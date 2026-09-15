-- ==============================================================================
-- SPCI MASTER: ESTRUTURA E USUÁRIOS (PASSO 1 - ULTRA LEVE)
-- Cole este script no SQL Editor do seu novo Supabase e clique em RUN.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS E TIPOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('Desenvolvedor', 'Administrador', 'Usuário');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_estoque_enum') THEN
        CREATE TYPE public.status_estoque_enum AS ENUM ('ESTOQUE APLICAÇÃO', 'ESTOQUE MANUTENÇÃO', 'APLICADO', 'CONDENADO');
    END IF;
END $$;

-- 2. TABELAS PÚBLICAS
CREATE TABLE IF NOT EXISTS public.assets (
    id text NOT NULL,
    id_ativo text NOT NULL,
    category text NOT NULL,
    model text,
    location text,
    sub_location text,
    status text DEFAULT 'Conforme'::text NOT NULL,
    latitude numeric,
    longitude numeric,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status_estoque public.status_estoque_enum DEFAULT 'ESTOQUE APLICAÇÃO'::public.status_estoque_enum,
    numero_serie text,
    patrimonio text,
    data_fabricacao date,
    data_vencimento_teste date,
    tipo_movimentacao text DEFAULT 'na_area_aplicado'::text,
    lote_manutencao_atual_id uuid,
    precisao_gps double precision,
    data_ultima_localizacao timestamp with time zone,
    origem_localizacao character varying(50),
    status_operacional text DEFAULT 'NA_AREA_APLICADO'::text,
    CONSTRAINT assets_category_check CHECK ((category = ANY (ARRAY['extintores'::text, 'hidrantes'::text, 'sinalizacoes'::text, 'iluminacao'::text, 'bombas'::text]))),
    CONSTRAINT chk_assets_status_operacional CHECK ((status_operacional = ANY (ARRAY['NA_AREA_APLICADO'::text, 'ESTOQUE_APLICACAO'::text, 'ESTOQUE_MANUTENCAO'::text, 'EM_MANUTENCAO_EXTERNA'::text, 'CONDENADO_DESCARTE'::text])))
);

CREATE TABLE IF NOT EXISTS public.ativo_movimentacoes (
    id text DEFAULT (extensions.uuid_generate_v4())::text NOT NULL,
    asset_id text NOT NULL,
    id_ativo text NOT NULL,
    status_anterior public.status_estoque_enum,
    status_novo public.status_estoque_enum NOT NULL,
    motivo_movimentacao text,
    usuario_id text,
    usuario_nome text DEFAULT 'Sistema'::text NOT NULL,
    usuario_email text,
    observacao text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ativos_extintores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qr_code_hash uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    sub_local_id uuid,
    numero_patrimonio character varying(100) NOT NULL,
    selo_inmetro character varying(100),
    chassi character varying(100),
    modelo_id uuid NOT NULL,
    peso_capacidade character varying(50) NOT NULL,
    data_ultima_recarga date NOT NULL,
    meses_validade_recarga integer NOT NULL,
    ano_ultimo_teste_hidro integer NOT NULL,
    data_pesagem_co2 date,
    foto_url character varying(512),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    latitude double precision,
    longitude double precision,
    precisao_gps double precision,
    data_ultima_localizacao timestamp with time zone,
    origem_localizacao character varying(50),
    CONSTRAINT ativos_extintores_ano_ultimo_teste_hidro_check CHECK (((ano_ultimo_teste_hidro >= 1900) AND (ano_ultimo_teste_hidro <= 2100))),
    CONSTRAINT ativos_extintores_meses_validade_recarga_check CHECK ((meses_validade_recarga > 0))
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id text DEFAULT (extensions.uuid_generate_v4())::text NOT NULL,
    user_id text,
    user_email text,
    action text NOT NULL,
    entity text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cadastro_extintores (
    asset_id text NOT NULL,
    fabricante text NOT NULL,
    modelo text NOT NULL,
    peso_capacidade text NOT NULL,
    capacidade_extintora text NOT NULL,
    selo_inmetro text NOT NULL,
    chassi text NOT NULL,
    ano_fabricacao integer NOT NULL,
    ultimo_teste_hidro integer NOT NULL,
    data_ultima_recarga date NOT NULL,
    validade_recarga_meses integer DEFAULT 12 NOT NULL,
    validade_recarga_data date NOT NULL,
    CONSTRAINT cadastro_extintores_ano_fabricacao_check CHECK (((ano_fabricacao >= 1970) AND ((ano_fabricacao)::numeric <= EXTRACT(year FROM now())))),
    CONSTRAINT cadastro_extintores_ultimo_teste_hidro_check CHECK ((ultimo_teste_hidro >= 1970)),
    CONSTRAINT check_datas CHECK ((validade_recarga_data > data_ultima_recarga))
);

CREATE TABLE IF NOT EXISTS public.checklists_ativos (
    id text NOT NULL,
    ordem integer NOT NULL,
    categoria text DEFAULT 'extintores'::text NOT NULL,
    item text NOT NULL,
    tipos_aplicaveis jsonb DEFAULT '["Todos"]'::jsonb,
    pesos_aplicaveis jsonb DEFAULT '["Todos"]'::jsonb,
    status text DEFAULT 'Ativado'::text NOT NULL,
    is_impeditivo boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contratos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fornecedores_manutencao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    razao_social text NOT NULL,
    nome_fantasia text,
    cnpj text,
    registro_inmetro text,
    telefone text,
    whatsapp text,
    email text,
    contato_responsavel text,
    endereco text,
    cidade_uf text,
    ativo boolean DEFAULT true NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.historico_localizacao_ativo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ativo_id character varying(100) NOT NULL,
    categoria character varying(50) DEFAULT 'extintores'::character varying,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    precisao double precision,
    distancia_deslocada_metros double precision DEFAULT 0,
    foto_evidencia_url text,
    usuario_id uuid,
    usuario_nome character varying(255),
    tipo_evento character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.historico_movimentacoes_ativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id text NOT NULL,
    id_ativo text NOT NULL,
    lote_id uuid,
    numero_lote text,
    status_origem text NOT NULL,
    status_destino text NOT NULL,
    tipo_evento text NOT NULL,
    descricao_evento text NOT NULL,
    usuario_responsavel_nome text NOT NULL,
    usuario_responsavel_email text,
    detalhes_alteracao jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inspecoes (
    id text NOT NULL,
    asset_id text NOT NULL,
    asset_category text DEFAULT 'extintores'::text NOT NULL,
    status_result text DEFAULT 'Conforme'::text NOT NULL,
    tecnico_nome text,
    tecnico_email text,
    inspection_notes text,
    photo_patrimonio text,
    photo_frontal text,
    item_states jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspecoes_realizadas (
    id bigint NOT NULL,
    asset_id text NOT NULL,
    asset_patrimonio text NOT NULL,
    status text NOT NULL,
    observacoes text,
    tecnico_nome text NOT NULL,
    data_inspecao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    latitude double precision,
    longitude double precision,
    precisao_gps double precision,
    foto_evidencia_url text,
    justificativa_reinspecao text
);

CREATE TABLE IF NOT EXISTS public.itens_lote_manutencao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lote_id uuid NOT NULL,
    asset_id text NOT NULL,
    id_ativo text NOT NULL,
    patrimonio text,
    numero_serie text,
    modelo_tipo text,
    capacidade text,
    fabricante text,
    selo_inmetro_anterior text,
    data_ultimo_hidro text,
    data_ultima_recarga text,
    status_triagem text DEFAULT 'PENDENTE'::text NOT NULL,
    novo_selo_inmetro text,
    nova_validade_recarga date,
    nova_validade_hidro date,
    motivo_condenacao text,
    laudo_tecnico_url text,
    observacoes_triagem text,
    triado_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT itens_lote_manutencao_status_triagem_check CHECK ((status_triagem = ANY (ARRAY['PENDENTE'::text, 'APROVADO'::text, 'CONDENADO'::text])))
);

CREATE TABLE IF NOT EXISTS public.locais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locais_planta (
    id text NOT NULL,
    nome text NOT NULL,
    setor text,
    descricao text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    usuario_nome character varying(255) NOT NULL,
    usuario_email character varying(255) NOT NULL,
    acao character varying(100) NOT NULL,
    tipo_ativo character varying(100),
    patrimonio character varying(100),
    detalhes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lotes_manutencao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_lote text NOT NULL,
    fornecedor_id uuid,
    fornecedor_nome text NOT NULL,
    fornecedor_cnpj text,
    data_envio timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    previsao_retorno date,
    data_conclusao timestamp with time zone,
    status text DEFAULT 'EM_ANDAMENTO'::text NOT NULL,
    total_itens integer DEFAULT 0 NOT NULL,
    total_aprovados integer DEFAULT 0 NOT NULL,
    total_condenados integer DEFAULT 0 NOT NULL,
    usuario_envio_nome text NOT NULL,
    usuario_envio_email text,
    usuario_triagem_nome text,
    usuario_triagem_email text,
    observacoes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    fornecedor_contato text,
    CONSTRAINT lotes_manutencao_status_check CHECK ((status = ANY (ARRAY['EM_ANDAMENTO'::text, 'FINALIZADO'::text, 'CANCELADO'::text])))
);

CREATE TABLE IF NOT EXISTS public.modelos_extintores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissoes_modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    modulo_id uuid NOT NULL,
    visualizar boolean DEFAULT false NOT NULL,
    interagir boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    photo_url text,
    logo_url text,
    role text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text]))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'inactive'::text])))
);

