import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import ExtintorPublicClient from './ExtintorPublicClient';

interface Props {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  
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
      };
    }

    return {
      title: `Ativo ${data.numero_patrimonio} (${data.status_conformidade}) - SPCI`,
      description: `Ficha pública de conformidade de combate a incêndio do ativo ${data.numero_patrimonio} instalado em ${data.local_instalacao}.`,
    };
  } catch (error) {
    return {
      title: 'Ficha de Segurança - SPCI Compliance',
      description: 'Consulta pública de conformidade e status de ativos SPCI.',
    };
  }
}

export default async function Page({ params }: Props) {
  const { hash } = await params;
  return <ExtintorPublicClient hash={hash} />;
}
