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
  version: 'v2.8.6',
  date: '06/09/2026',
  title: 'SPCI Master v2.8.6 - Efeito Neon Sonar nos Marcadores, Dock Interativo de Status & Modal de Regras de Vencimento',
  summary: 'Implementação da Opção C no Mapa Operacional: efeito visual neon pulsante com halo sonar de alta prioridade para ativos vencidos e a vencer, dock de filtros de status interativo na legenda flutuante com contagens dinâmicas e integração do modal de Regras de Vencimento.',
  changes: [
    {
      category: 'UI/UX',
      title: 'Efeito Neon Pulsante & Radar Sonar nos Marcadores',
      description: 'Ativos críticos (vencidos em vermelho neon e a vencer em âmbar neon) agora possuem pulso luminoso fluorescente contínuo com onda de radar expansiva, garantindo alerta imediato ao operador mesmo com múltiplos ativos no mapa.'
    },
    {
      category: 'UI/UX',
      title: 'Dock de Filtros de Status Interativo no Mapa',
      description: 'Legenda inferior esquerda transformada em dock de controle interativo: clique em qualquer status para filtrar instantaneamente os pinos no mapa com contadores dinâmicos, destaque brilhante e botão para limpar filtro.'
    },
    {
      category: 'NBR',
      title: 'Modal de Consulta de Regras de Vencimento SPCI',
      description: 'Disponibilização de modal explicativo com os critérios de tolerância e prazos operacionais preventivos (No Prazo, A Vencer e Vencido/Ação Imediata), acessível via botão (?) no mapa.'
    }
  ]
};
