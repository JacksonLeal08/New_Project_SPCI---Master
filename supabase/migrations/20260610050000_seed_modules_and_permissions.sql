-- Migration: 20260610050000_seed_modules_and_permissions.sql
-- Descrição: Insere os módulos padrão do sistema, define a função RPC para carregar permissões,
-- atualiza a função de criação de usuários para vincular permissões de acesso e recria as políticas RLS.

-- 1. CADASTRO INICIAL (SEED) DOS MÓDULOS DE NAVEGAÇÃO
INSERT INTO public.modulos (nome, descricao)
VALUES 
    ('dashboard', 'Dashboard / Visão Geral'),
    ('extintores', 'Extintores'),
    ('hidrantes', 'Hidrantes & Abrigos'),
    ('sinalizacao', 'Sinalização NBR'),
    ('iluminacao', 'Iluminação Emergência'),
    ('bombas', 'Casa de Bombas'),
    ('ronda', 'Despacho & Ronda Campo'),
    ('alerts', 'Disparo de Alertas')
ON CONFLICT (nome) DO NOTHING;

-- 2. FUNÇÃO RPC: get_user_permissions
-- Retorna os nomes dos módulos permitidos para visualização por um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_uid uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_perms text[];
BEGIN
    SELECT array_agg(m.nome) INTO v_perms
    FROM public.permissoes_modulos pm
    JOIN public.modulos m ON pm.modulo_id = m.id
    WHERE pm.usuario_id = p_uid AND pm.visualizar = true;
    
    RETURN COALESCE(v_perms, ARRAY[]::text[]);
END;
$$;

-- 3. FUNÇÃO RPC: create_new_user (ATUALIZADA)
-- Cria o usuário em auth.users, public.usuarios e insere as permissões modulares solicitadas
DROP FUNCTION IF EXISTS public.create_new_user(text, text, text, public.user_role, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.create_new_user(text, text, text, public.user_role, text, timestamp with time zone, text[]);

CREATE OR REPLACE FUNCTION public.create_new_user(
    p_email text,
    p_username text,
    p_name text,
    p_role public.user_role,
    p_password text,
    p_expires_at timestamp with time zone default null,
    p_allowed_modules text[] default null
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

    -- 5. Inserção no schema auth.users (Supabase Auth) com strings vazias para evitar erros no GoTrue
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

    -- 6. Inserção na tabela pública public.usuarios
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

    -- 7. Inserção das permissões na tabela public.permissoes_modulos
    if p_allowed_modules is not null then
        insert into public.permissoes_modulos (usuario_id, modulo_id, visualizar, interagir)
        select 
            v_new_user_id, 
            m.id, 
            (m.nome = any(p_allowed_modules)), 
            (m.nome = any(p_allowed_modules))
        from public.modulos m;
    else
        -- Se for nulo, concede acesso a todos (retrocompatibilidade)
        insert into public.permissoes_modulos (usuario_id, modulo_id, visualizar, interagir)
        select 
            v_new_user_id, 
            m.id, 
            true, 
            true
        from public.modulos m;
    end if;

    -- 8. Montagem do payload de retorno
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

-- 4. REFORÇO DAS POLÍTICAS RLS (usuarios)
-- Recria as políticas RLS garantindo que Desenvolvedor e Administrador acessem a tabela sem recursão cíclica
DROP POLICY IF EXISTS "Dev_All_Usuarios" ON public.usuarios;
CREATE POLICY "Dev_All_Usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (
    public.get_my_role() = 'Desenvolvedor'::public.user_role
)
WITH CHECK (
    public.get_my_role() = 'Desenvolvedor'::public.user_role
);

DROP POLICY IF EXISTS "Admin_Manage_Usuarios" ON public.usuarios;
CREATE POLICY "Admin_Manage_Usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (
    public.get_my_role() = 'Administrador'::public.user_role
    AND role != 'Desenvolvedor'::public.user_role
)
WITH CHECK (
    public.get_my_role() = 'Administrador'::public.user_role
    AND role != 'Desenvolvedor'::public.user_role
);
