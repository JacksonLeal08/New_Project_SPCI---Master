import { MetadataRoute } from 'next';

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
        '/qr/',
      ],
    },
    sitemap: 'https://spci.compliance.app/sitemap.xml',
  };
}
