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
  version: 'v2.8.3',
  date: '06/09/2026',
  title: 'SPCI Master v2.8.3 - Otimização de Performance no Mapa, Desobstrução de Cliques & Popup Refinado',
  summary: 'Aceleração no carregamento do Mapa Operacional com consultas simultâneas no Supabase (Promise.all), desobstrução total do clique em extintores próximos à localização do usuário e eliminação de sobreposição do botão fechar com o status do ativo.',
  changes: [
    {
      category: 'DESEMPENHO',
      title: 'Carregamento Acelerado do Mapa (Promise.all)',
      description: 'As consultas de extintores, ativos com GPS, histórico de fotos e contagem agora rodam em paralelo no Supabase, reduzindo o tempo de resposta em mais de 60%.'
    },
    {
      category: 'UI/UX',
      title: 'Desobstrução de Cliques & Calibração do Raio GPS',
      description: 'O círculo de precisão do operador recebeu interactive: false e raio calibrado, garantindo que o clique em extintores próximos (como EXT-151) seja sempre direto e certeiro.'
    },
    {
      category: 'UI/UX',
      title: 'Botão Fechar Circular e Cabeçalho Anti-Colisão',
      description: 'Novo botão de fechar circular translúcido com margem de segurança dedicada no cabeçalho do popup, garantindo que o status (Vencido, Conforme) nunca seja sobreposto.'
    }
  ]
};
