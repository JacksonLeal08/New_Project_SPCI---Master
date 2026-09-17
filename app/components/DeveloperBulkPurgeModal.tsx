'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Lock, 
  FileText,
  Layers,
  Database
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';
import { idb } from '@/lib/indexedDb';

interface DeveloperBulkPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
  activeContrato?: string;
  availableAssets?: any[];
}

type Step = 'ALERT' | 'JUSTIFICATION' | 'PROCESSING' | 'SUCCESS';

export const DeveloperBulkPurgeModal: React.FC<DeveloperBulkPurgeModalProps> = ({
  isOpen,
  onClose,
  category = 'extintores',
  activeContrato = 'ONÇA PUMA',
  availableAssets = []
}) => {
  const { userProfile, currentUser, syncWithRealDatabase, setExtintores } = useSpci();

  // Estados do Modal
  const [step, setStep] = useState<Step>('ALERT');
  const [justificativa, setJustificativa] = useState<string>('');
  const [targetScope, setTargetScope] = useState<'ALL_CONTRATO' | 'ALL_DUPLICATES' | 'ALL_GLOBAL'>('ALL_CONTRATO');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalToPurge, setTotalToPurge] = useState<number>(0);
  const [currentAssetInfo, setCurrentAssetInfo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determinar ativos alvo de acordo com o escopo selecionado
  const assetsToPurge = useMemo(() => {
    if (!availableAssets || availableAssets.length === 0) return [];

    if (targetScope === 'ALL_GLOBAL') {
      return availableAssets;
    }

    if (targetScope === 'ALL_CONTRATO') {
      const siteNorm = (activeContrato || '').trim().toUpperCase();
      if (siteNorm.startsWith('TODOS') || siteNorm === 'GLOBAL') {
        return availableAssets;
      }
      return availableAssets.filter((a: any) => {
        const s = String(a.site || a.details?.site || a.details?.contrato || a.details?.projeto || a.projeto || a.location || '').toUpperCase();
        if (s.includes(siteNorm) || siteNorm.includes(s)) return true;
        // Se for Onça Puma, computa legado
        return siteNorm === 'ONÇA PUMA' && !s.includes('SALOBO');
      });
    }

    if (targetScope === 'ALL_DUPLICATES') {
      // Filtra apenas clones/duplicados por patrimônio
      const seen = new Set<string>();
      const duplicates: any[] = [];
      for (const a of availableAssets) {
        const pat = String(a.numero_patrimonio || a.idAtivo || a.patrimonio || '').trim().toUpperCase();
        if (pat) {
          if (seen.has(pat)) {
            duplicates.push(a);
          } else {
            seen.add(pat);
          }
        }
      }
      return duplicates;
    }

    return availableAssets;
  }, [availableAssets, targetScope, activeContrato]);

  // Resetar modal ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('ALERT');
      setJustificativa('');
      setProgressPercent(0);
      setProcessedCount(0);
      setErrorMessage(null);
      setTotalToPurge(assetsToPurge.length);
    }
  }, [isOpen, assetsToPurge.length]);

  // Validação de role estrita
  const isDev = useMemo(() => {
    const r = String(userProfile?.role || '').trim().toUpperCase();
    return r === 'DESENVOLVEDOR' || r === 'DEVELOPER';
  }, [userProfile?.role]);

  if (!isOpen) return null;

  // Bloqueio se não for Desenvolvedor
  if (!isDev) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">ACESSO NÃO AUTORIZADO</h2>
          <p className="text-slate-300 text-sm mb-6">
            O Módulo de Exclusão em Massa Definitiva (Hard Delete) é restrito exclusivamente ao perfil <span className="text-red-400 font-black">DESENVOLVEDOR</span>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    );
  }

  // Execução da exclusão definitiva em Lotes (Chunks)
  const executePurgeInBatches = async () => {
    if (justificativa.trim().length < 20) {
      setErrorMessage('A justificativa técnica deve possuir no mínimo 20 caracteres.');
      return;
    }

    if (assetsToPurge.length === 0) {
      setErrorMessage('Nenhum ativo selecionado para exclusão no escopo atual.');
      return;
    }

    setStep('PROCESSING');
    setErrorMessage(null);
    const total = assetsToPurge.length;
    setTotalToPurge(total);
    setProcessedCount(0);
    setProgressPercent(0);

    const CHUNK_SIZE = 50;
    const allIds = assetsToPurge.map((a: any) => a.id || a.id_ativo || a.numero_patrimonio);
    let deletedCount = 0;

    try {
      for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
        const chunk = allIds.slice(i, i + CHUNK_SIZE);
        const currentItem = assetsToPurge[i];
        setCurrentAssetInfo(`Ativo ${currentItem?.numero_patrimonio || currentItem?.idAtivo || currentItem?.id || '...'}`);

        const response = await fetch('/api/developer/purge-assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': userProfile?.role || 'DESENVOLVEDOR'
          },
          body: JSON.stringify({
            userEmail: userProfile?.email || currentUser?.email,
            userRole: userProfile?.role || 'DESENVOLVEDOR',
            userId: userProfile?.id || currentUser?.uid,
            justificativa: justificativa.trim(),
            assetIds: chunk,
            category,
            contratoId: activeContrato
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Falha HTTP ${response.status} ao processar lote de exclusão.`);
        }

        deletedCount += chunk.length;
        const currentTotal = Math.min(deletedCount, total);
        setProcessedCount(currentTotal);
        setProgressPercent(Math.round((currentTotal / total) * 100));

        // Pequeno intervalo para renderização suave da barra de progresso
        await new Promise(res => setTimeout(res, 80));
      }

      // Saneamento local do IndexedDB e memória
      try {
        const purgedIdSet = new Set(allIds.map(String));
        if (category === 'extintores') {
          setExtintores((prev: any[]) => prev.filter(x => !purgedIdSet.has(String(x.id)) && !purgedIdSet.has(String(x.numero_patrimonio))));
          const cached = await idb.getAll('extintores');
          const cleanCached = (cached || []).filter((x: any) => !purgedIdSet.has(String(x.id)) && !purgedIdSet.has(String(x.numero_patrimonio)));
          await idb.setAll('extintores', cleanCached);
        }
      } catch (cleanErr) {
        console.warn('Aviso na limpeza do cache IndexedDB pós-purge:', cleanErr);
      }

      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Erro na exclusão em lote:', err);
      setErrorMessage(err.message || 'Erro inesperado durante o processamento do lote.');
      setStep('JUSTIFICATION');
    }
  };

  const handleReloadCockpit = async () => {
    try {
      // Limpa cache local de extintores para forçar sincronização do banco mestre
      await idb.clear('extintores').catch(console.error);
      if (syncWithRealDatabase) {
        await syncWithRealDatabase();
      }
    } catch (e) {
      console.error('Erro ao revalidar cockpit:', e);
    } finally {
      onClose();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none overflow-y-auto"
      // Bloqueio de fechamento durante processamento
      onClick={step === 'PROCESSING' ? undefined : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="bg-slate-950 border-2 border-red-500/60 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden"
      >
        {/* Barra luminosa de perigo no topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/80 border border-red-500/60 rounded-xl text-red-400">
              <Database className="w-6 h-6 animate-pulse text-red-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase tracking-wider font-mono font-black px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full">
                  EXCLUSIVO DESENVOLVEDOR
                </span>
                <span className="text-xs text-slate-400 font-mono">RBAC LEVEL 4</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-1">
                Expurgo de Dados Físico (Hard Delete)
              </h2>
            </div>
          </div>

          {step !== 'PROCESSING' && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500 text-red-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASSO 1: ALERTA CRÍTICO DE RISCO MÁXIMO */}
        {step === 'ALERT' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-sm uppercase tracking-wide">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                <span>ATENÇÃO: OPERAÇÃO DE EXPURGO DE DADOS IRREVERSÍVEL</span>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Você está prestes a excluir definitivamente <strong className="text-red-400 font-mono text-sm">{assetsToPurge.length}</strong> ativos e todos os seus históricos associados no escopo selecionado.
                Esta operação <strong className="text-white">NÃO PODERÁ SER DESFEITA</strong> e os dados serão eliminados fisicamente do banco de dados relacional.
              </p>

              {/* Seletor de Escopo de Expurgo */}
              <div className="pt-2 border-t border-red-950 space-y-2">
                <label className="text-[11px] font-mono text-slate-400 block uppercase">
                  Selecione o Escopo de Expurgo:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => setTargetScope('ALL_CONTRATO')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      targetScope === 'ALL_CONTRATO'
                        ? 'bg-red-900/40 border-red-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-red-400">ESCOPO CONTRATUAL</span>
                    Contrato {activeContrato} ({assetsToPurge.length} ativos)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('ALL_DUPLICATES')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      targetScope === 'ALL_DUPLICATES'
                        ? 'bg-red-900/40 border-red-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-amber-400">APENAS DUPLICATAS</span>
                    Clones Detectados (Seguro)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-300 font-sans text-center">
                Você tem certeza absoluta que deseja prosseguir para a justificativa técnica?
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs rounded-xl transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => setStep('JUSTIFICATION')}
                disabled={assetsToPurge.length === 0}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/50 transition-all flex items-center justify-center space-x-2"
              >
                <span>TENHO CERTEZA!</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: JUSTIFICATIVA TÉCNICA OBRIGATÓRIA */}
        {step === 'JUSTIFICATION' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono">
              <FileText className="w-4 h-4" />
              <span>JUSTIFICATIVA TÉCNICA OBRIGATÓRIA (MÍNIMO 20 CARACTERES)</span>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Esta justificativa será gravada de forma <strong className="text-slate-200">imutável</strong> na tabela jurídica de auditoria com seu IP, e-mail e carimbo de data/hora.
            </p>

            <div className="relative">
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={4}
                placeholder="Ex: Saneamento de base duplicada gerada por importação XLSX corrompida em homologação do contrato Onça Puma..."
                className="w-full p-3 bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-colors font-sans resize-none"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] font-mono">
                <span className={justificativa.trim().length >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
                  {justificativa.trim().length >= 20 
                    ? '✓ Tamanho válido para auditoria' 
                    : `Faltam ${Math.max(0, 20 - justificativa.trim().length)} caracteres`}
                </span>
                <span className="text-slate-500">
                  {justificativa.trim().length} / 20 min
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Total de Ativos a Purgar:</span>
              <span className="text-red-400 font-bold">{assetsToPurge.length} equipamentos</span>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('ALERT')}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs rounded-xl transition-colors"
              >
                VOLTAR
              </button>
              <button
                type="button"
                onClick={executePurgeInBatches}
                disabled={justificativa.trim().length < 20}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/60 transition-all flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>CONFIRMAR EXCLUSÃO DEFINITIVA</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: PROCESSAMENTO COM BARRA DE PROGRESSO EM TEMPO REAL */}
        {step === 'PROCESSING' && (
          <div className="space-y-5 py-4">
            <div className="text-center space-y-2">
              <div className="inline-block p-3 bg-red-950/60 border border-red-500/40 rounded-full animate-spin">
                <RefreshCw className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Processando Expurgo Físico em Lotes...
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Por favor, não feche o navegador nem atualize a página.
              </p>
            </div>

            {/* Contador Sequencial */}
            <div className="flex justify-between items-end text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">PROGRESSO DA OPERAÇÃO</span>
                <span className="text-white font-bold text-sm">
                  Excluindo ativo {processedCount} de {totalToPurge}...
                </span>
              </div>
              <span className="text-red-400 font-black text-lg">
                {progressPercent}%
              </span>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            </div>

            {/* Ativo Atual */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-center text-xs font-mono text-slate-400">
              <span className="text-[10px] block text-slate-500 uppercase">Processando cascata relacional</span>
              {currentAssetInfo || 'Iniciando transação em lote...'}
            </div>
          </div>
        )}

        {/* PASSO 4: SUCESSO VISUAL */}
        {step === 'SUCCESS' && (
          <div className="space-y-5 py-2 text-center">
            <div className="w-16 h-16 bg-emerald-950/60 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10 animate-scale" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Expurgo Concluído com Sucesso!
              </h3>
              <p className="text-xs text-slate-300 font-sans max-w-md mx-auto">
                <strong className="text-emerald-400 font-mono">{processedCount}</strong> ativos e todos os seus históricos foram purgados definitivamente do sistema e do banco de dados.
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left text-xs font-mono space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Auditoria Imutável:</span>
                <span className="text-emerald-400 font-bold">REGISTRADA</span>
              </div>
              <div className="flex justify-between">
                <span>Responsável:</span>
                <span className="text-slate-300">{userProfile?.email || currentUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Data/Hora:</span>
                <span className="text-slate-300">{new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReloadCockpit}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>RECARREGAR COCKPIT & SANITIZAR CACHE</span>
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
};
