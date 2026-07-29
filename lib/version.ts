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
  version: 'v2.7.0',
  date: '29/07/2026',
  title: 'SPCI Master v2.7.0 - Agente IA 24h & Tema Claro NBR',
  summary: 'Nova versão lançada com Agente de IA 24h no estilo Elite Coach, suporte às Normas NBR ABNT e Tema Claro Corporativo unificado.',
  changes: [
    {
      category: 'IA',
      title: 'Agente de IA 24h Estilo Elite Coach',
      description: 'Painel lateral com tópicos automáticos de usabilidade do sistema, navegação guiada e integração com motor DeepSeek-V3 + Gemini.'
    },
    {
      category: 'NBR',
      title: 'Guia Oficial de Normas ABNT NBR',
      description: 'Modal de consulta rápida de diretrizes e links oficiais das normas NBR 12693, NBR 12962, NBR 15808 e NBR 15809 no laudo de extintores.'
    },
    {
      category: 'UI/UX',
      title: 'Refatoração Tema Claro Corporativo',
      description: 'Conversão integral dos modais de inspeção, checklists e assistente IA para o tema claro de alto contraste e legibilidade.'
    },
    {
      category: 'UI/UX',
      title: 'Ajuste de Responsividade e Posicionamento FAB',
      description: 'Reorganização do posicionamento flutuante do botão Inspe IA, eliminando sobreposições com controles de tela.'
    }
  ]
};
