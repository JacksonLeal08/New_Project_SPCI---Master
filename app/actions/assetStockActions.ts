'use server';

import { createClient } from '@supabase/supabase-js';

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configuração ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão configuradas no servidor.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export type StatusEstoqueType =
  | 'ESTOQUE APLICAÇÃO'
  | 'ESTOQUE MANUTENÇÃO'
  | 'EM MANUTENÇÃO'
  | 'CONDENADOS';

export interface AssetStockItemRecord {
  id: string;
  id_ativo: string;
  category: string;
  model: string;
  location: string;
  sub_location: string;
  status: string;
  status_estoque: StatusEstoqueType;
  numero_serie?: string;
  patrimonio?: string;
  data_fabricacao?: string;
  data_vencimento_teste?: string;
  details?: any;
  created_at?: string;
  updated_at?: string;
}

export interface AssetMovementRecord {
  id: string;
  asset_id: string;
  id_ativo: string;
  status_anterior: string;
  status_novo: string;
  motivo_movimentacao: string;
  usuario_nome: string;
  usuario_email?: string;
  observacao?: string;
  created_at: string;
}

/**
 * Busca a lista completa de ativos de estoque registrados no Supabase
 */
export async function getAssetStockItemsAction(statusEstoque?: string) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    let query = supabaseAdmin.from('assets').select('*');

    if (statusEstoque && statusEstoque !== 'Todos') {
      query = query.eq('status_estoque', statusEstoque);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[getAssetStockItemsAction] Erro no Supabase:', error.message);
      return { success: false, error: error.message, assets: [] };
    }

    const assets: AssetStockItemRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      id_ativo: row.id_ativo || row.id,
      category: row.category || 'extintores',
      model: row.model || 'Padrão',
      location: row.location || 'Almoxarifado',
      sub_location: row.sub_location || 'Estoque',
      status: row.status || 'Conforme',
      status_estoque: (row.status_estoque as StatusEstoqueType) || 'ESTOQUE APLICAÇÃO',
      numero_serie: row.numero_serie || row.details?.serialNumber || '',
      patrimonio: row.patrimonio || row.id_ativo || row.id,
      data_fabricacao: row.data_fabricacao || null,
      data_vencimento_teste: row.data_vencimento_teste || null,
      details: row.details || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return { success: true, assets };
  } catch (err: any) {
    console.error('[getAssetStockItemsAction Catch]:', err);
    return { success: false, error: err.message || 'Erro ao buscar estoque.', assets: [] };
  }
}

/**
 * Cadastra ou edita um ativo individualmente no estoque
 */
