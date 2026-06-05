import { idb } from '@/lib/indexedDb';
import { saveAssetToDb, salvarInspecaoNoSupabase } from '@/lib/supabaseDb';
import { InspecaoRealizada } from '@/lib/types';

export interface PendingSyncTask {
  id: string;
  moduleKey: string; // Ex: 'extintores', 'hidrantes', 'sinalizacoes', 'iluminacao', 'bombas'
  assetId: string;
  payload: any;
  timestamp: number;
  attempts?: number;      // Número de tentativas realizadas
  lastAttempt?: number;   // Timestamp da última tentativa
  status?: 'pending' | 'failed'; // Status da tarefa
  error?: string;
}

export interface PendingInspectionTask {
  id: string;
  inspecao: InspecaoRealizada;
  timestamp: number;
  attempts?: number;      // Número de tentativas realizadas
  lastAttempt?: number;   // Timestamp da última tentativa
  status?: 'pending' | 'failed'; // Status da tarefa
  error?: string;
}

export class SyncQueue {
  private static STORAGE_KEY = 'spci_sync_queue';
  private static INSPECTION_STORAGE_KEY = 'spci_inspections_queue';
  private static MAX_ATTEMPTS = 5;

  /**
   * Identifica se o erro é uma falha definitiva de autorização/segurança (ex: RLS, token vencido).
   */
  private static isPermanentSecurityError(err: any): boolean {
    const msg = (err?.message || String(err)).toLowerCase();
    return (
      msg.includes('row level security') ||
      msg.includes('violates row level security') ||
      msg.includes('permission denied') ||
      msg.includes('jwt expired') ||
      msg.includes('invalid token') ||
      msg.includes('auth/invalid') ||
      msg.includes('jwt signature') ||
      msg.includes('não autorizado') ||
      msg.includes('acesso negado')
    );
  }

