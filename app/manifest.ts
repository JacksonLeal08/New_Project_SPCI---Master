import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SPCI Master - Grupo OMG',
    short_name: 'SPCI Master',
    description: 'Sistema de Segurança e Conformidade contra Incêndio para Inspeções em Campo',
    start_url: '/',
    display: 'standalone',
    background_color: '#333333', // Cinza Corporativo Dark
    theme_color: '#dc2626',      // Vermelho Ômega Grupo OMG
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/omega-icon.svg',
        sizes: '100x100',
        type: 'image/svg+xml',
        purpose: 'any',
      },
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
    shortcuts: [
      {
        name: 'Inspeção de Campo',
        short_name: 'Inspeção',
        description: 'Consulta pública rápida por QR Code',
        url: '/consulta/EXT-001',
      },
      {
        name: 'Dashboard SPCI',
        short_name: 'Cockpit',
        description: 'Painel Geral de Ativos',
        url: '/dashboard',
      },
    ],
  };
}
