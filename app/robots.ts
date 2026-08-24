import { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/login',
        '/consulta',
        '/consulta/*',
        '/public/*',
        '/qr/*',
      ],
      disallow: [
        '/api/',
        '/dashboard/',
        '/extintores/',
        '/hidrantes/',
        '/sinalizacao/',
        '/iluminacao/',
        '/bombas/',
        '/ronda/',
        '/alerts/',
        '/alertas-criticos/',
        '/gestao-ativo/',
        '/configuracoes/',
        '/logs/',
        '/sheets-db/',
        '/usuarios/',
        '/inspecao/',
        '/inspecao/*',
        '/logout',
        '/acesso-expirado',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
