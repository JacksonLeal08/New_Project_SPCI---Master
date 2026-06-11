'use server';

import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com privilégios de Service Role (Admin) no servidor
const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configuração ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configuradas no servidor. Por favor, adicione-as ao .env.local.'
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
 * Server Action para criar um novo colaborador de forma definitiva no Supabase Auth e na tabela pública.
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
  const { email, username, name, role, phone, password, expiresAt, allowedModules } = payload;
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Cria o usuário no Supabase Auth bypassando envio de email de confirmação
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
    throw new Error(`Erro no Supabase Auth: ${authError.message}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('Falha ao obter o ID do usuário criado no Auth.');
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

    if (dbError) throw dbError;

    // 3. Cadastra as permissões modulares do usuário
    const { data: modules, error: modError } = await supabaseAdmin
      .from('modulos')
      .select('id, nome');

    if (modError) throw modError;

    if (modules && modules.length > 0) {
      const permissionsToInsert = modules.map((m) => ({
        usuario_id: userId,
        modulo_id: m.id,
        visualizar: allowedModules ? allowedModules.includes(m.nome) : true,
        interagir: allowedModules ? allowedModules.includes(m.nome) : true
      }));

      const { error: permError } = await supabaseAdmin
        .from('permissoes_modulos')
        .insert(permissionsToInsert);

      if (permError) throw permError;
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
    // Rollback: se falhar a escrita no banco público, remove o usuário criado no auth para evitar sujeira
    console.error('Erro ao registrar perfil público. Executando rollback no Auth...', err);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Erro ao registrar perfil de usuário: ${err.message || err}`);
  }
}

/**
 * Server Action para deletar de verdade um usuário da base de dados e do Supabase Auth.
 */
export async function deleteUserAction(userId: string) {
  if (!userId) {
    throw new Error('ID do usuário não fornecido.');
  }
  const supabaseAdmin = getSupabaseAdminClient();

  // Deleta o usuário do Supabase Auth. 
  // Devido à chave estrangeira com ON DELETE CASCADE, isso apagará automaticamente 
  // os registros dele em public.usuarios e public.permissoes_modulos.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Erro ao deletar usuário do Supabase Auth: ${error.message}`);
  }

  return { success: true };
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
  if (!userId) {
    throw new Error('ID do usuário não fornecido.');
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
    throw new Error(`Erro ao atualizar perfil público: ${error.message}`);
  }

  return { success: true };
}
