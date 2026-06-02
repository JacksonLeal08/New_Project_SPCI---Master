import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spci.compliance.app';
  
  const routes = [
    '',
    '/dashboard',
    '/extintores',
    '/hidrantes',
    '/sinalizacao',
    '/iluminacao',
    '/bombas',
    '/ronda',
    '/alerts',
    '/sheets-db',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' || route === '/dashboard' ? 1.0 : 0.8,
  }));
}
