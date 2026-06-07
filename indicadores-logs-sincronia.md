# Plano de Implementação: Sincronia de Indicadores, Timestamp de Sincronização, Auditoria de Logs Premium e Interatividade HUD (Versão Atualizada)

Este plano descreve o detalhamento técnico para alinhar os indicadores do painel corporativo (incluindo a categoria "Bombas" omitida), adicionar metadados de data/hora de última sincronização na tela de Extintores, criar uma página de auditoria de logs robusta com filtros e downloads, e adicionar navegação/filtragem interativa aos cards de KPI do dashboard e da página de Extintores, além de reorganizar os cards de ativos de Extintores, remover o botão redundante de cadastro e adicionar ícones de classificação de incêndio relevantes.

---

## User Review Required

> [!IMPORTANT]
> 1. **Geração de Logs por Triggers**: Adotaremos triggers em nível de banco de dados (Supabase) para rastrear de forma 100% resiliente qualquer criação, edição ou exclusão de ativos, bem como registros de vistorias (inspeções), inclusive em cenários offline que sincronizam posteriormente.
> 2. **Inclusão da Categoria "Bombas"**: Corrigiremos os KPIs do Dashboard principal para incluir as bombas nos cálculos de conformidade. As bombas com status "Manutenção Req." serão classificadas como alertas críticos (vencidos).
> 3. **Página de Tratamento de Alertas Críticos**: Criaremos a nova rota `/alertas-criticos` para gerenciar os ativos vencidos de todas as categorias. Ela exibirá sugestões detalhadas de ações corretivas baseadas nas normas técnicas brasileiras (NBRs) e fornecerá atalhos rápidos para tratamento.
> 4. **Filtragem Interativa na Tela de Extintores**: Adicionaremos estado de filtragem na tela de Extintores. Ao clicar em "Conformes", "Vencidos" ou "Manutenção / A Vencer", a lista de ativos será refinada dinamicamente, oferecendo feedback visual premium de qual filtro está ativo.
> 5. **Restilização Responsiva e Limpeza do Card de Ativos**:
>    - Dividiremos a fileira de botões de ação em um layout responsivo de duas fileiras: Fileira 1 com as ações primárias (**Inspecionar** e **Editar**) e Fileira 2 com as ações secundárias/apoio (**Histórico**, **Alerta** e **Excluir**).
>    - Removeremos limites rígidos de largura no texto do local (como `max-w-[80px]`), aplicando flexbox dinâmico com reticências (`truncate`).
>    - Filtraremos metadados técnicos do banco (como `qr_code_hash` e `statusConformidade`) para que não poluam a caixa de "Campos Auto-Modelados IA".
> 6. **Remoção de Botão Redundante**: Removeremos o botão vermelho `+ NOVO EXTINTOR` posicionado ao lado da barra de pesquisa no cabeçalho do Inventário, uma vez que a barra superior já possui o botão de cadastro corporativo.
> 7. **Ícones Educativos das Classes de Extinção (NBR 12962)**:
>    - Adicionaremos ícones/emojis dinâmicos ao lado do modelo do extintor para identificar visualmente seu agente extintor:
>      - `💧 Água (AP)`: Classe A (Papel, Madeira, Tecido).
>      - `💨 Pó Químico (PQS)`: Classes A, B, C (Líquidos Inflamáveis e Equipamentos Elétricos).
>      - `⚡ Gás Carbônico (CO2)`: Classes B, C (Equipamentos Elétricos Energizados sem deixar resíduos).

---

## Open Questions

> [!IMPORTANT]
> 1. Os logs de auditoria devem ficar visíveis para todos os usuários do sistema ou restritos apenas a administradores e desenvolvedores?
> 2. A exportação em PDF deve conter gráficos visuais das atividades ou uma listagem tabular limpa e formal das ações com cabeçalho da empresa?
> 3. Para o recurso de "Compartilhar dados" de log, gostaria que integrássemos com a Web Share API (permitindo enviar para WhatsApp/Telegram no celular e copiar link no desktop) ou um modal customizado?

