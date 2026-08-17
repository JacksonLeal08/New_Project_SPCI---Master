import { Metadata } from 'next';
import QuietLuxuryHome from './components/QuietLuxuryHome';

export const metadata: Metadata = {
  title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio',
  description: 'Plataforma de alta precisão para rastreabilidade offline-first de ativos, emissão de laudos de vistoria técnica em tempo real e inteligência preditiva para plantas industriais e edifícios corporativos.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SISTEMA SPCI Master | Gestão e Governança de Combate a Incêndio',
    description: 'Centralização de laudos técnicos NBR 12962, vistorias em tempo real e rastreabilidade offline-first de ativos de segurança contra incêndio.',
    url: 'https://spci.compliance.app',
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
