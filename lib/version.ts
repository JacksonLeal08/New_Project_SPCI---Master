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
  version: 'v2.9.2',
  date: '07/09/2026',
  title: 'SPCI Master v2.9.2 - Gravação e Exibição de Fotos dos Extintores no Mapa',
  summary: 'Resolução completa do fluxo de upload e associação de fotos aos extintores: upload server-side com service_role evitando bloqueios de RLS no Storage, persistência da URL pública em ativos_extintores e assets, propagação da foto da vistoria para o cadastro do extintor e normalização de URLs no popup operacional.',
  changes: [
    {
      category: 'UI/UX',
      title: 'Fotos dos Extintores Gravadas e Exibidas no Mapa Operacional',
      description: 'Upload de fotos através de Server Action blindada contra restrições de RLS do Storage, propagação automática da foto da vistoria para o cadastro do extintor e normalização de URLs no popup do mapa.'
    },
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
