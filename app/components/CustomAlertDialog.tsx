'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type AlertType = 'warning' | 'error' | 'success' | 'info';

export interface CustomAlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
  showCancelButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export const CustomAlertDialog: React.FC<CustomAlertDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'warning',
  buttonText = 'ENTENDIDO',
  showCancelButton = false,
  confirmText = 'CONFIRMAR',
  cancelText = 'CANCELAR',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-7 h-7 text-amber-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-7 h-7 text-rose-500 animate-bounce" />;
      case 'success':
        return <CheckCircle2 className="w-7 h-7 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-7 h-7 text-blue-500" />;
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getAccentLine = () => {
    switch (type) {
      case 'warning':
        return 'from-amber-500 via-orange-500 to-amber-600';
      case 'error':
        return 'from-red-650 via-rose-500 to-red-700';
      case 'success':
        return 'from-emerald-500 via-teal-500 to-emerald-600';
      case 'info':
      default:
        return 'from-blue-600 via-cyan-500 to-blue-700';
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-none';
      case 'error':
        return 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-black shadow-lg shadow-red-600/30 border-none';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30 border-none';
      case 'info':
      default:
        return 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-black shadow-lg shadow-slate-900/30 border-none';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white/95 border border-slate-200/90 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl shadow-slate-950/30 p-6 relative overflow-hidden space-y-5 text-slate-900"
        >
          {/* Accent Line Superior */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getAccentLine()} rounded-t-3xl`} />

          {/* Botão Fechar no Canto */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer border-none"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cabeçalho do Popup */}
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border shadow-xs shrink-0 ${getBadgeStyle()}`}>
              {getIcon()}
            </div>
            <div className="pr-6 space-y-1">
              <span className={`text-[9px] font-extrabold uppercase font-mono px-2.5 py-0.5 rounded-md border inline-block ${getBadgeStyle()}`}>
                {type === 'warning' ? 'AVISO DO SISTEMA' : type === 'error' ? 'ALERTA DE ERRO' : type === 'success' ? 'SUCESSO' : 'INFORMAÇÃO'}
              </span>
              <h3 className="font-['Hanken_Grotesk'] font-black text-lg text-slate-900 leading-tight">
                {title}
              </h3>
            </div>
          </div>

          {/* Mensagem */}
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 font-sans">
            {message}
          </p>

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            {showCancelButton || onConfirm ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-xs active:scale-95 flex items-center justify-center"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className={`w-full sm:w-auto px-6 py-2.5 font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-md active:scale-95 flex items-center justify-center gap-2 ${getButtonStyle()}`}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:w-auto px-6 py-2.5 font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none shadow-md active:scale-95 flex items-center justify-center gap-2 ${getButtonStyle()}`}
              >
                {buttonText}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