---

## Proposed Changes

Abaixo estão divididos os componentes que sofrerão alteração:

### 1. Banco de Dados & Infraestrutura (Supabase SQL)

#### [NEW] [20260607100000_audit_logs.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260607100000_audit_logs.sql)
- Criação da tabela `public.logs_auditoria` com os campos: `id`, `usuario_id`, `usuario_nome`, `usuario_email`, `acao`, `tipo_ativo`, `patrimonio`, `detalhes` e `created_at`.
- Habilitação de RLS na tabela `public.logs_auditoria` permitindo select e insert para usuários autenticados.
- Criação de trigger PostgreSQL `tr_ativos_extintores_audit`, `tr_assets_audit` e `tr_inspecoes_realizadas_audit` para registrar automaticamente no banco de dados qualquer inserção, edição ou exclusão de ativos e inspeções.

---

### 2. Contexto do React (Estado e offline-first)

#### [MODIFY] [indexedDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/indexedDb.ts)
- Elevar a versão do banco IndexedDB `DB_VERSION = 2` e adicionar o object store `'audit_logs'` para persistência offline de logs de auditoria.

#### [MODIFY] [supabaseDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseDb.ts)
- Adicionar o tratamento da categoria `'audit_logs'` em `getNormalizedCategory` e `saveAssetToDb` para suportar o sincronismo via fila offline `SyncQueue` caso um log gerado no cliente falhe por falta de rede.

#### [MODIFY] [SpciContext.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/context/SpciContext.tsx)
- Adicionar o estado `lastSyncTime` (Date ou null) e o estado `auditLogs` (array).
- Atualizar `lastSyncTime = new Date()` ao finalizar com sucesso a função `syncWithRealDatabase`.
- Carregar `audit_logs` do IndexedDB na inicialização e sincronizá-lo com o Supabase durante o refresh em `syncWithRealDatabase`.
- Expor uma função auxiliar `logSystemAction(action, assetType, patrimonio, details)` que insere logs localmente e no banco de dados (ex: logs de LOGIN e LOGOUT).

---

### 3. Painel Principal (Dashboard & KPIs)

#### [MODIFY] [dashboard/page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/dashboard/page.tsx)
- Incluir `bombas` em `totalAssets`.
- Adicionar bombas com status `'Manutenção Req.'` no cálculo de `totalVencidos` (pelo alto risco operacional de uma bomba inativa).
- Incluir bombas no array `allAssets` e `assetsSelectOptions` para que fiquem disponíveis no dropdown de "QR Ronda de Campo" e no Mapa Térmico D3 de Zonas de Risco.
- Adicionar interação de clique no card de **Alertas Críticos / Vencidos** redirecionando o usuário para a rota `/alertas-criticos` de forma dinâmica.

---

### 4. Tratamento de Alertas Críticos

#### [NEW] [alertas-criticos/page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/alertas-criticos/page.tsx)
- Página premium de resolução e visualização de alertas críticos vencidos de todas as categorias.
- Listagem dos ativos que necessitam de intervenção imediata (vencidos, com falhas de carga, faltantes ou que requerem manutenção).
- Exibição de sugestões detalhadas de ações corretivas baseadas na legislação e normas de segurança técnica (NBR 12962, NBR 13714, NBR 13434, NBR 10898, NBR 10897).
- Atalhos para abrir a edição do ativo, disparar alertas ou agendar vistorias corretivas.

---

### 5. Visualização de Inventário de Extintores

