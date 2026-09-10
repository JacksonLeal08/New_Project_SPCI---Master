'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowModal } from '@/app/context/WindowModalContext';
import {
  Boxes,
  Maximize2,
  X,
  Flame,
  Truck,
  ArrowLeftRight,
  ShieldCheck,
  ClipboardList,
  Layers,
  FileText
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  boxes: <Boxes className="w-3.5 h-3.5 text-red-500" />,
  truck: <Truck className="w-3.5 h-3.5 text-blue-500" />,
  swap: <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-500" />,
  ArrowLeftRight: <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-500" />,
  flame: <Flame className="w-3.5 h-3.5 text-red-500" />,
  shield: <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />,
  clipboard: <ClipboardList className="w-3.5 h-3.5 text-slate-400" />,
  file: <FileText className="w-3.5 h-3.5 text-blue-400" />,
};

export default function WindowDockTray() {
  const { minimizedWindows, restoreWindow, closeWindow } = useWindowModal();

  if (minimizedWindows.length === 0) return null;

  return (
    <div
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[9999] flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2 pointer-events-none select-none font-mono"
      aria-label="Bandeja de Janelas Minimizadas"
    >
      <AnimatePresence>
        {minimizedWindows.map((win) => {
          const icon = (win.iconName && ICON_MAP[win.iconName]) || <Layers className="w-3.5 h-3.5 text-red-500" />;

          return (
            <motion.div
              key={win.id}
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.85 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto group relative flex items-center bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 hover:border-red-500/80 text-white rounded-2xl shadow-2xl p-1.5 pr-2.5 transition-all duration-200 hover:shadow-red-950/40 hover:-translate-y-0.5"
            >
              {/* Botão de restauração principal */}
              <button
                type="button"
                onClick={() => restoreWindow(win.id)}
                className="flex items-center gap-2.5 px-2 py-1.5 text-left cursor-pointer border-none bg-transparent"
                title={`Restaurar janela: ${win.title}`}
              >
                {/* Ícone com LED pulsante de status ativo */}
                <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 group-hover:border-red-500/40 shrink-0">
                  {icon}
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
                  <span className="text-[11px] font-bold text-slate-100 truncate uppercase tracking-wider">
                    {win.title}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                    <span className="text-emerald-400 font-semibold">{win.badgeStatus || 'Em andamento'}</span>
                    <span>• Clique p/ restaurar</span>
                  </span>
                </div>
              </button>

              {/* Botão de Maximizar Rápido */}
              <button
                type="button"
                onClick={() => restoreWindow(win.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer ml-1"
                title="Restaurar / Abrir Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Botão de Fechar Rápido */}
              <button
                type="button"
                onClick={() => closeWindow(win.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/60 transition cursor-pointer ml-0.5"
                title="Descartar e Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
