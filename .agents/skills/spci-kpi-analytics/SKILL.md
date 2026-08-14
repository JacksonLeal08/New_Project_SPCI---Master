---
name: spci-kpi-analytics
description: Especialista em métricas, fórmulas de cálculo, auditoria de conformidade e design de dashboards para Sistemas de Proteção Contra Incêndio (SPCI), contemplando extintores, hidrantes, iluminação, sinalização e casa de bombas.
---

# Diretrizes para Gestão de Indicadores e KPIs de SPCI

## 1. Escopo de Ativos Monitorados

O sistema deve rastrear e consolidar o ciclo de vida e a integridade de cinco subsistemas críticos:

- **Extintores de Incêndio:** Validade da carga, anel de lacre, peso/pressão e Teste Hidrostático (cilindros).
- **Hidrantes e Abrigos (Mangotinhos, Esguichos, Chaves):** Pressão de linha, integridade de mangueiras (teste de estanqueidade) e desobstrução de abrigos.
- **Casa de Bombas:** Status operacional do motor (elétrico/combustão), pressão de acionamento do pressostato e histórico de testes semanais.
- **Iluminação de Emergência:** Autonomia das baterias, teste de carga e integridade das luminárias.
- **Sinalização de Fotoluminescência:** Visibilidade, conformidade com a ABNT e ausência de avarias nas rotas de fuga.

---

## 2. Matriz de Indicadores Principais (KPIs Executivos)

### A. Índice de Prontidão Operacional (IPO)

- **Fórmula:** $\text{IPO} = \left( \frac{\text{Total de Ativos Operacionais e Sem Avarias}}{\text{Total de Ativos Cadastrados}} \right) \times 100$
- **Meta Executiva:** $\ge 98\%$
- **Thresholds Visuais:**
  - Verde: $\ge 95\%$
  - Amarelo: $85\% \text{ a } 94.9\%$
  - Vermelho (Crítico): $< 85\%$ (Risco iminente de interdição ou falha em sinistro).

### B. Índice de Vencimento e Conformidade Legal (IVC)

- **Fórmula:** Rastreia o volume de itens com vencimento de carga, teste hidrostático ou bateria nos próximos **30, 60 e 90 dias**.
- **Tomada de Ação:** Acionamento automático do setor de compras/manutenção preventiva antes do prazo legal para evitar multas de órgãos fiscalizadores e recusas de seguradoras.

### C. MTTR (Mean Time to Repair / Tempo Médio de Reparo)

- **Fórmula:** $\text{MTTR} = \frac{\sum (\text{Data/Hora da Solução} - \text{Data/Hora da Notificação da Falha})}{\text{Total de Incidentes Resolvidos}}$
- **Foco:** Medir a agilidade da equipe técnica ou prestadores terceirizados na correção de não-conformidades apontadas em inspeções de rotina.

---

## 3. Diretrizes de Análise Temporal e Projeção Orçamentária

- **Linha do Tempo de Custos e Validades:** O painel temporal deve projetar os próximos 6 a 12 meses mostrando picos de vencimento (ex: lotes de recarga de extintores que vencem juntos), permitindo ao gestor prever o orçamento financeiro com antecedência.
- **Histórico de Inspeções Periódicas:** Gráficos de barra empilhada exibindo o volume de inspeções realizadas *vs.* pendentes por mês.

---

## 4. Recomendações de UI/UX para o Dashboard SPCI

- **Cores Semânticas Obrigatórias:**
  - 🟢 **Sucesso/Operacional:** `#2E7D32` (Verde Institucional)
  - 🟡 **Atenção/Vencimento Próximo:** `#F57F17` (Âmbar/Laranja)
  - 🔴 **Crítico/Inoperante/Vencido:** `#C62828` (Vermelho Alerta)
- **Hierarquia do Layout:**
  - **Topo:** Cards de impacto rápido (IPO Global, Ativos Críticos, Status da Casa de Bombas, Vencimentos nos Próximos 30 Dias).
  - **Centro:** Gráfico de evolução temporal de vencimentos e gráfico de rosca dividindo falhas por tipo de equipamento.
  - **Rodapé:** Tabela de intervenções urgentes ordenadas por criticidade de prazo.
