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
  version: 'v2.8.2',
  date: '05/09/2026',
  title: 'SPCI Master v2.8.2 - Upload Seguro de Fotos & Proteção VARCHAR(512)',
  summary: 'Correção crítica no salvamento de fotos de extintores: envio automático para o Supabase Storage em nuvem, eliminando o estouro de limite de 512 caracteres no banco de dados com suporte a fila offline.',
  changes: [
    {
      category: 'DESEMPENHO',
      title: 'Upload Otimizado para Supabase Storage',
      description: 'As fotos capturadas ou enviadas são salvas diretamente no bucket em nuvem (fotos_extintores), gerando URLs públicas compactas e leves.'
    },
    {
      category: 'NBR',
      title: 'Proteção Ativa contra Erro VARCHAR(512)',
      description: 'Camada de segurança dupla no frontend e na camada de banco que impede que dados Base64 brutos ultrapassem o limite de 512 caracteres da tabela ativos_extintores.'
    },
    {
      category: 'DESEMPENHO',
      title: 'Fila de Mídia Offline (MediaQueue)',
      description: 'Garante que mesmo sem internet momentânea a foto seja enfileirada localmente e o ativo seja atualizado com segurança.'
    }
  ]
};
