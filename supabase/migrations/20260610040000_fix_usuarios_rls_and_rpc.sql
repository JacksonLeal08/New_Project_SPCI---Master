-- Migration: 20260610040000_fix_usuarios_rls_and_rpc.sql
-- Descrição: Corrige a recursão infinita no RLS da tabela public.usuarios, 
-- adiciona a função RPC get_email_by_username para permitir login híbrido por username 
-- e adiciona a função RPC delete_user_by_admin para exclusão completa do usuário (auth e public).

-- 1. CORREÇÃO DA RECURSÃO INFINITA (RLS)
-- Removemos a verificação is_my_account_expired das políticas User_View_Self e User_Update_Self
-- para evitar consultas circulares recursivas que causam o erro 'infinite recursion detected'.

DROP POLICY IF EXISTS "User_View_Self" ON public.usuarios;
CREATE POLICY "User_View_Self"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);

DROP POLICY IF EXISTS "User_Update_Self" ON public.usuarios;
CREATE POLICY "User_Update_Self"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);

-- 2. FUNÇÃO RPC: get_email_by_username
-- Permite que o login híbrido busque o e-mail pelo username sem violar o RLS (SECURITY DEFINER).
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

-- 3. FUNÇÃO RPC: delete_user_by_admin
-- Permite que administradores excluam usuários tanto da tabela pública quanto da de autenticação (auth.users).
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
