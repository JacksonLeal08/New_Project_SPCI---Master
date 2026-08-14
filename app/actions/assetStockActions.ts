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
  fabricante?: string;
  peso_capacidade?: string;
  validadeRecarga?: string;
  ultima_recarga?: string;
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
      model: row.model || row.details?.model || 'Padrão',
      fabricante: row.fabricante || row.details?.fabricante || 'Kidde',
      peso_capacidade: row.peso_capacidade || row.peso || row.details?.peso_capacidade || '4KG',
      validadeRecarga: row.validadeRecarga || row.data_vencimento_teste || row.details?.validadeRecarga || null,
      ultima_recarga: row.details?.ultima_recarga || null,
      location: row.location || 'Almoxarifado',
      sub_location: row.sub_location || 'Estoque',
      status: row.status || 'Conforme',
      status_estoque: (row.status_estoque as StatusEstoqueType) || 'ESTOQUE APLICAÇÃO',
      numero_serie: row.numero_serie || row.details?.serialNumber || '',
      patrimonio: row.patrimonio || row.id_ativo || row.id,
      data_fabricacao: row.data_fabricacao || null,
      data_vencimento_teste: row.data_vencimento_teste || row.validadeRecarga || null,
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
      data_vencimento_teste: asset.validadeRecarga || asset.data_vencimento_teste || null,
      details: {
        ...(asset.details || {}),
        fabricante: asset.fabricante || 'Kidde',
        peso_capacidade: asset.peso_capacidade || '4KG',
        validadeRecarga: asset.validadeRecarga || null,
        ultima_recarga: asset.ultima_recarga || null
      },
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
 * Realiza a importação ou edição em massa de ativos por planilha XLSX/CSV (Upsert inteligente por patrimônio/série)
 */