export async function saveSingleAssetStockAction(asset: Partial<AssetStockItemRecord>) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const assetId = asset.id || `ast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const patrimonio = asset.patrimonio || asset.id_ativo || assetId;

    const payload = {
      id: assetId,
      id_ativo: patrimonio,
      patrimonio: patrimonio,
      numero_serie: asset.numero_serie || '',
      category: asset.category || 'extintores',
      model: asset.model || 'Padrão',
      location: asset.location || 'Almoxarifado',
      sub_location: asset.sub_location || 'Geral',
      status: asset.status || 'Conforme',
      status_estoque: asset.status_estoque || 'ESTOQUE APLICAÇÃO',
      data_fabricacao: asset.data_fabricacao || null,
      data_vencimento_teste: asset.data_vencimento_teste || null,
      details: asset.details || {},
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin.from('assets').upsert(payload, { onConflict: 'id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, assetId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar ativo.' };
  }
}

/**
 * Realiza a importação em massa de ativos exigindo a categoria de destino obrigatória
 */
export async function bulkImportAssetsAction(
  rows: Array<{
    patrimonio?: string;
    numero_serie?: string;
    tipo_ativo?: string;
    modelo?: string;
    location?: string;
    sub_location?: string;
  }>,
  categoriaDestino: StatusEstoqueType,
  usuarioNome: string = 'Administrador'
) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    if (!categoriaDestino) {
      return { success: false, error: 'A categoria de destino do estoque é obrigatória.' };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'Nenhum item válido para importação.' };
    }

    const payloadAssets: any[] = [];
    const payloadMovements: any[] = [];

    rows.forEach((r, idx) => {
      const assetId = `imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const pat = r.patrimonio || `PAT-${Date.now()}-${idx}`;
      const numSerie = r.numero_serie || `SN-${Date.now()}-${idx}`;

      payloadAssets.push({
        id: assetId,
        id_ativo: pat,
        patrimonio: pat,
        numero_serie: numSerie,
        category: (r.tipo_ativo || 'Extintor').toLowerCase().includes('hidrante') ? 'hidrantes' : 'extintores',
        model: r.modelo || 'Padrão',
        location: r.location || 'Almoxarifado',
        sub_location: r.sub_location || 'Estoque',
        status: 'Conforme',
        status_estoque: categoriaDestino,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      payloadMovements.push({
        asset_id: assetId,
        id_ativo: pat,
        status_anterior: 'N/A (Novo Cadastro)',
        status_novo: categoriaDestino,
        motivo_movimentacao: 'Importação em Massa via Planilha XLSX',
        usuario_nome: usuarioNome,
        created_at: new Date().toISOString()
      });
    });

    const { error: errAssets } = await supabaseAdmin.from('assets').upsert(payloadAssets, { onConflict: 'id' });

    if (errAssets) {
      console.warn('[bulkImportAssetsAction] Aviso ao salvar assets:', errAssets.message);
      return { success: false, error: errAssets.message };
    }

    // Tenta gravar auditoria de movimentações se a tabela existir
    try {
      await supabaseAdmin.from('ativo_movimentacoes').insert(payloadMovements);
    } catch (e) {
      console.warn('[bulkImportAssetsAction] Aviso em movimentações:', e);
    }

    return { success: true, totalImportados: payloadAssets.length };
  } catch (err: any) {
    console.error('[bulkImportAssetsAction Catch]:', err);
    return { success: false, error: err.message || 'Erro na importação em massa.' };
  }
}

/**
 * Altera o status operacional do ativo e gera o histórico de auditoria
 */
export async function moveAssetStatusAction(
  assetId: string,
  idAtivo: string,
  statusNovo: StatusEstoqueType,
  statusAnterior: string,
  motivo: string,
  usuarioNome: string = 'Operador'
) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Atualiza status_estoque no asset
    const { error: errUpdate } = await supabaseAdmin
      .from('assets')
      .update({
        status_estoque: statusNovo,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (errUpdate) {
      return { success: false, error: errUpdate.message };
    }

    // 2. Grava histórico na tabela ativo_movimentacoes
    const movementPayload = {
      asset_id: assetId,
      id_ativo: idAtivo,
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      motivo_movimentacao: motivo || 'Movimentação manual de estoque',
      usuario_nome: usuarioNome,
      created_at: new Date().toISOString()
    };

    const { error: errMov } = await supabaseAdmin.from('ativo_movimentacoes').insert([movementPayload]);

    if (errMov) {
      console.warn('[moveAssetStatusAction] Aviso ao registrar histórico:', errMov.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao movimentar status do ativo.' };
  }
}

/**
 * Busca a linha do tempo de auditoria de movimentações de um determinado ativo
 */
export async function getAssetMovementsHistoryAction(assetId: string) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('ativo_movimentacoes')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, history: [] };
    }

    const history: AssetMovementRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      asset_id: row.asset_id,
      id_ativo: row.id_ativo,
      status_anterior: row.status_anterior || 'Desconhecido',
      status_novo: row.status_novo,
      motivo_movimentacao: row.motivo_movimentacao || 'Sem motivo registrado',
      usuario_nome: row.usuario_nome || 'Sistema',
      usuario_email: row.usuario_email,
      observacao: row.observacao,
      created_at: row.created_at
    }));

    return { success: true, history };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar histórico.', history: [] };
  }
}