  /**
   * Enfileira uma nova tarefa de sincronização de ativo se estiver offline.
   */
  static async enqueue(moduleKey: string, assetId: string, payload: any): Promise<void> {
    const queue: PendingSyncTask[] = await this.getQueue();
    const newTask: PendingSyncTask = {
      id: `${moduleKey}-${assetId}-${Date.now()}`,
      moduleKey,
      assetId,
      payload,
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending'
    };

    // Remove qualquer tarefa pendente anterior para o mesmo ativo para evitar duplicação
    const filteredQueue = queue.filter(
      (task) => !(task.moduleKey === moduleKey && task.assetId === assetId)
    );
    filteredQueue.push(newTask);

    await idb.set('config', this.STORAGE_KEY, filteredQueue);
    console.log(`[SyncQueue] Ativo enfileirado para ${moduleKey}/${assetId}. Total na fila: ${filteredQueue.length}`);

    if (typeof window !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Obtém a lista de ativos pendentes.
   */
  static async getQueue(): Promise<PendingSyncTask[]> {
    try {
      const queue = await idb.get('config', this.STORAGE_KEY);
      return queue || [];
    } catch (e) {
      console.warn('Erro ao obter fila de ativos do IndexedDB:', e);
      return [];
    }
  }

  /**
   * Limpa a fila de ativos.
   */
  static async clearQueue(): Promise<void> {
    await idb.set('config', this.STORAGE_KEY, []);
  }

  /**
   * Processa a fila de ativos pendentes enviando-os ao Supabase com backoff exponencial.
   */
  static async processQueue(onSuccessTask?: (task: PendingSyncTask) => void): Promise<void> {
    const queue = await this.getQueue();
    // Filtra tarefas que ainda não falharam permanentemente
    const pendingTasks = queue.filter(task => task.status !== 'failed');
    if (pendingTasks.length === 0) return;

    console.log(`[SyncQueue] Processando ${pendingTasks.length} ativos pendentes de sincronismo...`);
    const updatedQueue = [...queue];

    for (const task of pendingTasks) {
      const taskIndex = updatedQueue.findIndex(t => t.id === task.id);
      if (taskIndex === -1) continue;

      const currentTask = updatedQueue[taskIndex];
      const attempts = currentTask.attempts || 0;
      const lastAttempt = currentTask.lastAttempt || 0;

      // Cálculo de Backoff Exponencial: delay = 2^attempts * 1500ms
      const delay = Math.pow(2, attempts) * 1500;
      const now = Date.now();

      if (lastAttempt > 0 && (now - lastAttempt < delay)) {
        console.log(`[SyncQueue] Pulando ativo ${currentTask.assetId} (em espera de backoff exponencial: ${Math.round((delay - (now - lastAttempt)) / 1000)}s restantes)`);
        continue;
      }

      currentTask.attempts = attempts + 1;
      currentTask.lastAttempt = now;

      try {
        await saveAssetToDb(currentTask.moduleKey, currentTask.assetId, currentTask.payload);
        console.log(`[SyncQueue] Sucesso ao sincronizar ativo ${currentTask.assetId} no Supabase.`);
        
        // Remove com sucesso a tarefa da fila
        updatedQueue.splice(taskIndex, 1);
        
        if (onSuccessTask) {
          onSuccessTask(currentTask);
        }
      } catch (err: any) {
        const isSecurityErr = SyncQueue.isPermanentSecurityError(err);
        console.error(`[SyncQueue] Erro ao sincronizar ativo ${currentTask.assetId} (Tentativa ${currentTask.attempts}/${this.MAX_ATTEMPTS}):`, err);
        currentTask.error = err.message || String(err);
        
        if (isSecurityErr || currentTask.attempts >= this.MAX_ATTEMPTS) {
          currentTask.status = 'failed';
          console.warn(`[SyncQueue] Ativo ${currentTask.assetId} marcado como falhado devido a ${isSecurityErr ? 'Erro de RLS/Segurança' : 'limite de tentativas'}.`);
          
          if (isSecurityErr && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spci_security_sync_error', { detail: { error: err.message || String(err) } }));
          }
        }

        if (isSecurityErr) {
          console.warn('[SyncQueue] Abortando processamento da fila devido a erro crítico de segurança.');
          break; // Aborta o processamento da fila de ativos
        }
      }
    }

    await idb.set('config', this.STORAGE_KEY, updatedQueue);
  }

  /**
   * Enfileira uma nova inspeção de vistoria realizada.
   */
  static async enqueueInspection(inspecao: InspecaoRealizada): Promise<void> {
    const queue: PendingInspectionTask[] = await this.getInspectionQueue();
    const newTask: PendingInspectionTask = {
      id: `inspecao-${inspecao.asset_id}-${Date.now()}`,
      inspecao,
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending'
    };

    queue.push(newTask);
    await idb.set('config', this.INSPECTION_STORAGE_KEY, queue);
    console.log(`[SyncQueue] Vistoria enfileirada para o ativo ${inspecao.asset_patrimonio}. Total na fila: ${queue.length}`);

    if (typeof window !== 'undefined' && navigator.onLine) {
      this.processInspectionQueue();
    }
  }

  /**
   * Obtém a lista de vistorias pendentes.
   */
  static async getInspectionQueue(): Promise<PendingInspectionTask[]> {
    try {
      const queue = await idb.get('config', this.INSPECTION_STORAGE_KEY);
      return queue || [];
    } catch (e) {
      console.warn('Erro ao obter fila de vistorias do IndexedDB:', e);
      return [];
    }
  }

  /**
   * Limpa a fila de vistorias.
   */
  static async clearInspectionQueue(): Promise<void> {
    await idb.set('config', this.INSPECTION_STORAGE_KEY, []);
  }

  /**
   * Processa a fila de vistorias pendentes enviando-as ao Supabase com backoff exponencial.
   */
  static async processInspectionQueue(onSuccessTask?: (task: PendingInspectionTask) => void): Promise<void> {
    const queue = await this.getInspectionQueue();
    const pendingTasks = queue.filter(task => task.status !== 'failed');
    if (pendingTasks.length === 0) return;

    console.log(`[SyncQueue] Processando ${pendingTasks.length} vistorias offline pendentes...`);
    const updatedQueue = [...queue];

    for (const task of pendingTasks) {
      const taskIndex = updatedQueue.findIndex(t => t.id === task.id);
      if (taskIndex === -1) continue;

      const currentTask = updatedQueue[taskIndex];
      const attempts = currentTask.attempts || 0;
      const lastAttempt = currentTask.lastAttempt || 0;

      // Cálculo de Backoff Exponencial: delay = 2^attempts * 1500ms
      const delay = Math.pow(2, attempts) * 1500;
      const now = Date.now();

      if (lastAttempt > 0 && (now - lastAttempt < delay)) {
        console.log(`[SyncQueue] Pulando vistoria do ativo ${currentTask.inspecao.asset_patrimonio} (em espera de backoff exponencial: ${Math.round((delay - (now - lastAttempt)) / 1000)}s restantes)`);
        continue;
      }

      currentTask.attempts = attempts + 1;
      currentTask.lastAttempt = now;

      try {
        const result = await salvarInspecaoNoSupabase(currentTask.inspecao);
        if (!result.success) {
          throw new Error(result.error || 'Erro desconhecido de banco');
        }
        console.log(`[SyncQueue] Sucesso ao sincronizar vistoria do ativo ${currentTask.inspecao.asset_patrimonio}.`);
        
        // Remove a tarefa concluída da fila
        updatedQueue.splice(taskIndex, 1);

        if (onSuccessTask) {
          onSuccessTask(currentTask);
        }
      } catch (err: any) {
        const isSecurityErr = SyncQueue.isPermanentSecurityError(err);
        console.error(`[SyncQueue] Erro ao enviar vistoria do ativo ${currentTask.inspecao.asset_patrimonio} (Tentativa ${currentTask.attempts}/${this.MAX_ATTEMPTS}):`, err);
        currentTask.error = err.message || String(err);

        if (isSecurityErr || currentTask.attempts >= this.MAX_ATTEMPTS) {
          currentTask.status = 'failed';
          console.warn(`[SyncQueue] Vistoria do ativo ${currentTask.inspecao.asset_patrimonio} marcada como falhada devido a ${isSecurityErr ? 'Erro de RLS/Segurança' : 'limite de tentativas'}.`);
          
          if (isSecurityErr && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spci_security_sync_error', { detail: { error: err.message || String(err) } }));
          }
        }

        if (isSecurityErr) {
          console.warn('[SyncQueue] Abortando processamento da fila de vistorias devido a erro crítico de segurança.');
          break; // Aborta o processamento da fila de vistorias
        }
      }
    }

    await idb.set('config', this.INSPECTION_STORAGE_KEY, updatedQueue);
  }
}

// Escuta de eventos do navegador para rodar automaticamente ao restabelecer internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Rede reestabelecida. Disparando processamento de filas pendentes...');
    SyncQueue.processQueue();
    SyncQueue.processInspectionQueue();
  });
}
