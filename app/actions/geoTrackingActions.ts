'use server';

import { createClient } from '@supabase/supabase-js';
import { 
  calculateHaversineDistance, 
  isSignificantDisplacement, 
  GEO_DRIFT_TOLERANCE_METERS, 
  LocationSource,
  LocationHistoryEntry 
} from '@/lib/geoUtils';

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração do Supabase ausente no ambiente do servidor.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export interface ProcessLocationParams {
  assetId: string;
  category?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  tipoEvento: LocationSource;
  fotoEvidenciaUrl?: string | null;
  toleranceMeters?: number;
  usuario?: {
    id?: string;
    nome?: string;
  };
}

export interface ProcessLocationResult {
  success: boolean;
  updated: boolean;
  distanceMeters: number;
  reason: string;
  historyId?: string;
  error?: string;
}

/**
 * Processa a atualização de coordenadas de um ativo com validação de desvio Haversine.
 * Se delta >= tolerância (5m) ou primeira localização: atualiza ativo e gera histórico.
 * Se delta < tolerância: mantém ativo inalterado e gera log de auditoria presencial.
 */
export async function processAssetLocationUpdateAction(
  params: ProcessLocationParams
): Promise<ProcessLocationResult> {
  const {
    assetId,
    category = 'extintores',
    latitude,
    longitude,
    accuracy = null,
    tipoEvento,
    fotoEvidenciaUrl = null,
    toleranceMeters = GEO_DRIFT_TOLERANCE_METERS,
    usuario
  } = params;

  if (!assetId || latitude == null || longitude == null) {
    return {
      success: false,
      updated: false,
      distanceMeters: 0,
      reason: 'Parâmetros obrigatórios de geolocalização ausentes.',
      error: 'ID do ativo ou coordenadas inválidas.'
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const cleanId = String(assetId).trim();
    let currentLat: number | null = null;
    let currentLng: number | null = null;
    let resolvedId = cleanId;
    const cleanIdWithoutSpaces = cleanId.replace(/\s+/g, '');

    // Verificar na tabela de extintores
    if (category === 'extintores' || cleanId.includes('EXT')) {
      const { data: extData } = await supabase
        .from('ativos_extintores')
        .select('id, numero_patrimonio, latitude, longitude')
        .or(`numero_patrimonio.eq.${cleanId},numero_patrimonio.eq.${cleanIdWithoutSpaces},numero_patrimonio.ilike.%${cleanIdWithoutSpaces}%,id.eq.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (extData) {
        resolvedId = extData.numero_patrimonio || extData.id;
        currentLat = extData.latitude != null ? Number(extData.latitude) : null;
        currentLng = extData.longitude != null ? Number(extData.longitude) : null;
      }
    }

    // Se não encontrou ou outra categoria, verificar na tabela unificada 'assets'
    if (currentLat == null) {
      const { data: assetData } = await supabase
        .from('assets')
        .select('id, id_ativo, patrimonio, latitude, longitude')
        .or(`id.eq.${cleanId},id_ativo.eq.${cleanId},patrimonio.eq.${cleanId},id_ativo.eq.${cleanIdWithoutSpaces},patrimonio.eq.${cleanIdWithoutSpaces}`)
        .limit(1)
        .maybeSingle();

      if (assetData) {
        resolvedId = assetData.id_ativo || assetData.patrimonio || assetData.id;
        currentLat = assetData.latitude != null ? Number(assetData.latitude) : null;
        currentLng = assetData.longitude != null ? Number(assetData.longitude) : null;
      }
    }

    // 2. Avaliar desvio com Fórmula de Haversine
    const evaluation = isSignificantDisplacement(
      currentLat,
      currentLng,
      latitude,
      longitude,
      toleranceMeters
    );

    const nowIso = new Date().toISOString();

    // 3. Atualizar posição principal se houver deslocamento significativo
    if (evaluation.shouldUpdate) {
      // Atualizar / sincronizar tabela unificada 'assets'
      const { error: assetUpdateErr } = await supabase
        .from('assets')
        .upsert({
          id: resolvedId,
          id_ativo: resolvedId,
          patrimonio: resolvedId,
          category: category || (resolvedId.includes('EXT') ? 'extintores' : 'outros'),
          latitude: latitude,
          longitude: longitude,
          precisao_gps: accuracy,
          data_ultima_localizacao: nowIso,
          origem_localizacao: tipoEvento,
          updated_at: nowIso
        }, { onConflict: 'id' });

      if (assetUpdateErr) {
        console.warn('[processAssetLocationUpdateAction] Aviso ao sincronizar em assets:', assetUpdateErr.message);
      }

      // Se for extintor, atualizar também 'ativos_extintores'
      if (category === 'extintores' || resolvedId.includes('EXT')) {
        await supabase
          .from('ativos_extintores')
          .update({
            latitude: latitude,
            longitude: longitude,
            precisao_gps: accuracy,
            data_ultima_localizacao: nowIso,
            origem_localizacao: tipoEvento,
            updated_at: nowIso
          })
          .or(`numero_patrimonio.eq.${resolvedId},numero_patrimonio.eq.${cleanIdWithoutSpaces},numero_patrimonio.ilike.%${cleanIdWithoutSpaces}%,id.eq.${resolvedId}`);
      }
    }

    // 4. Inserir registro imutável na timeline (HistoricoLocalizacaoAtivo)
    const { data: histData, error: histError } = await supabase
      .from('historico_localizacao_ativo')
      .insert([{
        ativo_id: resolvedId,
        categoria: category,
        latitude: evaluation.shouldUpdate ? latitude : (currentLat ?? latitude),
        longitude: evaluation.shouldUpdate ? longitude : (currentLng ?? longitude),
        precisao: accuracy,
        distancia_deslocada_metros: evaluation.distanceMeters,
        foto_evidencia_url: fotoEvidenciaUrl || null,
        usuario_id: usuario?.id || null,
        usuario_nome: usuario?.nome || 'Operador Técnico',
        tipo_evento: tipoEvento,
        created_at: nowIso
      }])
      .select('id')
      .single();

    if (histError) {
      console.warn('[processAssetLocationUpdateAction] Aviso ao gravar histórico:', histError.message);
    }

    return {
      success: true,
      updated: evaluation.shouldUpdate,
      distanceMeters: evaluation.distanceMeters,
      reason: evaluation.reason,
      historyId: histData?.id
    };
  } catch (err: any) {
    console.error('[processAssetLocationUpdateAction] Erro crítico:', err);
    return {
      success: false,
      updated: false,
      distanceMeters: 0,
      reason: 'Erro interno ao processar localização.',
      error: err.message || String(err)
    };
  }
}

/**
 * Retorna o histórico de localização e deslocamento de um ativo específico
 */
export async function getAssetLocationHistoryAction(
  assetId: string
): Promise<{ success: boolean; history: LocationHistoryEntry[]; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const cleanId = String(assetId).trim().toUpperCase();

    const { data, error } = await supabase
      .from('historico_localizacao_ativo')
      .select('*')
      .eq('ativo_id', cleanId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      history: (data || []) as LocationHistoryEntry[]
    };
  } catch (err: any) {
    console.error('[getAssetLocationHistoryAction] Erro:', err);
    return {
      success: false,
      history: [],
      error: err.message || String(err)
    };
  }
}

/**
 * Retorna todos os ativos que possuem coordenadas geográficas válidas para o Mapa Operacional
 */
export async function getOperationalMapAssetsAction(): Promise<{
  success: boolean;
  assets: any[];
  totalPlotados: number;
  totalInspecoesComGps: number;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Buscar extintores tanto da view quanto direto de ativos_extintores
    let extList: any[] = [];
    try {
      const { data: viewData, error: viewErr } = await supabase
        .from('vw_extintores_publico')
        .select('*');

      if (!viewErr && viewData && viewData.length > 0) {
        extList = viewData;
      } else {
        const { data: directData } = await supabase
          .from('ativos_extintores')
          .select('*');
        extList = directData || [];
      }
    } catch {
      const { data: directData } = await supabase
        .from('ativos_extintores')
        .select('*');
      extList = directData || [];
    }

    // 2. Buscar ativos cadastrados na tabela unificada 'assets'
    const { data: assetsData } = await supabase
      .from('assets')
      .select('*');

    // 3. Contar inspeções que possuem GPS registrado
    let totalInspecoesComGps = 0;
    try {
      const { count } = await supabase
        .from('historico_localizacao_ativo')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_evento', 'INSPECAO');
      totalInspecoesComGps = count || 0;
    } catch {
      totalInspecoesComGps = 0;
    }

    // 4. Mapear e unir todos os ativos com coordenadas válidas
    const resultMap = new Map<string, any>();

    // Processar extintores primeiro
    for (const ext of extList) {
      const lat = ext.latitude != null ? Number(ext.latitude) : null;
      const lng = ext.longitude != null ? Number(ext.longitude) : null;

      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        const pat = String(ext.numero_patrimonio || ext.id_ativo || ext.id).trim().toUpperCase();
        const key = pat.replace(/\s+/g, '');

        resultMap.set(key, {
          id: ext.id,
          idAtivo: pat,
          patrimonio: pat,
          category: 'extintores',
          model: ext.modelo_tipo || ext.modelo || ext.model || 'Extintor de Incêndio',
          location: ext.local_instalacao || ext.location || 'Área Operacional',
          subLocation: ext.sub_local_instalacao || ext.sub_location || ext.subLocation || '',
          status: ext.status_conformidade === 'VENCIDO' ? 'Vencido' : (ext.status || 'Conforme'),
          status_estoque: ext.status_estoque || 'NA ÁREA (APLICADO)',
          tipo_movimentacao: ext.tipo_movimentacao || 'na_area_aplicado',
          latitude: lat,
          longitude: lng,
          precisao_gps: ext.precisao_gps ? Number(ext.precisao_gps) : null,
          data_ultima_localizacao: ext.data_ultima_localizacao || ext.updated_at,
          origem_localizacao: ext.origem_localizacao || 'EDICAO_MANUAL',
          foto_url: ext.foto_url || null
        });
      }
    }

    // Processar ativos da tabela 'assets' (hidrantes, iluminação, sinalização, bombas, extintores unificados)
    for (const item of (assetsData || [])) {
      const lat = item.latitude != null ? Number(item.latitude) : null;
      const lng = item.longitude != null ? Number(item.longitude) : null;

      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        const pat = String(item.id_ativo || item.patrimonio || item.id).trim().toUpperCase();
        const key = pat.replace(/\s+/g, '');

        if (resultMap.has(key)) {
          const existing = resultMap.get(key);
          resultMap.set(key, {
            ...existing,
            model: existing.model || item.model || item.details?.model,
            location: existing.location || item.location,
            subLocation: existing.subLocation || item.sub_location,
            foto_url: existing.foto_url || item.foto_url || item.details?.foto_url
          });
        } else {
          resultMap.set(key, {
            id: item.id,
            idAtivo: pat,
            patrimonio: pat,
            category: item.category || 'extintores',
            model: item.model || item.details?.model || 'Equipamento SPCI',
            location: item.location || 'Área Operacional',
            subLocation: item.sub_location || item.subLocation || '',
            status: item.status || 'Conforme',
            status_estoque: item.status_estoque || 'NA ÁREA (APLICADO)',
            tipo_movimentacao: item.tipo_movimentacao || 'na_area_aplicado',
            latitude: lat,
            longitude: lng,
            precisao_gps: item.precisao_gps ? Number(item.precisao_gps) : null,
            data_ultima_localizacao: item.data_ultima_localizacao || item.updated_at,
            origem_localizacao: item.origem_localizacao || 'EDICAO_MANUAL',
            foto_url: item.foto_url || item.details?.foto_url || null
          });
        }
      }
    }

    const validAssets = Array.from(resultMap.values());

    return {
      success: true,
      assets: validAssets,
      totalPlotados: validAssets.length,
      totalInspecoesComGps
    };
  } catch (err: any) {
    console.error('[getOperationalMapAssetsAction] Erro:', err);
    return {
      success: false,
      assets: [],
      totalPlotados: 0,
      totalInspecoesComGps: 0,
      error: err.message || String(err)
    };
  }
}
