import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SITE_URL } from '@/config/seo';
import AtivosPublicCatalogClient, { CatalogAssetItem } from './AtivosPublicCatalogClient';

export const metadata: Metadata = {
  title: 'Catálogo de Ativos na Área & Visibilidade Operacional | SPCI Master',
  description: 'Portal público de rastreabilidade e consulta de extintores, hidrantes, casas de bombas e equipamentos de combate a incêndio ativos na planta.',
  alternates: {
    canonical: '/public/ativos',
  },
  openGraph: {
    title: 'Catálogo Público de Ativos SPCI Master',
    description: 'Verificação em tempo real de conformidade e integridade dos equipamentos de combate a incêndio.',
    url: `${SITE_URL}/public/ativos`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catálogo Público de Ativos SPCI Master',
    description: 'Auditoria técnica e visibilidade pública de equipamentos de segurança contra incêndio.',
  },
};

export default async function PublicAtivosPage() {
  let initialAssets: CatalogAssetItem[] = [];

  try {
    const { data: rows, error } = await supabase
      .from('assets')
      .select('*')
      .order('id_ativo', { ascending: true })
      .limit(300);

    if (rows && !error) {
      initialAssets = rows.map((row) => {
        const d = row.details || {};
        return {
          id: row.id,
          idAtivo: row.id_ativo || row.patrimonio || row.id,
          category: row.category || 'extintores',
          model: row.model || d.tipo || 'Equipamento SPCI',
          location: row.location || d.location || 'Planta Operacional',
          subLocation: row.sub_location || d.sub_location || d.setor || '',
          status: row.status || 'Conforme',
          statusEstoque: row.status_estoque || d.status_estoque || 'NA ÁREA (APLICADO)',
          validadeRecarga: d.validadeRecarga || d.validade_recarga,
          dataVencimentoTeste: row.data_vencimento_teste || d.data_vencimento_teste,
          anoUltimoTesteHidro: d.ano_ultimo_teste_hidro || d.ultimoTesteHidro,
          seloInmetro: d.seloInmetro || d.inmetro || d.selo_inmetro,
          fotoUrl: d.foto_url || d.fotoUrl || null,
        };
      });
    }
  } catch (err) {
    console.error('Erro ao carregar catálogo público de ativos:', err);
  }

  return <AtivosPublicCatalogClient initialAssets={initialAssets} />;
}
