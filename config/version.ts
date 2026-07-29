export const SYSTEM_VERSION = 'v2.7.1';
export const COMPANY_NAME = 'Grupo OMG';
export const COPYRIGHT_YEAR = '2026';

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
}

export const SYSTEM_CHANGELOG: ChangelogRelease[] = [
  {
    version: 'v2.7.1',
    date: '29-07-2026',
    title: '🛡️ Confirmação de Limpeza da IA & FAB Responsivo Lado a Lado',
    description: 'Release de refinamento visual e usabilidade no assistente de IA 24h e botões flutuantes.',
    changes: [
      '⚠️ Modal de confirmação ao fechar o assistente IA 24h, informando e limpando o histórico para a próxima sessão.',
      '📍 Alinhamento do botão da IA ao lado esquerdo do botão FAB (+) no canto inferior direito.',
      '↔️ Deslocamento fluido do botão FAB (+) para a extremidade esquerda do painel lateral quando a IA é aberta.',
      '🔔 Notificação e alerta automático da nova versão v2.7.1 na tela.'
    ]
  },
  {
    version: 'v2.7.0',
    date: '29-07-2026',
    title: '🤖 Agente de IA 24h Estilo Elite Coach, Guias NBR e Tema Claro Corporativo',
    description: 'Release com assistente em painel lateral deslizante, tópicos de usabilidade do sistema, guiamento de normas NBR ABNT e alertas de atualização.',
    changes: [
      '🤖 Painel Lateral (Drawer Right) Agente de IA 24h inspirado no sistema Elite Coach com suporte DeepSeek-V3 + Gemini.',
      '📚 Tópicos de Usabilidade do Sistema integrados para resposta instantânea da IA (NBR 12962, 12693, 13434, 13714, 15808, 15809).',
      '🔔 Sistema de Alertas e Notificações de Novidades da Versão (v2.7.0) com aviso automático na tela.',
      '🎯 Ajuste fino de posicionamento flutuante (FAB) do botão Inspe IA prevenindo qualquer sobreposição visual.',
      '☀️ Refatoração 100% Tema Claro Corporativo nos modais de Inspeção, Checklist e Assistente IA.'
    ]
  }
];
