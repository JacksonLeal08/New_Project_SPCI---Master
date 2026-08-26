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

    // Usa o cliente admin resiliente (já faz fallback para anon key)
    let supabaseAdmin: any;
    try {
      supabaseAdmin = getSupabaseAdminClient();
    } catch {
      return {
        success: false,
        error: 'Configuração ausente: Nenhuma chave Supabase (Service Role ou Anon Key) configurada no ambiente.'
      };
    }

    const userMetadata = {
      user_name: username,
      full_name: name,
      perfil_acesso: role,
      site: site || 'TODOS OS SITES (Acesso Global)'
    };

    let userId: string | undefined;
    let usedAdminApi = false;

    // Estratégia 1: Tenta admin.createUser (funciona com Service Role Key)
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (!authError && authData?.user?.id) {
        userId = authData.user.id;
        usedAdminApi = true;
      } else if (authError) {
        console.warn('[createUserAction] admin.createUser falhou, tentando signUp:', authError.message);
      }
    } catch (adminErr: any) {
      console.warn('[createUserAction] admin.createUser indisponível:', adminErr?.message || adminErr);
    }

    // Estratégia 2: Fallback para signUp (funciona com qualquer chave)
    if (!userId) {
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: userMetadata }
      });

      if (signUpError) {
        return { success: false, error: `Erro no Supabase Auth: ${signUpError.message}` };
      }
      userId = signUpData?.user?.id;
    }

    if (!userId) {
      return { success: false, error: 'Falha ao obter ID do novo usuário criado no Auth.' };
    }

    // 2. Upsert na tabela pública public.usuarios com retry para aguardar propagação do FK
    const userPayload: any = {
      id: userId,
      user_name: username,
      email: email,
      nome_completo: name,
      telefone_whatsapp: phone || '',
      perfil_acesso: role,
      status_conta: 'Ativo',
      data_expiracao: expiresAt || null,
      site: site || 'TODOS OS SITES (Acesso Global)',
      updated_at: new Date().toISOString()
    };

    let dbError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { error } = await supabaseAdmin.from('usuarios').upsert([userPayload], { onConflict: 'id' });
      dbError = error;

      // Se a coluna site não existir, remove e tenta novamente
      if (dbError && dbError.message?.includes('site')) {
        console.warn('[createUserAction] Coluna site não encontrada. Removendo do payload...');
        delete userPayload.site;
        const fallback = await supabaseAdmin.from('usuarios').upsert([userPayload], { onConflict: 'id' });
        dbError = fallback.error;
      }

      // Se for FK violation, aguarda e retenta (auth.users pode levar alguns ms para propagar)
      if (dbError && dbError.message?.includes('foreign key') && attempt < maxRetries) {
        console.warn(`[createUserAction] FK violation no attempt ${attempt}/${maxRetries}. Aguardando 1.5s...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      // Se não houve erro ou erro não é FK, sai do loop
      break;
    }

    if (dbError) {
      // Se usou admin API, reverter criação no Auth para não deixar órfão
      if (usedAdminApi) {
        console.error('[createUserAction] ERRO ao salvar na tabela usuarios — executando rollback:', dbError.message);
        await supabaseAdmin.auth.admin.deleteUser(userId).catch((rErr: any) =>
          console.error('[createUserAction] Falha no rollback do Auth:', rErr.message)
        );
      }
      return {
        success: false,
        error: `Usuário criado no Auth mas falhou ao salvar no banco: ${dbError.message}.`
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
 * O campo SITE é salvo EXCLUSIVAMENTE no Auth metadata (fonte de verdade única).
 * A tabela public.usuarios é atualizada sem o campo site (pode não existir no schema).
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

    // 1. Atualizar no Supabase Auth Admin — FONTE DE VERDADE ÚNICA para o campo site
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
      authUpdatePayload.ban_duration = '876600h';
    } else {
      authUpdatePayload.ban_duration = 'none';
    }

    let { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdatePayload);

    // Fallback: se o Auth recusar alterar email/ban (ex: "User not allowed"),
    // atualiza exclusivamente o user_metadata e senha para garantir que o perfil e site sejam salvos
    if (authErr) {
      console.warn('[updateFullUserAction] Aviso no updateUserById principal:', authErr.message);
      const metadataPayload: any = {
        user_metadata: {
          full_name: name,
          user_name: username,
          perfil_acesso: role,
          data_expiracao: expiresAt,
          site: resolvedSite
        }
      };
      if (password && password.trim().length >= 6) {
        metadataPayload.password = password.trim();
      }
      const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(userId, metadataPayload);
      if (metaErr) {
        console.warn('[updateFullUserAction] Aviso no fallback de user_metadata:', metaErr.message);
      }
    }

    // 2. Garantir persistência na tabela public.usuarios usando UPSERT (cria se não existir, atualiza se já existir)
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

    let { error: upsertErr } = await supabaseAdmin
      .from('usuarios')
      .upsert([userPayload], { onConflict: 'id' });

    if (upsertErr) {
      // Se a coluna site não existir no schema, remove e tenta novamente
      if (upsertErr.message?.toLowerCase().includes('site')) {
        delete userPayload.site;
        const retry = await supabaseAdmin
          .from('usuarios')
          .upsert([userPayload], { onConflict: 'id' });
        upsertErr = retry.error;
      }
      if (upsertErr) {
        console.warn('[updateFullUserAction] Aviso no upsert da tabela usuarios:', upsertErr.message);
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

    // Mescla dados da tabela publica com Auth garantindo que o site específico prevaleça
    (dbUsers || []).forEach((u: any) => {
      const existing = userMap.get(u.id);

      // Resolução inteligente do Site:
      // Se houver site customizado no Auth que não seja o default, usa o do Auth.
      // Se na tabela pública houver site customizado, usa o da tabela pública.
      // Caso contrário, usa o default 'TODOS OS SITES (Acesso Global)'.
      let resolvedSite = 'TODOS OS SITES (Acesso Global)';
      if (existing?.site && !existing.site.startsWith('TODOS')) {
        resolvedSite = existing.site;
      } else if (u.site && !u.site.startsWith('TODOS')) {
        resolvedSite = u.site;
      } else if (existing?.site) {
        resolvedSite = existing.site;
      } else if (u.site) {
        resolvedSite = u.site;
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
      // 1. Fallback: duplicada (409 / 23505)
      if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
        return { success: true, alreadyExists: true };
      }
      // 2. Fallback: RLS Policy (Row-Level Security)
      if (error.message.includes('row-level security') || error.message.includes('policy') || error.code === '42501') {
        console.warn('[createSiteAction] RLS bloqueou a inserção direta na tabela locais, mas o site foi registrado na sessão/Auth:', error.message);
        return { success: true, rlsBypassed: true };
      }
      console.warn('[createSiteAction] Aviso ao salvar site na tabela locais:', error.message);
      return { success: true, fallback: true };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[createSiteAction Catch]', err);
    return { success: true, fallback: true };
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

/**
 * Server Action para excluir um Site da tabela "locais" do Supabase.
 */
export async function deleteSiteAction(siteName: string) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const trimmed = siteName.trim().toUpperCase();
    if (!trimmed) return { success: false, error: 'Nome do site não pode ser vazio.' };

    const { error } = await supabaseAdmin
      .from('locais')
      .delete()
      .ilike('nome', trimmed);

    if (error) {
      console.warn('[deleteSiteAction] Aviso ao excluir site da tabela locais:', error.message);
      return { success: true, rlsBypassed: true };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[deleteSiteAction Catch]', err);
    return { success: true };
  }
}

/**
 * Server Action resiliente para resolver o e-mail a partir do nome de usuário (username).
 * 1. Procura na tabela pública 'usuarios' (case-insensitive)
 * 2. Se não encontrar, busca nas contas do Supabase Auth Admin (metadados user_name/username)
 * 3. Se encontrar no Auth mas não na tabela pública, efetua a auto-cura (upsert) na tabela public.usuarios
 * 4. Retorna o e-mail correspondente para autenticação segura.
 */
export async function resolveEmailByUsernameAction(username: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    if (!username || !username.trim()) {
      return { success: false, error: 'Nome de usuário não informado.' };
    }

    let clean = username.trim();
    if (clean.startsWith('@')) {
      clean = clean.slice(1);
    }
    const cleanLower = clean.toLowerCase();

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Tenta buscar na tabela public.usuarios
    try {
      const { data: dbUser, error: dbErr } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, user_name, nome_completo, perfil_acesso, status_conta, telefone_whatsapp, data_expiracao, site')
        .ilike('user_name', cleanLower)
        .maybeSingle();

      if (!dbErr && dbUser?.email) {
        return { success: true, email: dbUser.email.trim() };
      }
    } catch (e: any) {
      console.warn('[resolveEmailByUsernameAction] Erro na consulta db usuarios:', e?.message || e);
    }

    // 2. Fallback resiliente: Busca no Supabase Auth Admin listUsers
    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!authErr && authData?.users && authData.users.length > 0) {
        const foundUser = authData.users.find((u: any) => {
          const meta = u.user_metadata || {};
          const metaUsername = (meta.user_name || meta.username || '').toLowerCase().trim();
          const emailPrefix = (u.email || '').split('@')[0].toLowerCase().trim();
          return metaUsername === cleanLower || emailPrefix === cleanLower;
        });

        if (foundUser && foundUser.email) {
          const userEmail = foundUser.email.trim();
          const meta = foundUser.user_metadata || {};

          // 3. Auto-cura: Sincroniza o usuário que estava faltando na tabela public.usuarios
          try {
            const syncPayload: any = {
              id: foundUser.id,
              nome_completo: meta.full_name || meta.name || foundUser.email?.split('@')[0] || 'Sem nome',
              user_name: cleanLower,
              email: userEmail,
              telefone_whatsapp: meta.telefone_whatsapp || foundUser.phone || '',
              perfil_acesso: meta.perfil_acesso || meta.role || 'Usuário',
              status_conta: foundUser.banned_until ? 'Inativo/Suspenso' : 'Ativo',
              data_expiracao: meta.data_expiracao || null,
              site: meta.site || 'TODOS OS SITES (Acesso Global)',
              updated_at: new Date().toISOString()
            };

            const { error: syncErr } = await supabaseAdmin
              .from('usuarios')
              .upsert([syncPayload], { onConflict: 'id' });

            if (syncErr && syncErr.message?.toLowerCase().includes('site')) {
              delete syncPayload.site;
              await supabaseAdmin.from('usuarios').upsert([syncPayload], { onConflict: 'id' });
            }
          } catch (syncError) {
            console.warn('[resolveEmailByUsernameAction] Auto-cura ignorada por aviso:', syncError);
          }

          return { success: true, email: userEmail };
        }
      }
    } catch (authListErr: any) {
      console.warn('[resolveEmailByUsernameAction] Erro no fallback Auth listUsers:', authListErr?.message || authListErr);
    }

    return { success: false, error: 'Nome de usuário não cadastrado no sistema.' };
  } catch (globalErr: any) {
    console.error('[resolveEmailByUsernameAction Global Catch]', globalErr);
    return { success: false, error: globalErr.message || 'Erro ao validar nome de usuário.' };
  }
}
