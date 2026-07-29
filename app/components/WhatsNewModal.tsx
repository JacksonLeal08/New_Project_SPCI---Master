'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CURRENT_SYSTEM_VERSION } from '@/lib/version';
import { Sparkles, X, CheckCircle2, Cpu, ShieldCheck, ArrowRight, Bell } from 'lucide-react';

export default function WhatsNewModal({
  isOpen,
  onClose
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen !== undefined) {
      setShowModal(isOpen);
      return;
    }

    // Auto-exibe o alerta na primeira visita da nova versão
    const lastSeenVersion = localStorage.getItem('spci_last_seen_version');
    if (lastSeenVersion !== CURRENT_SYSTEM_VERSION.version) {
      setShowModal(true);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    localStorage.setItem('spci_last_seen_version', CURRENT_SYSTEM_VERSION.version);
    setShowModal(false);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
          >
            {/* CABEÇALHO DA VERSÃO */}
            <div className="bg-gradient-to-r from-red-700 via-red-800 to-slate-900 p-6 text-white relative">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-500/30 border border-red-400/40 text-red-100 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-red-200 animate-bounce" />
                  Alerta de Atualização
                </span>
                <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full">
                  {CURRENT_SYSTEM_VERSION.version}
                </span>
              </div>

              <h3 className="text-lg font-black tracking-tight font-['Hanken_Grotesk'] text-white">
                {CURRENT_SYSTEM_VERSION.title}
              </h3>
              <p className="text-xs text-red-100/90 font-medium mt-1">
                Lançado em {CURRENT_SYSTEM_VERSION.date}
              </p>
            </div>

            {/* RESUMO E LISTA DE MELHORIAS */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                {CURRENT_SYSTEM_VERSION.summary}
              </p>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
                  Melhorias da Versão:
                </h4>

                {CURRENT_SYSTEM_VERSION.changes.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-red-200 transition-colors flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0 border border-red-200 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                        <h5 className="text-xs font-black text-slate-900 font-sans">
                          {item.title}
                        </h5>
                      </div>
                      <p className="text-[11.5px] text-slate-600 font-sans font-medium mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RODAPÉ */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleDismiss}
                className="bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Entendido! Explorar Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
