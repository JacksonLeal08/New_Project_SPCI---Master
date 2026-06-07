import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SyncQueue, PendingSyncTask, PendingInspectionTask } from '@/lib/syncQueue';
import { MediaQueue, PendingMediaTask } from '@/lib/mediaQueue';
import { RefreshCw, Trash2, X, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SyncStatusPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [assetQueue, setAssetQueue] = useState<PendingSyncTask[]>([]);
  const [inspectionQueue, setInspectionQueue] = useState<PendingInspectionTask[]>([]);
  const [mediaQueue, setMediaQueue] = useState<PendingMediaTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadQueues = async () => {
    const assets = await SyncQueue.getQueue();
    const inspections = await SyncQueue.getInspectionQueue();
    const medias = await MediaQueue.getQueue();
    setAssetQueue(assets);
    setInspectionQueue(inspections);
    setMediaQueue(medias);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueues();
    // Atualiza a cada 5 segundos
    const interval = setInterval(loadQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalTasks = assetQueue.length + inspectionQueue.length + mediaQueue.length;
  const totalFailed = 
    assetQueue.filter(t => t.status === 'failed').length + 
    inspectionQueue.filter(t => t.status === 'failed').length;

  const handleForceSync = async () => {
    setIsProcessing(true);
    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        await SyncQueue.processQueue();
        await SyncQueue.processInspectionQueue();
        await MediaQueue.processQueue();
        await loadQueues();
      } else {
        alert('Dispositivo ainda offline. Aguardando rede para sincronizar.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFailed = async () => {
    await SyncQueue.resetFailedTasks();
    await loadQueues();
  };

  const handleClearQueues = async () => {
    if (confirm('Tem certeza de que deseja limpar e apagar todas as tarefas pendentes de sincronização? Isso apagará vistorias não salvas.')) {
      await SyncQueue.clearQueue();
      await SyncQueue.clearInspectionQueue();
      // Limpa fila de mídias também
      const db = await import('@/lib/indexedDb').then(m => m.getIndexedDB());
      const transaction = db.transaction('config', 'readwrite');
      transaction.objectStore('config').delete('spci_media_queue');
      await loadQueues();
    }
  };

  if (totalTasks === 0 && !isOpen) return null;

  return (
    <>
      {/* Botão Flutuante Indicador HUD */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 right-4 z-40 px-3.5 py-2.5 rounded-xl font-mono text-[10px] font-black tracking-wider flex items-center gap-2 border cursor-pointer shadow-lg active:scale-95 transition-all uppercase ${
            totalFailed > 0
              ? 'bg-red-500 hover:bg-red-600 border-red-400 text-slate-950 animate-pulse'
              : 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-slate-950 shadow-amber-950/20'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
          </span>
          {totalFailed > 0 ? `ERROS: ${totalFailed}` : `FILA OFFLINE: ${totalTasks}`}
        </motion.button>
      )}

      {/* Modal HUD Detalhado */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="w-full max-w-lg border border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col p-6 rounded-none text-slate-300"
            >
              {/* Accent Line */}
              <div className={`h-1 absolute top-0 left-0 right-0 ${totalFailed > 0 ? 'bg-red-650' : 'bg-amber-500'}`} />

              <div className="flex justify-between items-start mb-4 pt-1">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest block">HUD_CONSOLE // SYNCHRONIZATION</span>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider mt-0.5">
                    Fila de Transmissão SPCI
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-500 hover:text-slate-300 border border-slate-800 p-1.5 hover:border-slate-700 bg-slate-950 rounded-none cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Informações Gerais */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950 border border-slate-800 p-3 mb-4 text-[10px] text-slate-400">
                <div>
                  <span className="block text-slate-600">ATIVOS</span>
                  <span className="text-slate-100 font-extrabold text-xs">{assetQueue.length}</span>
                </div>
                <div>
                  <span className="block text-slate-600">VISTORIAS</span>
                  <span className="text-slate-100 font-extrabold text-xs">{inspectionQueue.length}</span>
                </div>
                <div>
                  <span className="block text-slate-600">FOTOS</span>
                  <span className="text-slate-100 font-extrabold text-xs">{mediaQueue.length}</span>
                </div>
              </div>

              {/* Lista de Itens da Fila */}
              <div className="flex-1 max-h-[30vh] overflow-y-auto space-y-2 border border-slate-800 bg-slate-950/60 p-3 rounded-none mb-5 scrollbar-thin scrollbar-thumb-slate-800">
                {totalTasks === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 text-[10px] gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span>FILA TRANSMISSÃO LIMPA E ATUALIZADA</span>
                  </div>
                ) : (
                  <>
                    {/* Ativos */}
                    {assetQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-400 uppercase">ATIVO: {task.assetId}</span>
                          <span className="block text-slate-500 font-sans mt-0.5 truncate">Modulo: {task.moduleKey} | Tentativas: {task.attempts}</span>
                          {task.error && (
                            <span className="block text-red-500 font-sans mt-1 bg-red-950/20 px-1.5 py-0.5 border border-red-900/30 whitespace-pre-wrap">
                              Erro: {task.error}
                            </span>
                          )}
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 uppercase shrink-0 ${
                          task.status === 'failed' ? 'bg-red-650 text-slate-950' : 'bg-amber-500 text-slate-950'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}

                    {/* Vistorias */}
                    {inspectionQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-400 uppercase">LAUDO: {task.inspecao.asset_patrimonio}</span>
                          <span className="block text-slate-500 font-sans mt-0.5 truncate">Técnico: {task.inspecao.tecnico_nome} | Status: {task.inspecao.status}</span>
                          {task.error && (
                            <span className="block text-red-500 font-sans mt-1 bg-red-950/20 px-1.5 py-0.5 border border-red-900/30 whitespace-pre-wrap">
                              Erro: {task.error}
                            </span>
                          )}
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 uppercase shrink-0 ${
                          task.status === 'failed' ? 'bg-red-650 text-slate-950' : 'bg-amber-500 text-slate-950'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}

                    {/* Mídias */}
                    {mediaQueue.map((task) => (
                      <div key={task.id} className="border-b border-slate-800/80 pb-2 text-[10px] flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-400 uppercase">FOTO ATIVO: {task.assetId}</span>
                          <span className="block text-slate-500 font-sans mt-0.5 truncate">Arquivo: {task.fileName}</span>
                        </div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 uppercase shrink-0 bg-blue-500 text-slate-950">
                          pendente
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Botões de Comando HUD */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-800 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleClearQueues}
                    title="Limpar Fila de Sincronia"
                    className="p-2.5 border border-slate-850 hover:border-red-900 bg-slate-950 text-slate-400 hover:text-red-500 transition-all rounded-none cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {totalFailed > 0 && (
                    <button
                      onClick={handleResetFailed}
                      className="px-3 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 text-[9px] font-extrabold tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> RESETAR FALHAS
                    </button>
                  )}
                </div>

                <button
                  onClick={handleForceSync}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-slate-950 text-[10px] font-black tracking-widest transition-all rounded-none cursor-pointer flex items-center gap-1.5 active:scale-[0.97]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} /> 
                  {isProcessing ? 'TRANSMITINDO...' : 'FORÇAR TRANSMISSÃO'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
