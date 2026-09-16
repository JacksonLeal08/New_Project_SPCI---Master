'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { X } from 'lucide-react';

export type BottomSheetSnapPoint = 'compact' | 'half' | 'expanded';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  snapPoint?: BottomSheetSnapPoint;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  snapPoint = 'half',
  children,
  footer,
  showCloseButton = true,
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escuta tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trata o término do gesto de arrastar para baixo
  const handleDragEnd = (_: any, info: PanInfo) => {
    // Se arrastar mais de 100px para baixo ou com velocidade alta, fecha
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  };

  // Alturas por Snap Point
  const heightClasses: Record<BottomSheetSnapPoint, string> = {
    compact: 'max-h-[48vh] h-auto',
    half: 'max-h-[72vh] h-[68vh]',
    expanded: 'max-h-[94vh] h-[92vh]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* Backdrop com desfoque e escurecimento suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Gaveta Inferior Deslizante */}
          <motion.div
            ref={sheetRef}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 border-t border-slate-200/90 dark:border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden pb-safe ${heightClasses[snapPoint]} ${className}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Puxador Gestual Superior (Drag Handle) */}
            <div className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 transition-colors" />
            </div>

            {/* Cabeçalho da Gaveta */}
            {(title || showCloseButton) && (
              <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0 flex-1">
                  {typeof title === 'string' ? (
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors touch-target flex items-center justify-center"
                    aria-label="Fechar gaveta"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Conteúdo Rolável */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-slate-800 dark:text-slate-200">
              {children}
            </div>

            {/* Rodapé Opcional */}
            {footer && (
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/90 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
