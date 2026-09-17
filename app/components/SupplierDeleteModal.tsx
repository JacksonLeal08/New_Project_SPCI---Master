'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Building2, 
  MapPin, 
  FileBadge, 
  UserCheck, 
  Loader2 
} from 'lucide-react';
import { FornecedorRecord } from '@/app/actions/supplierActions';
import { playDisintegrateSound } from '@/lib/audio';

interface SupplierDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: FornecedorRecord | null;
  onConfirm: (id: string) => Promise<void> | void;
  isDeleting?: boolean;
}

export default function SupplierDeleteModal({
  isOpen,
  onClose,
  supplier,
  onConfirm,
  isDeleting = false
}: SupplierDeleteModalProps) {
  if (!isOpen || !supplier) return null;

  const handleConfirm = async () => {
    try {
      playDisintegrateSound();
    } catch {
      // áudio opcional
    }
    await onConfirm(supplier.id);
  };

  const displayName = supplier.nome_fantasia || supplier.razao_social;
  const inmetroCert = supplier.registro_inmetro?.trim();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isDeleting ? undefined : onClose}
          className="absolute inset-0 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-red-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-red-950/15 overflow-hidden text-slate-800 dark:text-slate-100 font-sans select-none"
        >
          {/* Top Danger Bar Accent */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 w-full" />

          {/* Close Button */}
          {!isDeleting && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Modal Header */}
          <div className="p-6 pb-4 flex items-start gap-4">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 rounded-2xl shrink-0 text-red-600 dark:text-red-500 shadow-sm">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-black tracking-widest text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 px-2 py-0.5 rounded-md inline-block">
                Ação Crítica de Sistema
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight font-['Hanken_Grotesk']">
                Remover Prestador Homologado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirmação de exclusão do fornecedor da base cadastral.
              </p>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-2 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Você tem certeza de que deseja remover o seguinte prestador de manutenção do sistema?
            </p>

            {/* BENTO CARD COM DADOS DO PRESTADOR */}
            <div className="p-4 bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                      {displayName}
                    </h4>
                    {supplier.nome_fantasia && supplier.razao_social !== supplier.nome_fantasia && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {supplier.razao_social}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badge Ativo / Inativo */}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
                  supplier.ativo
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {supplier.ativo ? 'Habilitado' : 'Inativo'}
                </span>
              </div>

              {/* Informações detalhadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px]">
                {supplier.cnpj && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400 font-bold">CNPJ:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{supplier.cnpj}</span>
                  </div>
                )}

                {inmetroCert ? (
                  <div className="flex items-center gap-1.5">
                    <FileBadge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded font-mono font-bold text-[10px]">
                      {inmetroCert}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <FileBadge className="w-3.5 h-3.5 shrink-0" />
                    <span>Sem certificação</span>
                  </div>
                )}

                {supplier.cidade_uf && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{supplier.cidade_uf}</span>
                  </div>
                )}

                {supplier.contato_responsavel && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 sm:col-span-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Contato: {supplier.contato_responsavel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AVISO DE IRREVERSIBILIDADE */}
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start gap-2.5 text-[11px] text-red-800 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block text-red-900 dark:text-red-200 font-bold">
                  Atenção: Ação irreversível
                </strong>
                <p className="text-red-700 dark:text-red-300/90 leading-relaxed">
                  O prestador será desvinculado da planta e não poderá ser selecionado em novas ordens de manutenção ou recargas de extintores.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="p-6 pt-4 bg-slate-50/90 dark:bg-slate-950/40 border-t border-slate-200/90 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirm}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 border border-red-700/30 rounded-xl shadow-lg shadow-red-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
