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

export interface CreateBatchItemPayload {
  asset_id: string;
  id_ativo: string;
  patrimonio?: string;
  numero_serie?: string;
  modelo_tipo?: string;
  capacidade?: string;
  fabricante?: string;
  selo_inmetro_anterior?: string;
  data_ultimo_hidro?: string;
  data_ultima_recarga?: string;
}

export interface CreateBatchPayload {
  fornecedor_nome: string;
  fornecedor_cnpj?: string;
  fornecedor_contato?: string;
  previsao_retorno?: string;
  observacoes?: string;
  usuario_envio_nome: string;
  usuario_envio_email?: string;
  itens: CreateBatchItemPayload[];
}

export interface TriageItemResult {
  item_id: string;
  asset_id: string;
  id_ativo: string;
  status_triagem: 'APROVADO' | 'CONDENADO';
  novo_selo_inmetro?: string;
  nova_validade_recarga?: string; // YYYY-MM-DD
  nova_validade_hidro?: string;   // YYYY-MM-DD
  motivo_condenacao?: string;
  laudo_url?: string;
  observacoes_triagem?: string;
}

export interface TriageBatchPayload {
  lote_id: string;
  usuario_triagem_nome: string;
  usuario_triagem_email?: string;
  itens_triagem: TriageItemResult[];
}

export interface LoteManutencaoRecord {
  id: string;
  numero_lote: string;
  fornecedor_nome: string;
  fornecedor_cnpj?: string;
  fornecedor_contato?: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  total_itens: number;
  total_aprovados: number;
  total_condenados: number;
  data_envio: string;
  previsao_retorno?: string;
  data_finalizacao?: string;
  usuario_envio_nome: string;
  usuario_envio_email?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  dias_em_manutencao?: number;
  itens?: ItemLoteManutencaoRecord[];
}

