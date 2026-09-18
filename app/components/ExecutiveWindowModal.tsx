'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Minus, Maximize2, Minimize2, X, AlertTriangle } from 'lucide-react';

interface ExecutiveWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  isDirty?: boolean;
  theme?: 'dark' | 'light';
}

export default function ExecutiveWindowModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = '3xl',
  isDirty = false,
  theme = 'light'
}: ExecutiveWindowModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Ao fechar ou abrir, reseta minimização
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setShowDirtyConfirm(false);
    }
  }, [isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, isDirty]);

  if (!mounted || !isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  }[maxWidth];

  const modalContent = (
    <AnimatePresence>
      {/* 1. DOCK FLUTUANTE INFERIOR QUANDO MINIMIZADO */}
      {isMinimized && (
        <motion.div
          key="dock-bar"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md cursor-pointer select-none transition-all ${
            theme === 'dark'
              ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100 hover:border-red-600'
              : 'bg-white/95 border-slate-300 text-slate-900 hover:border-red-600 shadow-slate-900/15'
          }`}
          onClick={() => setIsMinimized(false)}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <div className="flex items-center gap-2">
            {icon && <span className="text-base">{icon}</span>}
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-wider truncate max-w-[200px]">{title}</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">Rascunho minimizado • Clique para restaurar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="ml-2 px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Restaurar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAttemptClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* 2. JANELA PRINCIPAL (EXPANDIDA / NORMAL / MOBILE BOTTOM SHEET) */}
      {!isMinimized && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-sm overflow-hidden select-none">
          <motion.div
            key="window-body"
            initial={{ opacity: 0, scale: isFullscreen ? 1 : 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col w-full relative overflow-hidden transition-all duration-200 border shadow-2xl ${
              // Mobile Bottom Sheet styling
              'rounded-t-3xl md:rounded-2xl max-h-[92vh] md:max-h-[88vh]'
            } ${
              isFullscreen
                ? 'md:!max-w-none md:!w-screen md:!h-screen md:!max-h-screen md:!rounded-none'
                : maxWidthClasses
            } ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-black/80'
                : 'bg-white border-slate-300 text-slate-950 shadow-slate-900/20'
            }`}
          >
            {/* Faixa superior vermelha corporativa de destaque */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 z-10" />

            {/* Mobile Drag Handle (Apenas < 768px) */}
            <div className="md:hidden pt-2 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            </div>

            {/* CABEÇALHO EXECUTIVO COM CONTROLES DE JANELA */}
            <div
              className={`px-5 py-3.5 flex items-center justify-between border-b shrink-0 ${
                theme === 'dark'
                  ? 'border-zinc-800 bg-zinc-950/60'
                  : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              {/* Identificação e Título */}
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {icon && (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                      theme === 'dark'
                        ? 'bg-zinc-800 border-zinc-700 text-rose-500'
                        : 'bg-red-50 border-red-200 text-red-600 shadow-inner'
                    }`}
                  >
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-black text-sm uppercase tracking-wider truncate flex items-center gap-2 font-mono text-slate-950 dark:text-zinc-100">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-sans truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Botões de Controle de Janela */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Minimizar */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title="Minimizar para a barra inferior"
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Minus size={14} />
                </button>

                {/* Maximizar / Restaurar (oculto no mobile) */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Restaurar tamanho' : 'Maximizar tela cheia'}
                  className={`hidden md:flex p-1.5 rounded-lg border transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                {/* Fechar */}
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  title="Fechar janela"
                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* CORPO DO MODAL SCROLLÁVEL */}
            <div className="p-5 overflow-y-auto flex-1 font-sans text-xs scrollbar-thin">
              {children}
            </div>

            {/* RODAPÉ DO MODAL (SE FORNECIDO) */}
            {footer && (
              <div
                className={`px-5 py-3.5 border-t shrink-0 flex items-center justify-end gap-2.5 ${
                  theme === 'dark'
                    ? 'border-zinc-800 bg-zinc-950/60'
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                {footer}
              </div>
            )}

            {/* ALERTA FLUTUANTE DE FECHAMENTO COM RASCUNHO PENDENTE */}
            {showDirtyConfirm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
              >
                <div
                  className={`p-5 rounded-2xl max-w-sm w-full border shadow-2xl text-center space-y-3 ${
                    theme === 'dark'
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
                      : 'bg-white border-slate-300 text-slate-950'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto text-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Alterações Pendentes</h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-sans mt-1 leading-relaxed">
                      Você possui dados preenchidos que ainda não foram salvos. Tem certeza que deseja fechar e descartar?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDirtyConfirm(false)}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-colors ${
                        theme === 'dark'
                          ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                          : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      Continuar Editando
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDirtyConfirm(false);
                        onClose();
                      }}
                      className="flex-1 py-2 text-[10px] font-black uppercase rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                      Descartar e Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
