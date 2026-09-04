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
    email?: string;
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
    const cleanIdWithoutSpaces = cleanId.replace(/\s+/g, '');
    let currentLat: number | null = null;
    let currentLng: number | null = null;
    
    // Verificar se é extintor pelo patrimônio ou categoria para obter o UUID real
    let resolvedId = cleanId;
    let resolvedPatrimonio = cleanId;

    if (category === 'extintores' || cleanId.toUpperCase().includes('EXT')) {
      const { data: extData } = await supabase
        .from('ativos_extintores')
        .select('id, numero_patrimonio')
        .or(`numero_patrimonio.eq.${cleanId},numero_patrimonio.eq.${cleanIdWithoutSpaces},id.eq.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (extData) {
        resolvedId = extData.id;
        resolvedPatrimonio = extData.numero_patrimonio || cleanId;
      }
    }

    // Buscar dados atuais na tabela unificada 'assets' onde vive o Georreferenciamento
    const { data: assetData } = await supabase
      .from('assets')
      .select('id, id_ativo, patrimonio, latitude, longitude, details, model, location, sub_location, status')
      .or(`id.eq.${resolvedId},id_ativo.eq.${resolvedPatrimonio},patrimonio.eq.${resolvedPatrimonio},id.eq.${cleanId},id_ativo.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (assetData) {
      resolvedId = assetData.id || resolvedId;
      resolvedPatrimonio = assetData.id_ativo || assetData.patrimonio || resolvedPatrimonio;
      currentLat = assetData.latitude != null ? Number(assetData.latitude) : null;
      currentLng = assetData.longitude != null ? Number(assetData.longitude) : null;
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
      const existingDetails = assetData?.details || {};
      const updatedDetails = {
        ...existingDetails,
        precisao_gps: accuracy,
        origem_localizacao: tipoEvento,
        data_ultima_localizacao: nowIso,
        foto_evidencia_url: fotoEvidenciaUrl || existingDetails.foto_evidencia_url || null
      };

      const { error: assetUpdateErr } = await supabase
        .from('assets')
        .upsert({
          id: resolvedId,
          id_ativo: resolvedPatrimonio,
          patrimonio: resolvedPatrimonio,
          category: category || (resolvedPatrimonio.includes('EXT') ? 'extintores' : 'outros'),
          latitude: latitude,
          longitude: longitude,
          details: updatedDetails,
          updated_at: nowIso
        }, { onConflict: 'id' });

      if (assetUpdateErr) {
        console.error('[processAssetLocationUpdateAction] Erro ao sincronizar em assets:', assetUpdateErr.message);
      }

      // Se for extintor, atualizar carimbo em 'ativos_extintores'
      if (category === 'extintores' || resolvedPatrimonio.includes('EXT')) {
        try {
          await supabase
            .from('ativos_extintores')
            .update({ updated_at: nowIso })
            .or(`numero_patrimonio.eq.${resolvedPatrimonio},id.eq.${resolvedId}`);
        } catch { /* ignora erro de carimbo */ }
      }
    }

    // 4. Inserir registro de auditoria no logs_auditoria
    try {
      await supabase
        .from('logs_auditoria')
        .insert([{
          usuario_id: usuario?.id || null,
          usuario_nome: usuario?.nome || 'Operador Técnico',
          usuario_email: usuario?.email || null,
          acao: 'RASTREAMENTO_GPS',
          tipo_ativo: category || 'extintores',
          patrimonio: resolvedPatrimonio,
          detalhes: `GPS Atualizado: Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)} (Margem ±${accuracy}m). Evento: ${tipoEvento}`,
          created_at: nowIso
        }]);
    } catch (audErr: any) {
      console.warn('[processAssetLocationUpdateAction] Aviso ao gravar logs_auditoria:', audErr.message);
    }

    return {
      success: true,
      updated: evaluation.shouldUpdate,
      distanceMeters: evaluation.distanceMeters,
      reason: evaluation.reason
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
 * Retorna histórico de movimentações geoespaciais de um ativo específico
 */
export async function getAssetLocationHistoryAction(assetId: string): Promise<{
  success: boolean;
  history: any[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const cleanId = String(assetId).trim();
    const cleanIdWithoutSpaces = cleanId.replace(/\s+/g, '');

    const { data, error } = await supabase
      .from('logs_auditoria')
      .select('*')
      .or(`patrimonio.eq.${cleanId},patrimonio.eq.${cleanIdWithoutSpaces},patrimonio.ilike.%${cleanIdWithoutSpaces}%`)
      .eq('acao', 'RASTREAMENTO_GPS')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return {
      success: true,
      history: data || []
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

    // 1. Carregar metadados completos de extintores da view pública
    let extList: any[] = [];
    try {
      const { data: viewData } = await supabase
        .from('vw_extintores_publico')
        .select('*');
      if (viewData && viewData.length > 0) {
        extList = viewData;
      }
    } catch {
      extList = [];
    }

    const extMetaMap = new Map<string, any>();
    for (const ext of extList) {
      if (ext.id) extMetaMap.set(String(ext.id).toLowerCase(), ext);
      if (ext.numero_patrimonio) {
        const pNorm = String(ext.numero_patrimonio).replace(/\s+/g, '').toUpperCase();
        extMetaMap.set(pNorm, ext);
      }
    }

    // 2. Buscar TODOS os ativos com coordenadas salvas na tabela 'assets'
    const { data: assetsData, error: assetsErr } = await supabase
      .from('assets')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (assetsErr) {
      console.error('[getOperationalMapAssetsAction] Erro ao buscar assets:', assetsErr);
    }

    // 3. Contar inspeções que possuem GPS registrado
    let totalInspecoesComGps = 0;
    try {
      const { count } = await supabase
        .from('inspecoes_realizadas')
        .select('*', { count: 'exact', head: true })
        .not('details->geo_latitude', 'is', null);
      totalInspecoesComGps = count || 0;
    } catch {
      totalInspecoesComGps = 0;
    }

    // 4. Mapear e unir todos os ativos com coordenadas válidas
    const resultMap = new Map<string, any>();

    for (const item of (assetsData || [])) {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      if (isNaN(lat) || isNaN(lng)) continue;

      const pat = String(item.id_ativo || item.patrimonio || item.id).trim().toUpperCase();
      const pNorm = pat.replace(/\s+/g, '');
      const extMeta = extMetaMap.get(String(item.id).toLowerCase()) || extMetaMap.get(pNorm);

      const isExt = (item.category || '').toLowerCase().includes('extintor') || pat.includes('EXT');

      resultMap.set(pNorm, {
        id: item.id,
        idAtivo: pat,
        patrimonio: pat,
        category: isExt ? 'extintores' : (item.category || 'outros'),
        model: extMeta?.modelo_tipo || item.model || item.details?.model || (isExt ? 'Extintor ABC' : 'Equipamento SPCI'),
        location: extMeta?.local_instalacao || item.location || 'Área Operacional',
        subLocation: extMeta?.sub_local_instalacao || item.sub_location || item.details?.subLocation || '',
        status: extMeta?.status_conformidade === 'VENCIDO' ? 'Vencido' : (item.status || 'Conforme'),
        status_estoque: item.status_estoque || item.details?.status_estoque || 'NA ÁREA (APLICADO)',
        tipo_movimentacao: item.tipo_movimentacao || item.details?.tipo_movimentacao || 'na_area_aplicado',
        latitude: lat,
        longitude: lng,
        precisao_gps: item.details?.precisao_gps != null ? Number(item.details.precisao_gps) : null,
        data_ultima_localizacao: item.details?.data_ultima_localizacao || item.updated_at,
        origem_localizacao: item.details?.origem_localizacao || 'EDICAO_MANUAL',
        foto_url: extMeta?.foto_url || item.details?.foto_url || null
      });
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
