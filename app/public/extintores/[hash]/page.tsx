import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SITE_URL } from '@/config/seo';
import ExtintorPublicClient from './ExtintorPublicClient';

interface Props {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  const canonicalUrl = `/public/extintores/${hash}`;
  const fullUrl = `${SITE_URL}/public/extintores/${hash}`;
  
  try {
    const { data } = await supabase
      .from('vw_extintores_publico')
      .select('numero_patrimonio, status_conformidade, local_instalacao')
      .eq('qr_code_hash', hash)
      .maybeSingle();

    if (!data) {
      return {
        title: 'Ativo Não Localizado - SPCI Compliance',
        description: 'Ficha pública de segurança SPCI para ativo de combate a incêndio.',
        alternates: { canonical: canonicalUrl },
        robots: { index: false, follow: true },
      };
    }

    const pageTitle = `Ativo ${data.numero_patrimonio} (${data.status_conformidade}) - SPCI Master`;
    const pageDesc = `Ficha pública de conformidade de combate a incêndio do ativo ${data.numero_patrimonio} instalado em ${data.local_instalacao}.`;

    return {
      title: pageTitle,
      description: pageDesc,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: pageTitle,
        description: pageDesc,
        url: fullUrl,
        type: 'website',
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: `Ficha Técnica do Ativo ${data.numero_patrimonio} - SPCI`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description: pageDesc,
        images: ['/og-image.png'],
      },
    };
  } catch (error) {
    return {
      title: 'Ficha de Segurança - SPCI Compliance',
      description: 'Consulta pública de conformidade e status de ativos SPCI.',
      alternates: { canonical: canonicalUrl },
    };
  }
}

export default async function Page({ params }: Props) {
  const { hash } = await params;
  return <ExtintorPublicClient hash={hash} />;
}