export async function bulkImportAssetsAction(
  rows: Array<{
    patrimonio?: string;
    numero_serie?: string;
    tipo_ativo?: string;
    modelo?: string;
    capacidade_peso?: string;
    fabricante?: string;
    mes_ano_ultima_recarga?: string;
    mes_ano_vencimento?: string;
    formattedRecarga?: string;
    formattedVencimento?: string;
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

    // Busca ativos existentes para atualizar por patrimônio ou número de série (Edição em Massa via XLSX)
    const { data: existingAssets } = await supabaseAdmin
      .from('assets')
      .select('id, id_ativo, patrimonio, numero_serie, category, model, location, sub_location, status_estoque, details');

    const existingMapByPatrimonio = new Map<string, any>();
    const existingMapBySerie = new Map<string, any>();

    (existingAssets || []).forEach((item: any) => {
      if (item.patrimonio) existingMapByPatrimonio.set(String(item.patrimonio).trim().toLowerCase(), item);
      if (item.id_ativo) existingMapByPatrimonio.set(String(item.id_ativo).trim().toLowerCase(), item);
      if (item.numero_serie) existingMapBySerie.set(String(item.numero_serie).trim().toLowerCase(), item);
      if (item.details?.serialNumber) existingMapBySerie.set(String(item.details.serialNumber).trim().toLowerCase(), item);
    });

    const payloadAssets: any[] = [];
    const payloadMovements: any[] = [];

    rows.forEach((r, idx) => {
      const pat = (r.patrimonio || '').trim();
      const numSerie = (r.numero_serie || '').trim();

      // Procura ativo existente para atualizar em lote
      const matchAsset =
        (pat ? existingMapByPatrimonio.get(pat.toLowerCase()) : null) ||
        (numSerie ? existingMapBySerie.get(numSerie.toLowerCase()) : null);

      const assetId = matchAsset
        ? matchAsset.id
        : `imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

      const finalPat = pat || (matchAsset?.patrimonio || matchAsset?.id_ativo) || `PAT-${Date.now()}-${idx}`;
      const finalNumSerie = numSerie || matchAsset?.numero_serie || `SN-${Date.now()}-${idx}`;

      const validadeFormatted = r.formattedVencimento || r.mes_ano_vencimento || matchAsset?.details?.validadeRecarga || null;
      const recargaFormatted = r.formattedRecarga || r.mes_ano_ultima_recarga || matchAsset?.details?.ultima_recarga || null;

      payloadAssets.push({
        id: assetId,
        id_ativo: finalPat,
        patrimonio: finalPat,
        numero_serie: finalNumSerie,
        category: (r.tipo_ativo || matchAsset?.category || 'extintores').toLowerCase().includes('hidrante')
          ? 'hidrantes'
          : (r.tipo_ativo || matchAsset?.category || 'extintores').toLowerCase(),
        model: r.modelo || matchAsset?.model || 'Padrão',
        location: r.location || matchAsset?.location || 'Almoxarifado',
        sub_location: r.sub_location || matchAsset?.sub_location || 'Estoque',
        status: 'Conforme',
        status_estoque: categoriaDestino || matchAsset?.status_estoque || 'ESTOQUE APLICAÇÃO',
        data_vencimento_teste: validadeFormatted,
        details: {
          ...(matchAsset?.details || {}),
          fabricante: r.fabricante || matchAsset?.details?.fabricante || 'Kidde',
          peso_capacidade: r.capacidade_peso || matchAsset?.details?.peso_capacidade || '4KG',
          validadeRecarga: validadeFormatted,
          ultima_recarga: recargaFormatted,
          serialNumber: finalNumSerie
        },
        created_at: matchAsset?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      payloadMovements.push({
        asset_id: assetId,
        id_ativo: finalPat,
        status_anterior: matchAsset?.status_estoque || 'N/A (Novo Cadastro)',
        status_novo: categoriaDestino,
        motivo_movimentacao: matchAsset ? 'Edição/Atualização em Massa via Planilha XLSX' : 'Importação em Massa via Planilha XLSX',
        usuario_nome: usuarioNome,
        created_at: new Date().toISOString()
      });
    });

    const { error: errAssets } = await supabaseAdmin.from('assets').upsert(payloadAssets, { onConflict: 'id' });

    if (errAssets) {
      console.warn('[bulkImportAssetsAction] Erro no upsert de ativos:', errAssets.message);
      return { success: false, error: errAssets.message };
    }

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
 * Realiza a edição/atualização em massa (Cockpit Batch Update) para múltiplos ativos selecionados via UI
 */
export async function bulkUpdateAssetsAction(
  assetIds: string[],
  updates: {
    status_estoque?: StatusEstoqueType;
    status?: string;
    fabricante?: string;
    model?: string;
    peso_capacidade?: string;
    validadeRecarga?: string | null;
    ultima_recarga?: string | null;
    location?: string;
    sub_location?: string;
  },
  usuarioNome: string = 'Gestor'
) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    if (!assetIds || assetIds.length === 0) {
      return { success: false, error: 'Nenhum ativo selecionado para atualização em massa.' };
    }

    // Busca itens atuais para preservar details existentes
    const { data: existingAssets, error: fetchErr } = await supabaseAdmin
      .from('assets')
      .select('id, id_ativo, status_estoque, details')
      .in('id', assetIds);

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const payloadMovements: any[] = [];
    let updatedCount = 0;

    for (const item of existingAssets || []) {
      const currentDetails = item.details || {};
      const newDetails = { ...currentDetails };

      if (updates.fabricante !== undefined && updates.fabricante !== '') {
        newDetails.fabricante = updates.fabricante;
      }
      if (updates.peso_capacidade !== undefined && updates.peso_capacidade !== '') {
        newDetails.peso_capacidade = updates.peso_capacidade;
      }
      if (updates.validadeRecarga !== undefined && updates.validadeRecarga !== '') {
        newDetails.validadeRecarga = updates.validadeRecarga;
      }
      if (updates.ultima_recarga !== undefined && updates.ultima_recarga !== '') {
        newDetails.ultima_recarga = updates.ultima_recarga;
      }

      const updateData: any = {
        details: newDetails,
        updated_at: new Date().toISOString()
      };

      if (updates.status_estoque) {
        updateData.status_estoque = updates.status_estoque;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.model) {
        updateData.model = updates.model;
      }
      if (updates.location) {
        updateData.location = updates.location;
      }
      if (updates.sub_location) {
        updateData.sub_location = updates.sub_location;
      }
      if (updates.validadeRecarga) {
        updateData.data_vencimento_teste = updates.validadeRecarga;
      }

      const { error: errUpd } = await supabaseAdmin
        .from('assets')
        .update(updateData)
        .eq('id', item.id);

      if (!errUpd) {
        updatedCount++;
        if (updates.status_estoque && updates.status_estoque !== item.status_estoque) {
          payloadMovements.push({
            asset_id: item.id,
            id_ativo: item.id_ativo,
            status_anterior: item.status_estoque || 'ESTOQUE APLICAÇÃO',
            status_novo: updates.status_estoque,
            motivo_movimentacao: 'Edição em Massa via Cockpit',
            usuario_nome: usuarioNome,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    if (payloadMovements.length > 0) {
      try {
        await supabaseAdmin.from('ativo_movimentacoes').insert(payloadMovements);
      } catch (e) {}
    }

    return { success: true, updatedCount };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro na atualização em massa.' };
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
