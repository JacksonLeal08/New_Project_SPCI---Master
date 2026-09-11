'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowModal, WindowState } from '@/app/context/WindowModalContext';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle
} from 'lucide-react';

interface WindowModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconName?: string;
  badgeStatus?: string;
  hasUnsavedChanges?: boolean;
  maxWidthClass?: string;
  defaultMaximized?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideBackdrop?: boolean;
}

export default function WindowModal({
  id,
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconName,
  badgeStatus,
  hasUnsavedChanges = false,
  maxWidthClass = 'max-w-4xl',
  defaultMaximized = false,
  children,
  footer,
  hideBackdrop = false,
}: WindowModalProps) {
  const {
    registerWindow,
    updateWindowMetadata,
    unregisterWindow,
    setWindowState,
    getWindowState,
    bringToFront,
    activeWindowId,
  } = useWindowModal();

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  // Registra a janela no contexto quando abre e desregistra ao fechar
  useEffect(() => {
    if (isOpen) {
      registerWindow(id, {
        title,
        subtitle,
        iconName,
        badgeStatus,
        onClose,
      });

      if (defaultMaximized) {
        setWindowState(id, 'maximized');
      }
    } else {
      unregisterWindow(id);
    }
    return () => {
      unregisterWindow(id);
    };
  }, [id, isOpen, defaultMaximized, registerWindow, unregisterWindow, setWindowState, onClose]);

  // Sincroniza metadados sem desregistrar nem resetar o estado (preservando maximized)
  useEffect(() => {
    if (isOpen) {
      updateWindowMetadata(id, {
        title,
        subtitle,
        iconName,
        badgeStatus,
      });
    }
  }, [id, isOpen, title, subtitle, iconName, badgeStatus, updateWindowMetadata]);

  const currentState = getWindowState(id);

  // Escuta tecla ESC para fechar o modal com o qual está interagindo
  useEffect(() => {
    if (!isOpen || currentState === 'minimized') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmCloseOpen) {
          setConfirmCloseOpen(false);
          return;
        }
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentState, confirmCloseOpen, id, hasUnsavedChanges]);

  if (!isOpen) return null;

  // Quando minimizado, mantemos montado em DOM oculto para preservar 100% dos estados dos formulários
  const isMinimized = currentState === 'minimized';
  const isMaximized = currentState === 'maximized';

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setConfirmCloseOpen(false);
    onClose();
  };

  const toggleMaximize = () => {
    setWindowState(id, isMaximized ? 'restored' : 'maximized');
  };

  const handleMinimize = () => {
    setWindowState(id, 'minimized');
  };

  return (
    <div
      style={{ display: isMinimized ? 'none' : 'block' }}
      className="fixed inset-0 z-[100] font-sans select-none"
      onClick={() => bringToFront(id)}
    >
      {/* Backdrop com Blur e fechamento ao clicar fora */}
      {!hideBackdrop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleRequestClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity cursor-pointer pointer-events-auto"
        />
      )}

      {/* Caixa do Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center pointer-events-none ${
          isMaximized ? 'p-0' : 'p-2 sm:p-4'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleRequestClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            isMaximized
              ? 'w-screen h-screen rounded-none shadow-none'
              : `w-full ${maxWidthClass} max-h-[92vh] rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/5`
          }`}
        >
          {/* Header no Estilo Cockpit Executivo */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-sm shrink-0">
            {/* Título & Ícone */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 shadow-xs">
                  {icon}
                </div>
              )}
              <div className="truncate">
                {subtitle && (
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-red-700 dark:text-red-400 block font-mono">
                    {subtitle}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight font-['Hanken_Grotesk'] truncate">
                    {title}
                  </h2>
                  {badgeStatus && (
                    <span className="hidden sm:inline-block text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono shadow-2xs">
                      {badgeStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controles de Janela do Cockpit (Minimizar, Maximizar/Restaurar, Fechar) */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 1. Minimizar para o Dock Tray */}
              <button
                type="button"
                onClick={handleMinimize}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Minimizar para bandeja flutuante (_)"
                aria-label="Minimizar janela"
              >
                <Minus className="w-4 h-4" />
              </button>

              {/* 2. Maximizar / Restaurar (Tela Cheia) */}
              <button
                type="button"
                onClick={toggleMaximize}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
                title={isMaximized ? 'Restaurar tamanho padrão' : 'Maximizar em tela cheia (□)'}
                aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* 3. Fechar */}
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-700 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition cursor-pointer ml-1"
                title="Fechar janela (ESC)"
                aria-label="Fechar janela"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Diálogo de Confirmação para Descarte de Alterações */}
          <AnimatePresence>
            {confirmCloseOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Existem informações preenchidas. Deseja fechar e descartar as alterações?</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmCloseOpen(false)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-bold hover:bg-amber-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Continuar editando
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClose}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Descartar e Fechar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conteúdo Principal do Modal */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-800 dark:text-slate-200">
            {children}
          </div>

          {/* Rodapé Opcional */}
          {footer && (
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
