'use client';

import React, { useState, useEffect, useMemo } from 'react';
import WindowModal from './WindowModal';
import {
  AssetStockItemRecord,
  getAssetStockItemsAction
} from '@/app/actions/assetStockActions';
import {
  processAssetSwapAction,
  MotivoTrocaType,
  SubstituicaoAtivoRecord
} from '@/app/actions/assetSwapActions';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';
import { formatFriendlyMotivo, generateSwapReportPDF } from '@/lib/assetSwapReports';
import { soundNotificationService } from '@/lib/soundNotificationService';
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Building2,
  MapPin,
  Camera,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  FileText
} from 'lucide-react';

interface AssetSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  currentUserEmail?: string;
  preSelectedAssetId?: string;
  onSuccess?: (troca: SubstituicaoAtivoRecord) => void;
}

const MOTIVOS_OPTIONS: Array<{ key: MotivoTrocaType; label: string; desc: string; isCritico?: boolean }> = [
  {
    key: 'IMPEDITIVO_NBR',
    label: 'Impeditivo NBR 12962 / 15808',
    desc: 'Reprovação mandatória por inconformidade técnica grave em inspeção',
    isCritico: true
  },
  {
    key: 'DESPRESSURIZADO',
    label: 'Manômetro Despressurizado',
    desc: 'Ponteiro fora da faixa verde de operação / sem pressão interna',
    isCritico: true
  },
  {
    key: 'VENCIDO',
    label: 'Carga ou Teste Vencido',
    desc: 'Data limite de recarga anual ou teste hidrostático quinquenal expirada',
    isCritico: true
  },
  {
    key: 'LACRE_ROMPIDO',
    label: 'Lacre / Pino Rompido',
    desc: 'Selo violado, pino solto ou suspeita de uso não comunicado'
  },
  {
    key: 'AVARIA_MECANICA',
    label: 'Avaria Mecânica / Corrosão',
    desc: 'Amassado no corpo, bocal entupido ou ferrugem severa'
  },
  {
    key: 'USO_EMERGENCIA',
    label: 'Disparo em Emergência',
    desc: 'Cilindro descarregado em combate a princípio de incêndio'
  },
  {
    key: 'SOLICITACAO_SETOR',
    label: 'Chamado por Líder de Setor',
    desc: 'Solicitação avulsa de substituição preventiva aberta por área'
  },
  {
    key: 'OUTROS',
    label: 'Outro Motivo Operacional',
    desc: 'Troca de layout ou ajuste preventivo de capacidade'
  }
];