export interface ItemLoteManutencaoRecord {
  id: string;
  lote_id: string;
  asset_id: string;
  id_ativo: string;
  patrimonio?: string;
  numero_serie?: string;
  modelo_tipo?: string;
  capacidade?: string;
  fabricante?: string;
  selo_inmetro_anterior?: string;
  data_ultimo_hidro?: string;
  data_ultima_recarga?: string;
  status_triagem: 'PENDENTE' | 'APROVADO' | 'CONDENADO';
  novo_selo_inmetro?: string;
  nova_validade_recarga?: string;
  nova_validade_hidro?: string;
  motivo_condenacao?: string;
  laudo_url?: string;
  data_triagem?: string;
  usuario_triagem_nome?: string;
  observacoes_triagem?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gera um identificador de lote sequencial anual progressivo para controle contábil
 * Ex: LOTE-MAN-2026-001, LOTE-MAN-2026-002...
 */
async function generateNextLoteCode(supabase: any): Promise<string> {
  const yyyy = new Date().getFullYear();
  const prefix = `LOTE-MAN-${yyyy}-`;

  try {
    const { data, error } = await supabase
      .from('lotes_manutencao')
      .select('numero_lote')
      .ilike('numero_lote', `${prefix}%`);

    if (error || !data || data.length === 0) {
      return `${prefix}001`;
    }

    const numbers = data.map((d: any) => {
      const match = d.numero_lote.match(/LOTE-MAN-\d{4}-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const maxNum = Math.max(0, ...numbers);
    const nextSeq = maxNum + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  } catch (e) {
    console.warn('[generateNextLoteCode] Fallback para 001:', e);
    return `${prefix}001`;
  }
}

/**
 * Cria um novo Lote de Manutenção com seus itens e atualiza os extintores para 'EM MANUTENÇÃO'
 */
export async function createMaintenanceBatchAction(payload: CreateBatchPayload) {
  try {
    const supabase = getSupabaseAdminClient();

    if (!payload.itens || payload.itens.length === 0) {
      return { success: false, error: 'Selecione pelo menos um extintor para gerar o lote.' };
    }

    if (!payload.fornecedor_nome || !payload.fornecedor_nome.trim()) {
      return { success: false, error: 'O nome da empresa/fornecedor prestador de serviço é obrigatório.' };
    }

    const numeroLote = await generateNextLoteCode(supabase);

    // 1. Inserir cabeçalho do lote
    const { data: loteData, error: loteError } = await supabase
      .from('lotes_manutencao')
      .insert({
        numero_lote: numeroLote,
        fornecedor_nome: payload.fornecedor_nome.trim(),
        fornecedor_cnpj: payload.fornecedor_cnpj?.trim() || null,
        status: 'EM_ANDAMENTO',
        total_itens: payload.itens.length,
        total_aprovados: 0,
        total_condenados: 0,
        data_envio: new Date().toISOString(),
        previsao_retorno: payload.previsao_retorno || null,
        usuario_envio_nome: payload.usuario_envio_nome || 'Operador SPCI',
        usuario_envio_email: payload.usuario_envio_email || null,
        observacoes: payload.observacoes?.trim() || null,
      })
      .select()
      .single();

    if (loteError || !loteData) {
      console.error('[createMaintenanceBatchAction] Erro ao criar lote:', loteError);
      const isSchemaError = loteError?.message?.includes('schema cache') || loteError?.message?.includes('does not exist') || loteError?.message?.includes('Could not find');
      const customMsg = isSchemaError
        ? "As tabelas de lotes de manutenção ainda não foram criadas no seu banco de dados Supabase. Por favor, execute o script 'EXECUTAR_NO_SUPABASE_SPCI_MASTER.sql' no SQL Editor do Supabase."
        : `Erro ao criar lote: ${loteError?.message}`;
      return { success: false, error: customMsg };
    }

    const loteId = loteData.id;

    // 2. Inserir os itens do lote
    const itemsToInsert = payload.itens.map((item) => ({
      lote_id: loteId,
      asset_id: item.asset_id,
      id_ativo: item.id_ativo,
      patrimonio: item.patrimonio || item.id_ativo,
      numero_serie: item.numero_serie || null,
      modelo_tipo: item.modelo_tipo || 'EXTINTOR',
      capacidade: item.capacidade || null,
      fabricante: item.fabricante || null,
      selo_inmetro_anterior: item.selo_inmetro_anterior || null,
      data_ultimo_hidro: item.data_ultimo_hidro || null,
      data_ultima_recarga: item.data_ultima_recarga || null,
      status_triagem: 'PENDENTE',
    }));

    const { error: itemsError } = await supabase
      .from('itens_lote_manutencao')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[createMaintenanceBatchAction] Erro ao inserir itens:', itemsError);
      return { success: false, error: `Erro ao adicionar itens ao lote: ${itemsError.message}` };
    }

    // 3. Atualizar status de cada ativo para 'EM MANUTENÇÃO'
    const assetIds = payload.itens.map((i) => i.asset_id).filter(Boolean);

    if (assetIds.length > 0) {
      const { error: updateAssetsError } = await supabase
        .from('assets')
        .update({
          status_estoque: 'EM MANUTENÇÃO',
          tipo_movimentacao: 'em_manutencao',
          lote_manutencao_atual_id: loteId,
          updated_at: new Date().toISOString(),
        })
        .in('id', assetIds);

      if (updateAssetsError) {
        console.warn('[createMaintenanceBatchAction] Aviso ao atualizar assets:', updateAssetsError.message);
      }
    }

    // 4. Registrar logs de auditoria perpétuos para cada ativo
    const auditLogs = payload.itens.map((item) => ({
      asset_id: item.asset_id,
      id_ativo: item.id_ativo,
      tipo_evento: 'ENVIO_MANUTENCAO',
      lote_id: loteId,
      numero_lote: numeroLote,
      status_origem: 'ESTOQUE MANUTENÇÃO',
      status_destino: 'EM MANUTENÇÃO',
      usuario_responsavel_nome: payload.usuario_envio_nome || 'Operador SPCI',
      usuario_responsavel_email: payload.usuario_envio_email || null,
      descricao_evento: `Envio para recarga/teste hidrostático junto ao fornecedor: ${payload.fornecedor_nome}`,
      detalhes_alteracao: {
        fornecedor: payload.fornecedor_nome,
        previsao_retorno: payload.previsao_retorno,
        selo_inmetro_anterior: item.selo_inmetro_anterior,
        modelo_tipo: item.modelo_tipo,
        capacidade: item.capacidade,
      },
    }));

    await supabase.from('historico_movimentacoes_ativos').insert(auditLogs);

    return {
      success: true,
      lote: loteData,
      numero_lote: numeroLote,
      total_itens: payload.itens.length,
    };
  } catch (error: any) {
    console.error('[createMaintenanceBatchAction] Exceção crítica:', error);
    return { success: false, error: error.message || 'Erro inesperado ao gerar lote de manutenção.' };
  }
}

/**
 * Busca a lista de lotes de manutenção registrados
 */
export async function getMaintenanceBatchesAction(statusFilter?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase.from('lotes_manutencao').select('*, itens:itens_lote_manutencao(*)');

    if (statusFilter && statusFilter !== 'TODOS') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.order('data_envio', { ascending: false });

    if (error) {
      console.error('[getMaintenanceBatchesAction] Erro no Supabase:', error);
      return { success: false, error: error.message, lotes: [] };
    }

    // Calcular dias decorridos em manutenção para cada lote
    const now = new Date().getTime();
    const lotesCalculados: LoteManutencaoRecord[] = (data || []).map((lote: any) => {
      const envioTime = new Date(lote.data_envio).getTime();
      const endTime = lote.data_finalizacao ? new Date(lote.data_finalizacao).getTime() : now;
      const diffDays = Math.max(0, Math.floor((endTime - envioTime) / (1000 * 60 * 60 * 24)));

      return {
        ...lote,
        dias_em_manutencao: diffDays,
      };
    });

    return { success: true, lotes: lotesCalculados };
  } catch (error: any) {
    console.error('[getMaintenanceBatchesAction] Exceção:', error);
    return { success: false, error: error.message, lotes: [] };
  }
}

/**
 * Obtém detalhes completos de um lote com seus itens
 */
export async function getMaintenanceBatchDetailAction(loteId: string) {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: lote, error: loteError } = await supabase
      .from('lotes_manutencao')
      .select('*')
      .eq('id', loteId)
      .single();

    if (loteError || !lote) {
      return { success: false, error: 'Lote não encontrado.' };
    }

    const { data: itens, error: itensError } = await supabase
      .from('itens_lote_manutencao')
      .select('*')
      .eq('lote_id', loteId)
      .order('id_ativo', { ascending: true });

    if (itensError) {
      return { success: false, error: `Erro ao buscar itens: ${itensError.message}` };
    }

    return { success: true, lote, itens: itens || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Realiza a conferência de retorno e triagem (Aprovado / Condenado) de itens do lote
 */
export async function triageBatchReturnAction(payload: TriageBatchPayload) {
  try {
    const supabase = getSupabaseAdminClient();

    if (!payload.itens_triagem || payload.itens_triagem.length === 0) {
      return { success: false, error: 'Nenhum item informado para triagem.' };
    }

    // 1. Buscar lote para validação
    const { data: lote, error: loteFetchError } = await supabase
      .from('lotes_manutencao')
      .select('*')
      .eq('id', payload.lote_id)
      .single();

    if (loteFetchError || !lote) {
      return { success: false, error: 'Lote de manutenção não encontrado.' };
    }

    let aprovadosCount = 0;
    let condenadosCount = 0;
    const nowIso = new Date().toISOString();

    // 2. Processar cada item
    for (const itemResult of payload.itens_triagem) {
      const isApproved = itemResult.status_triagem === 'APROVADO';
      if (isApproved) {
        aprovadosCount++;
      } else {
        condenadosCount++;
      }

      // Atualizar o item na tabela do lote
      await supabase
        .from('itens_lote_manutencao')
        .update({
          status_triagem: itemResult.status_triagem,
          novo_selo_inmetro: itemResult.novo_selo_inmetro || null,
          nova_validade_recarga: itemResult.nova_validade_recarga || null,
          nova_validade_hidro: itemResult.nova_validade_hidro || null,
          motivo_condenacao: itemResult.motivo_condenacao || null,
          laudo_url: itemResult.laudo_url || null,
          observacoes_triagem: itemResult.observacoes_triagem || null,
          data_triagem: nowIso,
          usuario_triagem_nome: payload.usuario_triagem_nome || 'Operador SPCI',
          updated_at: nowIso,
        })
        .eq('id', itemResult.item_id);

      // Atualizar o ativo correspondente em assets
      if (itemResult.asset_id) {
        if (isApproved) {
          // APROVADO -> Vai para 'ESTOQUE APLICAÇÃO' com novas validades
          await supabase
            .from('assets')
            .update({
              status_estoque: 'ESTOQUE APLICAÇÃO',
              tipo_movimentacao: 'estoque_aplicacao',
              lote_manutencao_atual_id: null,
              validadeRecarga: itemResult.nova_validade_recarga || undefined,
              ultima_recarga: itemResult.nova_validade_recarga ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` : undefined,
              data_vencimento_teste: itemResult.nova_validade_hidro || undefined,
              status: 'Conforme',
              updated_at: nowIso,
            })
            .eq('id', itemResult.asset_id);

          // Log de auditoria
          await supabase.from('historico_movimentacoes_ativos').insert({
            asset_id: itemResult.asset_id,
            id_ativo: itemResult.id_ativo,
            tipo_evento: 'RETORNO_APROVADO',
            lote_id: payload.lote_id,
            numero_lote: lote.numero_lote,
            status_origem: 'EM MANUTENÇÃO',
            status_destino: 'ESTOQUE APLICAÇÃO',
            usuario_responsavel_nome: payload.usuario_triagem_nome || 'Operador SPCI',
            usuario_responsavel_email: payload.usuario_triagem_email || null,
            descricao_evento: 'Retorno de manutenção aprovado com selo Inmetro e novas validades aplicadas.',
            detalhes_alteracao: {
              novo_selo_inmetro: itemResult.novo_selo_inmetro,
              nova_validade_recarga: itemResult.nova_validade_recarga,
              nova_validade_hidro: itemResult.nova_validade_hidro,
              observacoes: itemResult.observacoes_triagem,
            },
          });
        } else {
          // CONDENADO -> Vai para 'CONDENADOS' / Inativo
          await supabase
            .from('assets')
            .update({
              status_estoque: 'CONDENADOS',
              tipo_movimentacao: 'condenado',
              lote_manutencao_atual_id: null,
              status: 'Não Conforme',
              updated_at: nowIso,
            })
            .eq('id', itemResult.asset_id);

          // Log de auditoria de condenação
          await supabase.from('historico_movimentacoes_ativos').insert({
            asset_id: itemResult.asset_id,
            id_ativo: itemResult.id_ativo,
            tipo_evento: 'CONDENACAO_ATIVO',
            lote_id: payload.lote_id,
            numero_lote: lote.numero_lote,
            status_origem: 'EM MANUTENÇÃO',
            status_destino: 'CONDENADOS',
            usuario_responsavel_nome: payload.usuario_triagem_nome || 'Operador SPCI',
            usuario_responsavel_email: payload.usuario_triagem_email || null,
            descricao_evento: `Ativo condenado no retorno de manutenção. Motivo: ${itemResult.motivo_condenacao || 'Não especificado'}`,
            detalhes_alteracao: {
              motivo_condenacao: itemResult.motivo_condenacao,
              laudo_url: itemResult.laudo_url,
              observacoes: itemResult.observacoes_triagem,
            },
          });
        }
      }
    }

    // 3. Verificar se todos os itens do lote foram triados
    const { data: allItems } = await supabase
      .from('itens_lote_manutencao')
      .select('status_triagem')
      .eq('lote_id', payload.lote_id);

    const pendentesRestantes = (allItems || []).filter((i: any) => i.status_triagem === 'PENDENTE').length;
    const totalAprovadosLote = (allItems || []).filter((i: any) => i.status_triagem === 'APROVADO').length;
    const totalCondenadosLote = (allItems || []).filter((i: any) => i.status_triagem === 'CONDENADO').length;

    const isLoteFinalizado = pendentesRestantes === 0;

    await supabase
      .from('lotes_manutencao')
      .update({
        status: isLoteFinalizado ? 'FINALIZADO' : 'EM_ANDAMENTO',
        total_aprovados: totalAprovadosLote,
        total_condenados: totalCondenadosLote,
        data_finalizacao: isLoteFinalizado ? nowIso : null,
        updated_at: nowIso,
      })
      .eq('id', payload.lote_id);

    return {
      success: true,
      aprovados: aprovadosCount,
      condenados: condenadosCount,
      finalizado: isLoteFinalizado,
      pendentes_restantes: pendentesRestantes,
    };
  } catch (error: any) {
    console.error('[triageBatchReturnAction] Exceção:', error);
    return { success: false, error: error.message || 'Erro ao processar triagem de retorno.' };
  }
}

/**
 * Busca histórico perpétuo de movimentações de um extintor específico
 */
export async function getExtinguisherMaintenanceHistoryAction(assetId: string) {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('historico_movimentacoes_ativos')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, history: [] };
    }

    return { success: true, history: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message, history: [] };
  }
}
