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
  version: 'v2.8.5',
  date: '06/09/2026',
  title: 'SPCI Master v2.8.5 - Tema Adaptativo Claro/Escuro, App-Like UI & Dispersão Geoespacial',
  summary: 'Aprimoramento completo do Mapa Operacional: responsividade visual nos temas claro e escuro (Bento Grid, filtros e Leaflet), sincronização dinâmica de camadas (Google Ruas no claro), Mobile App Shell PWA e motor de dispersão geoespacial (Smart Offset) para ativos com coordenadas coincidentes.',
  changes: [
    {
      category: 'UI/UX',
      title: 'Tema Adaptativo Claro/Escuro no Mapa Operacional',
      description: 'Estruturação completa com design tokens e classes Tailwind dark: no Bento Grid, barra de filtros, cards e controles flutuantes, garantindo legibilidade perfeita no tema claro e cinematográfica no tema escuro.'
    },
    {
      category: 'UI/UX',
      title: 'Dispersão Geoespacial Inteligente (Smart Offset)',
      description: 'Resolução definitiva da sobreposição de equipamentos (ex: EXT-151 e EXT-650): detecção de coordenadas coincidentes e distribuição em leque circular com linha de ancoragem, badges e identificação compartilhada no popup.'
    },
    {
      category: 'DESEMPENHO',
      title: 'PWA Mobile App Shell & Sincronia de Camadas',
      description: 'Botão de tela cheia Standalone touch-friendly (>=44px), scroll horizontal suave nas categorias e carregamento automático da camada Google Ruas em tema claro e Satélite/Noturno no escuro.'
    }
  ]
};
