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
  version: 'v2.10.1',
  date: '08/09/2026',
  title: 'SPCI Master v2.10.1 - Dashboard Otimizado (Opção C) e Alto Contraste Mobile',
  summary: 'Remoção de elementos redundantes no Dashboard (banner intermediário e mapa de calor), modernização do banner de Ronda com arte integrada em degradê, tabela de ativos com recolhimento inteligente e Gaveta Lateral (Drawer - Opção C), e correção de alto contraste nas fontes dos dados do ativo e quesitos NBR no formulário mobile.',
  changes: [
    {
      category: 'UI/UX',
      title: 'Otimização do Dashboard & Gaveta Lateral (Opção C)',
      description: 'Remoção do banner de extintores e do mapa de calor. A tabela de ativos inicia recolhida por padrão em Todos os Setores, expande automaticamente ao filtrar um setor e ganha Gaveta Lateral deslizante dedicada.'
    },
    {
      category: 'UI/UX',
      title: 'Alto Contraste e Legibilidade no Formulário Mobile',
      description: 'Ajuste de tipografia com cores de alto contraste WCAG para Selo Inmetro, Setor de Instalação, Validade da Recarga, Teste Hidrostático e enunciados de quesitos NBR no tema claro sob luz solar.'
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
