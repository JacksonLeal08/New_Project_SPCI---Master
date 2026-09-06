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
  version: 'v2.8.4',
  date: '06/09/2026',
  title: 'SPCI Master v2.8.4 - Resiliência em Sincronizações, Sessões e Logs de Auditoria',
  summary: 'Implementação das melhorias prioritárias de arquitetura: suporte híbrido UUID/Patrimônio ao atualizar extintores, merge seguro de metadados na fila de mídia, renovação automática de cookies de sessão no refresh de token e recarregamento sob demanda dos logs de auditoria.',
  changes: [
    {
      category: 'NBR',
      title: 'Atualização Resiliente de Laudos (UUID / Patrimônio)',
      description: 'Eliminada falha de tipagem no Supabase ao atualizar extintores após vistoria técnica, permitindo localizar o ativo tanto pelo UUID quanto pelo código de patrimônio limpo.'
    },
    {
      category: 'DESEMPENHO',
      title: 'Preservação de Metadados JSONB (MediaQueue)',
      description: 'O envio de fotos pela fila de sincronização offline agora mescla os dados existentes em vez de sobrescrever o objeto details, preservando informações técnicas do ativo.'
    },
    {
      category: 'UI/UX',
      title: 'Renovação de Sessão & Atualização de Logs',
      description: 'Cookie spci_session_token é renovado de forma transparente a cada atualização de token JWT pelo Supabase, e a tela de logs agora conta com carga histórica e botão de sincronização manual.'
    }
  ]
};
