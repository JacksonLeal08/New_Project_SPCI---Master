-- Migração: Política de Auto-Atualização de Perfil para Usuários Comuns
-- Autor: Arquiteto de Banco de Dados Master & Especialista Supabase
-- Data: 2026-06-05
--
-- Descrição:
-- Permite que usuários com role 'Usuário' atualizem campos pessoais do seu
-- próprio perfil (logo_url, name, photo_url), sem poder alterar campos de
-- segurança (role, status, data_expiracao, email, user_name).
-- A proteção é feita via trigger BEFORE UPDATE que reverte quaisquer
-- tentativas de alterar campos restritos.


-- ============================================================================
-- 1. TRIGGER: Proteção de Campos Restritos (Defence-in-Depth)
-- ============================================================================
-- Impede que qualquer usuário não-Admin/Dev altere campos de governança
-- no seu próprio registro via UPDATE direto.

CREATE OR REPLACE FUNCTION public.protect_user_restricted_fields()
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
BEGIN
    -- Se não há usuário autenticado (ex: migração backend), permite tudo
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    v_role := public.get_my_role();

    -- Devs e Admins podem alterar o que quiserem (já controlado por RLS)
    IF v_role IN ('Desenvolvedor', 'Administrador') THEN
        RETURN NEW;
    END IF;

    -- Para Usuários comuns: Reverte silenciosamente qualquer alteração em campos restritos
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.data_expiracao := OLD.data_expiracao;
    NEW.email := OLD.email;
    NEW.user_name := OLD.user_name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS tr_usuarios_protect_fields ON public.usuarios;

-- Cria trigger BEFORE UPDATE (executa ANTES do check_developer_immunity)
CREATE TRIGGER tr_usuarios_protect_fields
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.protect_user_restricted_fields();


-- ============================================================================
-- 2. POLÍTICA RLS: Usuário pode atualizar SEU PRÓPRIO perfil
-- ============================================================================

-- Remove política antiga se existir
DROP POLICY IF EXISTS "User_Update_Self" ON public.usuarios;

-- Permite que qualquer autenticado atualize apenas o próprio registro
CREATE POLICY "User_Update_Self"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
    AND NOT (SELECT public.is_my_account_expired())
)
WITH CHECK (
    id = auth.uid()
    AND NOT (SELECT public.is_my_account_expired())
);
