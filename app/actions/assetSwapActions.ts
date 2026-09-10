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
      swap_id: swapId,
      motivo_troca: payload.motivo_troca,
      descricao_motivo: payload.descricao_motivo || '',
      foto_antes_url: payload.foto_antes_url || '',
      foto_depois_url: payload.foto_depois_url || '',
      tecnico_responsavel_nome: payload.tecnico_responsavel_nome,
    };

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
      swap_id: swapId,
      substituiu_em: nowIso,
      tecnico_responsavel_nome: payload.tecnico_responsavel_nome,
    };

    // 4. PREPARAÇÃO DO REGISTRO DE SUBSTITUIÇÃO BILATERAL
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

    // Anexa o snapshot completo da troca nos detalhes do ativo retirado
    updatedRetiradoDetails.swap_record = trocaRecord;
    updatedSubstitutoDetails.swap_record = trocaRecord;

    // Atualiza ativo retirado
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

    // Atualiza ativo substituto
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

    // 5. REGISTRO NA TABELA DEDICADA (SE EXISTIR)
    try {
      await supabase.from('substituicoes_ativos').insert(trocaRecord);
    } catch (insertErr) {
      console.warn('[assetSwapActions] Tabela substituicoes_ativos não aceitou insert:', insertErr);
    }

    // 6. REGISTRO DE AUDITORIA ROBUSTO NA TABELA ativo_movimentacoes
    try {
      await supabase.from('ativo_movimentacoes').insert([
        {
          asset_id: retirado.id,
          id_ativo: retirado.id_ativo || retirado.patrimonio || retirado.id,
          status_anterior: 'NA ÁREA (APLICADO)',
          status_novo: 'ESTOQUE MANUTENÇÃO',
          motivo_movimentacao: `SUBSTITUICAO_EXTINTOR: ${payload.motivo_troca}`,
          observacao: JSON.stringify(trocaRecord),
          usuario_nome: payload.tecnico_responsavel_nome,
          usuario_email: payload.tecnico_responsavel_email || null,
          created_at: nowIso,
        },
        {
          asset_id: substituto.id,
          id_ativo: substituto.id_ativo || substituto.patrimonio || substituto.id,
          status_anterior: substituto.status_estoque || 'ESTOQUE APLICAÇÃO',
          status_novo: 'NA ÁREA (APLICADO)',
          motivo_movimentacao: 'INSTALACAO_SUBSTITUTO',
          observacao: `Instalado no setor ${setorFinal} em substituição ao extintor ${retirado.id_ativo || retirado.patrimonio}. Swap ID: ${swapId}`,
          usuario_nome: payload.tecnico_responsavel_nome,
          usuario_email: payload.tecnico_responsavel_email || null,
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn('[assetSwapActions] Falha ao registrar em ativo_movimentacoes:', auditErr);
    }

    return { success: true, troca: trocaRecord };
  } catch (err: any) {
    console.error('[assetSwapActions] Erro no processamento de troca bilateral:', err);
    return { success: false, error: err.message || 'Erro inesperado ao processar troca de extintores.' };
  }
}

/**
 * Consulta a lista de trocas realizadas com reconciliação multi-fonte e filtros
 */
export async function getAssetSwapsAction(filters?: {
  setor?: string;
  motivo?: string;
  termoBusca?: string;
}): Promise<{ success: boolean; trocas?: SubstituicaoAtivoRecord[]; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const allSwapsMap = new Map<string, SubstituicaoAtivoRecord>();

    // 1. TENTA BUSCAR NA TABELA DEDICADA substituicoes_ativos (SE EXISTIR)
    try {
      let query = supabase
        .from('substituicoes_ativos')
        .select('*')
        .order('criado_em', { ascending: false });

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        data.forEach((t: SubstituicaoAtivoRecord) => {
          if (t.id) allSwapsMap.set(t.id, t);
        });
      }
    } catch (tblErr) {
      // Tabela não criada ainda, segue para os fallbacks
    }

    // 2. BUSCA NA TABELA ativo_movimentacoes (QUE CONTÉM AUDITORIA COM JSON)
    try {
      const { data: movData, error: movErr } = await supabase
        .from('ativo_movimentacoes')
        .select('*')
        .ilike('motivo_movimentacao', 'SUBSTITUICAO_%')
        .order('created_at', { ascending: false });

      if (!movErr && movData && movData.length > 0) {
        movData.forEach((m: any) => {
          if (m.observacao && typeof m.observacao === 'string' && m.observacao.includes('ativo_retirado_')) {
            try {
              const parsed = JSON.parse(m.observacao) as SubstituicaoAtivoRecord;
              if (parsed && parsed.id && !allSwapsMap.has(parsed.id)) {
                allSwapsMap.set(parsed.id, parsed);
              }
            } catch (pErr) {
              // Não era JSON puro
            }
          }
        });
      }
    } catch (movErr) {
      console.warn('[assetSwapActions] Aviso ao consultar ativo_movimentacoes:', movErr);
    }

    // 3. RECONCILIAÇÃO PERPÉTUA NA TABELA assets (GARANTE QUE TROCAS JÁ FEITAS APAREÇAM)
    try {
      const { data: allAssets, error: assetErr } = await supabase
        .from('assets')
        .select('*');

      if (!assetErr && allAssets && allAssets.length > 0) {
        // Encontra ativos marcados como recolhidos ou com histórico de substituto
        const retirados = allAssets.filter((a) => {
          const d = (a.details as any) || {};
          return (
            d.swap_record ||
            d.substituido_por_codigo ||
            d.substituido_por_id ||
            a.tipo_movimentacao === 'RECOLHIDO_PARA_MANUTENCAO' ||
            d.tipo_movimentacao === 'RECOLHIDO_PARA_MANUTENCAO'
          );
        });

        retirados.forEach((ret) => {
          const d = (ret.details as any) || {};

          // Se tiver o objeto completo salvo no swap_record
          if (d.swap_record && d.swap_record.id) {
            if (!allSwapsMap.has(d.swap_record.id)) {
              allSwapsMap.set(d.swap_record.id, d.swap_record);
            }
            return;
          }

          // Reconstrói a partir do par retirado/substituto
          const subId = d.substituido_por_id;
          const subCod = d.substituido_por_codigo;
          const subst = allAssets.find(
            (a) =>
              (subId && a.id === subId) ||
              (subCod && (a.id_ativo === subCod || a.patrimonio === subCod))
          );
          const subDetails = (subst?.details as any) || {};

          const swapIdKey = d.swap_id || `TRC-${ret.id}-${subId || subCod || 'SUB'}`;
          if (!allSwapsMap.has(swapIdKey)) {
            const reconstructedSwap: SubstituicaoAtivoRecord = {
              id: swapIdKey,
              ativo_retirado_id: ret.id,
              ativo_retirado_codigo: ret.id_ativo || ret.patrimonio || ret.id,
              ativo_retirado_patrimonio: ret.patrimonio || ret.id_ativo,
              ativo_retirado_chassi: ret.numero_serie || d.serialNumber || 'N/A',
              ativo_retirado_modelo: ret.model || 'PQS ABC',
              ativo_retirado_capacidade: ret.peso_capacidade || d.peso_capacidade || '6 kg',
              ativo_substituto_id: subst?.id || subId || 'N/A',
              ativo_substituto_codigo: subst?.id_ativo || subst?.patrimonio || subCod || 'SUBSTITUTO',
              ativo_substituto_patrimonio: subst?.patrimonio || subst?.id_ativo || subCod,
              ativo_substituto_chassi: subst?.numero_serie || subDetails.serialNumber || 'N/A',
              ativo_substituto_modelo: subst?.model || 'PQS ABC',
              ativo_substituto_capacidade: subst?.peso_capacidade || subDetails.peso_capacidade || '6 kg',
              setor: subst?.location || d.local_origem || ret.location || 'Área Operacional',
              sub_local: subst?.sub_location || '',
              local_especifico: d.local_especifico || subDetails.local_especifico || '',
              motivo_troca: (d.motivo_baixa || d.motivo_troca || 'VENCIDO') as MotivoTrocaType,
              descricao_motivo:
                d.descricao_motivo ||
                `Substituição realizada no ponto. Ativo retirado: ${ret.id_ativo || ret.patrimonio}. Substituto instalado: ${subst?.id_ativo || subst?.patrimonio || subCod}.`,
              foto_antes_url: d.foto_antes_url || ret.foto_url || d.foto_url || '',
              foto_depois_url: d.foto_depois_url || subst?.foto_url || subDetails.foto_url || '',
              tecnico_responsavel_nome: d.tecnico_responsavel_nome || 'Operador SPCI',
              tecnico_responsavel_email: d.tecnico_responsavel_email || undefined,
              status_troca: 'CONCLUIDA',
              criado_em: d.data_troca || ret.updated_at || new Date().toISOString(),
              atualizado_em: d.data_troca || ret.updated_at || new Date().toISOString(),
            };
            allSwapsMap.set(swapIdKey, reconstructedSwap);
          }
        });
      }
    } catch (recErr) {
      console.warn('[assetSwapActions] Aviso na reconciliação da tabela assets:', recErr);
    }

    let finalData: SubstituicaoAtivoRecord[] = Array.from(allSwapsMap.values());

    // Ordenação cronológica decrescente
    finalData.sort((a, b) => {
      const timeA = new Date(a.criado_em).getTime();
      const timeB = new Date(b.criado_em).getTime();
      return timeB - timeA;
    });

    // Filtro por setor
    if (filters?.setor && filters.setor !== 'todos') {
      const s = filters.setor.toLowerCase();
      finalData = finalData.filter((t) => (t.setor || '').toLowerCase().includes(s));
    }

    // Filtro por motivo
    if (filters?.motivo && filters.motivo !== 'todos') {
      finalData = finalData.filter((t) => t.motivo_troca === filters.motivo);
    }

    // Filtro por termo de busca
    if (filters?.termoBusca && filters.termoBusca.trim()) {
      const term = filters.termoBusca.toLowerCase();
      finalData = finalData.filter(
        (t) =>
          (t.ativo_retirado_codigo || '').toLowerCase().includes(term) ||
          (t.ativo_substituto_codigo || '').toLowerCase().includes(term) ||
          (t.ativo_retirado_chassi || '').toLowerCase().includes(term) ||
          (t.ativo_substituto_chassi || '').toLowerCase().includes(term) ||
          (t.setor || '').toLowerCase().includes(term) ||
          (t.tecnico_responsavel_nome || '').toLowerCase().includes(term)
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
