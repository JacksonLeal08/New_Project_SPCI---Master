# Plano de Implementação: Correção de Erro de Schema no Login (Supabase Auth)

Este plano visa corrigir o erro "Database error querying schema" (traduzido como "Esquema de consulta por erro de banco de dados") que impede o acesso de novos usuários convidados via credenciais personalizadas.

## User Review Required

> [!IMPORTANT]
> **Ação Manual Necessária no Supabase Cloud:**
> Como não possuímos acesso direto com chaves administrativas de superusuário (Service Role Key) para modificar a tabela `auth.users` em produção automaticamente a partir deste ambiente local, o usuário precisará copiar um script SQL gerado e executá-lo manualmente no **SQL Editor** do painel do Supabase. Isso corrigirá imediatamente os usuários afetados (como `iderlandiagm@gmail.com`) e atualizará a função no banco em nuvem.

## Proposed Changes

---

### Componente: Banco de Dados Supabase (Migrações)

#### [NEW] [20260610030000_fix_auth_users_null_tokens.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610030000_fix_auth_users_null_tokens.sql)
- Criar nova migração que atualiza as colunas de token nulas de `auth.users` para strings vazias (`''`).
- Redefinir a função `public.create_new_user` para que novas inserções em `auth.users` definam esses campos com string vazia de forma explícita.

#### [MODIFY] [20260603094000_enterprise_security.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260603094000_enterprise_security.sql)
- Atualizar a declaração original da função `public.create_new_user` de forma que o script original do projeto esteja corrigido para novas instalações.

---

## Verification Plan

### Manual Verification
1. **Script SQL de Correção:** Executar o script SQL proposto no Supabase SQL Editor e validar o sucesso da execução.
2. **Teste de Login:** Tentar efetuar login com o usuário `iderlandiagm@gmail.com` na aplicação local (ou produção) e verificar se o erro "Esquema de consulta por erro de banco de dados" foi totalmente sanado.
3. **Teste de Novo Cadastro:** Criar um novo usuário temporário via painel de configurações e verificar se o mesmo consegue efetuar login sem falhas de banco.
