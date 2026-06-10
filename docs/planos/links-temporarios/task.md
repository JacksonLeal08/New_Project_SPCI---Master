# Checklist de Implementação - SPCI (Links Temporários e Avisos Premium)

- [x] 1. Remocão de OAuth Google e Conexão Google DB
  - [x] Remover botões e lógicas de login Google do `LoginClient.tsx`
  - [x] Remover referências no `SpciContext.tsx`
  - [x] Remover indicador visual "Google DB Conectante" da sidebar (`Sidebar.tsx`)

- [x] 2. Banco de Dados (Supabase)
  - [x] Criar migration `20260610010000_shared_sessions_schema.sql` com a tabela `shared_sessions` e funções `validate_shared_token`
  - [x] Criar migration `20260610020000_public_rls_policies.sql` com políticas RLS flexíveis utilizando `current_request_has_valid_token()`
  - [x] Aplicar migrations no Supabase (Necessário aplicar manualmente via SQL Editor no Supabase remoto)

- [x] 3. Segurança e Middleware (Roteamento)
  - [x] Atualizar `middleware.ts` para validar token da URL/cookie e gerenciar o cookie `spci_shared_token`
  - [x] Garantir bloqueio de acesso anônimo sem token ou com token inválido na rota `/inspecao`

- [x] 4. Lógica de Revogação de Sessão (Logout)
  - [x] Ajustar `handleLogout` no `SpciContext.tsx` para marcar tokens de compartilhamento ativos como `revoked` ao deslogar

- [x] 5. Cockpit de Despacho (Web Dashboard)
  - [x] Implementar geração de token e links em `app/(dashboard)/ronda/page.tsx`
  - [x] Criar botão de encerramento manual dos acessos despachados
  - [x] Adicionar ícone de Informações e Modal Premium WARNING com as regras de expiração (Framer Motion)

- [x] 6. Portal Técnico Móvel (Mobile App)
  - [x] Configurar injeção do cabeçalho `x-shared-token` com o token temporário no cliente Supabase em `app/inspecao/page.tsx` e `app/inspecao/[id]/page.tsx`
  - [x] Adicionar Banner Persistente de Alerta (Warning) em tons de âmbar no topo do formulário no mobile (com botão Fechar e botão de Informação)
  - [x] Implementar o Bottom Sheet / Modal móvel com o texto didático explicativo de expiração e incentivo a cadastro próprio

- [x] 7. Homologação, Responsividade & PWA
  - [x] Validar responsividade total das tabelas, sidebar retrátil e formulários móveis
  - [x] Integrar tratamento do Service Worker para requisições offline no `public/sw.js`
  - [x] Adicionar banner de instalação A2HS
  - [x] Testar builds estáticas com `npx.cmd tsc --noEmit` e `npm.cmd run lint`
