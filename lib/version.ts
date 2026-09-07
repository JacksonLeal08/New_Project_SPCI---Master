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
  version: 'v2.9.0',
  date: '07/09/2026',
  title: 'SPCI Master v2.9.0 - Ronda Mobile Refatorada, Checklist Dinâmico NBR, Fotos Leves e Sync em Tempo Real',
  summary: 'Refatoração integral do formulário mobile Despacho & Ronda de Campo (PWA / SPCI Bombeiros): motor dinâmico que consome os quesitos NBR do configurador web por agente extintor, registro de ocorrências com obrigatoriedade de 2 fotos comprobatórias compactadas no cliente (~80KB), cache offline-first robusto em IndexedDB (dbSync.ts), eliminação do botão Tutorial e notificações em tempo real com áudio e toast corporativo no Web Admin.',
  changes: [
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
