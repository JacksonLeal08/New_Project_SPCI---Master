/**
 * Configurações Centrais de SEO e Metadados do SISTEMA SPCI Master
 * Garante URL dinâmica baseada em ambiente e centralização de tags.
 */

export const SITE_URL = 
  process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://spci.compliance.app');

export const SEO_CONFIG = {
  siteName: 'SISTEMA SPCI',
  defaultTitle: 'SISTEMA SPCI - Gestão de Ativos, Prevenção e Combate a Incêndio',
  titleTemplate: '%s | SISTEMA SPCI',
  defaultDescription: 'Plataforma para rastreabilidade de ativos SPCI, emissão de laudos NBR 12962 em tempo real e gestão de combate a incêndio offline-first.',
  keywords: [
    'SPCI',
    'Prevenção de Incêndio',
    'NBR 12962',
    'NBR 13434',
    'NBR 13714',
    'Extintores Inmetro',
    'Inspeção de Hidrantes',
    'Laudo Técnico AVCB',
    'Gestão de Ativos',
    'Segurança Contra Incêndio',
    'Vistoria Predial',
    'Engenharia de Segurança'
  ],
  category: 'technology',
  ogImage: '/og-image.png',
  locale: 'pt_BR',
};
