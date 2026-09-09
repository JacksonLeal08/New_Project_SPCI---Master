'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  Upload,
  FileText,
  AlertCircle,
  Search,
  Check,
  Clock,
  Layers
} from 'lucide-react';
import {
  LoteManutencaoRecord,
  ItemLoteManutencaoRecord,
  getMaintenanceBatchDetailAction,
  triageBatchReturnAction,
  TriageItemResult
} from '@/app/actions/maintenanceBatchActions';

interface ConferenciaRetornoModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  currentUserName: string;
  currentUserEmail?: string;
  onTriageSuccess: () => void;
}

const MOTIVOS_CONDENACAO_OPTIONS = [
  'Corrosão severa / perda de massa do corpo do cilindro',
  'Falha no teste de expansão volumétrica permanente (TH NBR 12962)',
  'Perda de espessura de parede do cilindro abaixo do limite normativo',
  'Rosca do gargalo / válvula danificada ou espanada',
  'Deformação mecânica, mossa ou amassado no corpo',
  'Data de fabricação superior a 20 anos (Limite de vida útil NBR 12962)',
  'Outro motivo técnico impeditivo apontado pelo prestador'
];

export default function ConferenciaRetornoModal({
  isOpen,
  onClose,
  loteId,
  currentUserName,
  currentUserEmail,
  onTriageSuccess
}: ConferenciaRetornoModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lote, setLote] = useState<LoteManutencaoRecord | null>(null);
  const [items, setItems] = useState<ItemLoteManutencaoRecord[]>([]);
  const [triageMap, setTriageMap] = useState<Record<string, TriageItemResult>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Painel de Aplicação Rápida em Lote ("Aprovar Todos em Conformidade")
  const [showBatchFillPanel, setShowBatchFillPanel] = useState(false);
  const [batchRecargaDate, setBatchRecargaDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [batchHidroDate, setBatchHidroDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().split('T')[0];
  });
  const [batchSeloPrefix, setBatchSeloPrefix] = useState('INMETRO-');
  const [batchLaudoUrl, setBatchLaudoUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !loteId) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    getMaintenanceBatchDetailAction(loteId)
      .then((res) => {
        if (!isMounted) return;
        if (!res.success || !res.lote) {
          throw new Error(res.error || 'Falha ao carregar detalhes do lote.');
        }

        setLote(res.lote);
        setItems(res.itens || []);

        // Inicializar mapa de triagem
        const initialMap: Record<string, TriageItemResult> = {};
        const defaultRecarga = new Date();
        defaultRecarga.setFullYear(defaultRecarga.getFullYear() + 1);
        const defaultHidro = new Date();
        defaultHidro.setFullYear(defaultHidro.getFullYear() + 5);

        (res.itens || []).forEach((item: ItemLoteManutencaoRecord) => {
          const isAlreadyTriaged = item.status_triagem && item.status_triagem !== 'PENDENTE';
          initialMap[item.id] = {
            item_id: item.id,
            asset_id: item.asset_id,
            id_ativo: item.id_ativo,
            status_triagem: isAlreadyTriaged ? item.status_triagem as 'APROVADO' | 'CONDENADO' : 'APROVADO',
            novo_selo_inmetro: item.novo_selo_inmetro || '',
            nova_validade_recarga: item.nova_validade_recarga || defaultRecarga.toISOString().split('T')[0],
            nova_validade_hidro: item.nova_validade_hidro || defaultHidro.toISOString().split('T')[0],
            motivo_condenacao: item.motivo_condenacao || MOTIVOS_CONDENACAO_OPTIONS[0],
            laudo_url: item.laudo_url || '',
            observacoes_triagem: item.observacoes_triagem || ''
          };
        });

        setTriageMap(initialMap);
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, loteId]);

  if (!isOpen) return null;

  // Atualizador de item individual
  const updateItemTriage = (itemId: string, updates: Partial<TriageItemResult>) => {
    setTriageMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...updates
      }
    }));
  };

  // Aplicação em massa: "Aprovar Todos em Conformidade"
  const handleApplyBatchFill = () => {
    setTriageMap((prev) => {
      const updated = { ...prev };
      items.forEach((item, index) => {
        // Gera número sequencial sugerido caso haja prefixo
        const seloNumber = batchSeloPrefix.trim()
          ? `${batchSeloPrefix.trim()}${String(index + 1).padStart(4, '0')}`
          : '';

        updated[item.id] = {
          ...updated[item.id],
          status_triagem: 'APROVADO',
          nova_validade_recarga: batchRecargaDate,
          nova_validade_hidro: batchHidroDate,
          novo_selo_inmetro: seloNumber || updated[item.id]?.novo_selo_inmetro || '',
          laudo_url: batchLaudoUrl.trim() || updated[item.id]?.laudo_url || '',
          motivo_condenacao: undefined
        };
      });
      return updated;
    });

    setShowBatchFillPanel(false);
  };

  const handleFinalizeTriage = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payloadItens = Object.values(triageMap);

      if (payloadItens.length === 0) {
        throw new Error('Nenhum item informado para conferência.');
      }

      // Validação rápida de condenados
      for (const t of payloadItens) {
        if (t.status_triagem === 'CONDENADO' && !t.motivo_condenacao) {
          throw new Error(`Informe o motivo de condenação para o item ${t.id_ativo}.`);
        }
      }

      const res = await triageBatchReturnAction({
        lote_id: loteId,
        usuario_triagem_nome: currentUserName || 'Operador SPCI',
        usuario_triagem_email: currentUserEmail,
        itens_triagem: payloadItens
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao homologar conferência de retorno.');
      }

      setSubmitting(false);
      onTriageSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ConferenciaRetornoModal] Erro:', err);
      setErrorMsg(err.message || 'Erro inesperado na homologação do lote.');
      setSubmitting(false);
    }
  };

  const totalItens = items.length;
  const totalAprovados = Object.values(triageMap).filter((t) => t.status_triagem === 'APROVADO').length;
  const totalCondenados = Object.values(triageMap).filter((t) => t.status_triagem === 'CONDENADO').length;

  const filteredItems = items.filter((it) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (it.patrimonio || '').toLowerCase().includes(term) ||
      (it.id_ativo || '').toLowerCase().includes(term) ||
      (it.numero_serie || '').toLowerCase().includes(term) ||
      (it.modelo_tipo || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Faixa superior de destaque */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-blue-600 to-amber-500 shrink-0" />

        {/* Cabeçalho do Lote */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800">
                {lote?.numero_lote || 'CARREGANDO...'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                • Prestador: <strong className="text-slate-800 dark:text-slate-200">{lote?.fornecedor_nome || 'N/A'}</strong>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Conferência de Retorno & Triagem de Laudos NBR
            </h3>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {totalAprovados} Aprovados
              </span>
              <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> {totalCondenados} Condenados
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ação Rápida: Botão "Aprovar Todos em Conformidade" */}
        <div className="p-3 px-4 sm:px-5 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-sans">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Lote homogêneo? Você pode aprovar e preencher todos os cilindros de uma só vez.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowBatchFillPanel(!showBatchFillPanel)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>⚡ Aprovar Todos em Conformidade ({totalItens})</span>
            </button>
          </div>
        </div>

        {/* Painel Expansível de Preenchimento em Massa */}
        <AnimatePresence>
          {showBatchFillPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-100/60 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 p-4 sm:px-5 space-y-3 shrink-0 overflow-hidden"
            >
              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Definir Parâmetros Padronizados para Todos os Itens do Lote
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Nova Validade Recarga (Nível 2):
                  </label>
                  <input
                    type="date"
                    value={batchRecargaDate}
                    onChange={(e) => setBatchRecargaDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Nova Validade TH (Nível 3):
                  </label>
                  <input
                    type="date"
                    value={batchHidroDate}
                    onChange={(e) => setBatchHidroDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Prefixo Selo INMETRO:
                  </label>
                  <input
                    type="text"
                    value={batchSeloPrefix}
                    onChange={(e) => setBatchSeloPrefix(e.target.value)}
                    placeholder="Ex: SELO-2026-"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    URL / Certificado Coletivo:
                  </label>
                  <input
                    type="text"
                    value={batchLaudoUrl}
                    onChange={(e) => setBatchLaudoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBatchFillPanel(false)}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchFill}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar a Todos os Extintores</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Barra de Busca de Itens no Lote */}
        <div className="p-3 px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por patrimônio, chassi ou tipo..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Exibindo {filteredItems.length} de {totalItens} itens
          </span>
        </div>

        {/* Lista Item a Item para Conferência */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-grow bg-slate-100/50 dark:bg-slate-950/40">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div>{errorMsg}</div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando extintores do lote...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhum item localizado com o termo informado.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const currentTriage = triageMap[item.id] || {
                status_triagem: 'APROVADO'
              };
              const isApproved = currentTriage.status_triagem === 'APROVADO';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isApproved
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/60'
                      : 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-150 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-black text-slate-400 shrink-0">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-red-600 dark:text-red-400">
                            {item.patrimonio || item.id_ativo}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.modelo_tipo || 'EXTINTOR'} • {item.capacidade || 'Padrão'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                          Série/Chassi: {item.numero_serie || 'N/A'} • Selo Anterior: {item.selo_inmetro_anterior || 'S/N'}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Aprovado vs Condenado */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateItemTriage(item.id, { status_triagem: 'APROVADO' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isApproved
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprovado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateItemTriage(item.id, { status_triagem: 'CONDENADO' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          !isApproved
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Condenar</span>
                      </button>
                    </div>
                  </div>

                  {/* Campos do Parecer Técnico */}
                  <div className="pt-2.5">
                    {isApproved ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                            Novo Selo INMETRO:
                          </label>
                          <input
                            type="text"
                            value={currentTriage.novo_selo_inmetro || ''}
                            onChange={(e) => updateItemTriage(item.id, { novo_selo_inmetro: e.target.value })}
                            placeholder="Ex: 12345678"
                            className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                            Validade Recarga (Nível 2):
                          </label>
                          <input
                            type="date"
                            value={currentTriage.nova_validade_recarga || ''}
                            onChange={(e) => updateItemTriage(item.id, { nova_validade_recarga: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                            Validade TH (Nível 3):
                          </label>
                          <input
                            type="date"
                            value={currentTriage.nova_validade_hidro || ''}
                            onChange={(e) => updateItemTriage(item.id, { nova_validade_hidro: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                            Certificado / Laudo URL:
                          </label>
                          <input
                            type="text"
                            value={currentTriage.laudo_url || ''}
                            onChange={(e) => updateItemTriage(item.id, { laudo_url: e.target.value })}
                            placeholder="Link ou anexo"
                            className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-red-100/50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
                        <div className="sm:col-span-2">
                          <label className="block text-[9.5px] font-bold text-red-900 dark:text-red-300 uppercase mb-0.5">
                            Motivo Técnico da Condenação / Sucateamento:
                          </label>
                          <select
                            value={currentTriage.motivo_condenacao || MOTIVOS_CONDENACAO_OPTIONS[0]}
                            onChange={(e) => updateItemTriage(item.id, { motivo_condenacao: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                          >
                            {MOTIVOS_CONDENACAO_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-red-900 dark:text-red-300 uppercase mb-0.5">
                            Laudo Técnico de Destruição / Foto:
                          </label>
                          <input
                            type="text"
                            value={currentTriage.laudo_url || ''}
                            onChange={(e) => updateItemTriage(item.id, { laudo_url: e.target.value })}
                            placeholder="URL do laudo ou foto do corte"
                            className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé de Ações e Homologação */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 font-mono text-center sm:text-left">
            Ao homologar, os extintores aprovados retornam para{' '}
            <strong className="text-emerald-600">ESTOQUE APLICAÇÃO</strong> e os condenados vão para{' '}
            <strong className="text-red-600">CONDENADOS</strong>.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleFinalizeTriage}
              disabled={submitting || loading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Homologando Lote...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Homologar Conferência & Atualizar Frota</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
