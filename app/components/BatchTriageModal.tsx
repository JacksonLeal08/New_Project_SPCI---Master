'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Building2,
  Calendar,
  Award,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useWindowModal } from '@/app/context/WindowModalContext';
import {
  LoteManutencaoRecord,
  ItemLoteManutencaoRecord,
  getMaintenanceBatchDetailAction,
  triageBatchReturnAction,
  TriageItemResult
} from '@/app/actions/maintenanceBatchActions';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';

interface BatchTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  currentUserName: string;
  currentUserEmail?: string;
  onTriageSuccess: () => void;
}

export default function BatchTriageModal({
  isOpen,
  onClose,
  loteId,
  currentUserName,
  currentUserEmail,
  onTriageSuccess,
}: BatchTriageModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lote, setLote] = useState<LoteManutencaoRecord | null>(null);
  const [items, setItems] = useState<ItemLoteManutencaoRecord[]>([]);
  const [triageMap, setTriageMap] = useState<Record<string, TriageItemResult>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carregar detalhes do lote
  useEffect(() => {
    if (!isOpen || !loteId) return;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await getMaintenanceBatchDetailAction(loteId);

        if (!res.success || !res.lote) {
          throw new Error(res.error || 'Falha ao carregar detalhes do lote.');
        }

        setLote(res.lote);
        setItems(res.itens || []);

        // Inicializar mapa de triagem com valores padrão
        const initialMap: Record<string, TriageItemResult> = {};
        const today = new Date();
        
        // Padrão de nova recarga (+1 ano)
        const nextYearRecarga = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
          .toISOString()
          .split('T')[0];

        // Padrão de novo teste hidro (+5 anos em 31/12)
        const next5YearsHidro = `${today.getFullYear() + 5}-12-31`;

        (res.itens || []).forEach((item) => {
          initialMap[item.id] = {
            item_id: item.id,
            asset_id: item.asset_id,
            id_ativo: item.id_ativo,
            status_triagem: item.status_triagem === 'CONDENADO' ? 'CONDENADO' : 'APROVADO',
            novo_selo_inmetro: item.novo_selo_inmetro || '',
            nova_validade_recarga: item.nova_validade_recarga || nextYearRecarga,
            nova_validade_hidro: item.nova_validade_hidro || next5YearsHidro,
            motivo_condenacao: item.motivo_condenacao || '',
            observacoes_triagem: item.observacoes_triagem || '',
          };
        });

        setTriageMap(initialMap);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao carregar dados de triagem.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, loteId]);

  const handleUpdateItem = (itemId: string, field: keyof TriageItemResult, value: any) => {
    setTriageMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSetAllStatus = (status: 'APROVADO' | 'CONDENADO') => {
    setTriageMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id].status_triagem = status;
      });
      return updated;
    });
  };

  const handleSubmitTriage = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payloadList: TriageItemResult[] = Object.values(triageMap);

      // Validação simples
      const invalidCondemned = payloadList.find(
        (i) => i.status_triagem === 'CONDENADO' && (!i.motivo_condenacao || !i.motivo_condenacao.trim())
      );

      if (invalidCondemned) {
        setErrorMsg(`Informe o motivo de condenação para o extintor ${invalidCondemned.id_ativo}.`);
        setSubmitting(false);
        return;
      }

      const res = await triageBatchReturnAction({
        lote_id: loteId,
        usuario_triagem_nome: currentUserName || 'Operador SPCI',
        usuario_triagem_email: currentUserEmail,
        itens_triagem: payloadList,
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao processar conferência do lote.');
      }

      onTriageSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar retorno do lote.');
    } finally {
      setSubmitting(false);
    }
  };

  const approvedCount = Object.values(triageMap).filter((i) => i.status_triagem === 'APROVADO').length;
  const condemnedCount = Object.values(triageMap).filter((i) => i.status_triagem === 'CONDENADO').length;

  const MODAL_ID = `modal-batch-triage-${loteId || 'active'}`;
  const { registerWindow, unregisterWindow, setWindowState, getWindowState, bringToFront, updateWindowMetadata } = useWindowModal();

  useEffect(() => {
    if (isOpen) {
      registerWindow(MODAL_ID, {
        title: `Triagem Lote ${lote?.numero_lote || loteId}`,
        subtitle: 'Triagem & Selos Inmetro',
        iconName: 'shield',
        badgeStatus: `${approvedCount} OK`,
        onClose,
      });
    } else {
      unregisterWindow(MODAL_ID);
    }
    return () => unregisterWindow(MODAL_ID);
  }, [isOpen, loteId, registerWindow, unregisterWindow, onClose]);

  useEffect(() => {
    if (isOpen) {
      updateWindowMetadata(MODAL_ID, {
        title: `Triagem Lote ${lote?.numero_lote || loteId}`,
        badgeStatus: `${approvedCount} OK`,
      });
    }
  }, [isOpen, lote?.numero_lote, loteId, approvedCount, updateWindowMetadata]);

  const currentState = getWindowState(MODAL_ID);
  const isMinimized = currentState === 'minimized';
  const isMaximized = currentState === 'maximized';

  const handleMinimize = () => setWindowState(MODAL_ID, 'minimized');
  const toggleMaximize = () => setWindowState(MODAL_ID, isMaximized ? 'restored' : 'maximized');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{ display: isMinimized ? 'none' : 'flex' }}
      className={`fixed inset-0 z-[100] items-center justify-center bg-slate-950/80 backdrop-blur-sm font-mono select-none cursor-pointer ${
        isMaximized ? 'p-0' : 'p-2 sm:p-4'
      }`}
      onClick={(e) => {
        bringToFront(MODAL_ID);
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col cursor-default ${
          isMaximized ? 'w-screen h-screen rounded-none max-h-screen' : 'rounded-3xl w-full max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Header da Triagem com Cockpit Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-500 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 block">
                CONFERÊNCIA DE RETORNO • {lote?.numero_lote || 'CARREGANDO...'}
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk']">
                Triagem de Extintores & Selos Inmetro
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMinimize}
              title="Minimizar para a barra inferior"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all border-none bg-transparent cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              title={isMaximized ? "Restaurar tamanho" : "Maximizar tela cheia"}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all border-none bg-transparent cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar (Esc)"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border-none bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumo Rápido & Ações em Massa */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Resultado da Triagem:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
              🟢 {approvedCount} Aprovados
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
              🔴 {condemnedCount} Condenados
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAllStatus('APROVADO')}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-all border border-emerald-500/30 cursor-pointer"
            >
              Marcar Todos Aprovados
            </button>
            <button
              type="button"
              onClick={() => handleSetAllStatus('CONDENADO')}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold transition-all border border-rose-500/30 cursor-pointer"
            >
              Marcar Todos Condenados
            </button>
          </div>
        </div>

        {/* Lista de Itens para Triagem */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[11px] font-bold uppercase">Carregando Itens do Lote...</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const currentTriage = triageMap[item.id] || {
                status_triagem: 'APROVADO',
                novo_selo_inmetro: '',
                nova_validade_recarga: '',
                nova_validade_hidro: '',
                motivo_condenacao: '',
              };
              const isApproved = currentTriage.status_triagem === 'APROVADO';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isApproved
                      ? 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  {/* Linha de Cabeçalho do Item */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-red-600 dark:text-red-500 font-mono text-sm tracking-tight">
                          {formatFriendlyPatrimonio(item.id_ativo, item.patrimonio)}
                        </strong>

                        {item.numero_serie && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                            🏷️ Chassi: {item.numero_serie}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-bold">
                          🧯 {item.modelo_tipo || 'PQS ABC'} {item.capacidade || ''}
                        </span>

                        {item.selo_inmetro_anterior && (
                          <span className="text-slate-400 text-[10px] hidden sm:inline">
                            Selo Antigo: {item.selo_inmetro_anterior}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle Aprovado vs Condenado */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, 'status_triagem', 'APROVADO')}
                        className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer border-none ${
                          isApproved
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 bg-transparent'
                        }`}
                      >
                        ✓ Aprovado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, 'status_triagem', 'CONDENADO')}
                        className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer border-none ${
                          !isApproved
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 bg-transparent'
                        }`}
                      >
                        ✕ Condenado
                      </button>
                    </div>
                  </div>

                  {/* Campos Dinâmicos se Aprovado */}
                  {isApproved ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Novo Selo Inmetro
                        </label>
                        <input
                          type="text"
                          value={currentTriage.novo_selo_inmetro || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'novo_selo_inmetro', e.target.value)}
                          placeholder="Ex: 009847/2026"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:border-emerald-600 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Nova Validade de Recarga (+1 ano)
                        </label>
                        <input
                          type="date"
                          value={currentTriage.nova_validade_recarga || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'nova_validade_recarga', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:border-emerald-600 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Próximo Teste Hidrostático (+5 anos)
                        </label>
                        <input
                          type="date"
                          value={currentTriage.nova_validade_hidro || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'nova_validade_hidro', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:border-emerald-600 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Campos se Condenado */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400 block mb-1">
                          Motivo da Condenação / Reprovação <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={currentTriage.motivo_condenacao || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'motivo_condenacao', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-lg text-xs focus:border-rose-600 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">Selecione o motivo...</option>
                          <option value="Corrosão severa ou deformação no cilindro">Corrosão severa ou deformação no cilindro</option>
                          <option value="Reprovado em ensaio hidrostático de pressão">Reprovado em ensaio hidrostático de pressão</option>
                          <option value="Rosca do gargalo fissurada / danificada">Rosca do gargalo fissurada / danificada</option>
                          <option value="Válvula e corpo irrecuperáveis">Válvula e corpo irrecuperáveis</option>
                          <option value="Vida útil ultrapassada / descontinuação normativa">Vida útil ultrapassada / descontinuação normativa</option>
                          <option value="Outro motivo técnico comprovado">Outro motivo técnico comprovado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Observações Técnicas / N° do Laudo
                        </label>
                        <input
                          type="text"
                          value={currentTriage.observacoes_triagem || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'observacoes_triagem', e.target.value)}
                          placeholder="Ex: Laudo nº 4892/2026 emitido pelo prestador"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-sans text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Rodapé com Botão de Conclusão */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400">
            Itens aprovados serão migrados para <strong>Estoque Aplicação</strong> e condenados para <strong>Histórico de Descarte</strong>.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmitTriage}
              disabled={submitting || loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/20 flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 active:scale-95"
            >
              <span>{submitting ? 'Processando Triagem...' : 'Concluir Conferência de Retorno'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
