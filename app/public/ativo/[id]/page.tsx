import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/config/seo';
import AtivoPublicClient, { PublicAssetData } from './AtivoPublicClient';

interface Props {
  params: Promise<{ id: string }>;
}

const getSupabaseServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const idUpper = (id || '').trim().toUpperCase();
  const canonicalUrl = `/public/ativo/${encodeURIComponent(idUpper)}`;

  try {
    const db = getSupabaseServerClient();

    // 1. Tenta buscar primeiro na view rica de extintores
    const { data: extRow } = await db
      .from('vw_extintores_publico')
      .select('*')
      .or(`id.eq.${idUpper},qr_code_hash.eq.${idUpper},numero_patrimonio.eq.${idUpper}`)
      .maybeSingle();

    if (extRow) {
      const title = `Ficha Técnica ${extRow.numero_patrimonio} (${extRow.status_conformidade || 'Conforme'}) - SPCI Master`;
      const description = `Consulta de conformidade NBR para Extintor ${extRow.modelo_tipo || 'PQS ABC'} instalado em ${extRow.local_instalacao || 'Planta Operacional'}. Selo Inmetro: ${extRow.selo_inmetro || 'N/A'}.`;
      return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        openGraph: {
          title,
          description,
          url: `${SITE_URL}${canonicalUrl}`,
          type: 'website',
          images: [{ url: extRow.foto_url || '/og-image.png', width: 1200, height: 630, alt: extRow.numero_patrimonio }]
        }
      };
    }

    // 2. Busca na tabela unificada de assets
    const { data: row } = await db
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
    const db = getSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idUpper);

    // 1. Tenta buscar primeiro na view pública de extintores (onde residem modelo, local, sub-local, selo, fotos)
    let extRow: any = null;
    try {
      let extQuery = db.from('vw_extintores_publico').select('*');
      if (isUuid) {
        extQuery = extQuery.or(`id.eq.${idUpper},qr_code_hash.eq.${idUpper}`);
      } else {
        extQuery = extQuery.or(`numero_patrimonio.eq.${idUpper},id.eq.${idUpper}`);
      }
      const { data: vData } = await extQuery.maybeSingle();
      if (vData) extRow = vData;
    } catch (e) {
      console.warn('Erro ao consultar vw_extintores_publico:', e);
    }

    // Se encontrou na view de extintores
    if (extRow) {
      // Busca dados complementares da tabela assets (como coordenadas GPS)
      let assetGeo: any = null;
      try {
        const { data: aData } = await db
          .from('assets')
          .select('*')
          .or(`id.eq.${extRow.id},id_ativo.eq.${extRow.numero_patrimonio},patrimonio.eq.${extRow.numero_patrimonio}`)
          .maybeSingle();
        if (aData) assetGeo = aData;
      } catch (err) {
        // Silencioso
      }

      const isVencido = extRow.status_conformidade === 'VENCIDO';

      mappedAsset = {
        id: extRow.id,
        idAtivo: extRow.numero_patrimonio,
        category: 'extintores',
        model: extRow.modelo_tipo ? `Extintor ${extRow.modelo_tipo}` : 'Extintor PQS ABC',
        location: extRow.local_instalacao || assetGeo?.location || 'Planta Operacional',
        subLocation: extRow.sub_local_instalacao || assetGeo?.sub_location || '',
        status: isVencido ? 'Não Conforme' : (assetGeo?.status || 'Conforme'),
        statusEstoque: assetGeo?.status_operacional || assetGeo?.status_estoque || 'NA ÁREA (APLICADO)',
        fabricante: extRow.fabricante || assetGeo?.details?.fabricante || 'Fabricante Homologado',
        pesoCapacidade: extRow.peso_capacidade || assetGeo?.details?.peso_capacidade || 'Padrão',
        numeroSerie: extRow.numero_serie || assetGeo?.numero_serie,
        patrimonio: extRow.numero_patrimonio,
        seloInmetro: extRow.selo_inmetro || assetGeo?.details?.selo_inmetro,
        chassi: extRow.numero_serie,
        dataUltimaRecarga: extRow.data_ultima_recarga,
        validadeRecarga: extRow.data_limite_recarga,
        anoUltimoTesteHidro: extRow.ano_ultimo_teste_hidro,
        dataVencimentoTesteHidro: extRow.data_limite_hidro,
        fotoUrl: extRow.foto_url || assetGeo?.details?.foto_url || null,
        details: {
          ...(assetGeo?.details || {}),
          localizacao: extRow.local_instalacao,
          sub_localizacao: extRow.sub_local_instalacao,
          modelo_tipo: extRow.modelo_tipo,
          status_conformidade: extRow.status_conformidade
        },
        updatedAt: assetGeo?.updated_at || undefined
      };
    }

    // 2. Se não encontrou na view, busca na tabela unificada de assets (Hidrantes, Bombas, etc.)
    if (!mappedAsset) {
      const { data: row } = await db
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
          model: row.model || d.tipo || (row.category === 'hidrantes' ? 'Abrigo de Hidrante' : row.category === 'bombas' ? 'Casa de Bombas' : 'Equipamento SPCI'),
          location: row.location || d.location || 'Planta Operacional',
          subLocation: row.sub_location || d.sub_location || d.setor || '',
          status: row.status || 'Conforme',
          statusEstoque: row.status_estoque || row.status_operacional || d.status_estoque || 'NA ÁREA (APLICADO)',
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
    }

    // 3. Fallback direto na tabela ativos_extintores caso a view ou assets falhem
    if (!mappedAsset && (idUpper.startsWith('EXT-') || isUuid)) {
      const { data: directExt } = await db
        .from('ativos_extintores')
        .select('*')
        .or(`id.eq.${idUpper},numero_patrimonio.eq.${idUpper}`)
        .maybeSingle();

      if (directExt) {
        mappedAsset = {
          id: directExt.id,
          idAtivo: directExt.numero_patrimonio,
          category: 'extintores',
          model: 'Extintor de Incêndio',
          location: 'Planta Operacional',
          subLocation: '',
          status: 'Conforme',
          statusEstoque: 'NA ÁREA (APLICADO)',
          seloInmetro: directExt.selo_inmetro,
          numeroSerie: directExt.chassi,
          chassi: directExt.chassi,
          dataUltimaRecarga: directExt.data_ultima_recarga,
          anoUltimoTesteHidro: directExt.ano_ultimo_teste_hidro,
          fotoUrl: directExt.foto_url,
          details: directExt
        };
      }
    }
  } catch (error) {
    console.error('Erro ao buscar ativo no Supabase:', error);
  }

  return <AtivoPublicClient initialAsset={mappedAsset} searchedId={idUpper} />;
}
