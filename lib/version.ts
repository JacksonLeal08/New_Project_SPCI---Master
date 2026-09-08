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
  version: 'v2.11.0',
  date: '08/09/2026',
  title: 'SPCI Master v2.11.0 - Gestão de Ativos Mobile & Histórico Geral de Vistorias com Laudo PDF (Opção C)',
  summary: 'Refatoração mobile-first do modal Gestão de Ativos & Estoque Operacional com tela cheia, bloqueio de scroll bleed, régua compacta de 3 colunas e abas deslizantes. Ativação completa do Módulo Histórico de Inspeções (CRUD no Banco de Dados, telemetria GPS e fotos de evidência) e página de Laudo Técnico Pericial NBR 12962 com mini-mapa interativo e exportação em PDF (@media print).',
  changes: [
    {
      category: 'UI/UX',
      title: 'Modal Gestão de Ativos Mobile-First em Tela Cheia (Opção C)',
      description: 'Estrutura 100dvh responsiva no celular com bloqueio de scroll de fundo (overflow: hidden), mini-cards de vencimento em 3 colunas compactas, barra de ações com + Novo Ativo em destaque e scroll horizontal suave nas abas de estoque.'
    },
    {
      category: 'UI/UX',
      title: 'Módulo Dedicado "Histórico Geral de Inspeções"',
      description: 'Ativação da rota /extintores/historico-inspecoes substituindo o status de homologação, com tabela interativa, filtros por patrimônio (?ativo=), status e inspetor, retificação de notas com log de auditoria e cancelamento soft-delete.'
    },
    {
      category: 'NBR',
      title: 'Laudo Técnico Pericial em Página Única A4 & PDF com Nome Dinâmico',
      description: 'Página oficial de laudo de vistoria (/relatorios/inspecao/:id) com layout executivo calibrado para caber 100% em uma única folha A4, nome dinâmico de salvamento (SISTEMA SPCI - Laudo Técnico Pericial - [Ativo]), ocultação de botões flutuantes/FAB e assinaturas técnicas.'
    },
    {
      category: 'UI/UX',
      title: 'Bento Card com Foto do Ativo, Chassi e Capacidade',
      description: 'Exibição da imagem cadastrada do equipamento com modal de ampliação (Zoom Lightbox), agrupamento do número do Chassi junto do Patrimônio/Tag SPCI e inclusão do campo Capacidade Extintora junto ao Selo Inmetro.'
    },
    {
      category: 'UI/UX',
      title: 'Alto Contraste Mobile no Tema Claro (Opção B)',
      description: 'Substituição de fundos translúcidos por containers 100% sólidos e opacos no registro de Não Conformidade, tipografia em preto/vermelho escuro de alta nitidez sob luz solar e aviso de pendência destacado.'
    },
    {
      category: 'UI/UX',
      title: 'Otimização do Fundo Industrial no Tema Claro',
      description: 'Eliminação da sobreposição da grade técnica no tema claro para garantir leitura limpa sem ruído visual de linhas por trás dos cards de inspeção.'
    },
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
