# Relatório de Entrega: Correção de RLS, Login por Username e Exclusão Segura de Usuários

Este relatório documenta as modificações aplicadas para corrigir o erro de recursão infinita no RLS da tabela `usuarios`, viabilizar o login por username para usuários não autenticados e assegurar a exclusão completa das credenciais de autenticação no Supabase.

## Modificações Realizadas

### 1. Banco de Dados (Novas RPCs e Correção RLS)
* **Arquivo de Migração:** [20260610040000_fix_usuarios_rls_and_rpc.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610040000_fix_usuarios_rls_and_rpc.sql)
* **Alterações:**
  * Remoção da verificação `is_my_account_expired()` das políticas de RLS `User_View_Self` e `User_Update_Self` na tabela `public.usuarios` para eliminar o loop de consultas recursivas circulares.
  * Criação da função RPC `public.get_email_by_username(p_username text)` com `SECURITY DEFINER` para permitir que usuários não autenticados resolvam seu e-mail a partir do username.
  * Criação da função RPC `public.delete_user_by_admin(p_uid uuid)` com `SECURITY DEFINER` para permitir a exclusão de usuários das tabelas `public.usuarios` e `auth.users`.

### 2. Autenticação (Híbrida por Username)
* **Arquivo:** [supabaseAuth.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseAuth.ts)
* **Alteração:** Substituição da consulta direta à tabela `usuarios` pela chamada à função RPC `get_email_by_username`, que executa com privilégios elevados de banco de dados, permitindo a autenticação anônima por username sob as regras estritas de RLS.

### 3. CRUD de Usuários (Exclusão Segura)
* **Arquivo:** [supabaseDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseDb.ts)
* **Alteração:** Modificação da função `deleteUserProfileByAdmin` para invocar a função RPC `delete_user_by_admin`. Isso remove o usuário da base pública e do banco de credenciais de login (`auth.users`) simultaneamente.

---

## Script para Execução Imediata no Banco de Produção

Como as alterações envolvem estruturas de segurança internas da tabela `auth.users` e redefinição de políticas RLS, você deve executar o script a seguir no **SQL Editor** do painel da sua instância Supabase:

```sql
-- 1. CORREÇÃO DA RECURSÃO INFINITA (RLS)
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
```

---

## Verificação e Testes

### Compilação do Projeto
A validação de integridade do build foi concluída com sucesso:
```bash
npm.cmd run build
```
O build do Next.js gerou todas as páginas estáticas e dinâmicas perfeitamente, sem erros de TypeScript ou de vinculação.
