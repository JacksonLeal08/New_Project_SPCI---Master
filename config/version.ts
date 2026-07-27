export const SYSTEM_VERSION = 'v2.6.0';
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
    version: 'v2.6.0',
    date: '27-07-2026',
    title: '⚡ Sincronização Dinâmica de Roles RBAC, Logs sem Bloqueio e Notificação de Login',
    description: 'Release com sincronia total de perfil no Supabase, registro Server Action de auditoria e alerta de acessos ao Desenvolvedor.',
    changes: [
      '💻 Desenvolvedor Master Único reservado para jacksonflr@outlook.com.br; todos os demais colaboradores leem roles 100% dinâmicos do Supabase.',
      '📝 Gravação de Logs de Auditoria no Supabase sem bloqueios RLS (via Server Action administrativa).',
      '🔔 Notificações e sinalização ao Desenvolvedor no ícone de sininho a cada novo login de usuário no sistema.',
      '📌 Unificação da versão oficial v2.6.0 no rodapé, modal de changelog e tela de login.'
    ]
  },
  {
    version: 'v2.5.0',
    date: '27-07-2026',
    title: '🚀 CRUD Completo para Desenvolvedor, Notificações com Som e Layout Amplo',
    description: 'Release corporativa unificada com controle administrativo total de credenciais e novidades visuais.',
    changes: [
      '👥 CRUD Completo de Usuários para perfil Desenvolvedor (Auth Admin + Tabela Pública).',
      '📛 Correção de identificação de nome/e-mail nos Logs do Sistema (sem Sistema/Técnico - N/A).',
      '🔊 Notificações com sinal sonoro de telemetria em tempo real a cada novo login de colaborador.',
      '🖼️ Persistência de avatar/foto de perfil no F5 com tratamento gracioso de permissões RLS.',
      '🖥️ Expansão dos modais centrais para aproveitamento horizontal amplo e responsivo em desktop/mobile.'
    ]
  }
];
