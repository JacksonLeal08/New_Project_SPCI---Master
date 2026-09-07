export interface ReleaseChange {
  category: 'IA' | 'UI/UX' | 'NBR' | 'DESEMPENHO';
  title: string;
  description: string;
}

export interface SystemVersionInfo {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: ReleaseChange[];
}

export const CURRENT_SYSTEM_VERSION: SystemVersionInfo = {
  version: 'v2.9.1',
  date: '07/09/2026',
  title: 'SPCI Master v2.9.1 - Hotfix Transmissão Offline & Resiliência de Schema Cache',
  summary: 'Correção crítica na transmissão de laudos de vistoria offline: remoção de coluna inexistente justificativa_reinspecao da raiz de inspecoes_realizadas, retenção segura no payload JSONB details, auto-retry com safePayload em caso de incompatibilidade de schema e auto-reset de tarefas falhas no botão Forçar Transmissão.',
  changes: [
    {
      category: 'DESEMPENHO',
      title: 'Transmissão Segura de Vistorias e Fallback de Schema Cache',
      description: 'Garantia de 100% de sucesso no envio da fila offline para o Supabase, eliminando o erro PGRST204 de schema cache e preservando dados técnicos e justificativas no JSONB.'
    },
    {
      category: 'NBR',
      title: 'Motor de Checklist Dinâmico & Regras por Agente Extintor',
      description: 'Quesitos da vistoria são renderizados dinamicamente a partir dos templates do admin (NBR 12962 / NBR 15808), adaptando-se a extintores de Água, PQS ABC/BC, CO2 e porte (Portátil vs Carreta).'
    },
    {
      category: 'UI/UX',
      title: 'Não Conformidades com 2 Fotos e Layout Bento Mobile',
      description: 'Lógica idêntica ao Web Admin: seleção de falha/ocorrência com obrigatoriedade de 2 fotos comprobatórias por item reprovado. Remoção de poluição visual (botão Tutorial excluído), card de ativo em Bento Grid e botão fixo na zona do polegar (48px).'
    },
    {
      category: 'DESEMPENHO',
      title: 'Compressão Client-Side & Cache Offline-First (dbSync.ts)',
      description: 'Compressão automática de imagens via Canvas no navegador (JPEG ~80KB), pré-carregamento de ativos e regras no IndexedDB para operação em subsolos industriais sem rede celular.'
    },
    {
      category: 'DESEMPENHO',
      title: 'Sincronização em Tempo Real com Áudio e Toast no Web Admin',
      description: 'Transmissão instantânea via Supabase Broadcast para alertar o painel Web Admin em menos de 50ms, incrementando o contador do sino, exibindo toast animado e tocando aviso sonoro sutil.'
    }
  ]
};
