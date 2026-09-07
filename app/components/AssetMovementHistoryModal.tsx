'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Clock, 
  User, 
  Camera, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Boxes, 
  ArrowRight,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import { getAssetLocationHistoryAction } from '@/app/actions/geoTrackingActions';
import { LocationHistoryEntry, formatDistance } from '@/lib/geoUtils';

interface AssetMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    idAtivo?: string;
    patrimonio?: string;
    category?: string;
    model?: string;
    location?: string;
    subLocation?: string;
    status?: string;
  } | null;
}

export default function AssetMovementHistoryModal({
  isOpen,
  onClose,
  asset
}: AssetMovementHistoryModalProps) {
  const [history, setHistory] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const assetCode = String(asset?.idAtivo || asset?.patrimonio || '').toUpperCase();

  useEffect(() => {
    if (isOpen && assetCode) {
      setLoading(true);
      getAssetLocationHistoryAction(assetCode)
        .then((res) => {
          if (res.success) {
            setHistory(res.history);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, assetCode]);

  if (!isOpen || !asset) return null;

  // Estatísticas do histórico
  const totalDeslocamentos = history.length;
  const totalMetrosDeslocados = history.reduce((acc, curr) => acc + (curr.distancia_deslocada_metros || 0), 0);
  const maiorDeslocamento = history.reduce((max, curr) => Math.max(max, curr.distancia_deslocada_metros || 0), 0);

  const getEventBadge = (tipo: string) => {
    switch (tipo) {
      case 'CADASTRO_ESTOQUE':
        return {
          label: 'Cadastro Estoque',
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          icon: <Boxes size={12} className="text-blue-400" />
        };
      case 'RONDA_CAMPO':
        return {
          label: 'Ronda de Campo (Descoberta)',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: <Navigation size={12} className="text-amber-400" />
        };
      case 'INSPECAO':
      default:
        return {
          label: 'Vistoria Periódica',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck size={12} className="text-emerald-400" />
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
      >
        {/* CABEÇALHO */}
        <div className="bg-gradient-to-r from-red-750 to-slate-900 px-6 py-4 border-b border-red-700/40 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Navigation size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-white font-sans tracking-wide">
                  Histórico de Deslocamento & Timeline GPS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-red-100 text-[10px] font-bold">
                  {assetCode}
                </span>
              </div>
              <p className="text-[10px] text-red-200/80 font-sans mt-0.5">
                {asset.model || 'Equipamento SPCI'} • {asset.location}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* MÉTRICAS SUPERIORES (BENTO MINI) */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Leituras GPS</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{totalDeslocamentos}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Deslocamento Acumulado</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatDistance(totalMetrosDeslocados)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Maior Desvio (Delta)</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">{formatDistance(maiorDeslocamento)}</span>
          </div>
        </div>

        {/* CONTEÚDO DA TIMELINE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Consultando auditoria geoespacial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl space-y-2">
              <MapPin size={32} className="text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Nenhum registro de deslocamento gravado ainda para este ativo.
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                Novas leituras durante vistorias, rondas ou movimentação de estoque aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-red-600/30 ml-4 space-y-6">
              {history.map((item, idx) => {
                const badge = getEventBadge(item.tipo_evento);
                const isFirst = idx === 0;

                return (
                  <div key={item.id || idx} className="relative pl-6">
                    {/* Marcador na linha do tempo */}
                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 ${
                      isFirst 
                        ? 'bg-red-500 border-white ring-4 ring-red-500/20' 
                        : 'bg-slate-300 dark:bg-slate-900 border-slate-400 dark:border-slate-600'
                    }`} />

                    <div className={`p-4 rounded-xl border transition-all ${
                      isFirst 
                        ? 'bg-red-50/50 dark:bg-slate-850/90 border-red-300 dark:border-red-500/40 shadow-md' 
                        : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}>
                      {/* Topo do Evento */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold flex items-center gap-1 ${badge.bg}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                          {isFirst && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider">
                              Última Posição
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                          <Clock size={10} />
                          <span>
                            {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : 'Data não informada'}
                          </span>
                        </div>
                      </div>

                      {/* Coordenadas e Delta Haversine */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold">Coordenadas GPS</span>
                          <p className="font-mono text-slate-800 dark:text-slate-200">
                            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                            {item.precisao != null && (
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 ml-1.5">(±{item.precisao}m)</span>
                            )}
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold">Deslocamento Detectado</span>
                          <p className={`font-mono font-bold ${
                            item.distancia_deslocada_metros >= 5 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {item.distancia_deslocada_metros > 0 
                              ? `Δ ${formatDistance(item.distancia_deslocada_metros)}` 
                              : '0 m (Posição Estável / Inicial)'}
                          </p>
                        </div>
                      </div>

                      {/* Responsável e Evidência Fotográfica */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-500" />
                          <span>{item.usuario_nome || 'Operador SPCI'}</span>
                        </div>

                        {item.foto_evidencia_url && (
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(item.foto_evidencia_url!)}
                            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold transition-colors cursor-pointer"
                          >
                            <Camera size={12} />
                            <span>Ver Foto de Evidência</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL DE EXPANSÃO DE FOTO */}
        <AnimatePresence>
          {selectedPhoto && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <img
                  src={selectedPhoto}
                  alt="Evidência Fotográfica"
                  className="w-full h-full object-contain max-h-[80vh]"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* RODAPÉ */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar Timeline
          </button>
        </div>
      </motion.div>
    </div>
  );
}
