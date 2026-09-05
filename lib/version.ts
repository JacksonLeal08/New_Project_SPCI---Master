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
  version: 'v2.8.0',
  date: '05/09/2026',
  title: 'SPCI Master v2.8.0 - GPS EXIF de Fotos, Rotas e Inspe IA Atualizada',
  summary: 'Extração automática de GPS a partir de fotos (metadados EXIF), rotas via Waze/Google Maps, modo imersivo tela cheia no Mapa Operacional e novos tópicos temáticos no Inspe IA SPCI.',
  changes: [
    {
      category: 'IA',
      title: 'Inspe IA SPCI Atualizado com Mapa e GPS',
      description: 'Nova categoria de tópicos rápidos no assistente para guiar o operador sobre rotas, modo tela cheia, momentos de geocaptura e extração de GPS EXIF de fotos.'
    },
    {
      category: 'UI/UX',
      title: 'Extração de GPS EXIF de Fotos Sem Conflito',
      description: 'Ao anexar ou tirar foto do ativo com a câmera do celular, o sistema extrai automaticamente latitude e longitude dos metadados EXIF da imagem com fallback seguro para a antena do celular.'
    },
    {
      category: 'UI/UX',
      title: 'Mapa Operacional com Rotas e Modo Imersivo',
      description: 'Popup com botão para traçar rotas via Waze ou Google Maps, visualizador de fotos com zoom e botão de maximizar/minimizar para visualização em tela cheia.'
    }
  ]
};
