import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SITE_URL } from '@/config/seo';
import AtivoPublicClient, { PublicAssetData } from './AtivoPublicClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const idUpper = (id || '').trim().toUpperCase();
  const canonicalUrl = `/public/ativo/${encodeURIComponent(idUpper)}`;

  try {
    const { data: row } = await supabase
      .from('assets')
      .select('*')
      .or(`id.eq.${idUpper},id_ativo.eq.${idUpper},patrimonio.eq.${idUpper}`)
      .maybeSingle();

    if (!row) {
      return {
        title: `Equipamento ${idUpper} Não Localizado | SISTEMA SPCI`,
        description: `Ficha técnica de segurança contra incêndio para o ativo ${idUpper}.`,
        alternates: { canonical: canonicalUrl },
        robots: { index: false, follow: true },
      };
    }

    const d = row.details || {};
    const model = row.model || d.tipo || 'Equipamento SPCI';
    const location = row.location ? `${row.location}${row.sub_location ? ' - ' + row.sub_location : ''}` : 'Planta Geral';
    const status = row.status || 'Conforme';

    const title = `Ficha Técnica ${idUpper} (${status}) - SPCI Compliance`;
    const description = `Consulta de conformidade NBR para ${model} instalado em ${location}. Verifique selo Inmetro, garantia e teste hidrostático.`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}${canonicalUrl}`,
        type: 'website',
        images: [
          {
            url: d.foto_url || d.fotoUrl || '/og-image.png',
            width: 1200,
            height: 630,
            alt: `Ativo SPCI ${idUpper}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [d.foto_url || d.fotoUrl || '/og-image.png'],
      },
    };
  } catch {
    return {
      title: `Consulta de Ativo ${idUpper} | SISTEMA SPCI`,
      description: 'Consulta pública de conformidade de ativos contra incêndio.',
      alternates: { canonical: canonicalUrl },
    };
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const idUpper = (id || '').trim().toUpperCase();

  let mappedAsset: PublicAssetData | null = null;

  try {
    const { data: row } = await supabase
      .from('assets')
      .select('*')
      .or(`id.eq.${idUpper},id_ativo.eq.${idUpper},patrimonio.eq.${idUpper}`)
      .maybeSingle();

    if (row) {
      const d = row.details || {};
      mappedAsset = {
        id: row.id,
        idAtivo: row.id_ativo || row.patrimonio || row.id,
        category: row.category || 'extintores',
        model: row.model || d.tipo || 'Equipamento SPCI',
        location: row.location || d.location || 'Planta Operacional',
        subLocation: row.sub_location || d.sub_location || d.setor || '',
        status: row.status || 'Conforme',
        statusEstoque: row.status_estoque || d.status_estoque || 'NA ÁREA (APLICADO)',
        fabricante: d.fabricante || row.fabricante || 'Fabricante Homologado',
        pesoCapacidade: d.peso_capacidade || d.capacidade || (d.peso ? `${d.peso} KG` : undefined),
        numeroSerie: row.numero_serie || d.numero_serie || d.chassi,
        patrimonio: row.patrimonio || row.id_ativo,
        seloInmetro: d.seloInmetro || d.inmetro || d.selo_inmetro,
        chassi: d.chassi || row.numero_serie,
        dataUltimaRecarga: d.data_ultima_recarga || d.lastRecarga || d.lastInsp,
        validadeRecarga: d.validadeRecarga || d.validade_recarga,
        anoUltimoTesteHidro: d.ano_ultimo_teste_hidro || d.ultimoTesteHidro || (d.anoFab ? parseInt(d.anoFab, 10) : undefined),
        dataVencimentoTesteHidro: row.data_vencimento_teste || d.data_vencimento_teste,
        fotoUrl: d.foto_url || d.fotoUrl || null,
        details: d,
        updatedAt: row.updated_at
      };
    }
  } catch (error) {
    console.error('Erro ao buscar ativo no Supabase:', error);
  }

  return <AtivoPublicClient initialAsset={mappedAsset} searchedId={idUpper} />;
}
