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
  version: 'v2.8.1',
  date: '05/09/2026',
  title: 'SPCI Master v2.8.1 - Tela Cheia Nativa & Rastreamento Inteligente de Origem GPS',
  summary: 'Modo imersivo total projetado para fora da página via Fullscreen API, cascata inteligente com fallback automático para o GPS do aparelho quando a foto não tiver EXIF e sinalização visual clara da origem das coordenadas.',
  changes: [
    {
      category: 'UI/UX',
      title: 'Projeção do Mapa em Tela Cheia Nativa',
      description: 'Ao clicar em Maximizar, o mapa utiliza a Fullscreen API do navegador para expandir por 100% da tela do dispositivo, ocultando barras do navegador e integrando com a tecla ESC.'
    },
    {
      category: 'UI/UX',
      title: 'Fallback Automático da Imagem para GPS do Aparelho',
      description: 'Quando a imagem enviada não possui coordenadas EXIF gravadas, o sistema aciona de forma transparente e automática o GPS da antena do dispositivo sem travamentos.'
    },
    {
      category: 'UI/UX',
      title: 'Sinalização Visual de Origem (EXIF vs Dispositivo)',
      description: 'Badges temáticos de alta visibilidade no mapa, formulário de edição e vistoria indicando se a coordenada veio da foto (EXIF) ou da antena do dispositivo.'
    }
  ]
};
