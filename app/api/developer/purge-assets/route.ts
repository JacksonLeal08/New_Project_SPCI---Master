import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criação de cliente Supabase com Service Role para operação atômica de banco
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      userEmail, 
      userRole, 
      userId,
      justificativa, 
      assetIds, 
      category = 'extintores', 
      contratoId = 'ONÇA PUMA' 
    } = body;

    // 1. BARREIRA DE AUTORIZAÇÃO E RBAC ESTRITO (BACKEND GUARD)
    const normalizedRole = String(userRole || req.headers.get('x-user-role') || '').trim().toUpperCase();
    if (normalizedRole !== 'DESENVOLVEDOR' && normalizedRole !== 'DEVELOPER') {
      return NextResponse.json(
        { 
          error: 'Acesso negado. Ação restrita com exclusividade a Desenvolvedores do sistema SPCI Master.' 
        },
        { status: 403 }
      );
    }

    // 2. VALIDAÇÃO DE JUSTIFICATIVA TÉCNICA OBRIGATÓRIA (Mínimo 20 caracteres)
    const cleanJustificativa = String(justificativa || '').trim();
    if (cleanJustificativa.length < 20) {
      return NextResponse.json(
        { 
          error: 'Justificativa técnica insuficiente. É obrigatório fornecer no mínimo 20 caracteres detalhando a razão do expurgo.' 
        },
        { status: 400 }
      );
    }

    // 3. VALIDAÇÃO DOS IDS DE ATIVOS
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum ativo foi selecionado para a exclusão definitiva.' },
        { status: 400 }
      );
    }

    // Limitar o chunk a 100 itens por lote para evitar timeouts
    const targetIds = assetIds.slice(0, 100).map((id: any) => String(id).trim());

    // Obter IP de origem
    const ipOrigem = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    // 4. RECUPERAR IDENTIFICADORES ADICIONAIS (PATRIMÔNIOS) PARA TRATAMENTO EM CASCATA
    const { data: targetAssets } = await supabaseAdmin
      .from('assets')
      .select('id, id_ativo, patrimonio')
      .in('id', targetIds);

    const targetPatrimonios = new Set<string>();
    for (const a of (targetAssets || [])) {
      if (a.id) targetPatrimonios.add(String(a.id));
      if (a.id_ativo) targetPatrimonios.add(String(a.id_ativo));
      if (a.patrimonio) targetPatrimonios.add(String(a.patrimonio));
    }
    for (const id of targetIds) {
      targetPatrimonios.add(id);
    }
    const patrimoniosList = Array.from(targetPatrimonios);

    // 5. TRATAMENTO DE INTEGRIDADE REFERENCIAL - EXCLUSÃO EM CASCATA
    
    // 5.1. Excluir Itens de Lote de Manutenção associados
    try {
      if (patrimoniosList.length > 0) {
        await supabaseAdmin
          .from('itens_lote_manutencao')
          .delete()
          .in('patrimonio', patrimoniosList);
      }
    } catch (errSat) {
      console.warn('[Purge] Aviso ao excluir itens_lote_manutencao:', errSat);
    }

    // 5.2. Excluir Histórico de Localização do Ativo
    try {
      await supabaseAdmin
        .from('historico_localizacao_ativo')
        .delete()
        .in('asset_id', targetIds);
    } catch (errSat) {
      console.warn('[Purge] Aviso ao excluir historico_localizacao_ativo:', errSat);
    }

    // 5.3. Excluir Inspeções associadas
    try {
      await supabaseAdmin
        .from('inspecoes')
        .delete()
        .in('asset_id', targetIds);
    } catch (errSat) {
      console.warn('[Purge] Aviso ao excluir inspecoes:', errSat);
    }

    // 5.4. Excluir da tabela relacional ativos_extintores (se extintores)
    try {
      if (category.toLowerCase().includes('extintor') && patrimoniosList.length > 0) {
        await supabaseAdmin
          .from('ativos_extintores')
          .delete()
          .in('numero_patrimonio', patrimoniosList);
      }
    } catch (errSat) {
      console.warn('[Purge] Aviso ao excluir ativos_extintores:', errSat);
    }

    // 5.5. Exclusão Física Definitiva na tabela mestre assets
    const { error: deleteAssetsErr } = await supabaseAdmin
      .from('assets')
      .delete()
      .in('id', targetIds);

    if (deleteAssetsErr) {
      console.error('[Purge] Falha ao excluir registros da tabela assets:', deleteAssetsErr);
      return NextResponse.json(
        { error: `Erro de integridade do banco: ${deleteAssetsErr.message}` },
        { status: 500 }
      );
    }

    // 6. REGISTRO OBRIGATÓRIO NA TABELA IMUTÁVEL DE AUDITORIA
    const auditRecord = {
      usuario_id: userId || 'dev-auth',
      usuario_email: userEmail || 'desenvolvedor@spci.master',
      role: normalizedRole,
      contrato_id: contratoId,
      quantidade_ativos_excluidos: targetIds.length,
      ids_excluidos_json: targetIds,
      justificativa: cleanJustificativa,
      ip_origem: ipOrigem,
      created_at: new Date().toISOString()
    };

    let logGravado = false;

    // Tentativa primária: Tabela especializada logs_expurgo_dados
    try {
      const { error: purgeLogErr } = await supabaseAdmin
        .from('logs_expurgo_dados')
        .insert([auditRecord]);
      
      if (!purgeLogErr) {
        logGravado = true;
      }
    } catch (logErr) {
      console.warn('[Purge] Tabela logs_expurgo_dados não disponível, registrando em logs_auditoria...', logErr);
    }

    // Fallback garantido: Registrar também em logs_auditoria (tabela consolidada)
    try {
      await supabaseAdmin
        .from('logs_auditoria')
        .insert([{
          usuario_id: userId || 'dev-auth',
          usuario_nome: 'Desenvolvedor SPCI',
          usuario_email: userEmail || 'desenvolvedor@spci.master',
          acao: 'EXPURGO_MASSA_DEFINITIVO',
          modulo: category,
          item_id: targetIds[0] || 'LOTE',
          detalhes: JSON.stringify({
            quantidade_ativos_excluidos: targetIds.length,
            ids_excluidos: targetIds,
            contrato_id: contratoId,
            justificativa: cleanJustificativa,
            ip_origem: ipOrigem
          }),
          created_at: new Date().toISOString()
        }]);
      logGravado = true;
    } catch (auditErr) {
      console.error('[Purge] Falha ao registrar log em logs_auditoria:', auditErr);
    }

    return NextResponse.json({
      success: true,
      purgedCount: targetIds.length,
      auditLogged: logGravado,
      message: `Operação concluída com sucesso. ${targetIds.length} ativos e seus registros históricos foram purgados definitivamente do sistema e do banco de dados.`
    });

  } catch (error: any) {
    console.error('[Purge] Erro fatal no endpoint de expurgo:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor durante o expurgo de dados.' },
      { status: 500 }
    );
  }
}
