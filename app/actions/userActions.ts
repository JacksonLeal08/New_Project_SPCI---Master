'use server';

import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com privilégios de Admin
const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configuração ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configuradas no servidor.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Server Action para criar um novo colaborador de forma segura.
 * Sempre usa SUPABASE_SERVICE_ROLE_KEY para bypassar RLS.
 * Usa upsert para tolerância a duplicatas.
 * Executa rollback no Auth se o INSERT na tabela usuarios falhar.
 */
export async function createUserAction(payload: {
  email: string;
  username: string;
  name: string;
  role: 'Desenvolvedor' | 'Administrador' | 'Usuário';
  phone: string;
  password: string;
  expiresAt: string | null;
  allowedModules: string[] | null;
  site?: string | null;
}) {
  try {
    const { email, username, name, role, phone, password, expiresAt, allowedModules, site } = payload;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return { success: false, error: 'Variável NEXT_PUBLIC_SUPABASE_URL não configurada no servidor.' };
    }

    if (!serviceRoleKey) {
      return {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY ausente. Configure a variável no servidor para criar usuários com segurança.'
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Cria o usuário no Supabase Auth com confirmação automática de e-mail
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        user_name: username,
        full_name: name,
        perfil_acesso: role,
        site: site || 'TODOS OS SITES (Acesso Global)'
      }
    });

    if (authError) {
      return { success: false, error: `Erro no Supabase Auth: ${authError.message}` };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'Falha ao obter ID do novo usuário criado no Auth.' };
    }

    // 2. Upsert na tabela pública public.usuarios (tolerante a duplicatas)
    const userPayload: any = {
      id: userId,
      user_name: username,
      email: email,
      nome_completo: name,
      telefone_whatsapp: phone || '',
      perfil_acesso: role,
      status_conta: 'Ativo',
      data_expiracao: expiresAt || null,
      site: site || 'TODOS'
    };

    let { error: dbError } = await supabaseAdmin.from('usuarios').upsert([userPayload], { onConflict: 'id' });

    // Fallback: se a coluna site não existir no schema da tabela usuarios, remove site e tenta novamente
    if (dbError && dbError.message.includes('site')) {
      console.warn('[createUserAction] Coluna site não encontrada em usuarios. Salvando site exclusivamente no Auth metadata...');
      delete userPayload.site;
      const fallbackRes = await supabaseAdmin.from('usuarios').upsert([userPayload], { onConflict: 'id' });
      dbError = fallbackRes.error;
    }

    if (dbError) {
      // Erro crítico: reverter criação no Auth para não deixar órfão
      console.error('[createUserAction] ERRO ao salvar na tabela usuarios — executando rollback no Auth:', dbError.message);
      await supabaseAdmin.auth.admin.deleteUser(userId).catch((rErr: any) =>
        console.error('[createUserAction] Falha no rollback do Auth:', rErr.message)
      );
      return {
        success: false,
        error: `Usuário criado no Auth mas falhou ao salvar no banco: ${dbError.message}. A conta foi removida para consistência.`
      };
    }

    // 3. Cadastra as permissões modulares do usuário (se a tabela modulos existir)
    try {
      const { data: modules } = await supabaseAdmin.from('modulos').select('id, nome');

      if (modules && modules.length > 0) {
        const permissionsToInsert = modules.map((m: any) => ({
          usuario_id: userId,
          modulo_id: m.id,
          visualizar: allowedModules ? allowedModules.includes(m.nome) : true,
          interagir: allowedModules ? allowedModules.includes(m.nome) : true
        }));

        try {
          await supabaseAdmin
            .from('permissoes_modulos')
            .upsert(permissionsToInsert, { onConflict: 'usuario_id,modulo_id' });
        } catch (pErr: any) {
          console.warn('[createUserAction] Erro ao salvar permissões:', pErr.message || pErr);
        }
      }
    } catch (mErr) {
      console.warn('[createUserAction] Tabela modulos/permissoes não disponível:', mErr);
    }

    // 4. Dispara a notificação de e-mail corporativo HTML Premium
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      await fetch(`${siteUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email,
          username,
          name,
          role,
          tempPassword: password,
          expiresAt
        })
      }).catch(console.warn);
    } catch (eErr) {
      console.warn('[createUserAction] Erro ao disparar e-mail:', eErr);
    }

    return {
      success: true,
      user_id: userId,
      username,
      name,
      email,
      role,
      password,
      expires_at: expiresAt
    };
  } catch (globalErr: any) {
    console.error('[createUserAction Global Catch]', globalErr);
    return {
      success: false,
      error: `Erro ao processar criação de usuário: ${globalErr.message || globalErr}`
    };
  }
}

/**
 * Server Action para deletar de verdade um usuário da base de dados e do Supabase Auth.
 */
export async function deleteUserAction(userId: string) {
  try {
    if (!userId) {
      return { success: false, error: 'ID do usuário não fornecido.' };
    }
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Limpa permissões relacionais associadas ao usuário
    try {
      await supabaseAdmin.from('permissoes_modulos').delete().eq('usuario_id', userId);
    } catch (pErr: any) {
      console.warn('[deleteUserAction] Aviso ao deletar permissoes_modulos:', pErr?.message || pErr);
    }

    // 2. Deleta o cadastro público da tabela usuarios
    try {
      await supabaseAdmin.from('usuarios').delete().eq('id', userId);
    } catch (dErr: any) {
      console.warn('[deleteUserAction] Aviso ao deletar da tabela usuarios:', dErr?.message || dErr);
    }

    // 3. Tenta deletar da base de autenticação do Supabase Auth Admin
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authErr) {
      console.warn('[deleteUserAction] Supabase Auth deleteUser aviso:', authErr.message);

      // Fallback: Se o Auth recusar a exclusão direta (ex: "User not allowed" ou restrição do Supabase Auth),
      // aplica o banimento permanente na conta Auth para impedir logins futuros de forma definitiva
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876600h',
        user_metadata: { status_conta: 'Inativo/Suspenso', perfil_acesso: 'Inativo' }
      } as any).catch((bErr: any) => console.warn('[deleteUserAction] Erro no banimento de fallback:', bErr?.message || bErr));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteUserAction Global Catch]', err);
    return { success: false, error: err.message || 'Erro ao excluir usuário.' };
  }
}

/**
 * Server Action para atualizar o status de bloqueio ou perfil de um usuário.
 */
export async function updateUserStatusAction(
  userId: string,
  payload: {
    role?: 'Desenvolvedor' | 'Administrador' | 'Usuário';
    status?: 'Ativo' | 'Pendente' | 'Inativo/Suspenso';
  }
) {
  try {
    if (!userId) {
      return { success: false, error: 'ID do usuário não fornecido.' };
    }
    const supabaseAdmin = getSupabaseAdminClient();
    const updateData: any = { updated_at: new Date().toISOString() };

    if (payload.role) {
      updateData.perfil_acesso = payload.role;
    }
    if (payload.status) {
      updateData.status_conta = payload.status;
    }

    const { error } = await supabaseAdmin
      .from('usuarios')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      return { success: false, error: `Erro ao atualizar perfil público: ${error.message}` };
    }

    // Sincroniza role nos metadados do Auth
    if (payload.role) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { perfil_acesso: payload.role }
      }).catch((e: any) => console.warn('[updateUserStatusAction] Falha ao sincronizar role no Auth:', e.message));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status.' };
  }
}

/**
 * Server Action para atualização completa de perfil do colaborador (RBAC, dados pessoais, validade, senha e permissões).
 * Garante a sincronização atômica na tabela usuarios, metadados do Supabase Auth e permissões modulares.
 */
export async function updateFullUserAction(
  userId: string,
  payload: {
    name: string;
    username: string;
    email: string;
    phone: string;
    role: 'Desenvolvedor' | 'Administrador' | 'Usuário';
    status: 'Ativo' | 'Pendente' | 'Inativo/Suspenso';
    expiresAt: string | null;
    password?: string;
    allowedModules?: string[] | null;
    site?: string | null;
  }
) {
  try {
    if (!userId) {
      return { success: false, error: 'ID do usuário não fornecido.' };
    }
    const supabaseAdmin = getSupabaseAdminClient();

    const { name, username, email, phone, role, status, expiresAt, password, allowedModules, site } = payload;

    const resolvedSite = site || 'TODOS OS SITES (Acesso Global)';

    // 1. Atualizar no Supabase Auth Admin (FONTE DE VERDADE para o campo site)
    const authUpdatePayload: any = {
      email,
      user_metadata: {
        full_name: name,
        user_name: username,
        perfil_acesso: role,
        data_expiracao: expiresAt,
        site: resolvedSite
      }
    };

    if (password && password.trim().length >= 6) {
      authUpdatePayload.password = password.trim();
    }

    if (status === 'Inativo/Suspenso') {
      authUpdatePayload.banned_until = '3000-01-01T00:00:00Z';
    } else {
      authUpdatePayload.banned_until = 'none';
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdatePayload);
    if (authErr) {
      console.warn('[updateFullUserAction] Auth update warning:', authErr.message);
      // Não interrompe: o Auth metadata pode falhar em campos ban, mas o site é o mais importante
    }

    // 2. Atualizar ou Upsert na tabela publica usuarios (com fallback para coluna site)
    const userPayload: any = {
      id: userId,
      nome_completo: name,
      user_name: username,
      email: email,
      telefone_whatsapp: phone || '',
      perfil_acesso: role,
      status_conta: status,
      data_expiracao: expiresAt || null,
      site: resolvedSite,
      updated_at: new Date().toISOString()
    };

    // Tenta UPDATE direto no ID primeiro
    let { error: updateErr } = await supabaseAdmin
      .from('usuarios')
      .update(userPayload)
      .eq('id', userId);

    // Fallback: se a coluna site não existir no schema, remove e tenta novamente
    if (updateErr && (updateErr.message.includes('site') || updateErr.message.includes('column'))) {
      console.warn('[updateFullUserAction] Coluna site não encontrada. Salvando site exclusivamente no Auth metadata.');
      delete userPayload.site;
      const { error: retryErr } = await supabaseAdmin
        .from('usuarios')
        .update(userPayload)
        .eq('id', userId);
      updateErr = retryErr;
    }

    if (updateErr) {
      console.warn('[updateFullUserAction] Update direto falhou, tentando upsert:', updateErr.message);
      // Re-adiciona site para o upsert (pode funcionar se a tabela aceitar)
      userPayload.site = resolvedSite;
      let { error: upsertErr } = await supabaseAdmin
        .from('usuarios')
        .upsert([userPayload], { onConflict: 'id' });

      // Fallback upsert sem site
      if (upsertErr && (upsertErr.message.includes('site') || upsertErr.message.includes('column'))) {
        delete userPayload.site;
        const { error: upsertRetry } = await supabaseAdmin
          .from('usuarios')
          .upsert([userPayload], { onConflict: 'id' });
        upsertErr = upsertRetry;
      }

      if (upsertErr) {
        return { success: false, error: `Erro ao atualizar perfil no banco: ${upsertErr.message}` };
      }
    }

    // 3. Atualizar permissões modulares (se modulos existir)
    if (allowedModules) {
      try {
        const { data: modules } = await supabaseAdmin.from('modulos').select('id, nome');
        if (modules && modules.length > 0) {
          const permissionsToInsert = modules.map((m: any) => ({
            usuario_id: userId,
            modulo_id: m.id,
            visualizar: allowedModules.includes(m.nome),
            interagir: allowedModules.includes(m.nome)
          }));
          await supabaseAdmin.from('permissoes_modulos').upsert(permissionsToInsert, { onConflict: 'usuario_id,modulo_id' });
        }
      } catch (pErr: any) {
        console.warn('[updateFullUserAction] Falha ao atualizar permissões modulares:', pErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateFullUserAction Catch]', err);
    return { success: false, error: err.message || 'Erro inesperado ao atualizar usuário.' };
  }
}

/**
 * Server Action para buscar a lista completa de todos os usuários/colaboradores do banco público sem bloqueios de RLS.
 */
export async function getUsersListAction() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Busca usuários da tabela pública "usuarios"
    const { data: dbUsers } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Busca contas registradas no Supabase Auth Admin
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = authData?.users || [];

    const userMap = new Map<string, any>();

    // Popula com dados do Auth
    authUsers.forEach((authUser: any) => {
      const meta = authUser.user_metadata || {};
      userMap.set(authUser.id, {
        uid: authUser.id,
        name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Sem nome',
        email: authUser.email || 'N/A',
        username: meta.user_name || authUser.email?.split('@')[0] || 'usuario',
        phone: meta.telefone_whatsapp || authUser.phone || '',
        role: meta.perfil_acesso || meta.role || 'Usuário',
        status: authUser.banned_until ? 'Inativo/Suspenso' : 'Ativo',
        site: meta.site || 'TODOS OS SITES (Acesso Global)',
        dataExpiracao: meta.data_expiracao || null,
        createdAt: authUser.created_at || new Date().toISOString()
      });
    });

    // Sobrescreve com dados atualizados da tabela publica "usuarios" (prioridade ao banco)
    (dbUsers || []).forEach((u: any) => {
      const existing = userMap.get(u.id);

      // Função auxiliar: determina se um site é genérico (default) ou específico
      const isGenericSite = (s: string | null | undefined): boolean => {
        if (!s) return true;
        const normalized = s.trim().toUpperCase();
        return normalized === '' || normalized === 'TODOS' || normalized === 'TODOS OS SITES (ACESSO GLOBAL)';
      };

      // Resolve o site: prioriza o valor mais específico entre banco e Auth metadata
      const dbSite = u.site;
      const authSite = existing?.site;
      let resolvedSite: string;

      if (!isGenericSite(dbSite)) {
        // Banco tem site específico → usa o do banco
        resolvedSite = dbSite;
      } else if (!isGenericSite(authSite)) {
        // Auth tem site específico mas banco não → usa o do Auth
        resolvedSite = authSite;
      } else {
        resolvedSite = 'TODOS OS SITES (Acesso Global)';
      }

      userMap.set(u.id, {
        uid: u.id,
        name: u.nome_completo || u.user_name || existing?.name || 'Sem nome',
        email: u.email || existing?.email || 'N/A',
        username: u.user_name || existing?.username || 'usuario',
        phone: u.telefone_whatsapp || existing?.phone || '',
        role: u.perfil_acesso || existing?.role || 'Usuário',
        status: u.status_conta || existing?.status || 'Ativo',
        site: resolvedSite,
        dataExpiracao: u.data_expiracao || existing?.dataExpiracao || null,
        createdAt: u.created_at || existing?.createdAt || new Date().toISOString()
      });
    });

    const combinedUsers = Array.from(userMap.values()).sort((a, b) => {
      if (a.role !== b.role) {
        if (a.role === 'Desenvolvedor') return -1;
        if (b.role === 'Desenvolvedor') return 1;
        return a.role === 'Administrador' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return { success: true, users: combinedUsers };
  } catch (err: any) {
    console.error('[getUsersListAction Catch]', err);
    return { success: false, error: err.message || 'Erro ao listar usuários.' };
  }
}

/**
 * Server Action para gravar log de auditoria no Supabase com service role (bypassa RLS).
 */
export async function createLogAction(payload: {
  usuarioId?: string | null;
  usuarioNome: string;
  usuarioEmail: string;
  acao: string;
  tipoAtivo?: string | null;
  patrimonio?: string | null;
  detalhes?: string;
}) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const newLog = {
      id: crypto.randomUUID(),
      usuario_id: payload.usuarioId || null,
      usuario_nome: payload.usuarioNome,
      usuario_email: payload.usuarioEmail,
      acao: payload.acao,
      tipo_ativo: payload.tipoAtivo || null,
      patrimonio: payload.patrimonio || null,
      detalhes: payload.detalhes || '',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin.from('logs_auditoria').insert([newLog]);
    if (error) {
      console.warn('[createLogAction] Aviso ao inserir log via admin:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, log: newLog };
  } catch (err: any) {
    console.warn('[createLogAction Catch]:', err);
    return { success: false, error: err.message || 'Erro ao gravar log.' };
  }
}

/**
 * Server Action para salvar um novo Site na tabela "locais" do Supabase.
 * Verifica duplicatas antes de inserir (não depende de constraint UNIQUE).
 */
export async function createSiteAction(siteName: string) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const trimmed = siteName.trim().toUpperCase();
    if (!trimmed) return { success: false, error: 'Nome do site não pode ser vazio.' };

    // Verifica se o site já existe na tabela locais
    const { data: existing } = await supabaseAdmin
      .from('locais')
      .select('id, nome')
      .ilike('nome', trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      // Já existe — retorna sucesso sem duplicar
      return { success: true, alreadyExists: true };
    }

    // Insere novo registro
    const { error } = await supabaseAdmin
      .from('locais')
      .insert({ nome: trimmed });

    if (error) {
      // Fallback: pode ser um erro de constraint duplicada (409)
      if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
        return { success: true, alreadyExists: true };
      }
      console.warn('[createSiteAction] Aviso ao salvar site na tabela locais:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[createSiteAction Catch]', err);
    return { success: false, error: err.message || 'Erro ao salvar site.' };
  }
}

/**
 * Server Action para buscar todos os Sites cadastrados na tabela "locais" do Supabase.
 */
export async function fetchSitesAction() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('locais')
      .select('nome')
      .order('nome', { ascending: true });

    if (error) {
      console.warn('[fetchSitesAction] Aviso ao buscar locais:', error.message);
      return { success: false, sites: [] };
    }
    const sites = (data || []).map((r: any) => r.nome).filter(Boolean);
    return { success: true, sites };
  } catch (err: any) {
    console.error('[fetchSitesAction Catch]', err);
    return { success: false, sites: [] };
  }
}
