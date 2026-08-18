'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Boxes,
  Truck,
  Calendar,
  Building2,
  FileText,
  Download,
  ArrowRight,
  ShieldCheck,
  Flame,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Plus,
  Check
} from 'lucide-react';
import { AssetStockItemRecord } from '@/app/actions/assetStockActions';
import { createMaintenanceBatchAction, CreateBatchItemPayload } from '@/app/actions/maintenanceBatchActions';
import { generateBatchRomaneioPDF, exportBatchRomaneioXLSX } from '@/lib/maintenanceBatchReports';
import { FornecedorRecord, getSuppliersAction } from '@/app/actions/supplierActions';
import SupplierFormModal from './SupplierFormModal';

interface BatchCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssets: AssetStockItemRecord[];
  currentUserName: string;
  currentUserEmail?: string;
  onBatchCreatedSuccess: (numeroLote: string) => void;
}

const FALLBACK_SUPPLIERS = [
  'Extinwal Segurança Contra Incêndio',
  'Bucka Spiero Equipamentos',
  'Mocelin Extintores & Engenharia',
  'Kidde Brasil Manutenções',
  'Resmat Engenharia de Incêndio',
  'Yalunt Serviços Técnicos',
];

export default function BatchCreationModal({
  isOpen,
  onClose,
  selectedAssets,
  currentUserName,
  currentUserEmail,
  onBatchCreatedSuccess,
}: BatchCreationModalProps) {
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorCnpj, setFornecedorCnpj] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [previsaoRetorno, setPrevisaoRetorno] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fornecedores do Banco
  const [suppliersList, setSuppliersList] = useState<FornecedorRecord[]>([]);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await getSuppliersAction(true);
        if (res.success && res.suppliers) {
          setSuppliersList(res.suppliers);
        }
      } catch (e) {
        console.warn('Erro ao carregar fornecedores:', e);
      }
    }
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resumo por tipo de extintor
  const typeBreakdown = selectedAssets.reduce((acc, curr) => {
    const model = curr.model || 'PQS ABC';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setFornecedorNome('');
      setFornecedorCnpj('');
      return;
    }
    const found = suppliersList.find((s) => s.id === supplierId);
    if (found) {
      setFornecedorNome(found.nome_fantasia || found.razao_social);
      setFornecedorCnpj(found.cnpj || '');
    }
  };

  const handleNewSupplierSaved = (newSup: FornecedorRecord) => {
    setSuppliersList((prev) => [newSup, ...prev.filter((s) => s.id !== newSup.id)]);
    setSelectedSupplierId(newSup.id);
    setFornecedorNome(newSup.nome_fantasia || newSup.razao_social);
    setFornecedorCnpj(newSup.cnpj || '');
  };

  const handleConfirmSubmit = async () => {
    if (!fornecedorNome.trim()) {
      setErrorMsg('Informe o nome da empresa prestadora de serviços / fornecedor.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const itemsPayload: CreateBatchItemPayload[] = selectedAssets.map((asset) => ({
        asset_id: asset.id,
        id_ativo: asset.id_ativo || asset.id,
        patrimonio: asset.patrimonio || asset.id_ativo || asset.id,
        numero_serie: asset.numero_serie,
        modelo_tipo: asset.model || 'EXTINTOR',
        capacidade: asset.peso_capacidade,
        fabricante: asset.fabricante,
        selo_inmetro_anterior: asset.details?.seloInmetro || asset.details?.inmetro,
        data_ultimo_hidro: asset.data_vencimento_teste,
        data_ultima_recarga: asset.validadeRecarga || asset.ultima_recarga,
      }));

      const res = await createMaintenanceBatchAction({
        fornecedor_nome: fornecedorNome.trim(),
        fornecedor_cnpj: fornecedorCnpj.trim() || undefined,
        previsao_retorno: previsaoRetorno || undefined,
        observacoes: observacoes.trim() || undefined,
        usuario_envio_nome: currentUserName || 'Operador SPCI',
        usuario_envio_email: currentUserEmail,
        itens: itemsPayload,
      });

      if (!res.success) {
        throw new Error(res.error || 'Falha ao criar o lote.');
      }

      onBatchCreatedSuccess(res.numero_lote || 'LOTE');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar envio do lote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewPDF = () => {
    const dummyLote: any = {
      numero_lote: 'PRÉVIA-LOTE',
      fornecedor_nome: fornecedorNome.trim() || 'Empresa Prestadora Não Definida',
      data_envio: new Date().toISOString(),
      previsao_retorno: previsaoRetorno || undefined,
      usuario_envio_nome: currentUserName || 'Operador SPCI',
      status: 'EM_ANDAMENTO',
      observacoes: observacoes || undefined,
    };

    const dummyItens: any = selectedAssets.map((asset) => ({
      id_ativo: asset.id_ativo || asset.id,
      patrimonio: asset.patrimonio || asset.id_ativo || asset.id,
      numero_serie: asset.numero_serie,
      modelo_tipo: asset.model,
      capacidade: asset.peso_capacidade,
      fabricante: asset.fabricante,
      selo_inmetro_anterior: asset.details?.seloInmetro || asset.details?.inmetro,
      data_ultimo_hidro: asset.data_vencimento_teste,
      data_ultima_recarga: asset.validadeRecarga || asset.ultima_recarga,
    }));

    generateBatchRomaneioPDF(dummyLote, dummyItens);
  };

  const handlePreviewXLSX = () => {
    const dummyLote: any = {
      numero_lote: 'PREVIA-LOTE',
      fornecedor_nome: fornecedorNome.trim() || 'Empresa Prestadora Não Definida',
      data_envio: new Date().toISOString(),
      previsao_retorno: previsaoRetorno || undefined,
      usuario_envio_nome: currentUserName || 'Operador SPCI',
      status: 'EM_ANDAMENTO',
      observacoes: observacoes || undefined,
    };

    const dummyItens: any = selectedAssets.map((asset) => ({
      id_ativo: asset.id_ativo || asset.id,
      patrimonio: asset.patrimonio || asset.id_ativo || asset.id,
      numero_serie: asset.numero_serie,
      modelo_tipo: asset.model,
      capacidade: asset.peso_capacidade,
      fabricante: asset.fabricante,
      selo_inmetro_anterior: asset.details?.seloInmetro || asset.details?.inmetro,
      data_ultimo_hidro: asset.data_vencimento_teste,
      data_ultima_recarga: asset.validadeRecarga || asset.ultima_recarga,
    }));

    exportBatchRomaneioXLSX(dummyLote, dummyItens);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-mono select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header Superior com Estilo Bento Glass */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-500 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-500 block">
                  FLUXO DE EXPEDIÇÃO
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk']">
                  Gerar Lote de Manutenção de Extintores
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com Bento Layout */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            
            {/* Card Resumo dos Extintores Selecionados */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-red-600 dark:text-red-500" />
                  <span className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                    Resumo da Carga ({selectedAssets.length} Extintores Selecionados)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                  Aguardando Expedição
                </span>
              </div>

              {/* Badges de Tipos */}
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(typeBreakdown).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-xs"
                  >
                    <strong className="text-red-600 dark:text-red-500">{count}x</strong> {type}
                  </span>
                ))}
              </div>

              {/* Mini preview dos IDs */}
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pt-1">
                <strong>Ativos:</strong> {selectedAssets.map((a) => a.id_ativo || a.id).join(', ')}
              </div>
            </div>

            {/* Formulário de Envio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Seleção de Fornecedor Cadastrado */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Empresa Prestadora de Serviço / Fornecedor <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewSupplierModalOpen(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Cadastrar Novo Prestador</span>
                  </button>
                </div>

                {suppliersList.length > 0 ? (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSelectSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-red-600 font-sans cursor-pointer font-bold"
                  >
                    <option value="">-- Selecione um Prestador Cadastrado ou Digite Abaixo --</option>
                    {suppliersList.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nome_fantasia || sup.razao_social} {sup.cnpj ? `(${sup.cnpj})` : ''} {sup.registro_inmetro ? `• ${sup.registro_inmetro}` : ''}
                      </option>
                    ))}
                  </select>
                ) : null}

                <input
                  type="text"
                  list="suppliers-list"
                  value={fornecedorNome}
                  onChange={(e) => setFornecedorNome(e.target.value)}
                  placeholder="Ou digite o nome do fornecedor/empresa..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-red-600 font-sans mt-1"
                />
                <datalist id="suppliers-list">
                  {FALLBACK_SUPPLIERS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* CNPJ do Fornecedor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  CNPJ do Prestador (Opcional)
                </label>
                <input
                  type="text"
                  value={fornecedorCnpj}
                  onChange={(e) => setFornecedorCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-red-600 font-mono"
                />
              </div>

              {/* Previsão de Retorno */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Previsão Estimada de Retorno
                </label>
                <input
                  type="date"
                  value={previsaoRetorno}
                  onChange={(e) => setPrevisaoRetorno(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-red-600 font-mono"
                />
              </div>

              {/* Observações Gerais */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Instruções Especiais / Observações de Despacho
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Realizar teste hidrostático nos cilindros marcados; troca de mangueiras ressecadas..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-red-600 font-sans resize-none"
                />
              </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botões de Ação de Documento / Exportação Prévia */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>Romaneio PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePreviewXLSX}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Romaneio Excel (.XLSX)</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400">
                Assinaturas serão colhidas no documento físico.
              </span>
            </div>

          </div>

          {/* Rodapé com CTA Final */}
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-950/20 flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 active:scale-95"
            >
              <span>{submitting ? 'Gerando Lote...' : 'Confirmar Envio do Lote'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </motion.div>
      </div>

      {/* Modal Inline para Cadastro Rápido de Novo Prestador */}
      {isNewSupplierModalOpen && (
        <SupplierFormModal
          isOpen={isNewSupplierModalOpen}
          onClose={() => setIsNewSupplierModalOpen(false)}
          onSavedSuccess={(newSup) => {
            handleNewSupplierSaved(newSup);
          }}
        />
      )}
    </>
  );
}
