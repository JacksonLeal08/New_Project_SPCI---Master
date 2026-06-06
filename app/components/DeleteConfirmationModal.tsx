'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { playDisintegrateSound } from '@/lib/audio';

export default function DeleteConfirmationModal() {
  const { deleteConfirmation, setDeleteConfirmation, userProfile } = useSpci();

  if (!deleteConfirmation || !deleteConfirmation.show) return null;

  const { asset, assetType, onConfirm } = deleteConfirmation;

  const handleClose = () => {
    setDeleteConfirmation(null);
  };

  const handleConfirm = async () => {
    // 1. Close modal first
    handleClose();
    // 2. Play tactile sound effect programmatically
    playDisintegrateSound();
    // 3. Call the confirm action which triggers the disintegration & state update
    if (onConfirm) {
      await onConfirm();
    }
  };

  // Translate asset type slug to readable Portuguese label
  const getAssetTypeName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'extintor': return 'Extintor de Incêndio';
      case 'hidrante': return 'Hidrante de Parede / Abrigo';
      case 'iluminacao': return 'Iluminação de Emergência';
      case 'sinalizacao': return 'Placa de Sinalização NBR';
      default: return 'Ativo de Segurança';
    }
  };

  const assetName = getAssetTypeName(assetType);
  const patrimonio = asset?.idAtivo || asset?.id || 'N/A';
  const userName = userProfile?.name || 'Técnico Autorizado';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop glassmorphism */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-150 font-sans"
        >
          {/* Top Danger Bar Accent */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-rose-600 to-amber-500 w-full" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="p-6 pb-4 flex items-start gap-4">
            <div className="p-3 bg-red-950/50 border border-red-800/40 rounded-xl shrink-0 text-red-500">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500 mb-1">
                Ação Crítica de Sistema
              </p>
              <h3 className="text-lg font-bold text-white font-['Hanken_Grotesk'] leading-tight">
                Confirmar Exclusão de Ativo
              </h3>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-2 space-y-4 text-sm">
            {/* Logged in user info */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <p className="text-xs text-slate-400">Solicitante com privilégio de exclusão:</p>
              <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                👤 {userName} <span className="text-[9px] font-bold text-emerald-500/70 bg-emerald-950/60 border border-emerald-900/60 px-1.5 py-0.2 rounded uppercase ml-1.5">{userProfile?.role}</span>
              </p>
            </div>

            {/* Asset detailed specifications */}
            <div className="space-y-2.5">
              <p className="text-slate-300">
                Você realmente deseja remover o seguinte ativo cadastrado na rede?
              </p>
              
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase font-mono font-bold">Tipo do Ativo:</span>
                  <span className="font-extrabold text-slate-200">{assetName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase font-mono font-bold">Nº Patrimônio:</span>
                  <span className="font-mono font-bold text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2 py-0.5 rounded text-[11px]">
                    {patrimonio}
                  </span>
                </div>
                {asset?.location && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 uppercase font-mono font-bold">Localização:</span>
                    <span className="text-slate-300 font-medium truncate max-w-[200px]" title={asset.location}>
                      {asset.location} {asset.subLocation ? `(${asset.subLocation})` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* IRREVERSIBILITY WARNING */}
            <div className="flex gap-2.5 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <p className="leading-relaxed font-medium">
                <strong>Atenção:</strong> Esta exclusão é permanente e removerá todos os registros históricos de inspeção associados. <strong>Esta ação não poderá ser desfeita.</strong>
              </p>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="p-6 pt-4 bg-slate-950/30 border-t border-slate-800/60 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 border border-red-700/30 rounded-xl shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Confirmar Exclusão
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
