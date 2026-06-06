# Plano de Implementação: Melhorias Robustas de Arquitetura SPCI

## Overview
Este plano descreve o detalhamento técnico e a sequência de tarefas para a aplicação de melhorias robustas de sincronização, tempo real, mídia offline e visibilidade de fila de sincronismo no SPCI.

**Project Type**: WEB

---

## Success Criteria
- [ ] Atualização automática dos indicadores e painéis de vistorias recentes em menos de 1.5s após atualização por outro dispositivo (Supabase Realtime).
- [ ] Possibilidade de anexar fotos durante vistorias offline com fila resiliente de upload local no IndexedDB.
- [ ] Painel HUD com contadores reais de tarefas pendentes e falhas de sincronia.
- [ ] Leitura instantânea de QR Code com busca local em IndexedDB (~0ms de latência perceptível).

---

## Tech Stack
- **Framework**: Next.js (App Router, React)
- **Database/Backend**: Supabase (Realtime, Storage, Client SDK)
- **Offline Storage**: IndexedDB (nativo com idb helper)
- **Animations/UI**: Motion (motion/react), Tailwind CSS v4, Premium HUD Alert

---

## File Structure
- [NEW] [mediaQueue.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/mediaQueue.ts) - Gerenciador de fila offline de mídias.
- [NEW] [SyncStatusPanel.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/SyncStatusPanel.tsx) - Painel HUD de sincronização.
- [MODIFY] [SpciContext.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/context/SpciContext.tsx) - Integração com Supabase Realtime e despacho de novas filas.
- [MODIFY] [QrCameraScanner.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/QrCameraScanner.tsx) - Leitura prioritária local do IndexedDB.

---

## Task Breakdown

### Tarefa 1: Integração Supabase Realtime
- **Agente**: `backend-specialist` / `frontend-specialist`
- **Skills**: `nextjs-react-expert`, `database-design`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Conexão do Supabase Client.
- **OUTPUT**: Assinaturas em tempo real nos canais de `inspecoes_realizadas` e `ativos_extintores` atualizando o estado global do React e IndexedDB local.
- **VERIFY**: Realizar update direto no painel do Supabase e validar se o front-end reflete o valor sem reload.

### Tarefa 2: Fila Offline de Mídias (Fotos)
- **Agente**: `backend-specialist` / `frontend-specialist`
- **Skills**: `nodejs-best-practices`, `nextjs-react-expert`
- **Priority**: P1
- **Dependencies**: Nenhuma
- **INPUT**: Captura de imagem de vistoria (em Base64/Blob).
- **OUTPUT**: Salvamento da imagem no IndexedDB se offline, com upload para o Supabase Storage ao recuperar rede.
- **VERIFY**: Desconectar rede, simular vistoria com foto, reconectar e ver a foto subir no bucket do Supabase.

### Tarefa 3: Painel HUD HUD de Sincronia
- **Agente**: `frontend-specialist`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Priority**: P2
- **Dependencies**: Nenhuma
- **INPUT**: Dados da `SyncQueue`.
- **OUTPUT**: Componente `SyncStatusPanel` interativo exibindo tarefas pendentes, falhas e botões de comando.
- **VERIFY**: Abrir o painel, ver a listagem das filas pendentes e acionar botões de forçar envio.

### Tarefa 4: Otimização de Leitura QR Code
- **Agente**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: P2
- **Dependencies**: Nenhuma
- **INPUT**: Leitura do código de barras/QR pelo scanner.
- **OUTPUT**: Busca local instantânea no IndexedDB para abrir o formulário sem lag.
- **VERIFY**: Escanear ativo offline e checar se o drawer ou modal correspondente abre na hora.

---

## Phase X: Verification
- [ ] Compilação limpa (`npx tsc --noEmit`)
- [ ] Lint OK (`npm run lint`)
- [ ] Sem violação de cores restritas (sem violet/purple hex codes)
- [ ] Teste manual de todos os fluxos
