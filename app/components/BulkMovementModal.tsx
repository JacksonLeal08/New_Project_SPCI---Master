'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Truck,
  Wrench,
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Boxes,
  ArrowRight,
  Download
} from 'lucide-react';
import { AssetStockItemRecord, StatusEstoqueType, bulkMoveAssetStatusAction } from '@/app/actions/assetStockActions';
import { createMaintenanceBatchAction } from '@/app/actions/maintenanceBatchActions';
import { generateBatchRomaneioPDF, calculateTypeAndCapacityBreakdown } from '@/lib/maintenanceBatchReports';

interface BulkMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: AssetStockItemRecord[];
  currentUserName: string;
  currentUserEmail?: string;
  onSuccess: (targetStatus: string, count: number) => void;
}

const FORNECEDORES_PRESETS = [
  'Kidde Brasil Manutenções & Serviços',
  'Mocelin Equipamentos Contra Incêndio',
  'Resmat Proteção & Combate a Incêndio',
  'Bucka Engenharia Contra Incêndio',
  'Extinwal Manutenção de Extintores',
  'Empresa Credenciada Local'
];

export default function BulkMovementModal({
  isOpen,
  onClose,
  selectedItems,
  currentUserName,
  currentUserEmail,
  onSuccess
}: BulkMovementModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<StatusEstoqueType>('ESTOQUE MANUTENÇÃO');
  const [observacao, setObservacao] = useState('');
  
  // Campos específicos para envio direto com prestador credenciado (EM MANUTENÇÃO)
  const [fornecedorNome, setFornecedorNome] = useState(FORNECEDORES_PRESETS[0]);
  const [fornecedorCnpj, setFornecedorCnpj] = useState('');
  const [previsaoRetorno, setPrevisaoRetorno] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedBatchCode, setGeneratedBatchCode] = useState<string | null>(null);
  const [generatedBatchData, setGeneratedBatchData] = useState<any | null>(null);

  if (!isOpen) return null;

  const count = selectedItems.length;

  // Resumo discriminado por Tipo e Capacidade para o lote
  const { summary: bulkDetailedBreakdown } = calculateTypeAndCapacityBreakdown(
    selectedItems.map((item) => ({
      modelo_tipo: item.model,
      capacidade: item.peso_capacidade || (item.details as any)?.capacidade || 'Padrão'
    }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const assetIds = selectedItems.map((item) => item.id).filter(Boolean);

      if (assetIds.length === 0) {
        throw new Error('Nenhum identificador de ativo válido localizado para processamento.');
      }

      // DESTINO 2: Criação direta de lote com prestador credenciado
      if (selectedDestination === 'EM MANUTENÇÃO') {
        if (!fornecedorNome.trim()) {
          throw new Error('Informe o nome da empresa ou prestador credenciado.');
        }

        const batchPayload = {
          fornecedor_nome: fornecedorNome.trim(),
          fornecedor_cnpj: fornecedorCnpj.trim() || undefined,
          previsao_retorno: previsaoRetorno || undefined,
          observacoes: observacao.trim() || undefined,
          usuario_envio_nome: currentUserName || 'Operador SPCI',
          usuario_envio_email: currentUserEmail,
          itens: selectedItems.map((item) => ({
            asset_id: item.id,
            id_ativo: item.id_ativo || item.patrimonio || item.id,
            patrimonio: item.patrimonio || item.id_ativo,
            numero_serie: item.numero_serie,
            modelo_tipo: item.model || 'EXTINTOR',
            capacidade: item.peso_capacidade,
            fabricante: item.fabricante,
            selo_inmetro_anterior: (item.details as any)?.seloInmetro || (item.details as any)?.inmetro,
            data_ultimo_hidro: item.data_vencimento_teste,
            data_ultima_recarga: item.ultima_recarga || item.validadeRecarga
          }))
        };

        const batchRes = await createMaintenanceBatchAction(batchPayload);

        if (!batchRes.success) {
          throw new Error(batchRes.error || 'Falha ao registrar lote de manutenção.');
        }

        setGeneratedBatchCode(batchRes.numero_lote || 'LOTE-MAN');
        setGeneratedBatchData(batchRes.lote);
        setLoading(false);
        onSuccess('EM MANUTENÇÃO', count);
        return;
      }

      // DESTINO 1 ou 3: Movimentação interna de estoque (Almoxarifado ou Aplicação)
      const moveRes = await bulkMoveAssetStatusAction({
        assetIds,
        targetStatus: selectedDestination,
        motivo:
          selectedDestination === 'ESTOQUE MANUTENÇÃO'
            ? 'Recolhimento para triagem interna e formação de lote'
            : 'Reclassificação para prontidão de uso operacional',
        observacao: observacao.trim() || undefined,
        usuarioNome: currentUserName || 'Operador SPCI',
        usuarioEmail: currentUserEmail
      });

      if (!moveRes.success) {
        throw new Error(moveRes.error || 'Falha ao movimentar ativos em lote.');
      }

      setLoading(false);
      onSuccess(selectedDestination, count);
      onClose();
    } catch (err: any) {
      console.error('[BulkMovementModal] Erro:', err);
      setErrorMsg(err.message || 'Erro inesperado na movimentação em lote.');
      setLoading(false);
    }
  };

  const handleDownloadRomaneio = () => {
    if (!generatedBatchData) return;
    try {
      const docItens: any[] = selectedItems.map((item, idx) => ({
        id: `temp-${idx}`,
        id_lote: generatedBatchData.id,
        id_ativo: item.id_ativo,
        patrimonio: item.patrimonio || item.id_ativo,
        numero_serie: item.numero_serie || 'N/A',
        modelo_tipo: item.model || 'EXTINTOR',
        capacidade: item.peso_capacidade || 'Padrão',
        fabricante: item.fabricante || 'Diversos',
        selo_inmetro_anterior: (item.details as any)?.seloInmetro || 'S/N',
        status_conferencia: 'PENDENTE',
        tipo_servico_executado: 'RECARGA',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));
      generateBatchRomaneioPDF(generatedBatchData, docItens);
    } catch (pdfErr) {
      console.error('Erro ao gerar romaneio PDF:', pdfErr);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Faixa superior de destaque */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 shrink-0" />

        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-red-600" />
              Despacho & Movimentação em Lote
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Transição de status operacional para{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                {count} {count === 1 ? 'ativo selecionado' : 'ativos selecionados'}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-grow">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <strong className="block font-bold">Falha no processamento:</strong>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Tela de Sucesso Especial se gerou lote */}
          {generatedBatchCode ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Lote de Manutenção Gerado com Sucesso!
                </h4>
                <div className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-mono font-bold text-sm rounded-lg">
                  {generatedBatchCode}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2 max-w-md mx-auto">
                  Os <strong>{count} extintores</strong> foram transferidos para o status{' '}
                  <span className="text-blue-600 font-bold">EM MANUTENÇÃO</span> e associados ao prestador{' '}
                  <strong>{fornecedorNome}</strong>.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadRomaneio}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Romaneio de Envio (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Selecione o Destino Operacional em Lote:
                </label>

                {/* 3 Opções em Cards Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opção 1: Estoque Manutenção */}
                  <div
                    onClick={() => setSelectedDestination('ESTOQUE MANUTENÇÃO')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      selectedDestination === 'ESTOQUE MANUTENÇÃO'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Triagem Interna
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold mb-1">
                      ESTOQUE MANUTENÇÃO
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                      Recolhe cilindros com vencimento ou avaria para a baia de depósito interno.
                    </p>
                  </div>

                  {/* Opção 2: Em Manutenção (Envio Prestador) */}
                  <div
                    onClick={() => setSelectedDestination('EM MANUTENÇÃO')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      selectedDestination === 'EM MANUTENÇÃO'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Remessa Externa
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-blue-700 dark:text-blue-400 font-semibold mb-1">
                      EM MANUTENÇÃO
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                      Gera lote formal (`LOTE-MAN-...`) para envio a prestador credenciado com romaneio.
                    </p>
                  </div>

                  {/* Opção 3: Estoque Aplicação */}
                  <div
                    onClick={() => setSelectedDestination('ESTOQUE APLICAÇÃO')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      selectedDestination === 'ESTOQUE APLICAÇÃO'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Pronta-Entrega
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                      ESTOQUE APLICAÇÃO
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                      Reclassifica cilindros revisados/reservas para prontidão de uso operacional.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulário Condicional: Prestador Credenciado para "EM MANUTENÇÃO" */}
              {selectedDestination === 'EM MANUTENÇÃO' && (
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Dados da Remessa & Prestador Credenciado
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Empresa Prestadora Credenciada:
                      </label>
                      <input
                        type="text"
                        list="prestadores-list"
                        value={fornecedorNome}
                        onChange={(e) => setFornecedorNome(e.target.value)}
                        placeholder="Ex: Kidde Brasil Manutenções"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <datalist id="prestadores-list">
                        {FORNECEDORES_PRESETS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        CNPJ / Contato (Opcional):
                      </label>
                      <input
                        type="text"
                        value={fornecedorCnpj}
                        onChange={(e) => setFornecedorCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Previsão de Retorno:
                      </label>
                      <input
                        type="date"
                        value={previsaoRetorno}
                        onChange={(e) => setPrevisaoRetorno(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Resumo Consolidado Tipo & Capacidade */}
                  <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 block mb-1.5">
                      Resumo da Carga ({count} extintores por tipo & carga):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {bulkDetailedBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-[10px]"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.model} <span className="font-normal text-slate-400">({item.capacity})</span>
                          </span>
                          <span className="font-mono font-black text-red-600 dark:text-red-400 ml-1.5 shrink-0">
                            {item.count} un
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Justificativa / Observação Coletiva */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Observação Coletiva / Justificativa de Movimentação:
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Descreva o motivo desta movimentação em lote (ex: Recolhimento de extintores vencidos da área operacional)"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 font-sans"
                />
              </div>

              {/* Rodapé de Ações */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando Lote...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Movimentação ({count})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
