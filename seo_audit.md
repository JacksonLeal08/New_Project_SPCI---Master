# 📋 Relatório de Auditoria Técnica de SEO & GEO — SISTEMA SPCI Master
> **Data:** 13/09/2026 | **Especialista:** `seo-specialist` | **Versão do Sistema:** 4.3.0  
> **Status Geral:** 🟡 Atenção Requerida (Alguns pontos críticos de rastreamento e dados estruturados)

---

## 🎯 Resumo Executivo

Esta auditoria analisou minuciosamente as configurações de **SEO Tradicional (Google/Bing)**, **GEO (Otimização para IAs como ChatGPT, Perplexity e Gemini)** e a **Acessibilidade Semântica** do **SISTEMA SPCI Master**.

Embora o projeto já possua uma base sólida com Next.js App Router, fontes otimizadas e PWA, foram identificados **11 apontamentos**, dos quais **2 são Críticos**, **4 são de Alta Prioridade**, **3 de Média Prioridade** e **2 são Sugestões de Melhoria**.

---

## 📊 Quadro Resumo por Gravidade

| Nível de Gravidade | Quantidade | Descrição do Impacto | Ação Necessária |
| :--- | :---: | :--- | :--- |
| 🔴 **CRÍTICO** | 2 | Risco de penalidade no Google ou falha de privacidade nas buscas | Correção Imediata |
| 🟠 **ALTO** | 4 | Páginas importantes não indexadas ou com falhas de hierarquia | Correção Recomendada |
| 🟡 **MÉDIO** | 3 | Títulos cortados na pesquisa, crawlers confusos ou perda de autoridade | Ajuste de Otimização |
| 🟢 **BAIXO / SUGESTÃO** | 2 | Recursos para potencializar citações por IA e visualização em dispositivos | Melhoria Contínua |

---

## 🔍 Detalhamento das Não Conformidades & Oportunidades

---

### 🔴 1. [CRÍTICO] Schema FAQPage "Invisível" no Layout Global
* **Arquivo:** [`app/layout.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/layout.tsx#L126-L155)
* **O que acontece hoje:** O código injeta um bloco de dados estruturados (`FAQPage`) com 3 perguntas e respostas sobre normas NBR em **todas as páginas do site** (incluindo tela de login, consulta e área restrita). No entanto, na página inicial (`QuietLuxuryHome.tsx`), essas perguntas **não aparecem visualmente para o usuário**.
* **Por que isso é um problema:** As diretrizes estritas do Google para Rich Results (Resultados Ricos) proíbem expressamente colocar perguntas no código que não estejam visíveis para quem lê a página. O Google Search Console pode classificar isso como *"Spammy Structured Data"* (conteúdo oculto/fraudulento) e punir o ranqueamento do site.
* **Como resolver:**
  1. Adicionar visualmente uma seção de Perguntas Frequentes (FAQ) interativa e moderna na Home Page (`QuietLuxuryHome.tsx`), garantindo que o texto do código seja exatamente o que o usuário lê na tela; **OU**
  2. Mover o script `FAQPage` do `layout.tsx` para a página específica onde o conteúdo estiver visível.

---

### 🔴 2. [CRÍTICO] Regras do `robots.txt` com barra final vazando a rota `/dashboard`
* **Arquivo:** [`app/robots.ts`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/robots.ts#L16-L37)
* **O que acontece hoje:** A lista de bloqueio (`disallow`) contém caminhos com barra no final: `'/dashboard/'`, `'/extintores/'`, etc.
* **Por que isso é um problema:** Pelo padrão mundial do arquivo `robots.txt` (RFC 9309 do Googlebot), a linha `Disallow: /dashboard/` bloqueia apenas URLs que contenham a barra (`/dashboard/algo`). Se alguém criar um link externo apontando para `/dashboard` (sem barra no final), **o Googlebot tem permissão para rastrear** e pode exibir o título da página no buscador.
* **Como resolver:**
  1. Remover a barra final nas regras do `robots.ts` (ex: `'/dashboard'`, `'/extintores'`, `'/api'`), cobrindo tanto a rota exata quanto seus filhos;
  2. Inserir o cabeçalho `X-Robots-Tag: noindex, nofollow` no [`middleware.ts`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/middleware.ts) para todas as rotas autenticadas.

---

### 🟠 3. [ALTO] Página Pública de Catálogo de Ativos (`/public/ativos`) ausente no Sitemap
* **Arquivo:** [`app/sitemap.ts`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/sitemap.ts#L4-L17)
* **O que acontece hoje:** O sitemap lista apenas a Home (`/`), o Login (`/login`) e a Consulta Direta (`/consulta`). A página `/public/ativos` (que lista até 300 equipamentos operacionais, conformidade e selos Inmetro) ficou de fora.
* **Por que isso é um problema:** A página `/public/ativos` é a página pública com maior densidade de palavras-chave reais e dados técnicos do sistema. Sem constar no `sitemap.xml`, os robôs demoram semanas para encontrá-la.
* **Como resolver:** Incluir `{ path: '/public/ativos', priority: 0.9, changeFrequency: 'daily' }` no arquivo `sitemap.ts`.

---

### 🟠 4. [ALTO] Data de Modificação Falsa no Sitemap (`lastModified: new Date()`)
* **Arquivo:** [`app/sitemap.ts`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/sitemap.ts#L13)
* **O que acontece hoje:** O sitemap retorna `new Date()` em todas as rotas toda vez que é lido.
* **Por que isso é um problema:** Se o Google acessar seu sitemap 10 vezes no dia e ver que todas as páginas foram "modificadas naquele exato segundo", ele identifica que o carimbo é automático e falso. Como consequência, o Google ignora completamente a tag `lastmod`, reduzindo a velocidade de indexação de novidades reais.
* **Como resolver:** Utilizar uma data estática da versão atual do sistema (ex: data do último release ou build) ou buscar a data real da última vistoria técnica.

---

### 🟠 5. [ALTO] Ausência de Título Principal `<h1>` na Tela de Login
* **Arquivo:** [`app/login/LoginClient.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/login/LoginClient.tsx)
* **O que acontece hoje:** O formulário de login utiliza ícones e textos em `div`/`span`, mas não possui nenhuma tag de cabeçalho `<h1>`.
* **Por que isso é um problema:** A ausência de `<h1>` quebra os critérios essenciais de acessibilidade (WCAG) e é apontada como falha pelos robôs de SEO (Lighthouse / Google Search Essentials), que esperam que toda página tenha um título principal claro.
* **Como resolver:** Adicionar uma tag `<h1>` visualmente elegante no topo do card (ex: `<h1 className="...">Acesso ao Cockpit SPCI</h1>`).

