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
  version: 'v2.10.0',
  date: '08/09/2026',
  title: 'SPCI Master v2.10.0 - Segregação Multi-Tenant, Perfil Gestor, Gestão de Contratos e FAB com Nova Inspeção',
  summary: 'Arquitetura de isolamento Zero Trust por Contrato/Planta (Salobo vs Onça Puma), novo perfil RBAC Gestor, gerenciamento exclusivo de contratos para Desenvolvedores e Gestores, saneamento de localidades, identificação fidedigna de logins e auditoria, botão FAB com Speed Dial duplo (Nova Inspeção + Novo Ativo) e fechamento universal de modais via tecla Esc.',
  changes: [
    {
      category: 'DESEMPENHO',
      title: 'Segregação Estrita Multi-Tenant / Multi-Site',
      description: 'Isolamento completo de ativos e vistorias por contrato (Salobo e Onça Puma) em APIs, mapa operacional, sincronização offline no IndexedDB e formulário de campo, garantindo sigilo corporativo absoluto.'
    },
    {
      category: 'UI/UX',
      title: 'Novo Perfil RBAC "Gestor" & Governança de Contratos',
      description: 'Adição do perfil Gestor no controle de acesso RBAC e criação do módulo de gerenciamento de Contratos/Plantas em Configurações, restrito aos perfis Desenvolvedor e Gestor.'
    },
    {
      category: 'UI/UX',
      title: 'Saneamento do Campo Site / Planta',
      description: 'Desacoplamento entre locais fabris (setores da planta) e contratos oficiais (Salobo, Onça Puma), eliminando a poluição visual de 70 áreas no seletor de localidades.'
    },
    {
      category: 'DESEMPENHO',
      title: 'Correção de Auditoria e Logs de Login',
      description: 'Identificação fidedigna do usuário nos eventos de login e auditoria, substituindo o texto genérico Sistema/Técnico pelo nome real, perfil e e-mail corporativo.'
    },
    {
      category: 'UI/UX',
      title: 'Botão FAB com Ações Duplas & Modal "Nova Inspeção"',
      description: 'Speed Dial filtrado por permissões do usuário com opções duplas: Nova Inspeção (abertura de modal de seleção com busca em tempo real e redirecionamento direto) e Novo Ativo.'
    },
    {
      category: 'UI/UX',
      title: 'Fechamento Global de Modais com Tecla Esc',
      description: 'Comando unificado via evento de teclado Esc (Escape) para encerramento instantâneo de modais, diálogos e gavetas de seleção em todo o cockpit e formulários.'
    }
  ]
};