#### [MODIFY] [extintores/page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/extintores/page.tsx)
- Importar `lastSyncTime` do contexto.
- Adicionar um widget premium e discreto na parte superior do inventário com data e hora de sincronização (ex: "Sincronizado em: DD/MM/AAAA às HH:MM:SS" com indicador pulsante de sinal ativo).
- Adicionar um botão de refresh instantâneo ao lado do timestamp para forçar a sincronização de forma manual e elegante.
- Implementar estado local `statusFilter` (`'ALL' | 'CONFORME' | 'VENCIDO' | 'MANUTENCAO'`).
- Adicionar detectores de clique nos cards superiores de KPI de Extintores para alternar `statusFilter` e aplicar filtro visual na tabela de inventário de ativos na mesma página, realçando o card selecionado com borda ou efeito *glow* correspondente.
- **Remoção do Botão Redundante**: Excluir o botão `+ NOVO EXTINTOR` que está ao lado do campo de pesquisa no bloco "INVENTÁRIO DE EXTINTORES SPCI".
- **Ícones e Classificações de Extinção**:
  - Implementar o método `getExtinguisherIconAndClass(model)` que mapeia o modelo para o respectivo ícone educativo e descrição da Classe de Fogo (NBR).
  - Exibir esse indicador visual dinâmico de forma elegante no cabeçalho de cada card de Extintor.
- **Restilização dos cards**:
  - Ajustar o método `getCustomAttributes` para ignorar chaves de banco (`qr_code_hash`, `statusConformidade`, etc.) e evitar campos IA redundantes na tela.
  - Otimizar o layout de textos com flexbox flexível sem o limite forçado de `max-w-[80px]`.
  - Redesenhar a seção de botões de ação para utilizar duas fileiras organizadas, removendo a barra de rolagem horizontal.

---

### 6. Auditoria de Logs & Navegação

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/Sidebar.tsx)
- Adicionar o item "Logs do Sistema" (`/logs`) no menu de navegação, utilizando um ícone elegante de histórico/relatórios.

#### [NEW] [logs/page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/logs/page.tsx)
- Página premium de logs de auditoria contendo:
  - Tabela com paginação, carregamento fluido e micro-animações.
  - Filtros inteligentes por Tipo de Ação (Acesso, Cadastro, Edição, Exclusão, Inspeção), Usuário, Patrimônio e Período de data.
  - Painel HUD com estatísticas resumidas das atividades recentes.
  - Botão de exportação que abre um menu suspenso para escolher o formato: **Excel, CSV, PDF, JSON**.
  - Botão de compartilhamento de dados integrado à Web Share API corporativa.

---

## Verification Plan

### Automated Tests
- Executar `npx tsc --noEmit` para validação de tipos TypeScript.
- Executar `npm run lint` para checagem estática de linter.

### Manual Verification
- **Indicadores do Dashboard**: Cadastrar uma bomba ou simular alteração de status e checar se o índice de conformidade e o total de ativos mudam de forma correspondente e em tempo real.
- **Remoção de Elemento**: Validar se o botão `+ NOVO EXTINTOR` sumiu ao lado da busca e o layout ficou alinhado.
- **Ícones de Extinção**: Verificar se extintores do tipo Água exibem `💧 Classe A`, PQS exibe `💨 Classe A, B, C` e CO2 exibe `⚡ Classe B, C` de forma elegante no card.
- **Responsividade dos Cards**: Acessar a página de Extintores em desktops e celulares e garantir que não haja barra de rolagem horizontal na parte inferior do card e que os botões se ajustem perfeitamente à largura.
- **Metadados Limpos**: Validar que "Campos Auto-Modelados IA" não exiba chaves técnicas internas da tabela.
- **Timestamp de Sincronia**: Ir para a tela de Extintores, clicar no botão de recarregar dados e validar se a hora do widget é atualizada e o sinal brilha.
- **Navegação do Dashboard para Alertas Críticos**: Clicar no card "Alertas Críticos / Vencidos" no dashboard e garantir que a página de tratamento exclusiva seja aberta com as ações sugeridas.
- **Filtros por Card em Extintores**: Clicar nos cards de "Conformes", "Vencidos" e "Manutenção" e verificar se a listagem filtra imediatamente no cliente.
- **Exportação de Logs**: Acessar `/logs`, testar download de arquivos nos quatro formatos (XLSX, CSV, PDF, JSON) e validar a formatação correta de cada um.
- **Compartilhamento**: Clicar em compartilhar e validar a cópia de texto formatado ou acionamento da API nativa do navegador.
