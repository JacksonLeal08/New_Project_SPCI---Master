'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SyncQueue, PendingSyncTask, PendingInspectionTask } from '@/lib/syncQueue';
import { MediaQueue, PendingMediaTask } from '@/lib/mediaQueue';
import { 
  RefreshCw, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  Database, 
  FileCheck, 
  Camera, 
  Box, 
  ChevronUp, 
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';

export default function SyncStatusPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [assetQueue, setAssetQueue] = useState<PendingSyncTask[]>([]);
  const [inspectionQueue, setInspectionQueue] = useState<PendingInspectionTask[]>([]);
  const [mediaQueue, setMediaQueue] = useState<PendingMediaTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showRecentSuccess, setShowRecentSuccess] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const prevTasksCountRef = useRef<number>(0);
  const { showConfirmModal } = useSpci();

  const loadQueues = useCallback(async () => {
    try {
      const [assets, inspections, medias] = await Promise.all([
        SyncQueue.getQueue(),
        SyncQueue.getInspectionQueue(),
        MediaQueue.getQueue(),
      ]);
      setAssetQueue(assets);
      setInspectionQueue(inspections);
      setMediaQueue(medias);
    } catch (err) {
      console.warn('[SyncStatusPanel] Erro ao carregar filas do IndexedDB:', err);
    }
  }, []);

  const totalTasks = assetQueue.length + inspectionQueue.length + mediaQueue.length;
  const totalFailed = 
    assetQueue.filter(t => t.status === 'failed').length + 
    inspectionQueue.filter(t => t.status === 'failed').length;

  // Processamento unificado de sincronização
  const handleForceSync = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return;
    }

    setIsProcessing(true);
    try {
      if (totalFailed > 0) {
        await SyncQueue.resetFailedTasks();
      }
      await SyncQueue.processAllQueues();
      await loadQueues();
      setLastSyncTime(new Date());
      setShowRecentSuccess(true);
      setTimeout(() => setShowRecentSuccess(false), 4000);
    } catch (e) {
      console.error('[SyncStatusPanel] Falha na sincronização:', e);
    } finally {
      setIsProcessing(false);
    }
  }, [totalFailed, loadQueues]);

  // Efeito para monitorar conectividade e eventos da fila
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Estado inicial de conectividade
    setIsOnline(navigator.onLine);
    loadQueues();

    const handleOnline = () => {
      console.log('[SyncStatusPanel] Conexão detectada. Disparando sincronização automática...');
      setIsOnline(true);
      handleForceSync();
    };

    const handleOffline = () => {
      console.log('[SyncStatusPanel] Dispositivo desconectado. Modo Offline ativado.');
      setIsOnline(false);
    };

    const handleSyncUpdated = () => {
      loadQueues();
    };

    const handleOpenPanel = () => {
      setIsOpen(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('spci_sync_updated', handleSyncUpdated);
    window.addEventListener('spci-open-sync-panel', handleOpenPanel);

    // Polling de segurança a cada 5 segundos
    const interval = setInterval(loadQueues, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('spci_sync_updated', handleSyncUpdated);
      window.removeEventListener('spci-open-sync-panel', handleOpenPanel);
      clearInterval(interval);
    };
  }, [loadQueues, handleForceSync]);

  // Monitora se as tarefas foram esvaziadas após sincronização bem-sucedida
  useEffect(() => {
    if (prevTasksCountRef.current > 0 && totalTasks === 0 && isOnline) {
      setShowRecentSuccess(true);
      const timer = setTimeout(() => setShowRecentSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
    prevTasksCountRef.current = totalTasks;
  }, [totalTasks, isOnline]);

  const handleResetFailed = async () => {
    await SyncQueue.resetFailedTasks();
    await loadQueues();
  };

  const handleClearQueues = async () => {
    showConfirmModal({
      title: 'Limpar Fila de Sincronização 🗑️',
      message: 'Tem certeza de que deseja limpar e apagar todas as tarefas pendentes de sincronização? Isso apagará vistorias e alterações pendentes no dispositivo.',
      type: 'error',
      confirmText: 'LIMPAR TUDO',
      cancelText: 'CANCELAR',
      onConfirm: async () => {
        await SyncQueue.clearQueue();
        await SyncQueue.clearInspectionQueue();
        await MediaQueue.clearQueue();
        await loadQueues();
      }
    });
  };

  return (
    <>
      {/* Alerta Discreto de Topo por Exceção (Aparece apenas quando offline ou em caso de erro, deixando o logout 100% livre) */}
      <AnimatePresence>
        {!isOpen && (!isOnline || totalFailed > 0) && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 no-print print:hidden select-none pointer-events-auto">
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsOpen(true)}
              aria-label="Abrir Painel de Sincronização SPCI"
              className={`px-3.5 py-1.5 rounded-full font-mono text-[10px] font-black tracking-wider flex items-center gap-2 border cursor-pointer backdrop-blur-md shadow-xl transition-all uppercase min-h-[36px] ${
                !isOnline 
                  ? 'bg-amber-500/95 border-amber-400 text-slate-950 shadow-amber-950/20' 
                  : 'bg-red-600/95 border-red-400 text-white shadow-red-950/30'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
              </span>
              {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{!isOnline ? 'Modo Offline Ativo' : `${totalFailed} Erro(s) de Sincronização`}</span>
              {totalTasks > 0 && (
                <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                  {totalTasks}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Modal / Drawer HUD Detalhado */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 font-mono no-print print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-lg border border-slate-700/80 bg-slate-900/98 text-slate-200 shadow-2xl relative overflow-hidden flex flex-col p-5 sm:p-6 rounded-2xl max-h-[88vh]"
            >
              {/* Barra superior de status com cor dinâmica */}
              <div 
                className={`h-1.5 absolute top-0 left-0 right-0 ${
                  totalFailed > 0 
                    ? 'bg-red-500' 
                    : !isOnline 
                    ? 'bg-amber-500' 
                    : isProcessing 
                    ? 'bg-cyan-400 animate-pulse' 
                    : 'bg-emerald-500'
                }`} 
              />

              {/* Cabeçalho */}
              <div className="flex justify-between items-start mb-4 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block">
                      TELEMETRIA DE SINCRONIZAÇÃO SPCI
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mt-1">
                    Central de Transmissão em Campo
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar Painel"
                  className="text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 bg-slate-800/80 p-2 rounded-xl cursor-pointer transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mensagem Explicativa de Modo Offline (Ronda Segura) */}
              {!isOnline && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2.5 leading-relaxed">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="font-black text-amber-200 uppercase block mb-0.5">
                      Modo Ronda Segura Ativo
                    </strong>
                    Você está desconectado da rede. Todas as vistorias, alterações e fotos são salvas localmente no seu dispositivo e serão sincronizadas com o servidor automaticamente quando a conexão for reestabelecida.
                  </div>
                </div>
              )}

              {/* Bento Cards de Telemetria (3 Colunas) */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-950/70 border border-slate-800 p-3 mb-4 rounded-xl text-center">
                <div className="flex flex-col items-center justify-center p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <Box className="w-4 h-4 text-blue-400 mb-1" />
                  <span className="text-[9px] text-slate-400 uppercase">Ativos</span>
                  <span className="text-white font-extrabold text-sm">{assetQueue.length}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <FileCheck className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-[9px] text-slate-400 uppercase">Vistorias</span>
                  <span className="text-white font-extrabold text-sm">{inspectionQueue.length}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <Camera className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-[9px] text-slate-400 uppercase">Fotos</span>
                  <span className="text-white font-extrabold text-sm">{mediaQueue.length}</span>
                </div>
              </div>

              {/* Lista Detalhada de Tarefas Pendentes */}
              <div className="flex-1 max-h-[32vh] overflow-y-auto space-y-2 border border-slate-800 bg-slate-950/50 p-3 rounded-xl mb-4 scrollbar-thin scrollbar-thumb-slate-700">
                {totalTasks === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="font-bold text-slate-300">Fila Vazia • 100% Sincronizado</span>
                    <span className="text-[10px] text-slate-500 text-center max-w-xs">
                      Não há itens pendentes de transmissão no armazenamento local.
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Ativos */}
                    {assetQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-blue-400 uppercase flex items-center gap-1.5">
                            <Box className="w-3 h-3 text-blue-400 shrink-0" />
                            ATIVO: {task.assetId}
                          </span>
                          <span className="block text-slate-400 font-sans mt-0.5 truncate text-[11px]">
                            Módulo: {task.moduleKey} | Tentativas: {task.attempts || 0}
                          </span>
                          {task.error && (
                            <span className="block text-red-400 font-sans mt-1 bg-red-950/40 px-2 py-1 border border-red-900/40 rounded text-[10px]">
                              {task.error}
                            </span>
                          )}
                        </div>
                        <span className={`text-[8px] font-bold px-2 py-1 uppercase shrink-0 rounded ${
                          task.status === 'failed' ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'
                        }`}>
                          {task.status || 'pendente'}
                        </span>
                      </div>
                    ))}

                    {/* Vistorias */}
                    {inspectionQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-emerald-400 uppercase flex items-center gap-1.5">
                            <FileCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            VISTORIA: {task.inspecao.asset_patrimonio}
                          </span>
                          <span className="block text-slate-400 font-sans mt-0.5 truncate text-[11px]">
                            Técnico: {task.inspecao.tecnico_nome} | Status: {task.inspecao.status}
                          </span>
                          {task.error && (
                            <span className="block text-red-400 font-sans mt-1 bg-red-950/40 px-2 py-1 border border-red-900/40 rounded text-[10px]">
                              {task.error}
                            </span>
                          )}
                        </div>
                        <span className={`text-[8px] font-bold px-2 py-1 uppercase shrink-0 rounded ${
                          task.status === 'failed' ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'
                        }`}>
                          {task.status || 'pendente'}
                        </span>
                      </div>
                    ))}

                    {/* Fotos */}
                    {mediaQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-cyan-400 uppercase flex items-center gap-1.5">
                            <Camera className="w-3 h-3 text-cyan-400 shrink-0" />
                            FOTO: {task.assetId}
                          </span>
                          <span className="block text-slate-400 font-sans mt-0.5 truncate text-[11px]">
                            Arquivo: {task.fileName}
                          </span>
                        </div>
                        <span className="text-[8px] font-bold px-2 py-1 uppercase shrink-0 bg-cyan-600 text-white rounded">
                          pendente
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Barra de Ações do HUD */}
              <div className="flex flex-wrap justify-between items-center gap-2.5 border-t border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearQueues}
                    title="Limpar Fila de Sincronia"
                    className="p-2.5 border border-slate-700 hover:border-red-500/70 bg-slate-800/80 text-slate-400 hover:text-red-400 transition-all rounded-xl cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {totalFailed > 0 && (
                    <button
                      onClick={handleResetFailed}
                      className="px-3 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/80 text-slate-200 text-[10px] font-extrabold tracking-wider transition-all rounded-xl cursor-pointer flex items-center gap-1.5 active:scale-95 min-h-[44px]"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> RESETAR FALHAS
                    </button>
                  )}
                </div>

                <button
                  onClick={handleForceSync}
                  disabled={isProcessing || !isOnline}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-[10px] font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-2 active:scale-[0.97] min-h-[44px]"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} /> 
                  {isProcessing ? 'TRANSMITINDO...' : !isOnline ? 'AGUARDANDO REDE' : 'FORÇAR TRANSMISSÃO'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
