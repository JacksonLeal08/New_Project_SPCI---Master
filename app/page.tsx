import { Metadata } from 'next';
import { SITE_URL, SEO_CONFIG } from '@/config/seo';
import QuietLuxuryHome from './components/QuietLuxuryHome';

export const metadata: Metadata = {
  title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio',
  description: 'Plataforma para rastreabilidade de ativos SPCI, emissão de laudos NBR 12962 em tempo real e gestão de combate a incêndio offline-first.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio',
    description: 'Centralização de laudos técnicos NBR 12962, vistorias em tempo real e rastreabilidade offline-first de ativos de segurança contra incêndio.',
    url: SITE_URL,
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SISTEMA SPCI Master - Governança e Engenharia Contra Incêndio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio',
    description: 'Centralização de laudos técnicos NBR 12962, vistorias em tempo real e rastreabilidade offline-first.',
    images: ['/og-image.png'],
  },
};

export default function Home() {
  return <QuietLuxuryHome />;
}
