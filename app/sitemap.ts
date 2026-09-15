import { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Data estável de publicação/versão para evitar que robôs ignorem o lastModified dinâmico
  const releaseDate = new Date('2026-09-14T00:00:00.000Z');

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/consulta', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/public/ativos', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/login', priority: 0.4, changeFrequency: 'monthly' as const },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: releaseDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
