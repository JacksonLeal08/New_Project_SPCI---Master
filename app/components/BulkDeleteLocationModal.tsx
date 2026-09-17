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
  RefreshCw
} from 'lucide-react';
import { 
  LocalizacoesService, 
  LocalizacaoOperacional, 
  LocalizacaoBloqueada, 
  ResultadoValidacaoBulkDelete 
} from '@/lib/localizacoesService';

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
  const [stage, setStage] = useState<ModalStage>('auditoria');
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [validationResult, setValidationResult] = useState<ResultadoValidacaoBulkDelete | null>(null);
  const [idsParaExcluir, setIdsParaExcluir] = useState<string[]>([]);
  const [expandedLocId, setExpandedLocId] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* CABEÇALHO */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
                Exclusão em Massa de Localizações
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Auditoria de integridade referencial e trava contra equipamentos ativos.
              </p>
            </div>
          </div>

          {stage !== 'executando' && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* INDICADOR DE ETAPAS */}
        <div className="px-6 py-2.5 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <div className={`flex items-center gap-1.5 ${stage === 'auditoria' ? 'text-red-400' : 'text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${stage === 'auditoria' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
            Auditoria de Vínculos
          </div>
          <div className="h-px w-6 bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${stage === 'decisao' ? 'text-red-400' : 'text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${stage === 'decisao' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
            Confirmação
          </div>
          <div className="h-px w-6 bg-slate-800" />
          <div className={`flex items-center gap-1.5 ${stage === 'executando' || stage === 'concluido' ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${stage === 'executando' || stage === 'concluido' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
            Expurgo Seguro
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL COM SCROLL */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* MENSAGEM DE ERRO (SE HOUVER) */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção na Operação:</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
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
                  <p className="text-xs font-bold uppercase text-slate-200 tracking-wider">
                    Auditor de Integridade Ativo...
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-sm">
                    Varrendo tabelas de extintores, hidrantes e ativos gerais para garantir que nenhum equipamento fique órfão na planta.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* RESUMO EM BENTO BOX */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-400">Aptos para Exclusão</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-xl font-mono font-black text-white mt-1">{totalAptos}</p>
                      <p className="text-[9px] text-emerald-300/80 mt-0.5">Locais desocupados (sem ativos)</p>
                    </div>

                    <div className="p-3.5 bg-red-950/30 border border-red-800/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-red-400">Bloqueados por Vínculo</span>
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                      </div>
                      <p className="text-xl font-mono font-black text-white mt-1">{totalBloqueados}</p>
                      <p className="text-[9px] text-red-300/80 mt-0.5">Possuem equipamentos alocados</p>
                    </div>
                  </div>

                  {/* ALERTA DE TRAVA SE HOUVER BLOQUEADOS */}
                  {totalBloqueados > 0 && (
                    <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-200/90 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Trava de Segurança Restritiva (SPCI Master)
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-200/80">
                        Não é permitido excluir locais com equipamentos em operação. Realize a movimentação ou descarte prévio dos ativos antes de remover o ponto da planta.
                      </p>
                    </div>
                  )}

                  {/* LISTA DE LOCAIS BLOQUEADOS COM EXPANSÃO NOMINAL */}
                  {totalBloqueados > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Locais com Impedimento ({totalBloqueados}):
                      </p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {validationResult?.bloqueados.map((item, idx) => {
                          const isExpanded = expandedLocId === item.localizacao.id;
                          return (
                            <div
                              key={idx}
                              className="bg-slate-950/60 border border-red-900/40 rounded-xl p-3 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-red-400">
                                    {item.localizacao.setor_planta}
                                  </span>
                                  <span className="text-slate-500 mx-1.5">›</span>
                                  <span className="font-mono text-slate-300">
                                    {item.localizacao.sub_local}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-800/60 rounded text-[9px] font-bold">
                                    {item.totalAtivos} {item.totalAtivos === 1 ? 'ativo' : 'ativos'}
                                  </span>
                                  <button
                                    onClick={() => toggleExpand(item.localizacao.id!)}
                                    className="p-1 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
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
                                  className="mt-2 pt-2 border-t border-slate-800 space-y-1"
                                >
                                  {item.ativos.map((ast, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className="flex items-center justify-between bg-slate-900 px-2.5 py-1 rounded text-[10px]"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <Flame className="w-3 h-3 text-red-500" />
                                        <span className="font-mono font-bold text-slate-200">{ast.patrimonio}</span>
                                        <span className="text-slate-500">({ast.categoria})</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400">{ast.status}</span>
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
                      <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                        Locais Livres para Exclusão ({totalAptos}):
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {validationResult?.aptos.map((a, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                          >
                            {a.setor_planta} › {a.sub_local}
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
              <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold uppercase text-white tracking-wide">
                  Confirmar Exclusão Definitiva
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Você está prestes a remover permanentemente <strong className="text-white font-mono">{idsParaExcluir.length}</strong> localizações operacionais desocupadas.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                <p className="font-bold text-slate-300 uppercase text-[10px]">Diretrizes desta Ação:</p>
                <p>• Nenhum ativo operacional será danificado, pois todos os itens selecionados estão 100% desocupados.</p>
                <p>• Esta ação atualizará imediatamente os dropdowns de cadastro e checklists de campo.</p>
                <p>• Um registro auditado será gravado em <span className="font-mono text-slate-300">logs_auditoria</span> com o seu usuário.</p>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ETAPA 3: PROCESSAMENTO COM BARRA DE PROGRESSO                */}
          {/* ============================================================= */}
          {stage === 'executando' && (
            <div className="py-10 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold uppercase text-white tracking-wide">
                  Expurgando Localizações...
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {progressCurrent} de {progressTotal} removidos ({progressPercent}%)
                </p>
              </div>

              {/* BARRA DE PROGRESSO ANIMADA */}
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <motion.div
                  className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Por favor, aguarde. Não feche a janela enquanto a transação é processada.
              </p>
            </div>
          )}

          {/* ============================================================= */}
          {/* ETAPA 4: CONCLUSÃO COM SUCESSO                                */}
          {/* ============================================================= */}
          {stage === 'concluido' && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-extrabold uppercase text-white tracking-wide">
                  Operação Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  <strong className="text-emerald-400 font-mono">{idsParaExcluir.length}</strong> localizações operacionais foram expurgadas com integridade garantida.
                </p>
              </div>
              <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                O catálogo oficial e os caches locais já foram atualizados. Os formulários de ronda de campo não listarão mais esses pontos.
              </p>
            </div>
          )}

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {stage === 'auditoria' && (
            <>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {totalBloqueados > 0 && totalAptos > 0 && (
                  <button
                    onClick={handleProsseguirApenasDesocupados}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    Excluir Apenas os {totalAptos} Desocupados
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {totalBloqueados === 0 && totalAptos > 0 && (
                  <button
                    onClick={() => setStage('decisao')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-1.5"
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
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none"
              >
                ← Voltar
              </button>

              <button
                onClick={handleConfirmarExclusao}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar Exclusão ({idsParaExcluir.length})
              </button>
            </>
          )}

          {stage === 'concluido' && (
            <button
              onClick={handleFinalizar}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md"
            >
              Concluir e Atualizar Tabela
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