---

### 🟠 6. [ALTO] Quebra de Hierarquia de Títulos no Catálogo de Ativos (`h1` direto para `h4`)
* **Arquivo:** [`app/public/ativos/AtivosPublicCatalogClient.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/public/ativos/AtivosPublicCatalogClient.tsx#L201) e [Linha 333](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/public/ativos/AtivosPublicCatalogClient.tsx#L333)
* **O que acontece hoje:** O título da página é um `<h1>` ("Catálogo e Rastreabilidade Pública de Ativos"), mas logo em seguida os cards individuais dos equipamentos já usam a tag `<h4>`.
* **Por que isso é um problema:** Os leitores de tela e robôs de busca punem o salto de níveis (pular `<h2>` e `<h3>`). A hierarquia correta deve ser sequencial: `h1` -> `h2` (seções) -> `h3` (itens).
* **Como resolver:** Ajustar a área de categorias para `<h2>` e os títulos dos cards de ativos para `<h3>`.

---

### 🟡 7. [MÉDIO] Título da Home Duplicando o Nome da Marca (`titleTemplate`)
* **Arquivo:** [`app/layout.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/layout.tsx#L41) e [`app/page.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/page.tsx#L6)
* **O que acontece hoje:** O layout define a máscara `titleTemplate: '%s | SISTEMA SPCI'`. Na Home, a página define `title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio'`.
* **Resultado Gerado:** `SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio | SISTEMA SPCI` (78 caracteres).
* **Por que isso é um problema:** O título fica com a marca repetida duas vezes e ultrapassa o limite visual de 60 caracteres do Google, sendo cortado com reticências (`...`) nos resultados de pesquisa.
* **Como resolver:** Na Home (`app/page.tsx`), declarar o título com `title: { absolute: 'SISTEMA SPCI Master | Gestão de Combate a Incêndio' }`, impedindo que o template adicione o sufixo duplicado.

---

### 🟡 8. [MÉDIO] Prioridade Desproporcional da Tela de Login no Sitemap
* **Arquivo:** [`app/sitemap.ts`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/sitemap.ts#L7)
* **O que acontece hoje:** A rota `/login` está configurada com prioridade `0.8` e periodicidade `monthly`.
* **Por que isso é um problema:** A tela de login é apenas um formulário de entrada. Dar prioridade 0.8 faz o Google gastar "orçamento de rastreio" (crawl budget) no login em vez de priorizar páginas com conteúdo real como o Catálogo de Ativos e a Consulta de Laudos.
* **Como resolver:** Reduzir a prioridade de `/login` para `0.3` ou `0.4`.

---

### 🟡 9. [MÉDIO] Rodapé Sem Links de Navegação e Transparência (E-E-A-T)
* **Arquivo:** [`app/components/AppFooter.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/AppFooter.tsx)
* **O que acontece hoje:** O rodapé exibe apenas o texto de direitos reservados e versão.
* **Por que isso é um problema:** O algoritmo E-E-A-T do Google (Experiência, Especialidade, Autoridade e Confiança) pontua melhor sites que possuem links institucionais claros de rodapé (como links para Consulta Pública, Catálogo Geral, Termos de Uso e Política de Privacidade).
* **Como resolver:** Inserir uma linha sutil com links para: *Consulta Pública*, *Catálogo de Ativos*, *Políticas de Privacidade* e *Normas ABNT Atendidas*.

---

### 🟢 10. [BAIXO / GEO] Oportunidade para Motores de Busca com IA (ChatGPT / Perplexity)
* **Local:** [`app/components/QuietLuxuryHome.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/QuietLuxuryHome.tsx)
* **Oportunidade:** IAs generativas buscam respostas prontas e tabelas com números para citar como fontes de autoridade.
* **Sugestão de Recurso:** Incluir na Home um bloco de "Tabela de Prazos Normativos" visível (ex: Inspeção Nível 1 = Mensal, Recarga Nível 2 = Anual, Teste Hidrostático Nível 3 = 5 anos conforme NBR 12962). Isso faz com que ferramentas como Perplexity e SearchGPT citem o SISTEMA SPCI Master como fonte de referência técnica.

---

### 🟢 11. [BAIXO] Ícone Dedicado para Dispositivos Apple (`apple-touch-icon`)
* **Arquivo:** [`app/layout.tsx`](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/layout.tsx#L67)
* **O que acontece hoje:** O layout aponta `apple: '/icons/icon-192.png'`.
* **Sugestão:** Ter um arquivo dedicado em `public/apple-touch-icon.png` (tamanho 180x180 sem transparência) garante que o atalho na tela inicial do iPhone e iPad não fique com bordas pretas ou deformado.

---

## 📝 Painel de Decisão do Desenvolvedor

Marque abaixo os itens que você gostaria de resolver ou implementar:

- [ ] **Item 1 [CRÍTICO]:** Criar a seção visual de FAQ na Home ou ajustar o Schema FAQPage para não gerar risco de penalidade no Google.
- [ ] **Item 2 [CRÍTICO]:** Corrigir as regras do `robots.ts` e adicionar proteção `X-Robots-Tag: noindex` no middleware para rotas privadas.
- [ ] **Item 3 [ALTO]:** Adicionar a rota `/public/ativos` no `sitemap.ts` com prioridade 0.9.
- [ ] **Item 4 [ALTO]:** Corrigir a data dinâmica `lastModified` do sitemap para uma data de versão estável.
- [ ] **Item 5 [ALTO]:** Adicionar a tag `<h1>` na página de login.
- [ ] **Item 6 [ALTO]:** Corrigir a hierarquia de títulos no catálogo público (`h1` -> `h2` -> `h3`).
- [ ] **Item 7 [MÉDIO]:** Ajustar o título da Home com `absolute` para evitar repetição da marca e corte em 60 caracteres.
- [ ] **Item 8 [MÉDIO]:** Reduzir a prioridade da rota `/login` no sitemap para 0.4.
- [ ] **Item 9 [MÉDIO]:** Adicionar links de navegação pública e conformidade no rodapé (`AppFooter.tsx`).
- [ ] **Item 10 [GEO]:** Inserir tabela de prazos normativos ABNT na Home para citações de IA.
- [ ] **Item 11 [UX/PWA]:** Configurar ícone dedicado 180x180 para Apple Touch Icon.
