'use client';

import React from 'react';
import { HelpCircle, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface RegrasVencimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegrasVencimentoModal({
  isOpen,
  onClose
}: RegrasVencimentoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 font-sans animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 flex items-center justify-center text-red-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 font-mono">
              REGRAS DE VENCIMENTO
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cards de Regras */}
        <div className="space-y-3.5 text-xs">
          {/* 1. NO PRAZO */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 tracking-wide">
                NO PRAZO
              </span>
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-bold mb-1">
              Mais de 70 dias até o vencimento
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
              O ativo está dentro do prazo de validade da recarga. Nenhuma ação imediata necessária.
            </p>
          </div>

          {/* 2. A VENCER */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-amber-300 dark:hover:border-amber-800/60 transition-all shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
              <span className="text-sm font-black text-orange-600 dark:text-orange-400 tracking-wide">
                A VENCER
              </span>
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-bold mb-1">
              Entre 46 e 70 dias até o vencimento
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
              O ativo está próximo do vencimento. Programe a recarga e a manutenção preventiva.
            </p>
          </div>

          {/* 3. VENCIDO */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-red-300 dark:hover:border-red-800/60 transition-all shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              <span className="text-sm font-black text-red-600 dark:text-red-400 tracking-wide">
                VENCIDO
              </span>
            </div>
            <div className="text-slate-900 dark:text-slate-100 font-bold mb-1">
              45 dias ou menos até o vencimento
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
              O ativo está vencido ou prestes a vencer. Recarga imediata é necessária.
            </p>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Critério Operacional Preventivo SPCI</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 transition-all cursor-pointer active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
