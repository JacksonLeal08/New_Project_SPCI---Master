import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/acesso-expirado', '/consulta/', '/public/'],
      disallow: [
        '/api/',
        '/usuarios/',
        '/dashboard/',
        '/extintores/',
        '/hidrantes/',
        '/sinalizacao/',
        '/iluminacao/',
        '/bombas/',
        '/ronda/',
        '/alerts/',
        '/sheets-db/',
        '/qr/'
      ],
    },
    sitemap: 'https://spci.compliance.app/sitemap.xml',
  };
}
