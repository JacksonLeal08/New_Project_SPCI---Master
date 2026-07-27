import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SYSTEM_VERSION, SYSTEM_CHANGELOG } from '@/config/version';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  const currentRelease = SYSTEM_CHANGELOG[0];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl relative my-8 font-mono text-xs text-slate-800 dark:text-slate-100 overflow-hidden"
        >
          {/* Accent top bar */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700" />

          {/* Header */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">
                  NOVIDADES DO SISTEMA SPCI
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  Versão Oficial {SYSTEM_VERSION}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-none">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-5 rounded-xl text-slate-200">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                {currentRelease.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {currentRelease.description} (Publicado em {currentRelease.date})
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                📌 O que foi implementado nesta atualização:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentRelease.changes.map((change, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-relaxed">
                      {change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Historical Releases */}
            {SYSTEM_CHANGELOG.length > 1 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Histórico de Versões Anteriores:
                </span>
                {SYSTEM_CHANGELOG.slice(1).map((release, i) => (
                  <div key={i} className="p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-[11px]">
                    <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300">
                      <span>{release.version} - {release.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{release.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
            >
              Entendido / Continuar no SPCI →
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
