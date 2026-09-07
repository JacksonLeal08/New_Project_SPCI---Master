'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  RefreshCw,
  Layers,
  ShieldCheck,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  downloadStockImportTemplate,
  parseCSVToStockRows,
  validateStockImportRow,
  RawStockImportRow,
  ValidatedStockImportRow
} from '@/lib/excelStockUtils';
import {
  bulkImportAssetsAction,
  StatusEstoqueType
} from '@/app/actions/assetStockActions';

interface GestaoAtivosImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  existingSerialNumbers: string[];
}

export const GestaoAtivosImportModal: React.FC<GestaoAtivosImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingSerialNumbers
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [validatedRows, setValidatedRows] = useState<ValidatedStockImportRow[]>([]);
  const [categoriaDestino, setCategoriaDestino] = useState<StatusEstoqueType>('ESTOQUE APLICAÇÃO');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const raw = parseCSVToStockRows(text);
        const validated = raw.map((r) => validateStockImportRow(r, existingSerialNumbers));
        setValidatedRows(validated);
        setStep(2);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const validRowsOnly = validatedRows.filter((r) => r.isValid);
      if (validRowsOnly.length === 0) {
        setImportResult({
          success: false,
          count: 0,
          error: 'Nenhuma linha válida encontrada no arquivo. Verifique o formato de datas (MM/AAAA).'
        });
        return;
      }

      const res = await bulkImportAssetsAction(validRowsOnly, categoriaDestino);

      if (res.success) {
        setImportResult({ success: true, count: res.totalImportados || validRowsOnly.length });
        setStep(3);
        onImportSuccess();
      } else {
        setImportResult({ success: false, count: 0, error: res.error });
      }
    } catch (err: any) {
      setImportResult({ success: false, count: 0, error: err.message || err });
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setFileName('');
    setValidatedRows([]);
    setImportResult(null);
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 font-mono select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 my-auto"
      >
        {/* CABEÇALHO SPCI RED - LUXURY BENTO ACCENT */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                IMPORTAÇÃO EM MASSA DE ATIVOS (.XLSX / .CSV)
              </h2>
              <p className="text-[11px] text-red-100 font-sans mt-0.5 font-bold">
                Mapeamento obrigatório de destino & validação rigorosa de recarga/vencimento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PASSO 1: UPLOAD DO ARQUIVO + LINK DO TEMPLATE PADRÃO */}
        {step === 1 && (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-6 font-sans">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-200 shadow-xs">
              <UploadCloud className="w-8 h-8 text-indigo-600" />
            </div>

            <div className="max-w-lg">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-mono uppercase">
                Selecione o arquivo de lote (.XLSX ou .CSV)
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                Sua planilha deve conter as colunas de identificação e as datas de recarga e vencimento no formato <strong className="text-indigo-700">MM/AAAA</strong>.
              </p>
            </div>

            <div className="w-full max-w-md flex flex-col gap-3 font-mono">
              <label className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-slate-700 active:scale-95">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Escolher Arquivo no Computador</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* BOTÃO / LINK VISÍVEL PARA DOWNLOAD DO TEMPLATE PADRÃO (REQUISITO 1) */}
              <button
                type="button"
                onClick={downloadStockImportTemplate}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition-all border border-emerald-300 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>📥 Baixar Modelo Padrão (Template .CSV / .XLSX)</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md text-left text-[11px] font-sans text-slate-700 space-y-1.5">
              <span className="font-mono font-bold text-slate-900 uppercase block text-[10px] tracking-wider">
                ℹ️ Instruções do Modelo Template:
              </span>
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Datas nos campos <strong>Mês/Ano Recarga</strong> e <strong>Mês/Ano Vencimento</strong> no formato <strong>MM/AAAA</strong> (Ex: 08/2026).</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Validações idênticas ao cadastro mestre de extintores.</span>
              </p>
            </div>
          </div>
        )}

        {/* PASSO 2: VALIDAÇÃO E SELEÇÃO DE DESTINO OBRIGATÓRIA */}
        {step === 2 && (
          <div className="p-4 sm:p-6 flex flex-col space-y-4 overflow-y-auto max-h-[75vh] font-sans">
            {/* SELETOR DA CATEGORIA DESTINO (OBRIGATÓRIO) */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-mono font-bold text-xs uppercase mb-1.5">
                <Layers className="w-4 h-4 text-amber-700" />
                <span>MAPEAMENTO OBRIGATÓRIO DA CATEGORIA DE DESTINO NO ESTOQUE</span>
              </div>
              <p className="text-xs text-amber-800 font-medium mb-3">
                Selecione em qual categoria de estoque todos os ativos deste arquivo serão inseridos:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(
                  [
                    'ESTOQUE APLICAÇÃO',
                    'ESTOQUE MANUTENÇÃO',
                    'EM MANUTENÇÃO',
                    'CONDENADOS'
                  ] as StatusEstoqueType[]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaDestino(cat)}
                    className={`py-2.5 px-3 rounded-xl font-mono text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      categoriaDestino === cat
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat}</span>
                    {categoriaDestino === cat && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* RESUMO DAS LINHAS VALIDADAS */}
            <div className="flex items-center justify-between font-mono text-xs bg-slate-100 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Arquivo: {fileName}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-black">🟢 Válidos: {validCount}</span>
                {invalidCount > 0 && <span className="text-red-600 font-black">🔴 Erros: {invalidCount}</span>}
              </div>
            </div>

            {/* TABELA RESPONSIVA DE PRÉ-VISUALIZAÇÃO COM OVERFLOW AUTOMÁTICO (REQUISITO 2) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <div className="overflow-x-auto max-h-64 scrollbar-thin">
                <table className="w-full text-left font-mono text-xs border-collapse min-w-[700px]">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Linha</th>
                      <th className="py-2.5 px-3">Patrimônio / Série</th>
                      <th className="py-2.5 px-3">Tipo & Fabricante</th>
                      <th className="py-2.5 px-3">Última Recarga</th>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3">Status Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                    {validatedRows.map((r, idx) => {
                      return (
                        <tr
                          key={idx}
                          className={
                            !r.isValid
                              ? 'bg-red-50/80'
                              : r.isDuplicateInDB
                              ? 'bg-amber-50/60'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{r.line_number || idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div>{r.patrimonio || 'Gerado Aut.'}</div>
                            <span className="text-[10px] text-slate-500 font-normal block font-mono">
                              SN: {r.numero_serie || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div className="font-bold">{r.tipo_ativo || 'Extintor'} ({r.modelo || 'Padrão'})</div>
                            <span className="text-[10px] text-slate-500 block">Fab: {r.fabricante || 'Kidde'}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {r.mes_ano_ultima_recarga || 'N/D'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {r.mes_ano_vencimento || 'N/D'}
                          </td>
                          <td className="py-2.5 px-3">
                            {!r.isValid ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[10px] border border-red-300"
                                title={r.errorReason}
                              >
                                <AlertTriangle className="w-3 h-3 text-red-600" /> {r.errorReason || 'Inválido'}
                              </span>
                            ) : r.isDuplicateInDB ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300">
                                <AlertCircle className="w-3 h-3 text-amber-600" /> Já existe
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Válido
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO COM ADAPTAÇÃO FLEX RESPONSIVA (REQUISITO 2) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={resetModal}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer text-center"
              >
                Voltar / Trocar Arquivo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || validCount === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border-none active:scale-95"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Importando Lote...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Importação de {validCount} Ativos Válidos</span>
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: CONCLUSÃO DA IMPORTAÇÃO */}
        {step === 3 && importResult && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 font-sans">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-300 text-emerald-700 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black font-mono uppercase text-slate-900">
                IMPORTAÇÃO EM MASSA CONCLUÍDA! 🟢
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Foram processados e inseridos com sucesso <strong className="text-emerald-700">{importResult.count} ativos</strong> na categoria de estoque <strong className="text-slate-900 font-mono">{categoriaDestino}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none active:scale-95"
            >
              FINALIZAR E ATUALIZAR ESTOQUE 👍
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
