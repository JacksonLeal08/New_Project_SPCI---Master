'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Loader2, 
  Check, 
  ArrowRight,
  Flame,
  Layers,
  MapPin,
  RefreshCw,
  Maximize2,
  Minimize2,
  Minus,
  Sun,
  Moon
} from 'lucide-react';
import { 
  LocalizacoesService, 
  LocalizacaoOperacional, 
  LocalizacaoBloqueada, 
  ResultadoValidacaoBulkDelete 
} from '@/lib/localizacoesService';
import { useTheme } from '@/app/context/ThemeContext';

interface BulkDeleteLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  contratoId?: string;
  memoryAssets?: any[];
  usuarioId?: string;
  usuarioNome?: string;
  onSuccess: (excluidosCount: number) => void;
}

type ModalStage = 'auditoria' | 'decisao' | 'executando' | 'concluido';

export default function BulkDeleteLocationModal({
  isOpen,
  onClose,
  selectedIds,
  contratoId,
  memoryAssets,
  usuarioId,
  usuarioNome,
  onSuccess
}: BulkDeleteLocationModalProps) {
  const { theme, toggleTheme } = useTheme();
  const [stage, setStage] = useState<ModalStage>('auditoria');
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [validationResult, setValidationResult] = useState<ResultadoValidacaoBulkDelete | null>(null);
  const [idsParaExcluir, setIdsParaExcluir] = useState<string[]>([]);
  const [expandedLocId, setExpandedLocId] = useState<string | null>(null);

  // Estados de Controle de Janela (Maximizar / Minimizar)
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Estados de Progresso
  const [progressCurrent, setProgressCurrent] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Executa auditoria preventiva ao abrir a modal
  useEffect(() => {
    if (isOpen && selectedIds.length > 0) {
      setStage('auditoria');
      setIsValidating(true);
      setErrorMessage(null);
      setExpandedLocId(null);
      setProgressPercent(0);
      setIsMinimized(false);

      LocalizacoesService.validarExclusaoEmMassa(selectedIds, contratoId, memoryAssets)
        .then((res) => {
          setValidationResult(res);
          if (res.success) {
            // Inicialmente os IDs para exclusão são todos os aptos
            setIdsParaExcluir(res.aptos.map(a => a.id!).filter(Boolean));
          } else {
            setErrorMessage(res.erro || 'Falha ao validar integridade referencial.');
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Erro inesperado na validação.');
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [isOpen, selectedIds, contratoId, memoryAssets]);

  if (!isOpen) return null;

  // Alterna expansão de detalhes de ativos
  const toggleExpand = (locId: string) => {
    setExpandedLocId(prev => (prev === locId ? null : locId));
  };

  // Avança para decisão / confirmação
  const handleProsseguirApenasDesocupados = () => {
    if (!validationResult) return;
    const apenasAptosIds = validationResult.aptos.map(a => a.id!).filter(Boolean);
    setIdsParaExcluir(apenasAptosIds);
    setStage('decisao');
  };

  // Executa a exclusão permanente com progresso
  const handleConfirmarExclusao = async () => {
    if (idsParaExcluir.length === 0) return;

    setStage('executando');
    setProgressCurrent(0);
    setProgressTotal(idsParaExcluir.length);
    setProgressPercent(5);

    try {
      const res = await LocalizacoesService.executarExclusaoEmMassaComProgresso(idsParaExcluir, {
        contratoId,
        usuarioId,
        usuarioNome,
        onProgress: (cur, tot) => {
          setProgressCurrent(cur);
          setProgressTotal(tot);
          setProgressPercent(Math.round((cur / tot) * 100));
        }
      });

      if (res.sucesso) {
        setProgressPercent(100);
        setTimeout(() => {
          setStage('concluido');
        }, 500);
      } else {
        setErrorMessage(res.erro || 'Erro ao realizar exclusão no banco.');
        setStage('auditoria');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro inesperado durante a exclusão.');
      setStage('auditoria');
    }
  };

  const handleFinalizar = () => {
    onSuccess(idsParaExcluir.length);
    onClose();
  };

  const totalAptos = validationResult?.totalAptos || 0;
  const totalBloqueados = validationResult?.totalBloqueados || 0;

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-red-200/90 dark:border-slate-700 shadow-2xl rounded-2xl p-3 flex items-center gap-3 select-none font-sans text-slate-900 dark:text-white"
      >
        <div className="p-2 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-500 rounded-xl border border-red-200 dark:border-red-500/30">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Exclusão em Massa
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-red-50 dark:bg-slate-800 text-red-700 dark:text-slate-300 font-mono rounded border border-red-200 dark:border-slate-700">
              {selectedIds.length}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {stage === 'executando' 
              ? `Progresso: ${progressPercent}%` 
              : isValidating 
                ? 'Auditando integridade...' 
                : `${totalAptos} aptos • ${totalBloqueados} bloqueados`}
          </span>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            title="Restaurar modal"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {stage !== 'executando' && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md select-none font-sans transition-all duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full bg-white dark:bg-slate-900 border border-red-200/90 dark:border-slate-800 rounded-2xl shadow-2xl shadow-red-950/10 overflow-hidden flex flex-col transition-all duration-300 ${
          isMaximized 
            ? 'w-[98vw] h-[95vh] max-w-none max-h-none' 
            : 'max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* CABEÇALHO */}
        <div className="px-6 py-4 border-b border-red-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-50/80 via-white to-red-50/40 dark:from-slate-950/80 dark:to-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-500 rounded-xl border border-red-200 dark:border-red-500/30 shadow-sm">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                  Exclusão em Massa de Localizações
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-slate-800 text-red-700 dark:text-slate-300 font-mono font-bold border border-red-200 dark:border-slate-700">
                  {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Auditoria de integridade referencial e trava preventiva contra ativos em operação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Alternar Tema Claro / Escuro */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title={theme === 'dark' ? "Alternar para tema claro" : "Alternar para tema escuro"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Botão Minimizar */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title="Minimizar modal para o rodapé"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Botão Maximizar / Restaurar */}
            <button
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
              title={isMaximized ? "Restaurar tamanho padrão" : "Maximizar em tela cheia"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Botão Fechar */}
            {stage !== 'executando' && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer ml-1"
                title="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* INDICADOR DE ETAPAS */}
        <div className="px-6 py-2.5 bg-slate-50/90 dark:bg-slate-950/40 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <div className={`flex items-center gap-1.5 ${stage === 'auditoria' ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-500 dark:text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${stage === 'auditoria' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1</span>
            Auditoria de Vínculos
          </div>
          <div className="h-px w-6 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${stage === 'decisao' ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-500 dark:text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${stage === 'decisao' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>2</span>
            Confirmação
          </div>
          <div className="h-px w-6 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${stage === 'executando' || stage === 'concluido' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${stage === 'executando' || stage === 'concluido' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>3</span>
            Expurgo Seguro
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL COM SCROLL */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* MENSAGEM DE ERRO (SE HOUVER) */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start justify-between gap-2.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 dark:text-red-200">Atenção na Operação:</p>
                  <p className="text-[11px] mt-0.5 text-red-700 dark:text-red-300/90">{errorMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-0.5 bg-transparent border-none cursor-pointer"
                title="Dispensar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* ETAPA 1: AUDITORIA EM TEMPO REAL                              */}
          {/* ============================================================= */}
          {stage === 'auditoria' && (
            <>
              {isValidating ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  <p className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    Auditor de Integridade Ativo...
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                    Varrendo tabelas de extintores, hidrantes e ativos gerais para garantir que nenhum equipamento fique órfão na planta.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* RESUMO EM BENTO BOX */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Aptos para Exclusão</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-2xl font-mono font-black text-emerald-950 dark:text-white mt-1">{totalAptos}</p>
                      <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">Locais desocupados (sem ativos)</p>
                    </div>

                    <div className="p-3.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-red-800 dark:text-red-400 tracking-wider">Bloqueados por Vínculo</span>
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-2xl font-mono font-black text-red-950 dark:text-white mt-1">{totalBloqueados}</p>
                      <p className="text-[10px] text-red-700/90 dark:text-red-300/80 mt-0.5">Possuem equipamentos alocados</p>
                    </div>
                  </div>

                  {/* ALERTA DE TRAVA SE HOUVER BLOQUEADOS */}
                  {totalBloqueados > 0 && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200/90 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold uppercase text-[10px] tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Trava de Segurança Restritiva (SPCI Master)
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                        Não é permitido excluir locais com equipamentos em operação. Realize a movimentação ou descarte prévio dos ativos antes de remover o ponto da planta.
                      </p>
                    </div>
                  )}

                  {/* LISTA DE LOCAIS BLOQUEADOS COM EXPANSÃO NOMINAL */}
                  {totalBloqueados > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        Locais com Impedimento ({totalBloqueados}):
                      </p>
                      <div className={`space-y-1.5 overflow-y-auto pr-1 ${isMaximized ? 'max-h-[42vh]' : 'max-h-52'}`}>
                        {validationResult?.bloqueados.map((item, idx) => {
                          const isExpanded = expandedLocId === item.localizacao.id;
                          return (
                            <div
                              key={idx}
                              className="bg-slate-50 dark:bg-slate-950/60 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-xs shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                                    {item.localizacao.setor_planta}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 mx-1.5">›</span>
                                  <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {item.localizacao.sub_local}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-full text-[9px] font-bold">
                                    {item.totalAtivos} {item.totalAtivos === 1 ? 'ativo' : 'ativos'}
                                  </span>
                                  <button
                                    onClick={() => toggleExpand(item.localizacao.id!)}
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent border-none cursor-pointer"
                                    title="Ver equipamentos vinculados"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* LISTAGEM DETALHADA DOS ATIVOS DO LOCAL */}
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1"
                                >
                                  {item.ativos.map((ast, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <Flame className="w-3 h-3 text-red-500" />
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ast.patrimonio}</span>
                                        <span className="text-slate-500 dark:text-slate-400">({ast.categoria})</span>
                                      </div>
                                      <span className="text-[9px] text-slate-500 dark:text-slate-400">{ast.status}</span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LISTA RESUMIDA DE LOCAIS APTOS */}
                  {totalAptos > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                        Locais Livres para Exclusão ({totalAptos}):
                      </p>
                      <div className={`flex flex-wrap gap-1.5 overflow-y-auto ${isMaximized ? 'max-h-[50vh]' : 'max-h-36'}`}>
                        {validationResult?.aptos.map((a, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-800 dark:text-slate-300 shadow-sm"
                          >
                            {a.setor_planta} <span className="text-slate-400">›</span> {a.sub_local}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ============================================================= */}
          {/* ETAPA 2: TOMADA DE DECISÃO E CONFIRMAÇÃO                      */}
          {/* ============================================================= */}
          {stage === 'decisao' && (
            <div className="space-y-4 py-2">
              <div className="p-5 bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl text-center space-y-2.5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center mx-auto text-red-600 dark:text-red-500 shadow-sm">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white tracking-wide">
                  Confirmar Exclusão Definitiva
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Você está prestes a remover permanentemente <strong className="text-red-600 dark:text-red-400 font-mono font-black">{idsParaExcluir.length}</strong> {idsParaExcluir.length === 1 ? 'localização operacional desocupada' : 'localizações operacionais desocupadas'}.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">Diretrizes desta Ação:</p>
                <p>• Nenhum ativo operacional será danificado, pois todos os itens selecionados estão 100% desocupados.</p>
                <p>• Esta ação atualizará imediatamente os dropdowns de cadastro e checklists de campo.</p>
                <p>• Um registro auditado será gravado em <span className="font-mono font-bold text-slate-700 dark:text-slate-300">logs_auditoria</span> com o seu usuário.</p>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ETAPA 3: PROCESSAMENTO COM BARRA DE PROGRESSO                */}
          {/* ============================================================= */}
          {stage === 'executando' && (
            <div className="py-10 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center mx-auto text-red-600 dark:text-red-500 shadow-sm">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white tracking-wide">
                  Expurgando Localizações...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {progressCurrent} de {progressTotal} removidos ({progressPercent}%)
                </p>
              </div>

              {/* BARRA DE PROGRESSO ANIMADA */}
              <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                <motion.div
                  className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Por favor, aguarde. Não feche a janela enquanto a transação é processada.
              </p>
            </div>
          )}

          {/* ============================================================= */}
          {/* ETAPA 4: CONCLUSÃO COM SUCESSO                                */}
          {/* ============================================================= */}
          {stage === 'concluido' && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-extrabold uppercase text-slate-900 dark:text-white tracking-wide">
                  Operação Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{idsParaExcluir.length}</strong> localizações operacionais foram expurgadas com integridade garantida.
                </p>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                O catálogo oficial e os caches locais já foram atualizados. Os formulários de ronda de campo não listarão mais esses pontos.
              </p>
            </div>
          )}

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {stage === 'auditoria' && (
            <>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {totalBloqueados > 0 && totalAptos > 0 && (
                  <button
                    onClick={handleProsseguirApenasDesocupados}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                  >
                    Excluir Apenas os {totalAptos} Desocupados
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {totalBloqueados === 0 && totalAptos > 0 && (
                  <button
                    onClick={() => setStage('decisao')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                  >
                    Avançar para Exclusão ({totalAptos})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}

          {stage === 'decisao' && (
            <>
              <button
                onClick={() => setStage('auditoria')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none"
              >
                ← Voltar
              </button>

              <button
                onClick={handleConfirmarExclusao}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar Exclusão ({idsParaExcluir.length})
              </button>
            </>
          )}

          {stage === 'concluido' && (
            <button
              onClick={handleFinalizar}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-emerald-600/20"
            >
              Concluir e Atualizar Tabela
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
