/**
 * Módulo unificado de dados offline, pré-carga (prefetching) e sincronização inteligente (dbSync.ts).
 * Gerencia o ciclo de vida offline-first entre o IndexedDB e o Supabase.
 */

import { idb } from '@/lib/indexedDb';
import { supabase } from '@/lib/supabaseClient';
import { salvarInspecaoNoSupabase, getAssetsList } from '@/lib/supabaseDb';
import { SyncQueue } from '@/lib/syncQueue';
import { InspecaoRealizada } from '@/lib/types';
import { DEFAULT_EXTINTOR_CHECKLIST, ChecklistItemData } from '@/app/components/ChecklistEditModal';

export interface InspectionSubmissionResult {
  success: boolean;
  mode: 'online' | 'offline';
  error?: string;
}

/**
 * Dispara evento em tempo real via Broadcast no canal do Supabase para alertar o Web Admin imediatamente.
 */
export async function dispatchRealtimeInspectionEvent(inspecao: InspecaoRealizada): Promise<void> {
  try {
    const channel = supabase.channel('spci_realtime_sync');
    await channel.send({
      type: 'broadcast',
      event: 'nova_inspecao',
      payload: {
        id: inspecao.id || `insp-${Date.now()}`,
        asset_id: inspecao.asset_id,
        asset_patrimonio: inspecao.asset_patrimonio,
        status: inspecao.status,
        tecnico_nome: inspecao.tecnico_nome,
        data_inspecao: inspecao.data_inspecao || new Date().toISOString(),
        location: inspecao.details?.location || '',
        subLocation: inspecao.details?.subLocation || '',
        observacoes: inspecao.observacoes || '',
        category: inspecao.asset_patrimonio.toUpperCase().startsWith('EXT-') ? 'extintores' : 'equipamento'
      }
    });
    console.log('[dbSync] Evento broadcast de nova inspeção emitido para Web Admin:', inspecao.asset_patrimonio);
  } catch (err) {
    console.warn('[dbSync] Falha ao enviar broadcast em tempo real (não crítico):', err);
  }
}

/**
 * Pré-carregamento e hidratação de dados para operação offline em campo.
 * Salva no IndexedDB:
 * 1. Base completa de ativos operacionais (extintores, etc.)
 * 2. Templates mais recentes de checklist ativos configurados no admin
 * 3. Metadados de setores e locais
 */
export async function prefetchAndHydrateOfflineData(): Promise<{ success: boolean; totalAssets: number }> {
  if (typeof window === 'undefined') return { success: false, totalAssets: 0 };

  try {
    console.log('[dbSync] Iniciando prefetch e hidratação de dados offline...');

    // 1. Pré-carga dos ativos de extintores
    const assets = await getAssetsList('extintores');
    if (assets && assets.length > 0) {
      await idb.setAll('extintores', assets);
      console.log(`[dbSync] ${assets.length} ativos salvos no cache IndexedDB.`);
    }

    // 2. Pré-carga dos templates de checklist ativos
    try {
      const { data: checklistRows, error: chkErr } = await supabase
        .from('checklists_ativos')
        .select('*')
        .eq('categoria', 'extintores')
        .order('ordem', { ascending: true });

      if (!chkErr && checklistRows && checklistRows.length > 0) {
        const formattedChecklist: ChecklistItemData[] = checklistRows.map((row: any) => ({
          id: row.id,
          ordem: row.ordem,
          categoria: row.categoria || 'extintores',
          item: row.item,
          tiposAplicaveis: Array.isArray(row.tipos_aplicaveis) ? row.tipos_aplicaveis : ['Todos'],
          pesosAplicaveis: Array.isArray(row.pesos_aplicaveis) ? row.pesos_aplicaveis : ['Todos'],
          status: row.status || 'Ativado',
          isImpeditivo: !!(row.is_impeditivo || row.isImpeditivo)
        }));
        await idb.set('config', 'spci_checklist_extintores', formattedChecklist);
        console.log(`[dbSync] ${formattedChecklist.length} itens de checklist cacheados no IndexedDB.`);
      } else {
        // Fallback para o checklist padrão homologado NBR
        await idb.set('config', 'spci_checklist_extintores', DEFAULT_EXTINTOR_CHECKLIST);
      }
    } catch (e) {
      console.warn('[dbSync] Aviso ao buscar checklists_ativos, aplicando padrão local:', e);
      await idb.set('config', 'spci_checklist_extintores', DEFAULT_EXTINTOR_CHECKLIST);
    }

    // 3. Marca timestamp da última hidratação
    await idb.set('config', 'spci_last_prefetch_timestamp', Date.now());

    return { success: true, totalAssets: assets?.length || 0 };
  } catch (error) {
    console.error('[dbSync] Erro durante o prefetch de dados offline:', error);
    return { success: false, totalAssets: 0 };
  }
}

/**
 * Obtém os templates de checklist ativos armazenados em cache ou padrão
 */
export async function getCachedChecklistItems(): Promise<ChecklistItemData[]> {
  try {
    const cached = await idb.get('config', 'spci_checklist_extintores');
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch (e) {
    console.warn('[dbSync] Erro ao ler checklist do cache:', e);
  }
  return DEFAULT_EXTINTOR_CHECKLIST;
}

/**
 * Submete uma inspeção de campo com estratégia inteligente Online / Offline-first.
 */
export async function submitInspectionWithSync(
  inspecao: InspecaoRealizada & { justificativa_reinspecao?: string | null; foto_evidencia_url?: string | null }
): Promise<InspectionSubmissionResult> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;

  // CENÁRIO 1: Conexão detectada - tenta envio direto
  if (isOnline) {
    try {
      const res = await salvarInspecaoNoSupabase(inspecao);
      if (res.success) {
        // Dispara broadcast instantâneo para o Web Admin
        await dispatchRealtimeInspectionEvent(inspecao);
        return { success: true, mode: 'online' };
      }
      console.warn('[dbSync] Falha no salvamento online no Supabase, caindo para fila offline:', res.error);
    } catch (err: any) {
      console.warn('[dbSync] Exceção na chamada de rede, direcionando para fila local:', err);
    }
  }

  // CENÁRIO 2: Offline ou erro de rede - persiste na fila de outbox do IndexedDB
  try {
    await SyncQueue.enqueueInspection(inspecao);
    return { success: true, mode: 'offline' };
  } catch (err: any) {
    console.error('[dbSync] Erro crítico ao enfileirar inspeção no IndexedDB:', err);
    return { success: false, mode: 'offline', error: err?.message || 'Falha ao salvar no armazenamento local' };
  }
}

// Inicializa o listener de reconexão de rede (Online Event) para esvaziar a fila automaticamente
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[dbSync] Conexão restabelecida! Iniciando sincronização da fila offline...');
    try {
      await SyncQueue.processInspectionQueue((task) => {
        // Para cada tarefa descarregada com sucesso, despacha o broadcast para o Web Admin
        if (task.inspecao) {
          dispatchRealtimeInspectionEvent(task.inspecao);
        }
      });
    } catch (err) {
      console.warn('[dbSync] Erro ao descarregar fila após reconexão:', err);
    }
  });
}
