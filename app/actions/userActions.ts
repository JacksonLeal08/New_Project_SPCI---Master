'use server';

import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com privilégios de Admin (ou Anon Key de fallback)
const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
 * Server Action para criar um novo colaborador de forma segura sem crash no Server Component.
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
}) {
  try {
    const { email, username, name, role, phone, password, expiresAt, allowedModules } = payload;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return { success: false, error: 'Variável NEXT_PUBLIC_SUPABASE_URL não configurada no servidor.' };
    }

    // Se temos a Service Role Key, usamos o cliente admin para bypassar envio de e-mail de confirmação
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. Cria o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          user_name: username,
          full_name: name
        }
      });

      if (authError) {
        return { success: false, error: `Erro no Supabase Auth: ${authError.message}` };
      }

      const userId = authData.user?.id;
      if (!userId) {
        return { success: false, error: 'Falha ao obter ID do novo usuário criado.' };
      }

      try {
        // 2. Insere os dados na tabela pública public.usuarios
        const { error: dbError } = await supabaseAdmin.from('usuarios').insert([
          {
            id: userId,
            user_name: username,
            email: email,
            nome_completo: name,
            telefone_whatsapp: phone,
            perfil_acesso: role,
            status_conta: 'Ativo',
            data_expiracao: expiresAt
          }
        ]);

        if (dbError) {
          console.warn('[createUserAction] Erro ao inserir na tabela usuarios:', dbError.message);
        }

        // 3. Cadastra as permissões modulares do usuário (se a tabela modulos existir)
        try {
          const { data: modules } = await supabaseAdmin.from('modulos').select('id, nome');

          if (modules && modules.length > 0) {
            const permissionsToInsert = modules.map((m) => ({
              usuario_id: userId,
              modulo_id: m.id,
              visualizar: allowedModules ? allowedModules.includes(m.nome) : true,
              interagir: allowedModules ? allowedModules.includes(m.nome) : true
            }));

            await supabaseAdmin.from('permissoes_modulos').insert(permissionsToInsert);
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
      } catch (err: any) {
        console.error('Erro ao registrar perfil público. Executando rollback no Auth...', err);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { success: false, error: `Erro ao salvar perfil público: ${err.message || err}` };
      }
    } else {
      // Fallback quando SUPABASE_SERVICE_ROLE_KEY não está presente no servidor (modo Cliente / Anon)
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes no servidor.' };
      }

      const supabaseAnon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_name: username,
            full_name: name
          }
        }
      });

      if (authError) {
        return { success: false, error: `Erro ao criar conta: ${authError.message}` };
      }

      const userId = authData.user?.id || `usr-${Date.now()}`;

      // Tenta inserir na tabela usuarios
      await supabaseAnon.from('usuarios').insert([
        {
          id: userId,
          user_name: username,
          email: email,
          nome_completo: name,
          telefone_whatsapp: phone,
          perfil_acesso: role,
          status_conta: 'Ativo',
          data_expiracao: expiresAt
        }
      ]);

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
    }
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
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: `Erro ao deletar usuário do Auth: ${error.message}` };
    }

    return { success: true };
  } catch (err: any) {
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
    status?: 'Ativo' | 'Inativo/Suspenso';
  }
) {
  try {
    if (!userId) {
      return { success: false, error: 'ID do usuário não fornecido.' };
    }
    const supabaseAdmin = getSupabaseAdminClient();
    const updateData: any = {};

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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status.' };
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
        dataExpiracao: meta.data_expiracao || null,
        createdAt: authUser.created_at || new Date().toISOString()
      });
    });

    // Sobrescreve com dados atualizados da tabela publica "usuarios"
    (dbUsers || []).forEach((u: any) => {
      const existing = userMap.get(u.id);
      userMap.set(u.id, {
        uid: u.id,
        name: u.nome_completo || u.user_name || existing?.name || 'Sem nome',
        email: u.email || existing?.email || 'N/A',
        username: u.user_name || existing?.username || 'usuario',
        phone: u.telefone_whatsapp || existing?.phone || '',
        role: u.perfil_acesso || existing?.role || 'Usuário',
        status: u.status_conta || existing?.status || 'Ativo',
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
    return { success: false, users: [] };
  }
}
