import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/usuarios/'],
    },
    sitemap: 'https://spci.compliance.app/sitemap.xml',
  };
}
