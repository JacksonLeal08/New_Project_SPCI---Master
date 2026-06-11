# Plano de Correção e Implementação: CRUD de Desenvolvedor, Restrição de Logs e Permissões Modulares

Este plano aborda a correção definitiva da visualização de usuários pelo perfil do Desenvolvedor, a exclusão definitiva do item "Logs do Sistema" do menu lateral para perfis não desenvolvedores, e a introdução da lógica de seleção de permissões modulares (abas e elementos) no momento do cadastro de novos colaboradores pelo Desenvolvedor.

## User Review Required

> [!IMPORTANT]
> **Permissões Modulares no Banco de Dados:**
> * Utilizaremos a tabela `public.permissoes_modulos` e a tabela `public.modulos` (já mapeadas na estrutura inicial) para gravar e carregar as permissões do usuário em tempo de execução.
> * Criaremos a função RPC `public.get_user_permissions(p_uid uuid)` de forma segura (`SECURITY DEFINER`) para ler as permissões e retorná-las como um array de strings (ex: `['dashboard', 'extintores']`).

> [!NOTE]
> **Retrocompatibilidade de Módulos:**
> * Caso um usuário existente não possua registros de permissão gravados na tabela `public.permissoes_modulos`, o front-end concederá acesso total aos módulos padrão de forma implícita, evitando bloqueios de acesso após a aplicação da atualização.
> * O perfil de `Desenvolvedor` sempre terá acesso completo a todos os módulos, independentemente das flags configuradas.

## Proposed Changes

---

### Componente: Banco de Dados (Supabase Migrations)

#### [NEW] [20260610050000_seed_modules_and_permissions.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610050000_seed_modules_and_permissions.sql)
* Criar arquivo de migração contendo:
  1. Cadastro e inserção inicial (seeding) dos 8 módulos principais na tabela `public.modulos`: `dashboard`, `extintores`, `hidrantes`, `sinalizacao`, `iluminacao`, `bombas`, `ronda` e `alerts`.
  2. Nova função RPC `public.get_user_permissions(p_uid uuid)` que retorna a lista de módulos aos quais o usuário tem permissão para visualizar.
  3. Atualização da função RPC `public.create_new_user` para aceitar um parâmetro opcional `p_allowed_modules text[]` e inserir as permissões modulares de forma correspondente.
  4. Recriação e reforço das políticas de RLS na tabela `public.usuarios` para garantir que o perfil `Desenvolvedor` não sofra loops de recursão ao consultar todos os usuários.

---

### Componente: Queries e Banco de Dados (Supabase Operations)

#### [MODIFY] [supabaseDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseDb.ts)
* Adicionar a interface `SystemModule` e a função `getUserPermissions(uid: string)` chamando a nova RPC `get_user_permissions`.

---

### Componente: Gerenciamento de Estado (SPCI Context)

#### [MODIFY] [SpciContext.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/context/SpciContext.tsx)
* Modificar a tipagem do callback `handleInviteUser` para suportar o parâmetro opcional `allowedModules?: string[] | null`.
* Na inicialização da sessão e login (`initAuth` e `handleCredentialsLogin`), carregar as permissões modulares do usuário chamando `getUserPermissions(uid)` e anexá-las à propriedade `permissions` do objeto `userProfile`.

---

### Componente: Interface do Usuário (Sidebar & Configurações)

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/Sidebar.tsx)
* Filtrar os itens de menu lateral (`navItems`) baseando-se no cargo (`Desenvolvedor` sempre vê tudo) e nas permissões mapeadas in `userProfile?.permissions`.
* Ajustar o texto do cargo no cabeçalho do menu lateral para mostrar `'DEV'` para Desenvolvedores.

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/configuracoes/page.tsx)
* Adicionar o estado `selectedModules` e renderizar um grid com checkboxes de módulos no formulário de convite do colaborador apenas se o criador for do perfil `Desenvolvedor`.
* Garantir que todas as opções de cargo (incluindo `"Desenvolvedor"`) fiquem disponíveis na tabela CRUD caso o usuário logado seja um `Desenvolvedor`.
* Passar o array de módulos selecionados como argumento para `handleInviteUser` na finalização do cadastro.

---

## Verification Plan

### Automated Tests
* Executar `npm run build` para validar que todas as páginas Next.js continuam compilando normalmente.

### Manual Verification
1. **Visualização do Menu Lateral (Logs do Sistema):** Entrar com a conta de Técnico ou Administrador e certificar-se de que o menu "Logs do Sistema" NÃO é exibido.
2. **Cadastro com Permissões Específicas:** Logar como Desenvolvedor (`jackson602@gmail.com`), cadastrar um novo usuário Técnico desmarcando módulos específicos (ex: desmarcar `Casa de Bombas` e `Sinalização NBR`).
3. **Validação do Perfil Criado:** Logar com as credenciais do novo Técnico criado e verificar que o menu lateral exibe apenas as abas liberadas na etapa de cadastro.
4. **CRUD do Desenvolvedor:** Confirmar que a listagem de usuários e as ações de edição e exclusão estão operantes para o Desenvolvedor.
