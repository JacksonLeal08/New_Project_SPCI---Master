import { useState, useEffect, useCallback } from 'react';
import { SyncQueue } from '@/lib/syncQueue';

export function useSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Função para ler a fila e atualizar o contador de itens pendentes
  const updatePendingCount = useCallback(async () => {
    try {
      const activeQueue = await SyncQueue.getQueue();
      const inspectionQueue = await SyncQueue.getInspectionQueue();
      
      // Contabiliza apenas tarefas que não falharam de forma definitiva
      const pendingSyncs = activeQueue.filter(task => task.status !== 'failed').length;
      const pendingInspections = inspectionQueue.filter(task => task.status !== 'failed').length;
      
      setPendingCount(pendingSyncs + pendingInspections);
    } catch (e) {
      console.warn('[useSync] Erro ao ler filas locais para contador:', e);
    }
  }, []);

  // Força o processamento de ambas as filas e recarrega os contadores
  const triggerSync = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || syncing) return;

    setSyncing(true);
    try {
      console.log('[useSync] Disparando sincronização de filas...');
      
      // Processa a fila de ativos
      await SyncQueue.processQueue();
      // Processa a fila de vistorias
      await SyncQueue.processInspectionQueue();
      
      await updatePendingCount();
    } catch (e) {
      console.error('[useSync] Falha no processamento das filas:', e);
    } finally {
      setSyncing(false);
    }
  }, [syncing, updatePendingCount]);

  // Listener para estado de conectividade e sincronismo automático
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carrega o contador inicial de tarefas pendentes
    updatePendingCount();

    // Loop discreto para atualizar o contador a cada 30 segundos
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    syncing,
    triggerSync,
    updatePendingCount
  };
}
