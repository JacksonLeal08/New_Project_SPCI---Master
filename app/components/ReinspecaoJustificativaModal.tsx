'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, CheckCircle2, X, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { formatDateBr } from '@/lib/utils';

interface ReinspecaoJustificativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  onConfirm: (justificativa: string) => void;
  isDark?: boolean;
}

const OPCOES_RAPIDAS = [
  'Re-inspeção por avaria pós-evento',
  'Auditoria técnica / Controle de qualidade',
  'Rompimento ou violação acidental de lacre',
  'Intervenção ou solicitação da Brigada de Emergência',
  'Correção de posicionamento ou sinalização',
  'Reavaliação de pressão pós-descarga parcial'
];

export default function ReinspecaoJustificativaModal({
  isOpen,
  onClose,
  asset,
  onConfirm,
  isDark = true
}: ReinspecaoJustificativaModalProps) {
  const [justificativa, setJustificativa] = useState<string>('Re-inspeção por avaria pós-evento');
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const patrimonio = asset.idAtivo || asset.id_ativo || asset.numero_patrimonio || asset.id || 'N/A';
  const modelo = asset.model || asset.modelo || 'Equipamento SPCI';
  const local = asset.location || 'Local não informado';
  const dataUltima = asset.data_ultima_inspecao || asset.lastInsp;

  const handleSelectQuickOption = (opt: string) => {
    setJustificativa(opt);
    setErro(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = justificativa.trim();
    if (cleanText.length < 5) {
      setErro('Por favor, informe uma justificativa técnica detalhada (mínimo 5 caracteres).');
      return;
    }
    onConfirm(cleanText);
  };

  const bgModal = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';
  const cardInfoBg = isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900';
  const inputBg = isDark ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-lg rounded-2xl border p-6 overflow-hidden relative ${bgModal}`}
        >
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>

          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-amber-500">
                Ciclo Mensal de Inspeção
              </span>
              <h3 className="text-base font-extrabold uppercase font-sans leading-tight">
                Justificativa de Re-inspeção
              </h3>
            </div>
          </div>

          {/* Card de Aviso de Ciclo Já Concluído */}
          <div className={`p-3.5 rounded-xl border text-xs mb-4.5 space-y-1.5 ${cardInfoBg}`}>
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span>Este equipamento já possui vistoria registrada no mês atual!</span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Ativo: <strong className="font-mono">{patrimonio}</strong> — {modelo} ({local}).
              {dataUltima && (
                <span className="block mt-0.5 font-mono text-[10px]">
                  📅 Última vistoria realizada em: {formatDateBr(dataUltima)}
                </span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Chips de Opções Rápidas */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Motivo Operacional (Selecione ou edite abaixo):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {OPCOES_RAPIDAS.map((opt) => {
                  const isSelected = justificativa === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => handleSelectQuickOption(opt)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all text-left font-medium ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-sm'
                          : isDark
                            ? 'bg-slate-800/60 border-slate-750 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo Livre de Detalhamento */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Descrição / Justificativa Técnica Oficial:
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => {
                  setJustificativa(e.target.value);
                  setErro(null);
                }}
                rows={3}
                placeholder="Informe o motivo técnico que motivou a nova vistoria..."
                className={`w-full p-3 rounded-xl border text-xs outline-none transition-all resize-none font-sans ${inputBg}`}
              />
              {erro && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> {erro}
                </p>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-800/50">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl border border-amber-500 shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Prosseguir Vistoria</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
