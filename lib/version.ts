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
  version: 'v2.8.7',
  date: '06/09/2026',
  title: 'SPCI Master v2.8.7 - Ciclo Mensal Inteligente, Modal de Justificativa, Laudos Técnicos em PDF e Zero-GPS',
  summary: 'Implementação da Opção C do Ciclo Mensal de Inspeções: fila padrão de ronda apenas com ativos pendentes no mês, busca ativa com identificação de já inspecionados, modal de justificativa técnica para re-inspeção, histórico completo com emissão de laudo técnico oficial em PDF (foto do equipamento em tamanho médio lado a lado com itens do checklist) e enriquecimento automático de geolocalização Zero-GPS.',
  changes: [
    {
      category: 'NBR',
      title: 'Ciclo Mensal de Inspeção & Fila Inteligente (Opção C)',
      description: 'Fila padrão de campo exibe exclusivamente ativos pendentes no mês corrente. Ativos inspecionados somem da lista padrão e, na busca ativa, exibem badge com data/hora da vistoria e exigem justificativa técnica para nova rodada.'
    },
    {
      category: 'UI/UX',
      title: 'Modal de Justificativa Técnica de Re-inspeção',
      description: 'Ao reinspecionar ativos no mesmo ciclo, modal dinâmico solicita o motivo operacional com atalhos rápidos (avaria pós-evento, auditoria de conformidade, violação de lacre, etc.) e gravação no histórico.'
    },
    {
      category: 'UI/UX',
      title: 'Histórico Completo & Emissão de Laudos Técnicos em PDF',
      description: 'Linha do tempo cronológica com emissão de relatório oficial pronto para impressão ou PDF, com foto do equipamento em tamanho médio posicionada ao lado do checklist de conformidade NBR 12962.'
    },
    {
      category: 'DESEMPENHO',
      title: 'Enriquecimento Zero-GPS Fallback Automático',
      description: 'Ativos sem coordenadas prévias capturam automaticamente a geolocalização de alta precisão do dispositivo do inspetor durante a ronda, vinculando as coordenadas ao ativo e atualizando o mapa.'
    }
  ]
};