export default function AssetSwapModal({
  isOpen,
  onClose,
  currentUserName,
  currentUserEmail,
  preSelectedAssetId,
  onSuccess
}: AssetSwapModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [allAssets, setAllAssets] = useState<AssetStockItemRecord[]>([]);

  // Seleções da Troca Bilateral
  const [selectedRetirado, setSelectedRetirado] = useState<AssetStockItemRecord | null>(null);
  const [selectedSubstituto, setSelectedSubstituto] = useState<AssetStockItemRecord | null>(null);

  // Filtros de busca nas listas
  const [searchRetirado, setSearchRetirado] = useState('');
  const [searchSubstituto, setSearchSubstituto] = useState('');

  // Formulário de Contexto
  const [motivo, setMotivo] = useState<MotivoTrocaType>('IMPEDITIVO_NBR');
  const [descricao, setDescricao] = useState('');
  const [fotoAntes, setFotoAntes] = useState<string>('');
  const [fotoDepois, setFotoDepois] = useState<string>('');

  // Estados de Envio
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedTroca, setCompletedTroca] = useState<SubstituicaoAtivoRecord | null>(null);

  // Carrega os ativos ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      setLoadingAssets(true);
      try {
        const res = await getAssetStockItemsAction('Todos');
        if (res.success && res.assets) {
          setAllAssets(res.assets);

          if (preSelectedAssetId) {
            const found = res.assets.find((a) => a.id === preSelectedAssetId);
            if (found) {
              setSelectedRetirado(found);
              setStep(2); // Vai direto para escolha do substituto
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar ativos para troca:', err);
      } finally {
        setLoadingAssets(false);
      }
    }

    load();
  }, [isOpen, preSelectedAssetId]);

  // Ativos na área (candidatos a serem retirados)
  const areaAssets = useMemo(() => {
    return allAssets.filter((a) => {
      const statusEstoque = (a.status_estoque || '').toUpperCase();
      const tipo = (a.tipo_movimentacao || '').toLowerCase();
      return (
        statusEstoque.includes('ÁREA') ||
        statusEstoque.includes('AREA') ||
        statusEstoque.includes('APLICADO') ||
        tipo.includes('na_area') ||
        (!statusEstoque.includes('MANUTENÇÃO') && !statusEstoque.includes('CONDENAD') && a.status === 'ativo')
      );
    });
  }, [allAssets]);

  // Ativos de prontidão (candidatos a substitutos)
  const substituteAssets = useMemo(() => {
    return allAssets.filter((a) => {
      const statusEstoque = (a.status_estoque || '').toUpperCase();
      const tipo = (a.tipo_movimentacao || '').toLowerCase();
      // Não pode ser o próprio ativo retirado
      if (selectedRetirado && a.id === selectedRetirado.id) return false;

      return (
        statusEstoque.includes('APLICAÇÃO') ||
        statusEstoque.includes('APLICACAO') ||
        tipo.includes('aplicacao')
      );
    });
  }, [allAssets, selectedRetirado]);

  // Filtros de busca
  const filteredAreaAssets = useMemo(() => {
    if (!searchRetirado.trim()) return areaAssets;
    const term = searchRetirado.toLowerCase();
    return areaAssets.filter(
      (a) =>
        (a.id_ativo || '').toLowerCase().includes(term) ||
        (a.patrimonio || '').toLowerCase().includes(term) ||
        (a.numero_serie || '').toLowerCase().includes(term) ||
        (a.location || '').toLowerCase().includes(term) ||
        (a.model || '').toLowerCase().includes(term)
    );
  }, [areaAssets, searchRetirado]);

  const filteredSubstituteAssets = useMemo(() => {
    if (!searchSubstituto.trim()) return substituteAssets;
    const term = searchSubstituto.toLowerCase();
    return substituteAssets.filter(
      (a) =>
        (a.id_ativo || '').toLowerCase().includes(term) ||
        (a.patrimonio || '').toLowerCase().includes(term) ||
        (a.numero_serie || '').toLowerCase().includes(term) ||
        (a.model || '').toLowerCase().includes(term)
    );
  }, [substituteAssets, searchSubstituto]);

  const handleSelectMotivo = (m: MotivoTrocaType) => {
    setMotivo(m);
    const item = MOTIVOS_OPTIONS.find((opt) => opt.key === m);
    if (item?.isCritico) {
      soundNotificationService.playCriticalAlert();
    } else {
      soundNotificationService.playNeutralBlip();
    }
  };

  const handleSimulatePhotoUpload = (field: 'antes' | 'depois') => {
    // Simula captura de foto via câmera/arquivo com imagem SVG demonstrativa
    const sample = field === 'antes'
      ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%231e293b"/><text x="50%" y="45%" fill="%23ef4444" font-size="20" font-weight="bold" font-family="sans-serif" text-anchor="middle">REGISTRO: ANTES DA TROCA</text><text x="50%" y="60%" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Equipamento Retirado com Avaria/Vencimento</text></svg>'
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="45%" fill="%2310b981" font-size="20" font-weight="bold" font-family="sans-serif" text-anchor="middle">REGISTRO: DEPOIS DA TROCA</text><text x="50%" y="60%" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Substituto Instalado no Suporte e Sinalizado</text></svg>';

    if (field === 'antes') setFotoAntes(sample);
    else setFotoDepois(sample);
  };

  const handleSubmitSwap = async () => {
    if (!selectedRetirado || !selectedSubstituto) {
      setErrorMsg('Selecione ambos os extintores para efetuar a substituição.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await processAssetSwapAction({
        ativo_retirado_id: selectedRetirado.id,
        ativo_substituto_id: selectedSubstituto.id,
        setor: selectedRetirado.location,
        sub_local: selectedRetirado.sub_location,
        local_especifico: (selectedRetirado.details as any)?.local_especifico,
        motivo_troca: motivo,
        descricao_motivo: descricao.trim() || undefined,
        foto_antes_url: fotoAntes || undefined,
        foto_depois_url: fotoDepois || undefined,
        tecnico_responsavel_nome: currentUserName || 'Operador SPCI',
        tecnico_responsavel_email: currentUserEmail,
      });

      if (!res.success || !res.troca) {
        throw new Error(res.error || 'Falha ao processar a troca bilateral.');
      }

      setCompletedTroca(res.troca);
      soundNotificationService.playSuccessChime();

      if (onSuccess) {
        onSuccess(res.troca);
      }
    } catch (err: any) {
      console.error('[AssetSwapModal] Erro ao submeter troca:', err);
      setErrorMsg(err.message || 'Erro inesperado.');
      soundNotificationService.playCriticalAlert();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedRetirado(null);
    setSelectedSubstituto(null);
    setSearchRetirado('');
    setSearchSubstituto('');
    setMotivo('IMPEDITIVO_NBR');
    setDescricao('');
    setFotoAntes('');
    setFotoDepois('');
    setCompletedTroca(null);
    setErrorMsg(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const hasUnsavedChanges = Boolean(
    !completedTroca && (selectedRetirado || selectedSubstituto || descricao || fotoAntes || fotoDepois)
  );

  return (
    <WindowModal
      id="modal-asset-swap"
      isOpen={isOpen}
      onClose={handleModalClose}
      title={completedTroca ? 'Substituição Concluída com Sucesso' : 'Gestão de Trocas & Substituições de Extintores'}
      subtitle="WIZARD DE OPERAÇÃO EM CAMPO • NBR 12962 / 15808"
      icon={<ArrowLeftRight className="w-5 h-5 text-red-600 dark:text-red-400" />}
      iconName="swap"
      badgeStatus={completedTroca ? 'Homologado' : `Passo ${step} de 4`}
      hasUnsavedChanges={hasUnsavedChanges}
      maxWidthClass="max-w-4xl"
    >
      <div className="font-mono text-xs select-none">
        {/* TELA DE SUCESSO FINAL */}
        {completedTroca ? (
          <div className="p-4 sm:p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block font-mono">
                REGISTRO ATÔMICO BILATERAL CONCLUÍDO
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-['Hanken_Grotesk'] mt-1">
                Troca Executada & Setor 100% Protegido
              </h3>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs rounded-lg">
                Protocolo: {completedTroca.id}
              </div>
            </div>

            {/* Comparativo Resumido dos Dois Ativos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block mb-1">
                  Ativo Recolhido (Manutenção):
                </span>
                <div className="text-sm font-black text-red-700 dark:text-red-300">
                  {formatFriendlyPatrimonio(completedTroca.ativo_retirado_id, completedTroca.ativo_retirado_patrimonio)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Modelo: {completedTroca.ativo_retirado_modelo} ({completedTroca.ativo_retirado_capacidade})
                </div>
                <div className="text-[10px] text-red-600 font-bold mt-1">
                  Destino: ESTOQUE MANUTENÇÃO
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                  Ativo Substituto (Na Área):
                </span>
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {formatFriendlyPatrimonio(completedTroca.ativo_substituto_id, completedTroca.ativo_substituto_patrimonio)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Modelo: {completedTroca.ativo_substituto_modelo} ({completedTroca.ativo_substituto_capacidade})
                </div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">
                  Local: {completedTroca.setor}
                </div>
              </div>
            </div>

            {/* Ações pós-conclusão */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => generateSwapReportPDF(completedTroca)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Imprimir Laudo de Troca (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Barra de Progresso do Wizard */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-[10px]">
              <div
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  step === 1
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 font-bold'
                    : selectedRetirado
                    ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
                onClick={() => setStep(1)}
              >
                <span>1. Ativo da Área</span>
              </div>
              <div
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  step === 2
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 font-bold'
                    : selectedSubstituto
                    ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
                onClick={() => selectedRetirado && setStep(2)}
              >
                <span>2. Substituto</span>
              </div>
              <div
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  step === 3
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
                onClick={() => selectedRetirado && selectedSubstituto && setStep(3)}
              >
                <span>3. Motivo & Fotos</span>
              </div>
              <div
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  step === 4
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
                onClick={() => selectedRetirado && selectedSubstituto && setStep(4)}
              >
                <span>4. Revisão & Troca</span>
              </div>
            </div>

            {/* PASSO 1: SELEÇÃO DO ATIVO A SER RETIRADO */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Selecione o Extintor a ser Retirado da Área:
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Mostrando equipamentos alocados em setores operacionais ({areaAssets.length} na área)
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchRetirado}
                      onChange={(e) => setSearchRetirado(e.target.value)}
                      placeholder="Buscar chassi, setor, cód..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1">
                  {loadingAssets ? (
                    <div className="p-8 text-center text-slate-400">Carregando inventário de extintores...</div>
                  ) : filteredAreaAssets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                      Nenhum extintor na área encontrado com o termo buscado.
                    </div>
                  ) : (
                    filteredAreaAssets.map((asset) => {
                      const isSelected = selectedRetirado?.id === asset.id;
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedRetirado(asset)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isSelected
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Flame className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs font-mono">
                                  {formatFriendlyPatrimonio(asset.id_ativo, asset.patrimonio)}
                                </span>
                                {asset.numero_serie && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    (Chassi: {asset.numero_serie})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{asset.model || 'PQS ABC'}</span>
                                <span>•</span>
                                <span>{asset.peso_capacidade || '6 kg'}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-red-500" />
                                  {asset.location} {asset.sub_location ? `(${asset.sub_location})` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                isSelected
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isSelected ? 'Selecionado p/ Baixa' : 'Selecionar'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedRetirado}
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Avançar para Substituto</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: SELEÇÃO DO ATIVO SUBSTITUTO */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-700 dark:text-red-400 text-[11px]">Retirando da área:</span>
                    <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
                      {formatFriendlyPatrimonio(selectedRetirado?.id_ativo, selectedRetirado?.patrimonio)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({selectedRetirado?.model} • {selectedRetirado?.location})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] text-red-600 hover:underline font-bold"
                  >
                    Alterar
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Selecione o Extintor Substituto (Estoque Pronta-Entrega):
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Mostrando extintores com status ESTOQUE APLICAÇÃO ({substituteAssets.length} disponíveis)
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchSubstituto}
                      onChange={(e) => setSearchSubstituto(e.target.value)}
                      placeholder="Buscar por chassi, cód..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                  {filteredSubstituteAssets.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                      Nenhum extintor disponível em ESTOQUE APLICAÇÃO.
                    </div>
                  ) : (
                    filteredSubstituteAssets.map((asset) => {
                      const isSelected = selectedSubstituto?.id === asset.id;
                      const isSameModel = selectedRetirado && asset.model === selectedRetirado.model;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedSubstituto(asset)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                              }`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs font-mono">
                                  {formatFriendlyPatrimonio(asset.id_ativo, asset.patrimonio)}
                                </span>
                                {asset.numero_serie && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    (Chassi: {asset.numero_serie})
                                  </span>
                                )}
                                {isSameModel && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                                    Mesmo Agente
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{asset.model || 'PQS ABC'}</span>
                                <span>•</span>
                                <span>{asset.peso_capacidade || '6 kg'}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-bold">Pronto para Instalação</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isSelected ? 'Substituto Escolhido' : 'Escolher'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSubstituto}
                    onClick={() => setStep(3)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Avançar para Motivo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: MOTIVO DA TROCA & EVIDÊNCIAS FOTOGRÁFICAS */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Selecione o Motivo Técnico da Substituição:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MOTIVOS_OPTIONS.map((opt) => {
                      const isSelected = motivo === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectMotivo(opt.key)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {opt.label}
                            </span>
                            {opt.isCritico && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[8.5px] font-black">
                                Impeditivo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Descrição Complementar / Parecer do Técnico (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva detalhes adicionais constatados no extintor ou no suporte do ponto..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Evidências Fotográficas Antes e Depois */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Evidências Fotográficas (Auditoria NBR):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Foto Antes */}
                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        1. Extintor Retirado (Avaria / Vencimento)
                      </span>
                      {fotoAntes ? (
                        <div className="relative group w-full">
                          <img src={fotoAntes} alt="Antes" className="h-28 w-full object-contain rounded-xl border border-slate-200 dark:border-slate-800" />
                          <button
                            type="button"
                            onClick={() => setFotoAntes('')}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulatePhotoUpload('antes')}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-red-500 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer mt-1"
                        >
                          <Camera className="w-4 h-4 text-red-500" />
                          <span>Capturar Foto do Retirado</span>
                        </button>
                      )}
                    </div>

                    {/* Foto Depois */}
                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        2. Extintor Substituto Instalado
                      </span>
                      {fotoDepois ? (
                        <div className="relative group w-full">
                          <img src={fotoDepois} alt="Depois" className="h-28 w-full object-contain rounded-xl border border-slate-200 dark:border-slate-800" />
                          <button
                            type="button"
                            onClick={() => setFotoDepois('')}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulatePhotoUpload('depois')}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer mt-1"
                        >
                          <Camera className="w-4 h-4 text-emerald-500" />
                          <span>Capturar Foto do Instalado</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Revisar Troca Bilateral</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 4: REVISÃO & CONFIRMAÇÃO ATÔMICA */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                    Resumo da Operação Bilateral:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40">
                      <span className="text-[9px] font-bold text-red-700 dark:text-red-400 uppercase block mb-1">
                        1. Ativo Recolhido da Área:
                      </span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {formatFriendlyPatrimonio(selectedRetirado?.id_ativo, selectedRetirado?.patrimonio)}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        Chassi: {selectedRetirado?.numero_serie || 'N/A'} • {selectedRetirado?.model}
                      </div>
                      <div className="text-[10px] text-red-600 font-semibold mt-1">
                        Novo Status: ESTOQUE MANUTENÇÃO
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block mb-1">
                        2. Ativo Instalado no Ponto:
                      </span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {formatFriendlyPatrimonio(selectedSubstituto?.id_ativo, selectedSubstituto?.patrimonio)}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        Chassi: {selectedSubstituto?.numero_serie || 'N/A'} • {selectedSubstituto?.model}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        Novo Status: NA ÁREA (APLICADO)
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10.5px] space-y-1">
                    <div>
                      <strong className="text-slate-600 dark:text-slate-400">Setor Atendido:</strong>{' '}
                      <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedRetirado?.location}</span>
                    </div>
                    <div>
                      <strong className="text-slate-600 dark:text-slate-400">Motivo da Substituição:</strong>{' '}
                      <span className="text-red-600 font-bold">{formatFriendlyMotivo(motivo)}</span>
                    </div>
                    {descricao && (
                      <div>
                        <strong className="text-slate-600 dark:text-slate-400">Observações:</strong>{' '}
                        <span className="text-slate-700 dark:text-slate-300 italic">"{descricao}"</span>
                      </div>
                    )}
                    <div>
                      <strong className="text-slate-600 dark:text-slate-400">Técnico Executor:</strong>{' '}
                      <span className="text-slate-900 dark:text-slate-100">{currentUserName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitSwap}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Homologando Troca Bilateral...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar & Executar Substituição</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WindowModal>
  );
}
