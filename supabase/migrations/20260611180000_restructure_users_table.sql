-- Migração: Reestruturação Completa da Tabela de Usuários (CRUD & Onboarding)
-- Data: 2026-06-11
-- Descrição: Recria do zero a tabela public.usuarios com os campos nome_completo, 
-- telefone_whatsapp, perfil_acesso e status_conta, atualizando triggers, RLS e RPCs.

-- ============================================================================
-- 1. LIMPEZA DE ESTRUTURAS EXISTENTES
-- ============================================================================

-- Remove triggers antigos para evitar erros de dependência
DROP TRIGGER IF EXISTS tr_usuarios_timestamp ON public.usuarios CASCADE;
DROP TRIGGER IF EXISTS tr_usuarios_imunidade ON public.usuarios CASCADE;
DROP TRIGGER IF EXISTS tr_permissoes_modulos_timestamp ON public.permissoes_modulos CASCADE;

-- Remove tabelas existentes (cascade)
DROP TABLE IF EXISTS public.permissoes_modulos CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- ============================================================================
-- 2. CRIAÇÃO DAS TABELAS
-- ============================================================================

-- Tabela: public.usuarios
CREATE TABLE public.usuarios (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    user_name TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    telefone_whatsapp TEXT NOT NULL,
    photo_url TEXT,
    logo_url TEXT,
    perfil_acesso public.user_role NOT NULL DEFAULT 'Usuário'::public.user_role,
    status_conta TEXT NOT NULL DEFAULT 'Ativo' CHECK (status_conta IN ('Ativo', 'Inativo/Suspenso')),
    data_expiracao TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Validações de formato de e-mail e comprimento de nome de usuário
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    CONSTRAINT check_username_length CHECK (char_length(user_name) >= 3)
);

-- Tabela: public.permissoes_modulos
CREATE TABLE public.permissoes_modulos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
    visualizar BOOLEAN NOT NULL DEFAULT false,
    interagir BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restrição de unicidade para evitar duplicatas por usuário e módulo
    UNIQUE(usuario_id, modulo_id)
);

-- ============================================================================
-- 3. FUNÇÕES AUXILIARES E RPCs
-- ============================================================================

-- Atualiza a função que obtém o perfil de acesso ativo
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT perfil_acesso FROM public.usuarios WHERE id = auth.uid();
$$;

-- Verifica se a conta do usuário está inativa/suspensa
CREATE OR REPLACE FUNCTION public.is_my_account_suspended()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(status_conta = 'Inativo/Suspenso', false) FROM public.usuarios WHERE id = auth.uid();
$$;

-- Função RPC: get_user_permissions (atualizada para buscar da nova estrutura)
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_uid UUID)
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

-- Função RPC: get_email_by_username (atualizada)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email text;
BEGIN
    SELECT email INTO v_email FROM public.usuarios WHERE LOWER(user_name) = LOWER(p_username) LIMIT 1;
    RETURN v_email;
END;
$$;

-- ============================================================================
-- 4. TIMESTAMPS AUTOMÁTICOS (TRIGGERS)
-- ============================================================================

-- Trigger para tabela public.usuarios
CREATE TRIGGER tr_usuarios_timestamp
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- Trigger para tabela public.permissoes_modulos
CREATE TRIGGER tr_permissoes_modulos_timestamp
    BEFORE UPDATE ON public.permissoes_modulos
    FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- ============================================================================
-- 5. TRIGGER DE IMUNIDADE E INTEGRIDADE DO DESENVOLVEDOR (ATUALIZADA)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_developer_immunity()
RETURNS trigger AS $$
DECLARE
    v_executing_user_role public.user_role;
BEGIN
    -- Ignora se executado fora do contexto API (ex: migrations locais diretas no psql)
    IF auth.uid() IS NULL THEN
        RETURN COALESCE(new, old);
    END IF;

    v_executing_user_role := public.get_my_role();

    -- DELETE: Apenas outro Desenvolvedor pode excluir contas do tipo Desenvolvedor
    IF (tg_op = 'DELETE') THEN
        IF old.perfil_acesso = 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Apenas Desenvolvedores podem excluir contas do tipo Desenvolvedor.';
            END IF;
        END IF;
        RETURN old;
    END IF;

    -- UPDATE: Restrições de alteração de cargo e dados
    IF (tg_op = 'UPDATE') THEN
        -- Protege Desenvolvedores de modificações por terceiros
        IF old.perfil_acesso = 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Modificações em contas de Desenvolvedor são restritas.';
            END IF;
            
            -- Impede rebaixamento
            IF new.perfil_acesso != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Não é permitido rebaixar o perfil de um Desenvolvedor.';
            END IF;
        END IF;

        -- Impede que não-Desenvolvedores promovam alguém para Desenvolvedor
        IF new.perfil_acesso = 'Desenvolvedor'::public.user_role AND old.perfil_acesso != 'Desenvolvedor'::public.user_role THEN
            IF v_executing_user_role != 'Desenvolvedor'::public.user_role THEN
                RAISE EXCEPTION 'Imunidade de Segurança: Apenas Desenvolvedores podem designar novos Desenvolvedores.';
            END IF;
        END IF;
        
        RETURN new;
    END IF;

    RETURN COALESCE(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER tr_usuarios_imunidade
    BEFORE UPDATE OR DELETE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.check_developer_immunity();

-- ============================================================================
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_modulos ENABLE ROW LEVEL SECURITY;

-- Políticas para: public.usuarios
CREATE POLICY "User_View_Self" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "User_Update_Self" ON public.usuarios FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Dev_All_Usuarios" ON public.usuarios FOR ALL TO authenticated USING (public.get_my_role() = 'Desenvolvedor'::public.user_role) WITH CHECK (public.get_my_role() = 'Desenvolvedor'::public.user_role);
CREATE POLICY "Admin_Manage_Usuarios" ON public.usuarios FOR ALL TO authenticated USING (public.get_my_role() = 'Administrador'::public.user_role AND perfil_acesso != 'Desenvolvedor'::public.user_role) WITH CHECK (public.get_my_role() = 'Administrador'::public.user_role AND perfil_acesso != 'Desenvolvedor'::public.user_role);

-- Políticas para: public.permissoes_modulos
CREATE POLICY "Dev_All_Permissoes" ON public.permissoes_modulos FOR ALL TO authenticated USING (public.get_my_role() = 'Desenvolvedor'::public.user_role) WITH CHECK (public.get_my_role() = 'Desenvolvedor'::public.user_role);
CREATE POLICY "User_View_Own_Permissoes" ON public.permissoes_modulos FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "Admin_Manage_Permissoes" ON public.permissoes_modulos FOR ALL TO authenticated USING (public.get_my_role() = 'Administrador'::public.user_role AND (SELECT perfil_acesso FROM public.usuarios WHERE id = usuario_id) != 'Desenvolvedor'::public.user_role) WITH CHECK (public.get_my_role() = 'Administrador'::public.user_role AND (SELECT perfil_acesso FROM public.usuarios WHERE id = usuario_id) != 'Desenvolvedor'::public.user_role);
