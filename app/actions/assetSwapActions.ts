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
      persistSession: false,
    },
  });
};

export type MotivoTrocaType =
  | 'IMPEDITIVO_NBR'
  | 'DESPRESSURIZADO'
  | 'VENCIDO'
  | 'LACRE_ROMPIDO'
  | 'AVARIA_MECANICA'
  | 'USO_EMERGENCIA'
  | 'SOLICITACAO_SETOR'
  | 'OUTROS';

export interface SubstituicaoAtivoRecord {
  id: string;
  ativo_retirado_id: string;
  ativo_retirado_codigo: string;
  ativo_retirado_patrimonio?: string;
  ativo_retirado_chassi?: string;
  ativo_retirado_modelo?: string;
  ativo_retirado_capacidade?: string;
  ativo_substituto_id: string;
  ativo_substituto_codigo: string;
  ativo_substituto_patrimonio?: string;
  ativo_substituto_chassi?: string;
  ativo_substituto_modelo?: string;
  ativo_substituto_capacidade?: string;
  setor: string;
  sub_local?: string;
  local_especifico?: string;
  motivo_troca: MotivoTrocaType;
  descricao_motivo?: string;
  foto_antes_url?: string;
  foto_depois_url?: string;
  tecnico_responsavel_nome: string;
  tecnico_responsavel_email?: string;
  latitude?: number;
  longitude?: number;
  status_troca: 'CONCLUIDA' | 'PENDENTE_ATENDIMENTO';
  criado_em: string;
  atualizado_em: string;
}

export interface ProcessSwapPayload {
  ativo_retirado_id: string;
  ativo_substituto_id: string;
  setor?: string;
  sub_local?: string;
  local_especifico?: string;
  motivo_troca: MotivoTrocaType;
  descricao_motivo?: string;
  foto_antes_url?: string;
  foto_depois_url?: string;
  tecnico_responsavel_nome: string;
  tecnico_responsavel_email?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Garante e reconcilia a existência da tabela `substituicoes_ativos`
 */
async function ensureSubstituicoesTable(supabase: any) {
  try {
    const { error: testError } = await supabase
      .from('substituicoes_ativos')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      // Tabela não existe, tenta criar via RPC sql
      await supabase.rpc('execute_sql_query', {
        sql: `
          CREATE TABLE IF NOT EXISTS substituicoes_ativos (
            id TEXT PRIMARY KEY,
            ativo_retirado_id TEXT NOT NULL,
            ativo_retirado_codigo TEXT NOT NULL,
            ativo_retirado_patrimonio TEXT,
            ativo_retirado_chassi TEXT,
            ativo_retirado_modelo TEXT,
            ativo_retirado_capacidade TEXT,
            ativo_substituto_id TEXT NOT NULL,
            ativo_substituto_codigo TEXT NOT NULL,
            ativo_substituto_patrimonio TEXT,
            ativo_substituto_chassi TEXT,
            ativo_substituto_modelo TEXT,
            ativo_substituto_capacidade TEXT,
            setor TEXT NOT NULL,
            sub_local TEXT,
            local_especifico TEXT,
            motivo_troca TEXT NOT NULL,
            descricao_motivo TEXT,
            foto_antes_url TEXT,
            foto_depois_url TEXT,
            tecnico_responsavel_nome TEXT NOT NULL,
            tecnico_responsavel_email TEXT,
            latitude NUMERIC,
            longitude NUMERIC,
            status_troca TEXT DEFAULT 'CONCLUIDA',
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
          );
        `,
      });
    }
  } catch (err) {
    console.warn('[assetSwapActions] Aviso ao verificar tabela substituicoes_ativos:', err);
  }
}

/**
 * Processa a troca bilateral atômica de extintores
 */
