import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids, contrato_id } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lista de IDs de localizações é obrigatória.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Busca as localizações selecionadas
    const { data: locs, error: locErr } = await supabase
      .from('localizacoes_operacionais')
      .select('*')
      .in('id', ids);

    if (locErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao consultar localizações: ${locErr.message}` },
        { status: 500 }
      );
    }

    if (!locs || locs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma localização encontrada para os IDs fornecidos.' },
        { status: 404 }
      );
    }

    // 2. Busca ativos gerais na tabela assets que coincidam com esses setores / sub-locais
    const setorNomes = Array.from(new Set(locs.map(l => l.setor_planta).filter(Boolean)));
    const { data: assetsDb } = await supabase
      .from('assets')
      .select('id, id_ativo, patrimonio, category, status, location, sub_location, site')
      .in('location', setorNomes);

    // 3. Busca extintores na tabela ativos_extintores que coincidam por nome ou IDs
    const { data: extDb } = await supabase
      .from('ativos_extintores')
      .select('id, numero_patrimonio, status_inspecao, status_operacional, setor_planta, sub_local, local_id, sub_local_id');

    // 4. Triagem e Auditoria de Vínculos
    const aptos: any[] = [];
    const bloqueados: any[] = [];

    for (const loc of locs) {
      const setorLimpo = (loc.setor_planta || '').trim().toUpperCase();
      const subLimpo = (loc.sub_local || '').trim().toUpperCase();
      const locId = String(loc.id).toLowerCase();

      // Ativos vinculados em 'assets'
      const vinculadosAssets = (assetsDb || []).filter(a => {
        const aLoc = (a.location || '').trim().toUpperCase();
        const aSub = (a.sub_location || '').trim().toUpperCase();
        const aStatus = String(a.status || '').toUpperCase();
        if (aStatus.includes('CONDENADO') || aStatus.includes('DESCARTE')) return false;
        
        return aLoc === setorLimpo && aSub === subLimpo;
      }).map(a => ({
        id: a.id,
        patrimonio: a.id_ativo || a.patrimonio || 'S/N',
        categoria: a.category || 'Ativo Geral',
        status: a.status || 'Ativo na Área'
      }));

      // Ativos vinculados em 'ativos_extintores'
      const vinculadosExts = (extDb || []).filter(e => {
        const eLoc = (e.setor_planta || '').trim().toUpperCase();
        const eSub = (e.sub_local || '').trim().toUpperCase();
        const eLocalId = String(e.local_id || '').toLowerCase();
        const eSubId = String(e.sub_local_id || '').toLowerCase();
        const eStatus = String(e.status_operacional || '').toUpperCase();
        if (eStatus === 'CONDENADO_DESCARTE') return false;

        const matchNome = (eLoc === setorLimpo && eSub === subLimpo);
        const matchId = (eLocalId === locId || eSubId === locId);
        return matchNome || matchId;
      }).map(e => ({
        id: e.id,
        patrimonio: e.numero_patrimonio || 'EXT-S/N',
        categoria: 'Extintor',
        status: e.status_operacional || e.status_inspecao || 'Operacional'
      }));

      // Combina e deduplica por patrimônio
      const todosVinculadosMap = new Map<string, any>();
      [...vinculadosAssets, ...vinculadosExts].forEach(v => {
        todosVinculadosMap.set(String(v.patrimonio).toUpperCase(), v);
      });
      const todosVinculados = Array.from(todosVinculadosMap.values());

      if (todosVinculados.length > 0) {
        bloqueados.push({
          localizacao: loc,
          totalAtivos: todosVinculados.length,
          ativos: todosVinculados
        });
      } else {
        aptos.push(loc);
      }
    }

    return NextResponse.json({
      success: true,
      totalSolicitado: locs.length,
      totalAptos: aptos.length,
      totalBloqueados: bloqueados.length,
      aptos,
      bloqueados
    });

  } catch (err: any) {
    console.error('[API validate-bulk-delete] Erro:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno na validação prévia.' },
      { status: 500 }
    );
  }
}
