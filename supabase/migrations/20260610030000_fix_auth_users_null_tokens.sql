-- Migration: 20260610030000_fix_auth_users_null_tokens.sql
-- Descrição: Corrige o erro "Database error querying schema" ao inicializar campos de token vazios para os usuários criados manualmente.

-- 1. Corrige os registros existentes em auth.users
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    recovery_token = COALESCE(recovery_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '')
WHERE 
    confirmation_token IS NULL OR 
    email_change IS NULL OR 
    email_change_token_new IS NULL OR 
    email_change_token_current IS NULL OR 
    recovery_token IS NULL OR 
    phone_change IS NULL OR 
    phone_change_token IS NULL;

-- 2. Atualiza a função create_new_user para inicializar esses campos como string vazia nas inserções futuras
CREATE OR REPLACE FUNCTION public.create_new_user(
    p_email text,
    p_username text,
    p_name text,
    p_role public.user_role,
    p_password text,
    p_expires_at timestamp with time zone default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_creator_role public.user_role;
    v_new_user_id uuid;
    v_response jsonb;
BEGIN
    -- 1. Valida se há um usuário autenticado efetuando a requisição
    if auth.uid() is null then
        raise exception 'Não autorizado. Usuário não autenticado.';
    end if;

    -- 2. Busca e valida permissões da role de quem está executando
    v_creator_role := public.get_my_role();
    
    if v_creator_role is null then
        raise exception 'Não autorizado. Usuário criador sem perfil cadastrado.';
    end if;

    -- 3. Validação de Hierarquia Estrita de Criação
    if p_role = 'Desenvolvedor'::public.user_role and v_creator_role != 'Desenvolvedor'::public.user_role then
        raise exception 'Hierarquia violada: Apenas Desenvolvedores podem registrar novos Desenvolvedores.';
    end if;

    if v_creator_role = 'Usuário'::public.user_role then
        raise exception 'Acesso negado: Seu nível de acesso não permite a criação de contas.';
    end if;

    -- 4. Validação de formato mínimo de e-mail e username
    if not (p_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$') then
        raise exception 'Formato de e-mail inválido.';
    end if;

    if char_length(p_username) < 3 then
        raise exception 'Nome de usuário muito curto (mínimo de 3 caracteres).';
    end if;

    -- 5. Inserção no schema auth.users (Supabase Auth)
    begin
        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_sso_user,
            confirmation_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            recovery_token,
            phone_change,
            phone_change_token
        )
        values (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf', 10)),
            now(),
            now(),
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email']),
            jsonb_build_object('user_name', p_username, 'full_name', p_name),
            false,
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        )
        returning id into v_new_user_id;
    exception when unique_violation then
        raise exception 'Este e-mail ou nome de usuário já está cadastrado no sistema.';
    end;

    -- 6. Inserção automática na tabela pública public.usuarios
    insert into public.usuarios (
        id,
        user_name,
        email,
        name,
        role,
        data_expiracao
    )
    values (
        v_new_user_id,
        p_username,
        p_email,
        p_name,
        p_role,
        p_expires_at
    );

    -- 7. Montagem do payload de retorno
    v_response := jsonb_build_object(
        'success', true,
        'user_id', v_new_user_id,
        'username', p_username,
        'name', p_name,
        'email', p_email,
        'role', p_role,
        'password', p_password,
        'expires_at', p_expires_at
    );

    return v_response;
END;
$$;
