import { Metadata } from 'next';
import { SITE_URL, SEO_CONFIG } from '@/config/seo';
import QuietLuxuryHome from './components/QuietLuxuryHome';

export const metadata: Metadata = {
  title: {
    absolute: 'SISTEMA SPCI Master | Gestão de Combate a Incêndio',
  },
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

const homeFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Qual é a periodicidade da inspeção de extintores segundo a NBR 12962?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A inspeção de nível 1 (visual e operacional) deve ser realizada mensalmente, a manutenção de nível 2 (recarga) anualmente e o ensaio hidrostático (nível 3) a cada 5 anos conforme as normas ABNT NBR 12962 e regulamentações do Inmetro.',
      },
    },
    {
      '@type': 'Question',
      name: 'Como funciona a vistoria técnica offline-first no SISTEMA SPCI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'O técnico de campo realiza todo o checklist normativo no smartphone mesmo sem sinal de internet. Ao restabelecer a conexão, os dados e fotos são sincronizados automaticamente com a nuvem em conformidade com o AVCB e NBRs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quais itens são vistoriados na rede de hidrantes NBR 13714?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'São auditados o estado das mangueiras de incêndio, acoplamentos Storz, esguichos reguláveis, chaves de mangueira, abrigo, desobstrução física e verificação de pressão residual estática e dinâmica da casa de bombas.',
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      <QuietLuxuryHome />
    </>
  );
}