CREATE TABLE IF NOT EXISTS public.shared_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    created_by_nome text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT shared_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);

CREATE TABLE IF NOT EXISTS public.sub_locais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    nome character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id uuid NOT NULL,
    user_name text NOT NULL,
    email text NOT NULL,
    nome_completo text NOT NULL,
    telefone_whatsapp text NOT NULL,
    photo_url text,
    logo_url text,
    perfil_acesso public.user_role DEFAULT 'Usuário'::public.user_role NOT NULL,
    status_conta text DEFAULT 'Ativo'::text NOT NULL,
    data_expiracao timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    site text DEFAULT 'TODOS OS SITES (Acesso Global)'::text,
    CONSTRAINT check_email_format CHECK ((email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'::text)),
    CONSTRAINT check_username_length CHECK ((char_length(user_name) >= 3)),
    CONSTRAINT usuarios_status_conta_check CHECK ((status_conta = ANY (ARRAY['Ativo'::text, 'Inativo/Suspenso'::text])))
);

-- 3. FUNÇÕES DO SISTEMA SPCI
CREATE OR REPLACE FUNCTION public.bloquear_inspecao_ativo_condenado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
begin
  select status into v_status from public.assets where id = new.asset_id;
  
  if v_status = 'Condenado' then
    raise exception 'Operação Bloqueada: Este extintor está CONDENADO por falha estrutural e não pode receber novas vistorias.';
  end if;
  
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.check_developer_immunity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_executing_user_role public.user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN COALESCE(new, old);
    END IF;

    v_executing_user_role := public.get_my_role();

    IF (tg_op = 'DELETE') THEN
        IF old.perfil_acesso = 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Apenas Desenvolvedores podem excluir contas do tipo Desenvolvedor.';
            END IF;
        END IF;
        RETURN old;
    END IF;

    IF (tg_op = 'UPDATE') THEN
        IF old.perfil_acesso = 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Modificações em contas de Desenvolvedor são restritas.';
            END IF;
            IF new.perfil_acesso != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Não é permitido rebaixar o perfil de um Desenvolvedor.';
            END IF;
        END IF;

        IF new.perfil_acesso = 'Desenvolvedor'::public.user_role AND old.perfil_acesso != 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Apenas Desenvolvedores podem designar novos Desenvolvedores.';
            END IF;
        END IF;
        RETURN new;
    END IF;

    RETURN COALESCE(new, old);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_new_user(p_email text, p_username text, p_name text, p_role public.user_role, p_password text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_allowed_modules text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
    AS $_$
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
$_$;


ALTER FUNCTION public.create_new_user(p_email text, p_username text, p_name text, p_role public.user_role, p_password text, p_expires_at timestamp with time zone, p_allowed_modules text[]) OWNER TO postgres;

--
-- Name: current_request_has_valid_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_request_has_valid_token() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token_str TEXT;
    v_token UUID;
BEGIN
    v_token_str := current_setting('request.headers', true)::json->>'x-shared-token';
    IF v_token_str IS NULL OR v_token_str = '' THEN
        RETURN FALSE;
    END IF;
    
    BEGIN
        v_token := v_token_str::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    RETURN EXISTS (
        SELECT 1 FROM public.shared_sessions
        WHERE id = v_token AND status = 'active' AND expires_at > now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_uid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
DECLARE
    v_creator_role public.user_role;
    v_target_role public.user_role;
BEGIN
    -- 1. Valida se o executor está autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autorizado. Usuário não autenticado.';
    END IF;

    -- 2. Busca a role do executor
    v_creator_role := public.get_my_role();
    IF v_creator_role IS NULL THEN
        RAISE EXCEPTION 'Não autorizado. Usuário criador sem perfil cadastrado.';
    END IF;

    -- 3. Usuários comuns não podem excluir ninguém
    IF v_creator_role = 'Usuário'::public.user_role THEN
        RAISE EXCEPTION 'Acesso negado: Seu nível de acesso não permite excluir contas.';
    END IF;

    -- 4. Busca a role do usuário a ser excluído
    SELECT role INTO v_target_role FROM public.usuarios WHERE id = p_uid;
    
    -- 5. Se o alvo for um Desenvolvedor, apenas outro Desenvolvedor pode excluir
    IF v_target_role = 'Desenvolvedor'::public.user_role AND v_creator_role != 'Desenvolvedor'::public.user_role THEN
        RAISE EXCEPTION 'Hierarquia violada: Apenas Desenvolvedores podem excluir contas do tipo Desenvolvedor.';
    END IF;

    -- 6. Exclui da tabela public.usuarios (caso não tenha cascateado)
    DELETE FROM public.usuarios WHERE id = p_uid;

    -- 7. Exclui da tabela auth.users (o que removerá o usuário da autenticação)
    DELETE FROM auth.users WHERE id = p_uid;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_asset_status_operacional() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status_operacional = 'ESTOQUE_APLICACAO' THEN
        NEW.status_estoque := 'ESTOQUE APLICAÇÃO';
        NEW.tipo_movimentacao := 'estoque_aplicacao';
    ELSIF NEW.status_operacional = 'ESTOQUE_MANUTENCAO' THEN
        NEW.status_estoque := 'ESTOQUE MANUTENÇÃO';
        NEW.tipo_movimentacao := 'estoque_ag_manut';
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    ELSIF NEW.status_operacional = 'EM_MANUTENCAO_EXTERNA' THEN
        NEW.status_estoque := 'EM MANUTENÇÃO';
        NEW.tipo_movimentacao := 'em_manutencao';
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    ELSIF NEW.status_operacional = 'CONDENADO_DESCARTE' THEN
        NEW.status_estoque := 'CONDENADOS';
        NEW.tipo_movimentacao := 'condenado';
    ELSIF NEW.status_operacional = 'NA_AREA_APLICADO' THEN
        NEW.status_estoque := NULL;
        NEW.tipo_movimentacao := 'na_area_aplicado';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_email text;
BEGIN
    SELECT email INTO v_email FROM public.usuarios WHERE LOWER(user_name) = LOWER(p_username) LIMIT 1;
    RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS public.user_role
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT perfil_acesso FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_uid uuid) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.handle_update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_my_account_expired() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_expired boolean;
BEGIN
    SELECT COALESCE(data_expiracao < now(), false) INTO v_expired FROM public.usuarios WHERE id = auth.uid();
    RETURN v_expired;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_my_account_suspended() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT COALESCE(status_conta = 'Inativo/Suspenso', false) FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.process_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_name VARCHAR(255) := 'Sistema';
    v_user_email VARCHAR(255) := 'sistema@spci.com';
    v_acao VARCHAR(100);
    v_tipo_ativo VARCHAR(100);
    v_patrimonio VARCHAR(100);
    v_detalhes TEXT;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(nome_completo, user_name, 'Técnico Autenticado'), email 
            INTO v_user_name, v_user_email 
            FROM public.usuarios 
            WHERE id = auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_user_name := 'Técnico Autenticado';
        END;
        
        IF v_user_name IS NULL THEN
            v_user_name := 'Técnico Autenticado';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_acao := 'CADASTRO_ATIVO';
    ELSIF TG_OP = 'UPDATE' THEN
        v_acao := 'EDICAO_ATIVO';
    ELSIF TG_OP = 'DELETE' THEN
        v_acao := 'EXCLUSAO_ATIVO';
    END IF;

    IF TG_TABLE_NAME = 'ativos_extintores' THEN
        v_tipo_ativo := 'extintores';
        IF TG_OP = 'DELETE' THEN
            v_patrimonio := old.numero_patrimonio;
            v_detalhes := 'Extintor excluído definitivamente. Patrimônio: ' || old.numero_patrimonio;
        ELSE
            v_patrimonio := new.numero_patrimonio;
            v_detalhes := 'Extintor cadastrado/atualizado. Local ID: ' || COALESCE(new.local_id::text, 'N/A') || 
                          ', Selo: ' || COALESCE(new.selo_inmetro, 'N/A') || 
                          ', Chassi: ' || COALESCE(new.chassi, 'N/A');
        END IF;
    ELSIF TG_TABLE_NAME = 'assets' THEN
        IF TG_OP = 'DELETE' THEN
            v_tipo_ativo := old.category;
            v_patrimonio := old.id_ativo;
            v_detalhes := 'Ativo removido definitivamente. Categoria: ' || old.category || 
                          ', Local: ' || COALESCE(old.location, 'N/A');
        ELSE
            v_tipo_ativo := new.category;
            v_patrimonio := new.id_ativo;
            v_detalhes := 'Ativo cadastrado/atualizado. Categoria: ' || new.category || 
                          ', Modelo: ' || COALESCE(new.model, 'N/A') || 
                          ', Local: ' || COALESCE(new.location, 'N/A');
        END IF;
    ELSIF TG_TABLE_NAME = 'inspecoes_realizadas' THEN
        v_acao := 'INSPECAO';
        IF TG_OP = 'DELETE' THEN
            v_tipo_ativo := 'inspecoes';
            v_patrimonio := old.asset_patrimonio;
            v_detalhes := 'Relatório de vistoria removido. Técnico: ' || old.tecnico_nome || 
                          ', Status: ' || old.status;
        ELSE
            v_tipo_ativo := 'inspecoes';
            v_patrimonio := new.asset_patrimonio;
            IF auth.uid() IS NULL AND new.tecnico_nome IS NOT NULL THEN
                v_user_name := new.tecnico_nome;
                v_user_email := 'portal_vistoria@spci.com';
            END IF;
            v_detalhes := 'Vistoria registrada. Técnico: ' || new.tecnico_nome || 
                          ', Status: ' || new.status || 
                          ', Observações: ' || COALESCE(new.observacoes, 'Sem observações.');
        END IF;
    END IF;

    BEGIN
        INSERT INTO public.logs_auditoria (
            usuario_id, usuario_nome, usuario_email, acao, tipo_ativo, patrimonio, detalhes
        )
        VALUES (
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE auth.uid() END,
            v_user_name, v_user_email, v_acao, v_tipo_ativo, v_patrimonio, v_detalhes
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Audit log failed: %', SQLERRM;
    END;

    RETURN COALESCE(new, old);
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_restricted_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_role public.user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    v_role := public.get_my_role();

    IF v_role IN ('Desenvolvedor', 'Administrador') THEN
        RETURN NEW;
    END IF;

    -- Usuários comuns: reverte alterações em campos restritos
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.data_expiracao := OLD.data_expiracao;
    NEW.email := OLD.email;
    NEW.user_name := OLD.user_name;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_asset_status_from_inspection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  update public.assets
  set status = new.status,
      updated_at = timezone('utc'::text, now())
  where id = new.asset_id;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.validate_shared_token(p_token uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session FROM public.shared_sessions 
    WHERE id = p_token AND status = 'active' AND expires_at > now();

    IF FOUND THEN
        RETURN jsonb_build_object(
            'valid', true,
            'created_by', v_session.created_by,
            'created_by_nome', v_session.created_by_nome,
            'expires_at', v_session.expires_at
        );
    ELSE
        RETURN jsonb_build_object('valid', false);
    END IF;
END;
$$;

-- 4. VIEWS PÚBLICAS
CREATE OR REPLACE VIEW public.view_extintores AS
 SELECT a.id,
    a.id_ativo,
    a.category,
    a.location,
    a.sub_location,
    a.status,
    a.latitude,
    a.longitude,
    e.fabricante,
    e.modelo,
    e.peso_capacidade,
    e.capacidade_extintora,
    e.selo_inmetro,
    e.chassi,
    e.ano_fabricacao,
    e.ultimo_teste_hidro,
    e.data_ultima_recarga,
    e.validade_recarga_meses,
    e.validade_recarga_data,
    a.created_at,
    a.updated_at
   FROM (public.assets a
     JOIN public.cadastro_extintores e ON ((a.id = e.asset_id)));

CREATE OR REPLACE VIEW public.vw_extintores_publico AS
 SELECT ae.id,
    ae.qr_code_hash,
    ae.numero_patrimonio,
    ae.selo_inmetro,
    ae.chassi AS numero_serie,
    ae.peso_capacidade,
    me.nome AS modelo_tipo,
    l.nome AS local_instalacao,
    sl.nome AS sub_local_instalacao,
    ae.data_ultima_recarga,
    ae.ano_ultimo_teste_hidro,
    ae.foto_url,
    ((ae.data_ultima_recarga + ((ae.meses_validade_recarga)::double precision * '1 mon'::interval)))::date AS data_limite_recarga,
    make_date((ae.ano_ultimo_teste_hidro + 5), 12, 31) AS data_limite_hidro,
        CASE
            WHEN ((CURRENT_DATE > (ae.data_ultima_recarga + ((ae.meses_validade_recarga)::double precision * '1 mon'::interval))) OR (CURRENT_DATE > make_date((ae.ano_ultimo_teste_hidro + 5), 12, 31))) THEN 'VENCIDO'::text
            WHEN (((((ae.data_ultima_recarga + ((ae.meses_validade_recarga)::double precision * '1 mon'::interval)))::date - CURRENT_DATE) <= 30) OR ((make_date((ae.ano_ultimo_teste_hidro + 5), 12, 31) - CURRENT_DATE) <= 30)) THEN 'A VENCER'::text
            ELSE 'NO PRAZO'::text
        END AS status_conformidade
   FROM (((public.ativos_extintores ae
     JOIN public.locais l ON ((ae.local_id = l.id)))
     LEFT JOIN public.sub_locais sl ON ((ae.sub_local_id = sl.id)))
     JOIN public.modelos_extintores me ON ((ae.modelo_id = me.id)));

CREATE OR REPLACE VIEW public.vw_kpi_distribuicao_extintores AS
 SELECT count(*) FILTER (WHERE (status_operacional = 'NA_AREA_APLICADO'::text)) AS na_area_aplicado,
    count(*) FILTER (WHERE (status_operacional = 'ESTOQUE_APLICACAO'::text)) AS estoque_aplicacao,
    count(*) FILTER (WHERE (status_operacional = 'ESTOQUE_MANUTENCAO'::text)) AS estoque_manutencao,
    count(*) FILTER (WHERE (status_operacional = 'EM_MANUTENCAO_EXTERNA'::text)) AS em_manutencao_externa,
    count(*) FILTER (WHERE (status_operacional = 'CONDENADO_DESCARTE'::text)) AS condenado_descarte,
    count(*) AS total_extintores
   FROM public.assets
  WHERE (category ~~* '%extintor%'::text);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets USING btree (category);
CREATE INDEX IF NOT EXISTS idx_assets_id_ativo ON public.assets USING btree (id_ativo);
CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets USING btree (location);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_numero_serie_unique ON public.assets USING btree (numero_serie) WHERE ((numero_serie IS NOT NULL) AND (numero_serie <> ''::text));
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_assets_status_category ON public.assets USING btree (category, status);
CREATE INDEX IF NOT EXISTS idx_assets_status_operacional ON public.assets USING btree (status_operacional);
CREATE INDEX IF NOT EXISTS idx_assets_tipo_movimentacao ON public.assets USING btree (tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_ativo_movimentacoes_asset_id ON public.ativo_movimentacoes USING btree (asset_id);
CREATE INDEX IF NOT EXISTS idx_ativo_movimentacoes_created_at ON public.ativo_movimentacoes USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_ativos_categoria_ordem ON public.checklists_ativos USING btree (categoria, ordem);
CREATE INDEX IF NOT EXISTS idx_extintores_chassi ON public.cadastro_extintores USING btree (chassi);
CREATE INDEX IF NOT EXISTS idx_extintores_patrimonio ON public.ativos_extintores USING btree (numero_patrimonio);
CREATE INDEX IF NOT EXISTS idx_extintores_qr_hash ON public.ativos_extintores USING btree (qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_extintores_selo ON public.cadastro_extintores USING btree (selo_inmetro);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores_manutencao USING btree (ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores_manutencao USING btree (cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_razao_social ON public.fornecedores_manutencao USING btree (razao_social);
CREATE INDEX IF NOT EXISTS idx_hist_loc_ativo_id ON public.historico_localizacao_ativo USING btree (ativo_id);
CREATE INDEX IF NOT EXISTS idx_hist_loc_created_at ON public.historico_localizacao_ativo USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_loc_tipo_evento ON public.historico_localizacao_ativo USING btree (tipo_evento);
CREATE INDEX IF NOT EXISTS idx_hist_mov_asset_id ON public.historico_movimentacoes_ativos USING btree (asset_id);
CREATE INDEX IF NOT EXISTS idx_hist_mov_created_at ON public.historico_movimentacoes_ativos USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_mov_lote_id ON public.historico_movimentacoes_ativos USING btree (lote_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_asset_category ON public.inspecoes USING btree (asset_category);
CREATE INDEX IF NOT EXISTS idx_inspecoes_asset_id ON public.inspecoes_realizadas USING btree (asset_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_created_at ON public.inspecoes USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspecoes_status_result ON public.inspecoes USING btree (status_result);
CREATE INDEX IF NOT EXISTS idx_itens_asset_id ON public.itens_lote_manutencao USING btree (asset_id);
CREATE INDEX IF NOT EXISTS idx_itens_lote_id ON public.itens_lote_manutencao USING btree (lote_id);
CREATE INDEX IF NOT EXISTS idx_itens_status_triagem ON public.itens_lote_manutencao USING btree (status_triagem);
CREATE INDEX IF NOT EXISTS idx_lotes_data_envio ON public.lotes_manutencao USING btree (data_envio);
CREATE INDEX IF NOT EXISTS idx_lotes_fornecedor_nome ON public.lotes_manutencao USING btree (fornecedor_nome);
CREATE INDEX IF NOT EXISTS idx_lotes_numero ON public.lotes_manutencao USING btree (numero_lote);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON public.lotes_manutencao USING btree (status);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativo_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos_extintores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastro_extintores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_localizacao_ativo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_movimentacoes_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes_realizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lote_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_planta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_extintores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACESSO (RLS POLICIES)
DROP POLICY IF EXISTS "Admin_Manage_Permissoes" ON public.permissoes_modulos;
CREATE POLICY "Admin_Manage_Permissoes" ON public.permissoes_modulos TO authenticated USING (((public.get_my_role() = 'Administrador'::public.user_role) AND (( SELECT usuarios.perfil_acesso
   FROM public.usuarios
  WHERE (usuarios.id = permissoes_modulos.usuario_id)) <> 'Desenvolvedor'::public.user_role))) WITH CHECK (((public.get_my_role() = 'Administrador'::public.user_role) AND (( SELECT usuarios.perfil_acesso
   FROM public.usuarios
  WHERE (usuarios.id = permissoes_modulos.usuario_id)) <> 'Desenvolvedor'::public.user_role)));

DROP POLICY IF EXISTS "Admin_Manage_Usuarios" ON public.usuarios;
CREATE POLICY "Admin_Manage_Usuarios" ON public.usuarios TO authenticated USING (((public.get_my_role() = 'Administrador'::public.user_role) AND (perfil_acesso <> 'Desenvolvedor'::public.user_role))) WITH CHECK (((public.get_my_role() = 'Administrador'::public.user_role) AND (perfil_acesso <> 'Desenvolvedor'::public.user_role)));

DROP POLICY IF EXISTS "Administradores possuem controle total" ON public.profiles;
CREATE POLICY "Administradores possuem controle total" ON public.profiles TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = (auth.uid())::text) AND (profiles_1.role = 'admin'::text)))));

DROP POLICY IF EXISTS "Ativos podem ser gerenciados na ronda pública" ON public.assets;
CREATE POLICY "Ativos podem ser gerenciados na ronda pública" ON public.assets USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Ativos são visíveis publicamente" ON public.assets;
CREATE POLICY "Ativos são visíveis publicamente" ON public.assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Atualização de ativos_extintores para autenticados" ON public.ativos_extintores;
CREATE POLICY "Atualização de ativos_extintores para autenticados" ON public.ativos_extintores FOR UPDATE TO authenticated USING ((NOT public.is_my_account_expired())) WITH CHECK ((NOT public.is_my_account_expired()));

DROP POLICY IF EXISTS "Delete de locais para Devs e Admins" ON public.locais;
CREATE POLICY "Delete de locais para Devs e Admins" ON public.locais FOR DELETE TO authenticated USING (((public.get_my_role() = ANY (ARRAY['Desenvolvedor'::public.user_role, 'Administrador'::public.user_role])) AND (NOT public.is_my_account_expired())));

DROP POLICY IF EXISTS "Delete de modelos para Devs e Admins" ON public.modelos_extintores;
CREATE POLICY "Delete de modelos para Devs e Admins" ON public.modelos_extintores FOR DELETE TO authenticated USING (((public.get_my_role() = ANY (ARRAY['Desenvolvedor'::public.user_role, 'Administrador'::public.user_role])) AND (NOT public.is_my_account_expired())));

DROP POLICY IF EXISTS "Delete de sub_locais para Devs e Admins" ON public.sub_locais;
CREATE POLICY "Delete de sub_locais para Devs e Admins" ON public.sub_locais FOR DELETE TO authenticated USING (((public.get_my_role() = ANY (ARRAY['Desenvolvedor'::public.user_role, 'Administrador'::public.user_role])) AND (NOT public.is_my_account_expired())));

DROP POLICY IF EXISTS "Desenvolvedor - Gestão de Módulos" ON public.modulos;
CREATE POLICY "Desenvolvedor - Gestão de Módulos" ON public.modulos USING ((( SELECT public.get_my_role() AS get_my_role) = 'Desenvolvedor'::public.user_role));

DROP POLICY IF EXISTS "Dev_All_Permissoes" ON public.permissoes_modulos;
CREATE POLICY "Dev_All_Permissoes" ON public.permissoes_modulos TO authenticated USING ((public.get_my_role() = 'Desenvolvedor'::public.user_role)) WITH CHECK ((public.get_my_role() = 'Desenvolvedor'::public.user_role));

DROP POLICY IF EXISTS "Dev_All_Usuarios" ON public.usuarios;
CREATE POLICY "Dev_All_Usuarios" ON public.usuarios TO authenticated USING ((public.get_my_role() = 'Desenvolvedor'::public.user_role)) WITH CHECK ((public.get_my_role() = 'Desenvolvedor'::public.user_role));

DROP POLICY IF EXISTS "Exclusão de ativos_extintores para Admins e Devs" ON public.ativos_extintores;
CREATE POLICY "Exclusão de ativos_extintores para Admins e Devs" ON public.ativos_extintores FOR DELETE TO authenticated USING (((public.get_my_role() = ANY (ARRAY['Desenvolvedor'::public.user_role, 'Administrador'::public.user_role])) AND (NOT public.is_my_account_expired())));

DROP POLICY IF EXISTS "Exclusão de inspecoes para Devs e Admins" ON public.inspecoes_realizadas;
CREATE POLICY "Exclusão de inspecoes para Devs e Admins" ON public.inspecoes_realizadas FOR DELETE TO authenticated USING (((public.get_my_role() = ANY (ARRAY['Desenvolvedor'::public.user_role, 'Administrador'::public.user_role])) AND (NOT public.is_my_account_expired())));

DROP POLICY IF EXISTS "Histórico de vistorias é público" ON public.inspecoes_realizadas;
CREATE POLICY "Histórico de vistorias é público" ON public.inspecoes_realizadas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de historico_localizacao_ativo permitida" ON public.historico_localizacao_ativo;
CREATE POLICY "Insercao de historico_localizacao_ativo permitida" ON public.historico_localizacao_ativo FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Inserção de ativos_extintores para autenticados" ON public.ativos_extintores;
CREATE POLICY "Inserção de ativos_extintores para autenticados" ON public.ativos_extintores FOR INSERT TO authenticated WITH CHECK ((NOT public.is_my_account_expired()));

DROP POLICY IF EXISTS "Inserção de inspecoes flexível" ON public.inspecoes_realizadas;
CREATE POLICY "Inserção de inspecoes flexível" ON public.inspecoes_realizadas FOR INSERT TO authenticated, anon WITH CHECK (((auth.role() = 'authenticated'::text) OR public.current_request_has_valid_token()));

DROP POLICY IF EXISTS "Inserção de locais para autenticados" ON public.locais;
CREATE POLICY "Inserção de locais para autenticados" ON public.locais FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Inserção de logs para autenticados" ON public.logs_auditoria;
CREATE POLICY "Inserção de logs para autenticados" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK ((NOT public.is_my_account_expired()));

DROP POLICY IF EXISTS "Inserção de modelos para autenticados" ON public.modelos_extintores;
CREATE POLICY "Inserção de modelos para autenticados" ON public.modelos_extintores FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Inserção de sub_locais para autenticados" ON public.sub_locais;
CREATE POLICY "Inserção de sub_locais para autenticados" ON public.sub_locais FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de ativos_extintores flexível" ON public.ativos_extintores;
CREATE POLICY "Leitura de ativos_extintores flexível" ON public.ativos_extintores FOR SELECT TO authenticated, anon USING (((auth.role() = 'authenticated'::text) OR public.current_request_has_valid_token()));

DROP POLICY IF EXISTS "Leitura de historico_localizacao_ativo para todos autenticados" ON public.historico_localizacao_ativo;
CREATE POLICY "Leitura de historico_localizacao_ativo para todos autenticados" ON public.historico_localizacao_ativo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura de inspecoes para autenticados" ON public.inspecoes_realizadas;
CREATE POLICY "Leitura de inspecoes para autenticados" ON public.inspecoes_realizadas FOR SELECT TO authenticated USING ((NOT public.is_my_account_expired()));

DROP POLICY IF EXISTS "Leitura de locais flexível" ON public.locais;
CREATE POLICY "Leitura de locais flexível" ON public.locais FOR SELECT TO authenticated, anon USING (((auth.role() = 'authenticated'::text) OR public.current_request_has_valid_token()));

DROP POLICY IF EXISTS "Leitura de logs para autenticados" ON public.logs_auditoria;
CREATE POLICY "Leitura de logs para autenticados" ON public.logs_auditoria FOR SELECT TO authenticated USING ((NOT public.is_my_account_expired()));

DROP POLICY IF EXISTS "Leitura de modelos flexível" ON public.modelos_extintores;
CREATE POLICY "Leitura de modelos flexível" ON public.modelos_extintores FOR SELECT TO authenticated, anon USING (((auth.role() = 'authenticated'::text) OR public.current_request_has_valid_token()));

DROP POLICY IF EXISTS "Leitura de sub_locais flexível" ON public.sub_locais;
CREATE POLICY "Leitura de sub_locais flexível" ON public.sub_locais FOR SELECT TO authenticated, anon USING (((auth.role() = 'authenticated'::text) OR public.current_request_has_valid_token()));

DROP POLICY IF EXISTS "Perfis visíveis por qualquer usuário autenticado" ON public.profiles;
CREATE POLICY "Perfis visíveis por qualquer usuário autenticado" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir alteração pública de assets" ON public.assets;
CREATE POLICY "Permitir alteração pública de assets" ON public.assets USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir alteração pública de audit_logs" ON public.audit_logs USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de checklists_ativos" ON public.checklists_ativos;
CREATE POLICY "Permitir alteração pública de checklists_ativos" ON public.checklists_ativos USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de inspecoes" ON public.inspecoes;
CREATE POLICY "Permitir alteração pública de inspecoes" ON public.inspecoes USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de locais_planta" ON public.locais_planta;
CREATE POLICY "Permitir alteração pública de locais_planta" ON public.locais_planta USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de sub_locais" ON public.sub_locais;
CREATE POLICY "Permitir alteração pública de sub_locais" ON public.sub_locais USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir alteração pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir alteração pública de usuarios" ON public.usuarios USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir escrita de historico" ON public.historico_movimentacoes_ativos;
CREATE POLICY "Permitir escrita de historico" ON public.historico_movimentacoes_ativos USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir escrita de itens do lote" ON public.itens_lote_manutencao;
CREATE POLICY "Permitir escrita de itens do lote" ON public.itens_lote_manutencao USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir escrita de lotes" ON public.lotes_manutencao;
CREATE POLICY "Permitir escrita de lotes" ON public.lotes_manutencao USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção de logs por usuários autenticados" ON public.logs_auditoria;
CREATE POLICY "Permitir inserção de logs por usuários autenticados" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção de movimentações" ON public.ativo_movimentacoes;
CREATE POLICY "Permitir inserção de movimentações" ON public.ativo_movimentacoes USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção e edição para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir inserção e edição para todos autenticados" ON public.fornecedores_manutencao USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de historico" ON public.historico_movimentacoes_ativos;
CREATE POLICY "Permitir leitura de historico" ON public.historico_movimentacoes_ativos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura de itens do lote" ON public.itens_lote_manutencao;
CREATE POLICY "Permitir leitura de itens do lote" ON public.itens_lote_manutencao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura de lotes" ON public.lotes_manutencao;
CREATE POLICY "Permitir leitura de lotes" ON public.lotes_manutencao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura para todos autenticados" ON public.fornecedores_manutencao;
CREATE POLICY "Permitir leitura para todos autenticados" ON public.fornecedores_manutencao FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de assets" ON public.assets;
CREATE POLICY "Permitir leitura pública de assets" ON public.assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir leitura pública de audit_logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de checklists_ativos" ON public.checklists_ativos;
CREATE POLICY "Permitir leitura pública de checklists_ativos" ON public.checklists_ativos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de inspecoes" ON public.inspecoes;
CREATE POLICY "Permitir leitura pública de inspecoes" ON public.inspecoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de locais_planta" ON public.locais_planta;
CREATE POLICY "Permitir leitura pública de locais_planta" ON public.locais_planta FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de movimentações" ON public.ativo_movimentacoes;
CREATE POLICY "Permitir leitura pública de movimentações" ON public.ativo_movimentacoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de sub_locais" ON public.sub_locais;
CREATE POLICY "Permitir leitura pública de sub_locais" ON public.sub_locais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir leitura pública de usuarios" ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Técnicos podem registrar laudos na ronda" ON public.inspecoes_realizadas;
CREATE POLICY "Técnicos podem registrar laudos na ronda" ON public.inspecoes_realizadas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update de locais para autenticados" ON public.locais;
CREATE POLICY "Update de locais para autenticados" ON public.locais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Update de modelos para autenticados" ON public.modelos_extintores;
CREATE POLICY "Update de modelos para autenticados" ON public.modelos_extintores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Update de sub_locais para autenticados" ON public.sub_locais;
CREATE POLICY "Update de sub_locais para autenticados" ON public.sub_locais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "User_Update_Self" ON public.usuarios;
CREATE POLICY "User_Update_Self" ON public.usuarios FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

DROP POLICY IF EXISTS "User_View_Own_Permissoes" ON public.permissoes_modulos;
CREATE POLICY "User_View_Own_Permissoes" ON public.permissoes_modulos FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));

DROP POLICY IF EXISTS "User_View_Self" ON public.usuarios;
CREATE POLICY "User_View_Self" ON public.usuarios FOR SELECT TO authenticated USING ((id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios atualizam suas proprias shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios atualizam suas proprias shared_sessions" ON public.shared_sessions FOR UPDATE TO authenticated USING ((created_by = auth.uid()));

DROP POLICY IF EXISTS "Usuarios autenticados criam shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios autenticados criam shared_sessions" ON public.shared_sessions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios veem suas proprias shared_sessions" ON public.shared_sessions;
CREATE POLICY "Usuarios veem suas proprias shared_sessions" ON public.shared_sessions FOR SELECT TO authenticated USING ((created_by = auth.uid()));

DROP POLICY IF EXISTS "Usuários podem modificar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem modificar seu próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (((auth.uid())::text = id));

-- 8. TRIGGERS AUTOMÁTICOS
DROP TRIGGER IF EXISTS tr_assets_audit ON public.assets;
CREATE TRIGGER tr_assets_audit AFTER INSERT OR DELETE OR UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_ativos_extintores_audit ON public.ativos_extintores;
CREATE TRIGGER tr_ativos_extintores_audit AFTER INSERT OR DELETE OR UPDATE ON public.ativos_extintores FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_inspecoes_realizadas_audit ON public.inspecoes_realizadas;
CREATE TRIGGER tr_inspecoes_realizadas_audit AFTER INSERT OR DELETE OR UPDATE ON public.inspecoes_realizadas FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS tr_permissoes_modulos_timestamp ON public.permissoes_modulos;
CREATE TRIGGER tr_permissoes_modulos_timestamp BEFORE UPDATE ON public.permissoes_modulos FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

DROP TRIGGER IF EXISTS tr_usuarios_imunidade ON public.usuarios;
CREATE TRIGGER tr_usuarios_imunidade BEFORE DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.check_developer_immunity();

DROP TRIGGER IF EXISTS tr_usuarios_timestamp ON public.usuarios;
CREATE TRIGGER tr_usuarios_timestamp BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_checklists_ativos_updated_at ON public.checklists_ativos;
CREATE TRIGGER trg_checklists_ativos_updated_at BEFORE UPDATE ON public.checklists_ativos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_locais_planta_updated_at ON public.locais_planta;
CREATE TRIGGER trg_locais_planta_updated_at BEFORE UPDATE ON public.locais_planta FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_sub_locais_updated_at ON public.sub_locais;
CREATE TRIGGER trg_sub_locais_updated_at BEFORE UPDATE ON public.sub_locais FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_sync_asset_status_operacional ON public.assets;
CREATE TRIGGER trg_sync_asset_status_operacional BEFORE INSERT OR UPDATE OF status_operacional ON public.assets FOR EACH ROW EXECUTE FUNCTION public.fn_sync_asset_status_operacional();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_prevent_inspections_on_condemned ON public.inspecoes_realizadas;
CREATE TRIGGER trigger_prevent_inspections_on_condemned BEFORE INSERT ON public.inspecoes_realizadas FOR EACH ROW EXECUTE FUNCTION public.bloquear_inspecao_ativo_condenado();

DROP TRIGGER IF EXISTS trigger_sync_asset_status_after_inspection ON public.inspecoes_realizadas;
CREATE TRIGGER trigger_sync_asset_status_after_inspection AFTER INSERT ON public.inspecoes_realizadas FOR EACH ROW EXECUTE FUNCTION public.sync_asset_status_from_inspection();

DROP TRIGGER IF EXISTS trigger_update_assets_updated_at ON public.assets;
CREATE TRIGGER trigger_update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. BUCKET DE FOTOS NO SUPABASE STORAGE
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-extintores', 'fotos-extintores', true) 
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. USUÁRIOS DE ACESSO E TABELAS BASE
-- ==============================================================================
SET session_replication_role = replica; -- Desativa validações de FK temporariamente durante a carga

-- Inserindo 2 registros em auth.users...
INSERT INTO auth.users ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
('00000000-0000-0000-0000-000000000000', '9b1cec31-dda0-44c3-b2fa-602cc4077874', 'authenticated', 'authenticated', 'jacksonflr@outlook.com.br', '$2a$10$5.z9ELkkkXRRHKZAvQq66uEHLN9.4AvpHuIVf8OtYYixgWp.J8cze', '2026-06-03 19:29:29.767705+00', NULL, NULL, NULL, NULL, '2026-07-24 18:39:06.846396+00', NULL, NULL, NULL, '2026-09-12 14:19:13.616687+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "Jackson Leal", "user_name": "jacksonflr", "perfil_acesso": "Desenvolvedor", "email_verified": true}', NULL, '2026-06-03 19:29:29.749474+00', '2026-09-13 19:06:21.26103+00', NULL, NULL, NULL, NULL, NULL, NULL, '0', NULL, NULL, NULL, 'f', NULL, 'f'),
('00000000-0000-0000-0000-000000000000', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'authenticated', 'authenticated', 'jackson602@gmail.com', '$2a$10$Ja.i7xWXIhi2VO6hLjsIcetyOYbqkLaLKo7oAcL2vfzS0qjOytOoq', '2026-08-26 14:17:37.930752+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-10 20:49:21.979314+00', '{"provider": "email", "providers": ["email"]}', '{"site": "SALOBO", "full_name": "Usuário Teste", "user_name": "franckleal", "perfil_acesso": "Administrador", "email_verified": true}', NULL, '2026-08-26 14:17:37.915643+00', '2026-09-12 13:43:37.542241+00', NULL, NULL, NULL, NULL, NULL, NULL, '0', NULL, NULL, NULL, 'f', NULL, 'f')
ON CONFLICT DO NOTHING;

-- Inserindo 2 registros em auth.identities...
INSERT INTO auth.identities ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
('9b1cec31-dda0-44c3-b2fa-602cc4077874', '9b1cec31-dda0-44c3-b2fa-602cc4077874', '{"sub": "9b1cec31-dda0-44c3-b2fa-602cc4077874", "email": "jacksonflr@outlook.com.br", "email_verified": false, "phone_verified": false}', 'email', '2026-06-03 19:29:29.764437+00', '2026-06-03 19:29:29.764487+00', '2026-06-03 19:29:29.764487+00', '0b30ecd4-5825-441b-a195-5c201e94cc48'),
('98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '{"sub": "98af6368-c5fe-41fe-aa68-ec2d221f4bc6", "email": "jackson602@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-08-26 14:17:37.925444+00', '2026-08-26 14:17:37.925505+00', '2026-08-26 14:17:37.925505+00', 'cee8c624-d61a-4cba-9eae-288877458dc4')
ON CONFLICT DO NOTHING;

-- Inserindo 8 registros em public.modulos...
INSERT INTO public.modulos ("id", "nome", "descricao", "created_at") VALUES
('f2d35c8b-808e-4cb6-86b8-62a7873f4c47', 'dashboard', 'Dashboard / Visão Geral', '2026-06-10 20:57:46.088912+00'),
('c1b9b77d-a3e3-4d5f-aba2-6dee6ea867b5', 'extintores', 'Extintores', '2026-06-10 20:57:46.088912+00'),
('ffd2fdd4-069a-40b9-9a7b-ff7e51b0446c', 'hidrantes', 'Hidrantes & Abrigos', '2026-06-10 20:57:46.088912+00'),
('5ea2c8ab-5108-4262-babb-0adbbc95d047', 'sinalizacao', 'Sinalização NBR', '2026-06-10 20:57:46.088912+00'),
('c892f804-67a2-48bc-9414-039128df1465', 'iluminacao', 'Iluminação Emergência', '2026-06-10 20:57:46.088912+00'),
('94881fd9-63ef-4da2-b149-5b937473e35e', 'bombas', 'Casa de Bombas', '2026-06-10 20:57:46.088912+00'),
('736410c1-3070-421e-ab14-28b03e8c2e58', 'ronda', 'Despacho & Ronda Campo', '2026-06-10 20:57:46.088912+00'),
('1d84b33c-ae2a-4db1-bebc-d312e8434f68', 'alerts', 'Disparo de Alertas', '2026-06-10 20:57:46.088912+00')
ON CONFLICT DO NOTHING;

-- Inserindo 8 registros em public.permissoes_modulos...
INSERT INTO public.permissoes_modulos ("id", "usuario_id", "modulo_id", "visualizar", "interagir", "created_at", "updated_at") VALUES
('bf982abf-c543-4634-9ba7-74dbf99c775c', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'f2d35c8b-808e-4cb6-86b8-62a7873f4c47', 't', 't', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('d8a25c45-027e-4161-92e2-f0bee114e791', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'c1b9b77d-a3e3-4d5f-aba2-6dee6ea867b5', 't', 't', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('99bff201-51db-409f-81b3-1d4d459f9c78', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'ffd2fdd4-069a-40b9-9a7b-ff7e51b0446c', 'f', 'f', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('bc4880ab-626e-421f-93ac-172c7b397a5c', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '5ea2c8ab-5108-4262-babb-0adbbc95d047', 'f', 'f', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('1cd6e0ff-f54a-4944-a051-c62dcb057460', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'c892f804-67a2-48bc-9414-039128df1465', 'f', 'f', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('8870877e-eecb-460c-a9b0-d873ab7ffbc4', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '94881fd9-63ef-4da2-b149-5b937473e35e', 'f', 'f', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('1b7dafbc-7e71-4abd-9f11-4052cad93aec', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '736410c1-3070-421e-ab14-28b03e8c2e58', 't', 't', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00'),
('d27abeab-e862-4927-bdad-7c39b0b5dded', '98af6368-c5fe-41fe-aa68-ec2d221f4bc6', '1d84b33c-ae2a-4db1-bebc-d312e8434f68', 't', 't', '2026-08-26 14:17:38.681409+00', '2026-09-08 12:52:46.348995+00')
ON CONFLICT DO NOTHING;

-- Inserindo 2 registros em public.usuarios...
INSERT INTO public.usuarios ("id", "user_name", "email", "nome_completo", "telefone_whatsapp", "photo_url", "logo_url", "perfil_acesso", "status_conta", "data_expiracao", "created_at", "updated_at", "site") VALUES
('98af6368-c5fe-41fe-aa68-ec2d221f4bc6', 'franckleal', 'jackson602@gmail.com', 'Usuário Teste', '94999974449', NULL, NULL, 'Administrador', 'Ativo', NULL, '2026-08-26 14:17:38.103801+00', '2026-09-08 12:52:45.771826+00', 'SALOBO'),
('9b1cec31-dda0-44c3-b2fa-602cc4077874', 'jfleal', 'jacksonflr@outlook.com.br', 'Jackson Leal', '(94) 99295-0857', NULL, NULL, 'Desenvolvedor', 'Ativo', NULL, '2026-06-11 19:34:03.42869+00', '2026-07-28 11:10:14.71153+00', 'TODOS OS SITES (Acesso Global)')
ON CONFLICT DO NOTHING;

-- Inserindo 6 registros em public.modelos_extintores...
INSERT INTO public.modelos_extintores ("id", "nome", "created_at") VALUES
('3a38c7aa-441d-4e70-867e-cd6126b85597', 'ABC - PREMIUM', '2026-06-05 17:27:29.980361+00'),
('528b5198-5d47-4d17-9e13-1334be286079', 'BC', '2026-06-08 02:52:59.971518+00'),
('e39fae27-9ae4-4a50-a618-d3062452769e', 'ABC-PREMIUM', '2026-09-10 02:00:56.292415+00'),
('d684498d-33e9-47b2-a912-2ac96152b8ba', 'ABC', '2026-06-06 23:59:59.509947+00'),
('8f418962-9706-4ae1-9c32-e769b21d6540', 'CO²', '2026-06-08 00:33:14.915206+00'),
('f1f136ab-bf2b-4737-aa60-9fc9c9acb585', 'AP', '2026-06-08 02:53:44.527467+00')
ON CONFLICT DO NOTHING;

-- Inserindo 14 registros em public.checklists_ativos...
INSERT INTO public.checklists_ativos ("id", "ordem", "categoria", "item", "tipos_aplicaveis", "pesos_aplicaveis", "status", "is_impeditivo", "created_at", "updated_at") VALUES
('chk-1', '1', 'extintores', 'Localização, classe e modelo de extintores conforme projeto de incêndio e pânico', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-2', '2', 'extintores', 'Suporte e Altura de instalação adequada (Máximo 1,60 m do piso acabado)', '["Todos"]', '["Portátil"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-3', '3', 'extintores', 'Equipamento desobstruído e de fácil acesso visual e físico', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-4', '4', 'extintores', 'Sinalização de parede visível e dentro da norma vigente NBR 13434', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-5', '5', 'extintores', 'Sinalização de piso visível e dentro da norma vigente NBR 13434', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-6', '6', 'extintores', 'Aspecto externo sem dano, amassado, vazamento ou corrosão no recipiente', '["Todos"]', '["Todos"]', 'Ativado', 't', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-7', '7', 'extintores', 'Lacre de segurança íntegro e sem violação', '["Todos"]', '["Todos"]', 'Ativado', 't', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-8', '8', 'extintores', 'Selo Inmetro e Etiquetas de validade/manutenção íntegros e legíveis', '["Todos"]', '["Todos"]', 'Ativado', 't', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-9', '9', 'extintores', 'Prazo de manutenção anual e teste hidrostático (5 anos) dentro da validade', '["Todos"]', '["Todos"]', 'Ativado', 't', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-10', '10', 'extintores', 'Prazo de pesagem semestral de CO2 dentro da validade e sem perda >10%', '["CO2"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-11', '11', 'extintores', 'Indicador de pressão (Manômetro) na faixa verde de operação', '["PQS", "AP", "Espuma", "K"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-12', '12', 'extintores', 'Acessórios íntegros (mangueira, difusor, punho, gatilho e válvula)', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-13', '13', 'extintores', 'Mangueiras de descarga desobstruídas e sem ressecamento', '["Todos"]', '["Todos"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00'),
('chk-14', '14', 'extintores', 'Conjunto de rodagem, mangueira longa e suporte de transporte conforme (Carreta)', '["Todos"]', '["Carreta / Sobre Rodas"]', 'Ativado', 'f', '2026-08-14 12:09:11.051838+00', '2026-08-14 19:42:42.329062+00')
ON CONFLICT DO NOTHING;

-- Inserindo 5 registros em public.fornecedores_manutencao...
INSERT INTO public.fornecedores_manutencao ("id", "razao_social", "nome_fantasia", "cnpj", "registro_inmetro", "telefone", "whatsapp", "email", "contato_responsavel", "endereco", "cidade_uf", "ativo", "observacoes", "created_at", "updated_at") VALUES
('85014551-54c2-4c0b-82dc-d11a5333ff31', 'Bucka Spiero Engenharia e Equipamentos Contra Incêndio Ltda', 'Bucka Spiero Equipamentos', '52.124.987/0001-33', 'INMETRO 004891/2024', '(11) 4004-9200', NULL, 'engenharia@bucka.com.br', 'Carlos Eduardo', NULL, 'São Paulo / SP', 't', NULL, '2026-08-18 12:03:39.04927+00', '2026-08-18 12:03:39.04927+00'),
('990bdc85-5963-4d22-aaa1-08b9dff486c0', 'Mocelin Extintores & Engenharia de Prevenção Ltda', 'Mocelin Extintores', '14.982.341/0001-12', 'INMETRO 008712/2023', '(41) 3340-5500', NULL, 'comercial@mocelin.com.br', 'Juliana Ramos', NULL, 'Curitiba / PR', 't', NULL, '2026-08-18 12:03:39.04927+00', '2026-08-18 12:03:39.04927+00'),
('9c8c2f2f-807d-46fa-a859-97b6332bb104', 'Extinwal Comércio e Manutenção de Equipamentos de Segurança Ltda', 'Extinwal Segurança Contra Incêndio', '61.458.742/0001-90', 'INMETRO 002145/2023', '(11) 3245-8800', NULL, 'contato@extinwal.com.br', 'Eng. Roberto Silva', NULL, 'São Paulo / SP', 't', NULL, '2026-08-18 12:31:11.484717+00', '2026-08-18 12:31:11.484717+00'),
('2679e734-1de8-4b57-8f94-c39eca667f0b', 'Kidde Brasil Manutenções e Soluções de Incêndio Ltda', 'Kidde Brasil Manutenções', '48.910.231/0001-05', 'INMETRO 001923/2025', '(19) 3887-9000', NULL, 'suporte@kidde.com.br', 'Marcos Vinicius', NULL, 'Campinas / SP', 't', NULL, '2026-08-18 12:31:11.484717+00', '2026-08-18 12:31:11.484717+00'),
('723fb210-388a-47ab-bacd-cfd9538cec58', 'Resmat Engenharia e Combate a Incêndio Ltda', 'Resmat Engenharia', '09.334.812/0001-78', 'INMETRO 003450/2024', '(21) 2590-4400', NULL, 'tecnico@resmat.com.br', 'Fabio Almeida', NULL, 'Rio de Janeiro / RJ', 't', NULL, '2026-08-18 12:31:11.484717+00', '2026-08-18 12:31:11.484717+00')
ON CONFLICT DO NOTHING;

-- Inserindo 2 registros em public.contratos...
INSERT INTO public.contratos ("id", "nome", "descricao", "ativo", "created_at") VALUES
('6ca3347b-1184-4743-afd7-2928a00ccd4f', 'SALOBO', 'Contrato Operacional Mina e Usina Salobo', 't', '2026-09-08 12:19:48.728128+00'),
('c21d2e1f-5930-4745-9afe-244131eb32d3', 'ONÇA PUMA', 'Contrato Operacional Usina Onça Puma', 't', '2026-09-08 12:19:48.728128+00')
ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT; -- Reativa validação de FK e triggers

-- FIM DO SCRIPT DE ESTRUTURA E USUÁRIOS
