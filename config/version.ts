export const SYSTEM_VERSION = 'v2.5.0';

export interface ChangelogRelease {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
}

export const SYSTEM_CHANGELOG: ChangelogRelease[] = [
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
  },
  {
    version: 'v2.4.0',
    date: '27-07-2026',
    title: '✉️ E-mail Corporativo HTML Premium e Resiliência PWA',
    description: 'Integração de notificações corporativas Grupo OMG | SPCI Master.',
    changes: [
      '✉️ Envio de credenciais com template HTML corporativo premium (Grupo OMG | SPCI Master).',
      '⚠️ Tratamento de links expirados na tela de login.',
      '⚡ Estratégia Network-First no Service Worker (sw.js) para evitar exceções offline.'
    ]
  }
];
