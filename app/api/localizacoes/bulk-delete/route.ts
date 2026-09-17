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
    const { ids, contrato_id, usuario_id, usuario_nome } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lista de IDs para exclusão é obrigatória.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Tenta executar via RPC atômica caso a função PL/pgSQL esteja instalada no Supabase
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('bulk_delete_localizacoes_operacionais', {
        p_ids: ids,
        p_contrato_id: contrato_id || null,
        p_usuario_id: usuario_id || null,
        p_usuario_nome: usuario_nome || 'Operador SPCI'
      });

      if (!rpcErr && rpcData) {
        if (rpcData.sucesso === false) {
          return NextResponse.json(
            { success: false, error: rpcData.erro, detalhes: rpcData },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          quantidade_excluida: rpcData.quantidade_excluida,
          ids_excluidos: rpcData.ids_excluidos,
          via_rpc: true
        });
      }
    } catch (rpcCatch) {
      console.warn('[bulk-delete] RPC falhou ou não instalada, executando fallback com validação server-side:', rpcCatch);
    }

    // 2. FALLBACK COM REVALIDAÇÃO ESTRITA NO SERVIDOR
    // A. Busca os locais para confirmar existência
    const { data: locs, error: locErr } = await supabase
      .from('localizacoes_operacionais')
      .select('id, setor_planta, sub_local, contrato_id')
      .in('id', ids);

    if (locErr) throw locErr;
    if (!locs || locs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum registro encontrado para exclusão.' },
        { status: 404 }
      );
    }

    // B. Revalidação contra concorrência: assegura que NENHUM local a excluir possui ativos operacionais
    const setorNomes = Array.from(new Set(locs.map(l => l.setor_planta).filter(Boolean)));
    const { data: assetsDb } = await supabase
      .from('assets')
      .select('id, location, sub_location, status')
      .in('location', setorNomes);

    const { data: extDb } = await supabase
      .from('ativos_extintores')
      .select('id, setor_planta, sub_local, local_id, sub_local_id, status_operacional');

    const impedimentos: string[] = [];

    for (const loc of locs) {
      const setorLimpo = (loc.setor_planta || '').trim().toUpperCase();
      const subLimpo = (loc.sub_local || '').trim().toUpperCase();
      const locId = String(loc.id).toLowerCase();

      const hasAsset = (assetsDb || []).some(a => {
        const aLoc = (a.location || '').trim().toUpperCase();
        const aSub = (a.sub_location || '').trim().toUpperCase();
        const aStatus = String(a.status || '').toUpperCase();
        if (aStatus.includes('CONDENADO') || aStatus.includes('DESCARTE')) return false;
        return aLoc === setorLimpo && aSub === subLimpo;
      });

      const hasExt = (extDb || []).some(e => {
        const eLoc = (e.setor_planta || '').trim().toUpperCase();
        const eSub = (e.sub_local || '').trim().toUpperCase();
        const eLocalId = String(e.local_id || '').toLowerCase();
        const eSubId = String(e.sub_local_id || '').toLowerCase();
        const eStatus = String(e.status_operacional || '').toUpperCase();
        if (eStatus === 'CONDENADO_DESCARTE') return false;
        return (eLoc === setorLimpo && eSub === subLimpo) || (eLocalId === locId || eSubId === locId);
      });

      if (hasAsset || hasExt) {
        impedimentos.push(`${loc.setor_planta} - ${loc.sub_local}`);
      }
    }

    if (impedimentos.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `OPERAÇÃO_BLOQUEADA: Não é permitido excluir locais com ativos vinculados (${impedimentos.join(', ')}). Remaneje os equipamentos primeiro.` 
        },
        { status: 400 }
      );
    }

    // C. Executa a deleção
    const { error: delErr } = await supabase
      .from('localizacoes_operacionais')
      .delete()
      .in('id', ids);

    if (delErr) throw delErr;

    // D. Grava log de auditoria
    try {
      await supabase.from('logs_auditoria').insert([{
        acao: 'EXCLUSAO_MASSA_LOCAIS',
        tabela: 'localizacoes_operacionais',
        usuario_id: usuario_id || null,
        usuario_nome: usuario_nome || 'Operador SPCI',
        detalhes: JSON.stringify({
          quantidade_excluida: ids.length,
          ids_excluidos: ids,
          contrato_id: contrato_id || null,
          locais_removidos: locs.map(l => `${l.setor_planta} > ${l.sub_local}`)
        }),
        created_at: new Date().toISOString()
      }]);
    } catch (auditErr) {
      console.warn('[bulk-delete] Falha ao gravar log_auditoria (não fatal):', auditErr);
    }

    return NextResponse.json({
      success: true,
      quantidade_excluida: ids.length,
      ids_excluidos: ids,
      via_rpc: false
    });

  } catch (err: any) {
    console.error('[API bulk-delete] Erro:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno na exclusão em massa.' },
      { status: 500 }
    );
  }
}
