# Plano de Implementação: Indicadores de Inspeções, Edição em Massa e Fluxo de Logout Premium

## Overview
Este plano detalha o desenvolvimento técnico de três grandes frentes de melhoria no SPCI:
1. Painel de **Inspeções no Período** posicionado no inventário de Extintores.
2. Ferramenta de **Edição em Massa** via importação/exportação de planilhas.
3. Novo **Fluxo de Logout Premium** com botão na Sidebar, modal de confirmação desfocado e página interativa com estilo industrial e redirecionamento de 3s.

**Project Type**: WEB

---

## Success Criteria
- [ ] Renderizar o painel "INSPEÇÕES NO PERÍODO" com visual moderno, glassmorphism e cores do tema com filtro interativo na listagem.
- [ ] Exportação da base atual de extintores em formato `.xlsx` (Excel) e `.csv` pré-preenchida com os dados atuais.
- [ ] Cockpit de Edição em Massa interativo que compara os dados da planilha importada com a base local/Supabase baseando-se no `numero_patrimonio`.
- [ ] Bloqueio absoluto e exibição de erro na linha se houver alteração nos campos restritos: `numero_patrimonio`, `chassi` ou `selo_inmetro`.
- [ ] Realce visual das células com valores modificados ("Antes: X ➔ Novo: Y") na tabela de revisão e indicação da quantidade de alterações no HUD.
- [ ] Botão "SAIR DO SISTEMA" na base da Sidebar de forma sutil e elegante.
- [ ] Modal de Confirmação com desfoque de fundo (`backdrop-blur-md`) e botões de cancelar/confirmar.
- [ ] Nova rota `/logout` com animação industrial premium de finalização de sessão e progresso automático de 3s antes do redirecionamento para o `/login`.

---

## Tech Stack
- **Framework**: Next.js (App Router, React)
- **Library**: `xlsx` (parsing e geração de planilhas no client-side)
- **Database/Backend**: Supabase Auth (signOut) & database queue
- **Animations/UI**: Motion (motion/react), Tailwind CSS v4, Lucide React icons

---

## File Structure
- [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%2520Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/extintores/page.tsx) - Integração visual das inspeções e lógica da Edição em Massa.
- [MODIFY] [Sidebar.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%2520Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/Sidebar.tsx) - Botão de logout na base do menu.
- [MODIFY] [layout.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%2520Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/layout.tsx) - Modal de confirmação com desfoque.
- [NEW] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%2520Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/logout/page.tsx) - Rota pública para a animação de saída.
- [NEW] [LogoutClient.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%2520Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/logout/LogoutClient.tsx) - Interface interativa de finalização de sessão.

---

## Task Breakdown

### Tarefa 1: Bloco de Indicadores de Inspeções no Período
- **Agente**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: `complianceLogs` do contexto `useSpci()`.
- **OUTPUT**: Bloco visual de "INSPEÇÕES NO PERÍODO" renderizado na tela de extintores com filtros interativos.
- **VERIFY**: Clicar nos cards e checar se os contadores batem com os logs e se a tabela é filtrada corretamente.

### Tarefa 2: Download da Base Atual (Excel / CSV)
- **Agente**: `backend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: P1
- **Dependencies**: Nenhuma
- **INPUT**: Lista completa atual de `extintores`.
- **OUTPUT**: Botões de download gerando arquivos `.xlsx` e `.csv` estruturados e pré-preenchidos.
- **VERIFY**: Baixar a planilha e validar a presença de todos os registros atuais.

### Tarefa 3: Cockpit de Edição em Massa e Validador Cockpit
- **Agente**: `backend-specialist` / `frontend-specialist`
- **Skills**: `clean-code`, `frontend-design`
- **Priority**: P1
- **Dependencies**: Tarefa 2
- **INPUT**: Planilha editada enviada via Upload.
- **OUTPUT**: Comparador lógico por `numero_patrimonio`, realces coloridos de diferenças, erros em alterações de chassi/selo/patrimônio, e HUD.
- **VERIFY**: Fazer upload de planilha contendo modificações, validar as cores de destaque e erros.

### Tarefa 4: Gravação das Edições em Massa
- **Agente**: `backend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: P1
- **Dependencies**: Tarefa 3
- **INPUT**: Registros válidos alterados no Cockpit.
- **OUTPUT**: Execução do loop de atualização via `updateAsset`.
- **VERIFY**: Confirmar gravação, verificar se a tabela e o Supabase foram atualizados.

### Tarefa 5: Botão de Sair na Sidebar e Confirmação no Layout
- **Agente**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Priority**: P2
- **Dependencies**: Nenhuma
- **INPUT**: Evento de clique do usuário.
- **OUTPUT**:
  - Botão de logout na base do Sidebar.
  - Modal de confirmação desfocado (`backdrop-blur-md`) gerenciado no layout do dashboard.
- **VERIFY**: Clicar em logout, cancelar no modal (confirma que nada ocorre) e confirmar (confirma redirecionamento).

### Tarefa 6: Rota `/logout` com Animação de Saída
- **Agente**: `frontend-specialist` / `backend-specialist`
- **Skills**: `frontend-design`, `nextjs-react-expert`
- **Priority**: P2
- **Dependencies**: Tarefa 5
- **INPUT**: Confirmação de saída do usuário.
- **OUTPUT**: Rota pública `/logout` que limpa a sessão Supabase/cookies e renderiza contagem regressiva de 3s com layout industrial premium, seguido de redirecionamento automático para `/login`.
- **VERIFY**: Completar o logout e verificar se a sessão foi terminada e se o login é a tela final.

---

## Phase X: Verification
- [ ] Compilação limpa (`npx tsc --noEmit`)
- [ ] Lint OK (`npm run lint`)
- [ ] Sem violação de cores restritas (sem violet/purple hex codes)
- [ ] Teste manual de todos os fluxos de edição, indicadores e logout
