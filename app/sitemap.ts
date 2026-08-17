import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spci.compliance.app';
  
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/login', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/consulta', priority: 0.9, changeFrequency: 'daily' as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
