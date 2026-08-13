'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check
} from 'lucide-react';
import {
  downloadStockImportTemplate,
  parseCSVToStockRows,
  RawStockImportRow
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
  const [rawRows, setRawRows] = useState<RawStockImportRow[]>([]);
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
        const parsed = parseCSVToStockRows(text);
        setRawRows(parsed);
        setStep(2);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const validRows = rawRows.filter((r) => r.patrimonio || r.numero_serie);
      const res = await bulkImportAssetsAction(validRows, categoriaDestino);

      if (res.success) {
        setImportResult({ success: true, count: res.totalImportados || validRows.length });
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
    setRawRows([]);
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900"
      >
        {/* CABEÇALHO */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white font-['Hanken_Grotesk']">
                IMPORTAÇÃO EM MASSA DE ATIVOS (.XLSX / .CSV)
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5 font-medium">
                Sincronização de lote com validação por linha e mapeamento obrigatório de destino
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PASSO 1: UPLOAD DO ARQUIVO */}
        {step === 1 && (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-6 font-sans">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-200 shadow-xs">
              <UploadCloud className="w-8 h-8 text-indigo-600" />
            </div>

            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900 font-mono uppercase">
                Selecione o arquivo de lote (.XLSX ou .CSV)
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Carregue a planilha contendo os ativos. Você poderá validar e escolher o status de destino antes de gravar.
              </p>
            </div>

            <div className="w-full max-w-md flex flex-col gap-3">
              <label className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-slate-700">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Escolher Arquivo no Computador</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={downloadStockImportTemplate}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono text-xs font-bold transition-all border border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Baixar Planilha Modelo Padrão (.CSV)</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: VALIDAÇÃO E SELEÇÃO DE DESTINO OBRIGATÓRIA */}
        {step === 2 && (
          <div className="p-5 flex flex-col space-y-4 overflow-y-auto max-h-[70vh] font-sans">
            {/* SELETOR DA CATEGORIA DESTINO (OBRIGATÓRIO) */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-mono font-bold text-xs uppercase mb-2">
                <Layers className="w-4 h-4 text-amber-700" />
                <span>MAPEAMENTO OBRIGATÓRIO DA CATEGORIA DE DESTINO NO ESTOQUE</span>
              </div>
              <p className="text-xs text-amber-800 font-medium mb-3">
                Selecione em qual categoria de estoque todos os ativos deste arquivo serão inseridos:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    className={`py-2 px-3 rounded-lg font-mono text-[11px] font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                      categoriaDestino === cat
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/50'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat}</span>
                    {categoriaDestino === cat && <Check className="w-3.5 h-3.5 text-emerald-400 self-end mt-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* TABELA DE PRÉ-VISUALIZAÇÃO DOS ATIVOS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between font-mono text-xs font-bold text-slate-800">
                <span>PRÉVIA DOS DADOS DO ARQUIVO ({rawRows.length} LINHAS ENCONTRADAS)</span>
                <span className="text-indigo-600 font-semibold">{fileName}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Linha</th>
                      <th className="py-2 px-3">Patrimônio</th>
                      <th className="py-2 px-3">Nº Série</th>
                      <th className="py-2 px-3">Tipo / Modelo</th>
                      <th className="py-2 px-3">Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                    {rawRows.slice(0, 30).map((r, idx) => {
                      const isDuplicate = existingSerialNumbers.includes(r.numero_serie || '');
                      return (
                        <tr key={idx} className={isDuplicate ? 'bg-amber-50/60' : ''}>
                          <td className="py-2 px-3 text-slate-400 font-bold">{r.line_number || idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{r.patrimonio || 'Gerado Aut.'}</td>
                          <td className="py-2 px-3 text-slate-700">{r.numero_serie || 'Gerado Aut.'}</td>
                          <td className="py-2 px-3 text-slate-600">{r.tipo_ativo || 'Extintor'} ({r.modelo || 'Padrão'})</td>
                          <td className="py-2 px-3">
                            {isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Existe no DB
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
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

            {/* AÇÕES DE CONFIRMAÇÃO */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Voltar / Trocar Arquivo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || rawRows.length === 0}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 border-none"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Importando Lote...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Importação de {rawRows.length} Ativos</span>
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
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none"
            >
              FINALIZAR E ATUALIZAR ESTOQUE 👍
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
