import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PremiumHUDAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  dismissLabel?: string;
  autoDismissMs?: number;
}

export default function PremiumHUDAlert({
  isOpen,
  title,
  message,
  type,
  onClose,
  onConfirm,
  confirmLabel = 'CONFIRMAR',
  dismissLabel = 'FECHAR',
  autoDismissMs
}: PremiumHUDAlertProps) {
  // Auto-dismiss para alertas de sucesso e info (4s por padrão)
  useEffect(() => {
    if (!isOpen) return;
    const shouldAutoDismiss = autoDismissMs !== undefined ? autoDismissMs > 0 : (type === 'success' || type === 'info');
    if (!shouldAutoDismiss) return;
    const timeout = setTimeout(() => {
      onClose();
    }, autoDismissMs || 4000);
    return () => clearTimeout(timeout);
  }, [isOpen, type, onClose, autoDismissMs]);

  if (!isOpen) return null;

  const colorMap = {
    critical: {
      border: 'border-red-600',
      text: 'text-red-400',
      bg: 'bg-red-950/20',
      badge: 'bg-red-600 text-slate-950',
      label: 'ALERTA CRÍTICO',
      accentGlow: 'shadow-red-950/40'
    },
    warning: {
      border: 'border-amber-500',
      text: 'text-amber-400',
      bg: 'bg-amber-950/20',
      badge: 'bg-amber-500 text-slate-950',
      label: 'ATENÇÃO OPERACIONAL',
      accentGlow: 'shadow-amber-950/20'
    },
    success: {
      border: 'border-emerald-500',
      text: 'text-emerald-400',
      bg: 'bg-emerald-950/20',
      badge: 'bg-emerald-500 text-slate-950',
      label: 'CONFORMIDADE NBR',
      accentGlow: 'shadow-emerald-950/20'
    },
    info: {
      border: 'border-blue-500',
      text: 'text-blue-400',
      bg: 'bg-blue-950/20',
      badge: 'bg-blue-500 text-slate-950',
      label: 'INFO SISTEMA',
      accentGlow: 'shadow-blue-950/20'
    }
  };

  const style = colorMap[type] || colorMap.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono">
      <div 
        className={`w-full max-w-md border border-slate-800 bg-slate-900 shadow-2xl rounded-none relative overflow-hidden flex flex-col ${style.accentGlow}`}
        style={{ borderTop: `4px solid var(--border-color)` }}
      >
        {/* Truque para usar a cor dinâmica na borda superior sem inline complexes */}
        <div className={`h-1 w-full ${
          type === 'critical' ? 'bg-red-600' :
          type === 'warning' ? 'bg-amber-500' :
          type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
        }`} />

        <div className="absolute top-1 right-2 text-[8px] text-slate-500 select-none">
          SECURE_HUD_v1.2.0
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-[9px] font-bold px-2 py-0.5 tracking-widest ${style.badge}`}>
              {style.label}
            </span>
          </div>

          <h3 className={`text-base font-bold tracking-wider ${style.text} uppercase mb-2`}>
            {title}
          </h3>
          
          <p className="text-xs text-slate-300 leading-relaxed font-sans mb-6 whitespace-pre-line">
            {message}
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-[10px] font-bold tracking-widest uppercase transition-all rounded-none active:scale-[0.97] cursor-pointer"
            >
              {dismissLabel}
            </button>
            {onConfirm && (
              <button 
                onClick={onConfirm}
                className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all rounded-none active:scale-[0.97] cursor-pointer text-slate-950 ${
                  type === 'critical' ? 'bg-red-500 hover:bg-red-400' :
                  type === 'warning' ? 'bg-amber-500 hover:bg-amber-400' :
                  type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-blue-500 hover:bg-blue-400'
                }`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
