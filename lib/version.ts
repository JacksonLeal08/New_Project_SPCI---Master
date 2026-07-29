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
  version: 'v2.7.1',
  date: '29/07/2026',
  title: 'SPCI Master v2.7.1 - Confirmação de Limpeza IA & FAB Responsivo',
  summary: 'Nova atualização com modal de confirmação de limpeza ao fechar a IA e alinhamento responsivo lado a lado com o botão FAB de cadastro.',
  changes: [
    {
      category: 'IA',
      title: 'Aviso e Confirmação de Limpeza de Dados',
      description: 'Ao fechar o assistente IA 24h, um modal de confirmação notifica o operador que os dados da consulta serão limpos para a próxima sessão.'
    },
    {
      category: 'UI/UX',
      title: 'Alinhamento Lado a Lado do Botão IA & FAB',
      description: 'O botão Inspe IA foi posicionado à esquerda do botão FAB (+), eliminando ícones no topo direito e mantendo layout limpo.'
    },
    {
      category: 'UI/UX',
      title: 'Deslocamento Fluido do Botão FAB',
      description: 'Ao abrir o painel lateral da IA, o botão FAB (+) se desloca de forma dinâmica e fluida para a extremidade esquerda do modal aberto.'
    }
  ]
};
