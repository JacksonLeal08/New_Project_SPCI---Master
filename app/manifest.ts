import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SPCI Inspeções',
    short_name: 'SPCI',
    description: 'Sistema de Segurança e Conformidade contra Incêndio para Inspeções em Campo',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#020617', // Slate 950
    theme_color: '#dc2626',      // Vermelho Inspefire
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
