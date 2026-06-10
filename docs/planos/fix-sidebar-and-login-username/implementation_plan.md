# Plano de Correção: Erro de Recursão RLS, Login Híbrido por Username e CRUD de Usuários

Este plano aborda a correção definitiva da recursão infinita no RLS da tabela `usuarios` (que impede a alteração de cargo/status do técnico), o ajuste no login para permitir busca por username sem violação de RLS e o aprimoramento do CRUD de usuários com a exclusão completa das credenciais de autenticação.

## User Review Required

> [!IMPORTANT]
> **Adição de Novas Funções de Banco (RPC):**
> * A busca de e-mail por username e a exclusão completa de usuários agora serão realizadas via funções seguras de banco de dados (`SECURITY DEFINER`). Isso garante que os fluxos funcionem perfeitamente mesmo sob as restrições estritas do RLS e da criptografia.

> [!NOTE]
> **Correção da Recursão RLS:**
> Simplificamos as políticas `User_View_Self` e `User_Update_Self` na tabela `public.usuarios`, removendo a verificação redundante `is_my_account_expired()`. Isso quebra o ciclo recursivo infinito e resolve o erro `infinite recursion detected` ao atualizar usuários.

## Proposed Changes

---

### Componente: Banco de Dados (Supabase Migrations)

#### [NEW] [20260610040000_fix_usuarios_rls_and_rpc.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610040000_fix_usuarios_rls_and_rpc.sql)
- Criar migração SQL contendo:
  1. Recriação das políticas RLS `User_View_Self` e `User_Update_Self` na tabela `public.usuarios` sem a cláusula de expiração recursiva.
  2. Definição da função RPC `public.get_email_by_username(p_username text)` com `SECURITY DEFINER` para permitir que usuários não autenticados obtenham o e-mail de login a partir do username de forma segura.
  3. Definição da função RPC `public.delete_user_by_admin(p_uid uuid)` com `SECURITY DEFINER` para permitir que administradores/desenvolvedores excluam contas de usuários (tanto de `public.usuarios` quanto de `auth.users`).

---

### Componente: Autenticação (Supabase Auth)

#### [MODIFY] [supabaseAuth.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseAuth.ts)
- Atualizar `signInWithEmailOrUsername` para chamar a nova função RPC `get_email_by_username` em vez de consultar diretamente a tabela `usuarios` com o cliente anônimo.

---

### Componente: CRUD de Usuários (Database Operations)

#### [MODIFY] [supabaseDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseDb.ts)
- Atualizar a função `deleteUserProfileByAdmin` para chamar a função RPC `delete_user_by_admin` do Supabase, passando o `uid` correspondente.

---

## Verification Plan

### Automated Tests
- Executar `npm.cmd run build` para garantir que o projeto compila sem erros.

### Manual Verification
1. **Verificação de Login por Username:** Tentar efetuar login com o username do usuário recém-criado (ex: `jfleal` ou `@jfleal`) e verificar que a autenticação é efetuada corretamente sem o erro de "Nome de usuário não cadastrado".
2. **Verificação de Alteração de Cargo/Status:** Efetuar login com um perfil administrador, acessar Configurações -> Controle de Usuários e alterar o status ou cargo de um técnico. Certificar-se de que a operação é concluída com sucesso sem o erro de recursão infinita.
3. **Verificação de Exclusão Completa:** Excluir um usuário de teste através da interface de configurações e verificar que seu registro foi removido de `public.usuarios` e que ele não consegue mais efetuar login no sistema.