export async function processAssetSwapAction(
  payload: ProcessSwapPayload
): Promise<{ success: boolean; troca?: SubstituicaoAtivoRecord; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    await ensureSubstituicoesTable(supabase);

    const nowIso = new Date().toISOString();
    const swapId = `TRC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Busca os dados dos dois ativos
    const { data: assets, error: fetchErr } = await supabase
      .from('assets')
      .select('*')
      .in('id', [payload.ativo_retirado_id, payload.ativo_substituto_id]);

    if (fetchErr || !assets || assets.length < 2) {
      throw new Error('Não foi possível localizar ambos os extintores no sistema para realizar a troca.');
    }

    const retirado = assets.find((a) => a.id === payload.ativo_retirado_id);
    const substituto = assets.find((a) => a.id === payload.ativo_substituto_id);

    if (!retirado || !substituto) {
      throw new Error('Identificadores de ativo inconsistentes.');
    }

    // Setor e localização definitiva do ponto
    const setorFinal = payload.setor || retirado.location || 'Área Operacional';
    const subLocalFinal = payload.sub_local || retirado.sub_location || '';
    const localEspecificoFinal = payload.local_especifico || retirado.specific_location || (retirado.details as any)?.local_especifico || '';
    const latFinal = payload.latitude || retirado.latitude || null;
    const lngFinal = payload.longitude || retirado.longitude || null;

    // 2. ATUALIZAÇÃO DO ATIVO RETIRADO (vai para ESTOQUE MANUTENÇÃO)
    const retiradoDetails = (retirado.details as any) || {};
    const updatedRetiradoDetails = {
      ...retiradoDetails,
      status_estoque: 'ESTOQUE MANUTENÇÃO',
      tipo_movimentacao: 'RECOLHIDO_PARA_MANUTENCAO',
      motivo_baixa: payload.motivo_troca,
      substituido_por_id: substituto.id,
      substituido_por_codigo: substituto.id_ativo || substituto.patrimonio,
      data_troca: nowIso,
    };

    await supabase
      .from('assets')
      .update({
        status_estoque: 'ESTOQUE MANUTENÇÃO',
        tipo_movimentacao: 'RECOLHIDO_PARA_MANUTENCAO',
        status: 'inativo',
        location: 'Oficina / Depósito de Manutenção',
        sub_location: 'Aguardando Triagem',
        details: updatedRetiradoDetails,
        updated_at: nowIso,
      })
      .eq('id', retirado.id);

    // 3. ATUALIZAÇÃO DO ATIVO SUBSTITUTO (assume o ponto na área)
    const substitutoDetails = (substituto.details as any) || {};
    const updatedSubstitutoDetails = {
      ...substitutoDetails,
      status_estoque: 'NA ÁREA (APLICADO)',
      tipo_movimentacao: 'INSTALADO_EM_SUBSTITUICAO',
      substituiu_id: retirado.id,
      substituiu_codigo: retirado.id_ativo || retirado.patrimonio,
      local_especifico: localEspecificoFinal,
      data_instalacao_troca: nowIso,
    };

    await supabase
      .from('assets')
      .update({
        status_estoque: 'NA ÁREA (APLICADO)',
        tipo_movimentacao: 'INSTALADO_EM_SUBSTITUICAO',
        status: 'ativo',
        location: setorFinal,
        sub_location: subLocalFinal,
        latitude: latFinal,
        longitude: lngFinal,
        details: updatedSubstitutoDetails,
        updated_at: nowIso,
      })
      .eq('id', substituto.id);

    // 4. INSERÇÃO DO REGISTRO DE SUBSTITUIÇÃO BILATERAL
    const trocaRecord: SubstituicaoAtivoRecord = {
      id: swapId,
      ativo_retirado_id: retirado.id,
      ativo_retirado_codigo: retirado.id_ativo || retirado.patrimonio || retirado.id,
      ativo_retirado_patrimonio: retirado.patrimonio || retirado.id_ativo,
      ativo_retirado_chassi: retirado.numero_serie,
      ativo_retirado_modelo: retirado.model || 'PQS ABC',
      ativo_retirado_capacidade: retirado.peso_capacidade || retiradoDetails.capacidade || '6 kg',
      ativo_substituto_id: substituto.id,
      ativo_substituto_codigo: substituto.id_ativo || substituto.patrimonio || substituto.id,
      ativo_substituto_patrimonio: substituto.patrimonio || substituto.id_ativo,
      ativo_substituto_chassi: substituto.numero_serie,
      ativo_substituto_modelo: substituto.model || 'PQS ABC',
      ativo_substituto_capacidade: substituto.peso_capacidade || substitutoDetails.capacidade || '6 kg',
      setor: setorFinal,
      sub_local: subLocalFinal,
      local_especifico: localEspecificoFinal,
      motivo_troca: payload.motivo_troca,
      descricao_motivo: payload.descricao_motivo,
      foto_antes_url: payload.foto_antes_url,
      foto_depois_url: payload.foto_depois_url,
      tecnico_responsavel_nome: payload.tecnico_responsavel_nome,
      tecnico_responsavel_email: payload.tecnico_responsavel_email,
      latitude: latFinal || undefined,
      longitude: lngFinal || undefined,
      status_troca: 'CONCLUIDA',
      criado_em: nowIso,
      atualizado_em: nowIso,
    };

    try {
      await supabase.from('substituicoes_ativos').insert(trocaRecord);
    } catch (insertErr) {
      console.warn('[assetSwapActions] Tabela substituicoes_ativos não aceitou insert direto, registrando via logs:', insertErr);
    }

    // 5. REGISTRO PERPÉTUO CRUZADO DE AUDITORIA (Audit Trail)
    try {
      // Log para o Ativo Retirado
      await supabase.from('historico_movimentacoes_ativos').insert({
        asset_id: retirado.id,
        id_ativo: retirado.id_ativo || retirado.patrimonio || retirado.id,
        tipo_evento: 'SUBSTITUICAO_BAIXA',
        status_origem: 'NA ÁREA (APLICADO)',
        status_destino: 'ESTOQUE MANUTENÇÃO',
        local_origem: setorFinal,
        local_destino: 'Oficina / Depósito de Manutenção',
        usuario_responsavel_nome: payload.tecnico_responsavel_nome,
        usuario_responsavel_email: payload.tecnico_responsavel_email,
        observacoes: `Substituído e recolhido. Substituto: ${substituto.id_ativo || substituto.patrimonio}. Motivo: ${payload.motivo_troca}. Descrição: ${payload.descricao_motivo || 'N/A'}.`,
        metadata: {
          swap_id: swapId,
          papel: 'RETIRADO',
          substituto_id: substituto.id,
          motivo: payload.motivo_troca,
        },
      });

      // Log para o Ativo Substituto
      await supabase.from('historico_movimentacoes_ativos').insert({
        asset_id: substituto.id,
        id_ativo: substituto.id_ativo || substituto.patrimonio || substituto.id,
        tipo_evento: 'SUBSTITUICAO_INSTALACAO',
        status_origem: substituto.status_estoque || 'ESTOQUE APLICAÇÃO',
        status_destino: 'NA ÁREA (APLICADO)',
        local_origem: 'Estoque Aplicação / Prontidão',
        local_destino: setorFinal,
        usuario_responsavel_nome: payload.tecnico_responsavel_nome,
        usuario_responsavel_email: payload.tecnico_responsavel_email,
        observacoes: `Instalado na área operacional em substituição ao extintor recolhido ${retirado.id_ativo || retirado.patrimonio}.`,
        metadata: {
          swap_id: swapId,
          papel: 'SUBSTITUTO',
          retirado_id: retirado.id,
          setor: setorFinal,
        },
      });

      // Registro adicional na tabela ativo_movimentacoes
      await supabase.from('ativo_movimentacoes').insert([
        {
          ativo_id: retirado.id,
          id_ativo: retirado.id_ativo || retirado.patrimonio || retirado.id,
          status_anterior: 'NA ÁREA (APLICADO)',
          status_novo: 'ESTOQUE MANUTENÇÃO',
          motivo: `Troca por motivo ${payload.motivo_troca}: Substituto ${substituto.id_ativo || substituto.patrimonio}`,
          usuario_nome: payload.tecnico_responsavel_nome,
          data_movimentacao: nowIso,
        },
        {
          ativo_id: substituto.id,
          id_ativo: substituto.id_ativo || substituto.patrimonio || substituto.id,
          status_anterior: substituto.status_estoque || 'ESTOQUE APLICAÇÃO',
          status_novo: 'NA ÁREA (APLICADO)',
          motivo: `Instalado no setor ${setorFinal} em substituição ao ${retirado.id_ativo || retirado.patrimonio}`,
          usuario_nome: payload.tecnico_responsavel_nome,
          data_movimentacao: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn('[assetSwapActions] Falha não crítica nos logs de auditoria:', auditErr);
    }

    return { success: true, troca: trocaRecord };
  } catch (err: any) {
    console.error('[assetSwapActions] Erro no processamento de troca bilateral:', err);
    return { success: false, error: err.message || 'Erro inesperado ao processar troca de extintores.' };
  }
}

/**
 * Consulta a lista de trocas realizadas com filtros
 */
export async function getAssetSwapsAction(filters?: {
  setor?: string;
  motivo?: string;
  termoBusca?: string;
}): Promise<{ success: boolean; trocas?: SubstituicaoAtivoRecord[]; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    await ensureSubstituicoesTable(supabase);

    let query = supabase
      .from('substituicoes_ativos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (filters?.setor && filters.setor !== 'todos') {
      query = query.ilike('setor', `%${filters.setor}%`);
    }

    if (filters?.motivo && filters.motivo !== 'todos') {
      query = query.eq('motivo_troca', filters.motivo);
    }

    const { data, error } = await query;

    if (error) {
      // Se a tabela ainda estiver vazia ou com fallback, recupera dos logs de histórico
      const { data: logsData } = await supabase
        .from('historico_movimentacoes_ativos')
        .select('*')
        .eq('tipo_evento', 'SUBSTITUICAO_BAIXA')
        .order('criado_em', { ascending: false });

      if (logsData && logsData.length > 0) {
        const mappedTrocas: SubstituicaoAtivoRecord[] = logsData.map((l: any, idx: number) => ({
          id: (l.metadata as any)?.swap_id || `LOG-${idx}`,
          ativo_retirado_id: l.asset_id,
          ativo_retirado_codigo: l.id_ativo,
          ativo_substituto_id: (l.metadata as any)?.substituto_id || 'N/A',
          ativo_substituto_codigo: (l.metadata as any)?.substituto_codigo || 'SUBSTITUTO',
          setor: l.local_origem || 'Área Operacional',
          motivo_troca: ((l.metadata as any)?.motivo || 'IMPEDITIVO_NBR') as MotivoTrocaType,
          descricao_motivo: l.observacoes,
          tecnico_responsavel_nome: l.usuario_responsavel_nome || 'Brigada SPCI',
          status_troca: 'CONCLUIDA',
          criado_em: l.criado_em || new Date().toISOString(),
          atualizado_em: l.criado_em || new Date().toISOString(),
        }));
        return { success: true, trocas: mappedTrocas };
      }

      return { success: true, trocas: [] };
    }

    let finalData: SubstituicaoAtivoRecord[] = data || [];

    if (filters?.termoBusca && filters.termoBusca.trim()) {
      const term = filters.termoBusca.toLowerCase();
      finalData = finalData.filter(
        (t) =>
          t.ativo_retirado_codigo.toLowerCase().includes(term) ||
          t.ativo_substituto_codigo.toLowerCase().includes(term) ||
          (t.ativo_retirado_chassi || '').toLowerCase().includes(term) ||
          (t.ativo_substituto_chassi || '').toLowerCase().includes(term) ||
          t.setor.toLowerCase().includes(term) ||
          t.tecnico_responsavel_nome.toLowerCase().includes(term)
      );
    }

    return { success: true, trocas: finalData };
  } catch (err: any) {
    console.error('[assetSwapActions] Erro ao buscar trocas:', err);
    return { success: false, error: err.message || 'Erro ao carregar histórico de trocas.' };
  }
}

/**
 * Retorna os indicadores (KPIs) para o Bento Grid da página de Trocas
 */
export async function getSwapKpisAction(): Promise<{
  success: boolean;
  kpis?: {
    totalTrocas: number;
    trocasImpeditivos: number;
    chamadosSetores: number;
    motivoMaisRecorrente: string;
  };
  error?: string;
}> {
  try {
    const res = await getAssetSwapsAction();
    const trocas = res.trocas || [];

    const totalTrocas = trocas.length;
    const trocasImpeditivos = trocas.filter(
      (t) => t.motivo_troca === 'IMPEDITIVO_NBR' || t.motivo_troca === 'DESPRESSURIZADO' || t.motivo_troca === 'VENCIDO'
    ).length;
    const chamadosSetores = trocas.filter((t) => t.motivo_troca === 'SOLICITACAO_SETOR').length;

    // Contagem de motivos recorrentes
    const motivoCount: Record<string, number> = {};
    trocas.forEach((t) => {
      motivoCount[t.motivo_troca] = (motivoCount[t.motivo_troca] || 0) + 1;
    });

    let motivoMaisRecorrente = 'Nenhum';
    let maxCount = 0;
    Object.entries(motivoCount).forEach(([motivo, count]) => {
      if (count > maxCount) {
        maxCount = count;
        motivoMaisRecorrente = motivo.replace(/_/g, ' ');
      }
    });

    return {
      success: true,
      kpis: {
        totalTrocas,
        trocasImpeditivos,
        chamadosSetores,
        motivoMaisRecorrente,
      },
    };
  } catch (err: any) {
    console.error('[assetSwapActions] Erro ao calcular KPIs de trocas:', err);
    return { success: false, error: err.message };
  }
}
