'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Layers, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { LocalizacoesService, DryRunValidationResult } from '@/lib/localizacoesService';
import { useSpci } from '@/app/context/SpciContext';

interface LocalizacaoImportCockpitProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LocalizacaoImportCockpit: React.FC<LocalizacaoImportCockpitProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { activeSite, triggerSuccessNotification } = useSpci();

  // Etapas: 1: Upload, 2: DryRun, 3: Processing, 4: Report
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DryRunValidationResult | null>(null);

  // Estados de Processamento
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentProcessed, setCurrentProcessed] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const [finalReport, setFinalReport] = useState<{ sucessos: number; falhas: number; erros: string[] } | null>(null);

  // Filtro na visualização do Dry-Run
  const [dryRunTab, setDryRunTab] = useState<'validos' | 'erros'>('validos');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handlers de Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setAnalyzing(true);
    try {
      const result = await LocalizacoesService.validarPlanilha(file, activeSite || 'ONÇA PUMA');
      setAnalysisResult(result);
      setStep(2); // Avança para Dry-Run
    } catch (err: any) {
      alert('Erro ao ler planilha: ' + (err.message || 'Formato incompatível.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analysisResult || analysisResult.validRows.length === 0) return;

    setStep(3); // Barra de progresso
    setProgressPercent(0);
    setCurrentProcessed(0);
    setTotalToProcess(analysisResult.validRows.length);

    try {
      const res = await LocalizacoesService.salvarEmLote(
        analysisResult.validRows,
        (percent, current, total) => {
          setProgressPercent(percent);
          setCurrentProcessed(current);
          setTotalToProcess(total);
        }
      );

      setFinalReport(res);
      setStep(4); // Relatório de Fechamento
      triggerSuccessNotification(
        'Importação Concluída!',
        `${res.sucessos} localizações operacionais foram integradas com sucesso à base oficial.`
      );
      onSuccess();
    } catch (err: any) {
      alert('Erro durante gravação em lote: ' + err.message);
      setStep(2);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setAnalysisResult(null);
    setProgressPercent(0);
    setFinalReport(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        {/* Top Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-emerald-500 to-blue-600" />

        {/* Header do Cockpit */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Cockpit de Carga & Localização Operacional
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  SSOT
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-sans mt-0.5">
                Importação em massa de Setores, Sub-locais e Metadados Industriais da Vale.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Visual */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            <span>Upload Planilha</span>
          </div>
          <span className="text-slate-300">──</span>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            <span>Dry-Run (Validação)</span>
          </div>
          <span className="text-slate-300">──</span>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            <span>Processamento</span>
          </div>
          <span className="text-slate-300">──</span>
          <div className={`flex items-center gap-2 ${step === 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
            <span>Conclusão</span>
          </div>
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================= */}
          {/* ETAPA 1: UPLOAD & DOWNLOAD DE MODELO                              */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Barra com Botões de Download do Modelo */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-200 tracking-wider flex items-center gap-1.5">
                    📥 Planilha Modelo com 8 Colunas Oficiais
                  </h4>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-sans mt-0.5">
                    Utilize o modelo padrão com exemplos preenchidos para acelerar sua carga de dados.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => LocalizacoesService.baixarPlanilhaModelo('xlsx')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-none"
                  >
                    <Download className="w-3.5 h-3.5" /> Modelo Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => LocalizacoesService.baixarPlanilhaModelo('csv')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>

              {/* Área Drag & Drop */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 scale-[0.99]'
                    : 'border-slate-250 dark:border-slate-800 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                  {analyzing ? <RefreshCw className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                </div>

                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  {analyzing ? 'Analisando dados da planilha...' : 'Arraste e solte o arquivo da Vale aqui'}
                </span>
                <span className="text-[10px] text-slate-500 font-sans mt-1">
                  Ou clique para selecionar um arquivo Excel (.xlsx) ou CSV do seu computador
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 2: DRY-RUN (PRÉ-VISUALIZAÇÃO & INDICADORES DE CARGA)        */}
          {/* ================================================================= */}
          {step === 2 && analysisResult && (
            <div className="space-y-6">
              {/* KPIs de Carga */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Linhas</span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                    {analysisResult.totalRows}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Novos Locais</span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {analysisResult.novosCount}
                  </span>
                </div>

                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Setores Únicos</span>
                  <span className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5 block">
                    {analysisResult.setoresUnicos}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  analysisResult.invalidRows.length > 0 
                    ? 'bg-rose-50/60 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60' 
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-800'
                }`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider block ${analysisResult.invalidRows.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    Inconsistências
                  </span>
                  <span className={`text-xl font-black mt-0.5 block ${analysisResult.invalidRows.length > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {analysisResult.invalidRows.length} Linhas
                  </span>
                </div>
              </div>

              {/* Seletor de visualização */}
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDryRunTab('validos')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      dryRunTab === 'validos'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Válidos ({analysisResult.validRows.length})
                  </button>
                  {analysisResult.invalidRows.length > 0 && (
                    <button
                      onClick={() => setDryRunTab('erros')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        dryRunTab === 'erros'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      Inconsistentes ({analysisResult.invalidRows.length})
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 font-sans">
                  Arquivo: <strong>{selectedFile?.name}</strong>
                </span>
              </div>

              {/* Tabela de Amostra */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-black tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">Setor da Planta</th>
                      <th className="p-2.5">Sub-Local</th>
                      <th className="p-2.5">Área</th>
                      <th className="p-2.5">Prancha</th>
                      <th className="p-2.5">Gerência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {dryRunTab === 'validos' ? (
                      analysisResult.validRows.slice(0, 30).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{row.setor_planta}</td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">{row.sub_local}</td>
                          <td className="p-2.5 text-slate-500">{row.area_operacional || '—'}</td>
                          <td className="p-2.5 text-slate-500">{row.prancha_projeto || '—'}</td>
                          <td className="p-2.5 text-slate-500">{row.gerencia_responsavel || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      analysisResult.invalidRows.map((inv, idx) => (
                        <tr key={idx} className="bg-rose-50/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                          <td className="p-2.5 font-bold">Linha {inv.rowNum}</td>
                          <td colSpan={4} className="p-2.5 text-rose-700 dark:text-rose-400 font-sans">
                            {inv.errors.join(' | ')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 3: PROCESSAMENTO & BARRA DE PROGRESSO                       */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 shadow-lg">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                  Processando Carga em Lote
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-1">
                  Salvando dados na base oficial com deduplicação estrita...
                </p>
              </div>

              <div className="w-full max-w-md space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>{progressPercent}% Concluído</span>
                  <span>Linha {currentProcessed} de {totalToProcess}</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 4: RELATÓRIO DE CONCLUSÃO                                   */}
          {/* ================================================================= */}
          {step === 4 && finalReport && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 shadow-lg">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider">
                  Carga Concluída com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-1">
                  A base de dados oficial de Localizações Operacionais foi atualizada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Sucessos</span>
                  <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1 block">
                    {finalReport.sucessos}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Falhas</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1 block">
                    {finalReport.falhas}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex justify-between items-center shrink-0">
          {step === 1 && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer border-none bg-transparent"
            >
              Cancelar
            </button>
          )}

          {step === 2 && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border-none bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" /> Escolher Outro Arquivo
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!analysisResult || analysisResult.validRows.length === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md border-none"
              >
                Gravar {analysisResult?.validRows.length} Registros Válidos <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md border-none"
            >
              Concluir e Fechar Cockpit
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LocalizacaoImportCockpit;
