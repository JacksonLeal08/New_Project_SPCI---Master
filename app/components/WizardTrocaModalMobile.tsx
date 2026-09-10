'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowModal } from '@/app/context/WindowModalContext';
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
import { getAssetsList } from '@/lib/supabaseDb';
import AssetSelectionCard from './AssetSelectionCard';
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  MapPin,
  Camera,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Eye,
  Trash2,
  Loader2,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';

export interface WizardTrocaModalMobileProps {
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
    desc: 'Selo violado, pino solto ou suspeita de uso não comunicado',
    isCritico: false
  },
  {
    key: 'AVARIA_MECANICA',
    label: 'Avaria Mecânica / Corrosão',
    desc: 'Amassado no corpo, bocal entupido ou ferrugem severa',
    isCritico: false
  },
  {
    key: 'USO_EMERGENCIA',
    label: 'Disparo em Emergência',
    desc: 'Cilindro descarregado em combate a princípio de incêndio',
    isCritico: false
  },
  {
    key: 'SOLICITACAO_SETOR',
    label: 'Chamado por Líder de Setor',
    desc: 'Solicitação avulsa de substituição preventiva aberta por área',
    isCritico: false
  },
  {
    key: 'OUTROS',
    label: 'Outro Motivo Operacional',
    desc: 'Troca de layout ou ajuste preventivo de capacidade',
    isCritico: false
  }
];

const MODAL_ID = 'modal-asset-swap-wizard';

export default function WizardTrocaModalMobile({
  isOpen,
  onClose,
  currentUserName,
  currentUserEmail,
  preSelectedAssetId,
  onSuccess
}: WizardTrocaModalMobileProps) {
  const {
    registerWindow,
    unregisterWindow,
    setWindowState,
    getWindowState,
    bringToFront
  } = useWindowModal();

  // Estados do Fluxo de Troca
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [areaAssets, setAreaAssets] = useState<AssetStockItemRecord[]>([]);
  const [substituteAssets, setSubstituteAssets] = useState<AssetStockItemRecord[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Seleções bilaterais
  const [selectedRetirado, setSelectedRetirado] = useState<AssetStockItemRecord | null>(null);
  const [selectedSubstituto, setSelectedSubstituto] = useState<AssetStockItemRecord | null>(null);

  // Filtros de busca
  const [searchRetirado, setSearchRetirado] = useState('');
  const [searchSubstituto, setSearchSubstituto] = useState('');

  // Motivo e Parecer Técnico
  const [motivo, setMotivo] = useState<MotivoTrocaType>('IMPEDITIVO_NBR');
  const [descricao, setDescricao] = useState('');

  // Evidências Fotográficas Reais
  const [fotoAntes, setFotoAntes] = useState<string>('');
  const [fotoDepois, setFotoDepois] = useState<string>('');
  const [processingPhoto, setProcessingPhoto] = useState<'antes' | 'depois' | null>(null);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  // Refs para inputs invisíveis de foto
  const cameraInputAntesRef = useRef<HTMLInputElement>(null);
  const galleryInputAntesRef = useRef<HTMLInputElement>(null);
  const cameraInputDepoisRef = useRef<HTMLInputElement>(null);
  const galleryInputDepoisRef = useRef<HTMLInputElement>(null);

  // Estados de Processamento e Conclusão
  const [submitting, setSubmitting] = useState(false);
  const [completedTroca, setCompletedTroca] = useState<SubstituicaoAtivoRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Registra janela no WindowModalContext
  useEffect(() => {
    if (isOpen) {
      registerWindow(MODAL_ID, {
        title: 'Gestão de Trocas & Substituições',
        subtitle: 'Wizard de Operação • NBR 12962 / 15808',
        iconName: 'ArrowLeftRight',
        badgeStatus: `Passo ${step} de 4`,
        onClose,
      });
    } else {
      unregisterWindow(MODAL_ID);
    }
    return () => {
      unregisterWindow(MODAL_ID);
    };
  }, [isOpen, step, registerWindow, unregisterWindow, onClose]);

  const currentState = getWindowState(MODAL_ID);
  const isMinimized = currentState === 'minimized';
  const isMaximized = currentState === 'maximized';

  const handleMinimize = () => setWindowState(MODAL_ID, 'minimized');
  const toggleMaximize = () => setWindowState(MODAL_ID, isMaximized ? 'restored' : 'maximized');

  // Carrega inventário de extintores (combina tabela assets e view ao vivo com 602 ativos)
  const loadInventory = async () => {
    setLoadingAssets(true);
    setErrorMsg(null);
    try {
      const [allExtintoresLive, resEstoque, resAreaAction] = await Promise.all([
        getAssetsList('extintores').catch((e) => {
          console.warn('[WizardTrocaModalMobile] Falha ao buscar lista de extintores:', e);
          return [] as any[];
        }),
        getAssetStockItemsAction('ESTOQUE APLICAÇÃO').catch(() => ({ success: false, assets: [] })),
        getAssetStockItemsAction('NA ÁREA (APLICADO)').catch(() => ({ success: false, assets: [] }))
      ]);

      // 1. Constrói a lista completa de extintores da área instalados na planta
      const mappedAreaMap = new Map<string, AssetStockItemRecord>();

      // Adiciona itens da tabela assets retornados pela action
      (resAreaAction.assets || []).forEach((a) => {
        const key = (a.id_ativo || a.patrimonio || a.id || '').toUpperCase();
        if (key) mappedAreaMap.set(key, a);
      });

      // Adiciona/enriquece com os dados vivos dos 602 extintores da planta
      (allExtintoresLive || []).forEach((ext: any) => {
        const key = String(ext.idAtivo || ext.numero_patrimonio || ext.id || '').toUpperCase();
        if (!key) return;

        const isEstoque =
          ext.status_estoque === 'ESTOQUE APLICAÇÃO' ||
          ext.tipo_movimentacao === 'estoque_aplicacao' ||
          (ext.location && ext.location.toUpperCase().includes('ESTOQUE APLICAÇÃO'));

        if (!isEstoque) {
          const existing = mappedAreaMap.get(key);
          mappedAreaMap.set(key, {
            id: String(ext.id || key),
            id_ativo: ext.idAtivo || ext.numero_patrimonio || key,
            patrimonio: ext.numero_patrimonio || ext.idAtivo || key,
            category: 'extintores',
            model: ext.model || ext.tipoExtintor || existing?.model || 'ABC',
            fabricante: ext.fabricante || existing?.fabricante || 'Kidde',
            peso_capacidade: ext.peso_capacidade || ext.capacidade || ext.peso || existing?.peso_capacidade || '4KG',
            validadeRecarga: ext.validadeRecarga || ext.data_vencimento_teste || existing?.validadeRecarga || '',
            location: ext.location || existing?.location || 'Área Operacional',
            sub_location: ext.subLocation || ext.sub_location || existing?.sub_location || '',
            status: ext.status || existing?.status || 'Conforme',
            status_estoque: 'NA ÁREA (APLICADO)',
            tipo_movimentacao: 'na_area_aplicado',
            numero_serie: ext.numero_serie || ext.chassi || existing?.numero_serie || '',
            details: ext
          });
        }
      });

      // 2. Constrói a lista de substitutos em estoque (ESTOQUE APLICAÇÃO)
      const mappedEstoqueMap = new Map<string, AssetStockItemRecord>();

      (resEstoque.assets || []).forEach((a) => {
        const key = (a.id_ativo || a.patrimonio || a.id || '').toUpperCase();
        if (key) mappedEstoqueMap.set(key, a);
      });

      (allExtintoresLive || []).forEach((ext: any) => {
        const key = String(ext.idAtivo || ext.numero_patrimonio || ext.id || '').toUpperCase();
        if (!key) return;

        const isEstoque =
          ext.status_estoque === 'ESTOQUE APLICAÇÃO' ||
          ext.tipo_movimentacao === 'estoque_aplicacao' ||
          (ext.location && (ext.location.toUpperCase().includes('ALMOXARIFADO') || ext.location.toUpperCase().includes('ESTOQUE')));

        if (isEstoque && !mappedEstoqueMap.has(key)) {
          mappedEstoqueMap.set(key, {
            id: String(ext.id || key),
            id_ativo: ext.idAtivo || ext.numero_patrimonio || key,
            patrimonio: ext.numero_patrimonio || ext.idAtivo || key,
            category: 'extintores',
            model: ext.model || ext.tipoExtintor || 'ABC',
            fabricante: ext.fabricante || 'Kidde',
            peso_capacidade: ext.peso_capacidade || ext.capacidade || ext.peso || '4KG',
            validadeRecarga: ext.validadeRecarga || ext.data_vencimento_teste || '',
            location: ext.location || 'Almoxarifado',
            sub_location: ext.subLocation || ext.sub_location || 'Estoque Aplicação',
            status: ext.status || 'Conforme',
            status_estoque: 'ESTOQUE APLICAÇÃO',
            tipo_movimentacao: 'estoque_aplicacao',
            numero_serie: ext.numero_serie || ext.chassi || '',
            details: ext
          });
        }
      });

      const extintoresArea = Array.from(mappedAreaMap.values());
      const extintoresEstoque = Array.from(mappedEstoqueMap.values());

      setAreaAssets(extintoresArea);
      setSubstituteAssets(extintoresEstoque);

      if (preSelectedAssetId) {
        const match = extintoresArea.find(
          (a) =>
            a.id === preSelectedAssetId ||
            a.id_ativo === preSelectedAssetId ||
            a.patrimonio === preSelectedAssetId
        );
        if (match) {
          setSelectedRetirado(match);
        }
      }
    } catch (err: any) {
      console.error('[WizardTrocaModalMobile] Erro ao carregar ativos:', err);
      setErrorMsg('Falha ao carregar ativos do estoque. Tente novamente.');
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInventory();
      setCompletedTroca(null);
      setErrorMsg(null);
      setStep(1);
    }
  }, [isOpen, preSelectedAssetId]);

  // Filtros de ativos
  const filteredAreaAssets = useMemo(() => {
    if (!searchRetirado.trim()) return areaAssets;
    const term = searchRetirado.toLowerCase();
    return areaAssets.filter(
      (a) =>
        (a.id_ativo || '').toLowerCase().includes(term) ||
        (a.patrimonio || '').toLowerCase().includes(term) ||
        (a.numero_serie || '').toLowerCase().includes(term) ||
        (a.location || '').toLowerCase().includes(term) ||
        (a.sub_location || '').toLowerCase().includes(term) ||
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
        (a.model || '').toLowerCase().includes(term) ||
        (a.location || '').toLowerCase().includes(term)
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

  // Compressão client-side Canvas 1280px (JPEG 0.82)
  const processImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Erro ao decodificar imagem.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'antes' | 'depois') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('O arquivo selecionado deve ser uma imagem válida (JPG, PNG, WEBP).');
      soundNotificationService.playCriticalAlert();
      return;
    }

    setProcessingPhoto(field);
    setErrorMsg(null);

    try {
      const compressedDataUrl = await processImageFile(file);
      if (field === 'antes') {
        setFotoAntes(compressedDataUrl);
      } else {
        setFotoDepois(compressedDataUrl);
      }
      soundNotificationService.playSuccessChime();
    } catch (err: any) {
      console.error('[WizardTrocaModalMobile] Erro ao carregar foto:', err);
      soundNotificationService.playCriticalAlert();
      setErrorMsg('Falha ao processar a foto. Tente novamente.');
    } finally {
      setProcessingPhoto(null);
      e.target.value = '';
    }
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spci_asset_updated', { detail: res.troca }));
      }

      if (onSuccess) {
        onSuccess(res.troca);
      }
    } catch (err: any) {
      console.error('[WizardTrocaModalMobile] Erro ao submeter troca:', err);
      soundNotificationService.playCriticalAlert();
      setErrorMsg(err.message || 'Erro inesperado ao salvar a troca bilateral.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepTitles = {
    1: 'Seleção do Ativo da Área',
    2: 'Extintor Substituto do Estoque',
    3: 'Motivo Técnico & Evidências Fotográficas',
    4: 'Revisão Bilateral & Homologação'
  };

  return (
    <div
      style={{ display: isMinimized ? 'none' : 'block' }}
      className="fixed inset-0 z-[100] font-sans select-none"
      onClick={() => bringToFront(MODAL_ID)}
    >
      {/* Backdrop com Blur Profundo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Caixa do Modal Mobile & Desktop */}
      <div
        className={`fixed inset-0 flex items-center justify-center pointer-events-none ${
          isMaximized ? 'p-0' : 'p-0 sm:p-4'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className={`pointer-events-auto bg-slate-50/95 dark:bg-zinc-950 border border-slate-300/90 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            isMaximized
              ? 'w-screen h-screen rounded-none shadow-none'
              : 'w-full max-w-3xl h-[100dvh] sm:h-[92vh] sm:max-h-[92vh] sm:rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/5'
          }`}
        >
          {/* =================================================================== */}
          {/* CABEÇALHO FIXO (STICKY HEADER) COM BRANDING DO BOMBEIRO E PROFUNDIDADE */}
          {/* =================================================================== */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-xs shrink-0 relative overflow-hidden">
            {/* Asset Visual de Branding: Bombeiro Operacional com Máscara Gradiente */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/3 pointer-events-none bg-cover bg-right bg-no-repeat opacity-25 dark:opacity-40 mix-blend-luminosity"
              style={{
                backgroundImage: "url('/login-bg.png')",
                maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)'
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
              {/* Título e Subtítulo sem Truncamento */}
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 shadow-xs">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 block font-mono">
                    WIZARD DE OPERAÇÃO EM CAMPO • NBR 12962 / 15808
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans leading-tight">
                      Gestão de Trocas & Substituições
                    </h2>
                    <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 font-mono shadow-2xs">
                      Passo {step} de 4
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles de Janela (Cockpit) */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Minimizar */}
                <button
                  type="button"
                  onClick={handleMinimize}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Minimizar janela"
                  aria-label="Minimizar janela"
                >
                  <Minus className="w-4 h-4" />
                </button>

                {/* Maximizar / Restaurar */}
                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title={isMaximized ? 'Restaurar' : 'Maximizar'}
                  aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Fechar */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition cursor-pointer ml-1"
                  title="Fechar modal"
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* STEPPER COMPACTO E DINÂMICO (PROGRESSO MODERNO) */}
            {/* =================================================================== */}
            {!completedTroca && (
              <div className="px-4 sm:px-6 pb-3 pt-1 border-t border-slate-100 dark:border-zinc-900 space-y-2">
                {/* Rótulo da Etapa Corrente */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Etapa {step} de 4: <span className="text-red-600 dark:text-red-400">{stepTitles[step]}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                    {step === 1 && 'Selecione o extintor avariado'}
                    {step === 2 && 'Selecione o extintor novo'}
                    {step === 3 && 'Motivo e fotos reais'}
                    {step === 4 && 'Revise antes de salvar'}
                  </span>
                </div>

                {/* Barra de Progresso Segmentada */}
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                  {[1, 2, 3, 4].map((s) => {
                    const isPassed = step > s;
                    const isCurrent = step === s;
                    return (
                      <div
                        key={s}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPassed
                            ? 'bg-emerald-600'
                            : isCurrent
                            ? 'bg-red-600 shadow-xs ring-1 ring-red-600/30'
                            : 'bg-slate-200 dark:bg-zinc-800'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Badges Compactas em Linha com Scroll Sutil */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                      step === 1
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : selectedRetirado
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {selectedRetirado ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <span>1.</span>}
                    <span>Ativo da Área</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRetirado}
                    onClick={() => selectedRetirado && setStep(2)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border ${
                      step === 2
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : selectedSubstituto
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 disabled:opacity-50'
                    }`}
                  >
                    {selectedSubstituto ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <span>2.</span>}
                    <span>Substituto</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRetirado || !selectedSubstituto}
                    onClick={() => selectedRetirado && selectedSubstituto && setStep(3)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border ${
                      step === 3
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 disabled:opacity-50'
                    }`}
                  >
                    <span>3.</span>
                    <span>Motivo & Fotos</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedRetirado || !selectedSubstituto}
                    onClick={() => selectedRetirado && selectedSubstituto && setStep(4)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition flex items-center gap-1.5 border ${
                      step === 4
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 disabled:opacity-50'
                    }`}
                  >
                    <span>4.</span>
                    <span>Revisão</span>
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* =================================================================== */}
          {/* CONTAINER CENTRAL DE ROLAGEM INDEPENDENTE (COM PROFUNDIDADE) */}
          {/* =================================================================== */}
          <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4 text-slate-800 dark:text-zinc-200">
            {/* Mensagem de Erro Geral */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SUCESSO: TELÃO FINAL PÓS HOMOLOGAÇÃO */}
            {completedTroca ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Substituição Homologada com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                    A operação bilateral foi registrada com rastreabilidade atômica perpétua na base SPCI. O inventário operacional foi atualizado em tempo real.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/50 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-400 block mb-1">
                      Ativo Recolhido da Área:
                    </span>
                    <div className="text-sm font-black text-red-800 dark:text-red-300 font-mono">
                      {formatFriendlyPatrimonio(completedTroca.ativo_retirado_id, completedTroca.ativo_retirado_patrimonio)}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 font-semibold mt-1">
                      {completedTroca.ativo_retirado_modelo} ({completedTroca.ativo_retirado_capacidade})
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400 font-black mt-1">
                      Destino: ESTOQUE MANUTENÇÃO
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block mb-1">
                      Ativo Substituto Instalado:
                    </span>
                    <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 font-mono">
                      {formatFriendlyPatrimonio(completedTroca.ativo_substituto_id, completedTroca.ativo_substituto_patrimonio)}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 font-semibold mt-1">
                      {completedTroca.ativo_substituto_modelo} ({completedTroca.ativo_substituto_capacidade})
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-black mt-1">
                      Local: {completedTroca.setor}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => generateSwapReportPDF(completedTroca)}
                    className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Imprimir Laudo de Troca (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-black text-xs transition cursor-pointer border border-slate-300 dark:border-zinc-700"
                  >
                    Concluir e Fechar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* =================================================================== */}
                {/* ETAPA 1: SELEÇÃO DO ATIVO DA ÁREA */}
                {/* =================================================================== */}
                {step === 1 && (
                  <div className="space-y-3.5">
                    {/* Barra de Busca e Contador */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Extintores Instalados na Planta ({areaAssets.length} Ativos na Área):
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">
                          Localize e selecione o extintor que será removido do suporte para manutenção.
                        </p>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400" />
                        <input
                          type="text"
                          value={searchRetirado}
                          onChange={(e) => setSearchRetirado(e.target.value)}
                          placeholder="Buscar patrimônio, chassi, setor..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Lista com AssetSelectionCard (Zero Truncamento) */}
                    <div className="space-y-2.5">
                      {loadingAssets ? (
                        <div className="py-12 text-center space-y-2 text-slate-600 dark:text-zinc-400">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-600" />
                          <p className="text-xs font-bold font-mono uppercase">Carregando inventário de extintores...</p>
                        </div>
                      ) : filteredAreaAssets.length === 0 ? (
                        <div className="py-12 text-center text-slate-600 dark:text-zinc-400 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl font-semibold p-4">
                          Nenhum extintor na área encontrado com os critérios digitados.
                        </div>
                      ) : (
                        filteredAreaAssets.map((asset) => (
                          <AssetSelectionCard
                            key={asset.id}
                            asset={asset}
                            isSelected={selectedRetirado?.id === asset.id}
                            onSelect={() => setSelectedRetirado(asset)}
                            type="retirado"
                            selectionLabel={selectedRetirado?.id === asset.id ? 'Selecionado p/ Baixa' : 'Selecionar'}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* ETAPA 2: SELEÇÃO DO ATIVO SUBSTITUTO */}
                {/* =================================================================== */}
                {step === 2 && (
                  <div className="space-y-3.5">
                    {/* Resumo do Extintor que está sendo retirado */}
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-900/50 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0">
                        <span className="font-black text-red-700 dark:text-red-300 text-[10px] uppercase tracking-wide block">
                          Retirando do Ponto Operacional:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                            {formatFriendlyPatrimonio(selectedRetirado?.id_ativo, selectedRetirado?.patrimonio)}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-zinc-300 font-bold">
                            • {selectedRetirado?.model} ({selectedRetirado?.peso_capacidade || '6 kg'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 break-words">
                          📍 {selectedRetirado?.location} {selectedRetirado?.sub_location ? `• ${selectedRetirado?.sub_location}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-800 dark:text-red-200 text-xs font-black transition cursor-pointer shrink-0 border border-red-300 dark:border-red-800"
                      >
                        Alterar
                      </button>
                    </div>

                    {/* Cabeçalho do Estoque Substituto */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Extintores Disponíveis no Estoque ({substituteAssets.length} em Pronta-Entrega):
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">
                          Extintores carregados e conformes com status ESTOQUE APLICAÇÃO.
                        </p>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400" />
                        <input
                          type="text"
                          value={searchSubstituto}
                          onChange={(e) => setSearchSubstituto(e.target.value)}
                          placeholder="Buscar chassi, cód, modelo..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Lista com AssetSelectionCard Substituto */}
                    <div className="space-y-2.5">
                      {filteredSubstituteAssets.length === 0 ? (
                        <div className="py-12 text-center text-slate-600 dark:text-zinc-400 border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl font-semibold p-4">
                          Nenhum extintor disponível em ESTOQUE APLICAÇÃO.
                        </div>
                      ) : (
                        filteredSubstituteAssets.map((asset) => {
                          const isSameModel = selectedRetirado && asset.model === selectedRetirado.model;
                          return (
                            <AssetSelectionCard
                              key={asset.id}
                              asset={asset}
                              isSelected={selectedSubstituto?.id === asset.id}
                              onSelect={() => setSelectedSubstituto(asset)}
                              type="substituto"
                              isSameModelAsRetirado={Boolean(isSameModel)}
                              selectionLabel={selectedSubstituto?.id === asset.id ? 'Selecionado p/ Instalação' : 'Selecionar'}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* ETAPA 3: MOTIVO TÉCNICO & EVIDÊNCIAS FOTOGRÁFICAS REAIS */}
                {/* =================================================================== */}
                {step === 3 && (
                  <div className="space-y-4">
                    {/* Seleção do Motivo */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                        Selecione o Motivo Técnico da Substituição:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {MOTIVOS_OPTIONS.map((opt) => {
                          const isSelected = motivo === opt.key;
                          return (
                            <div
                              key={opt.key}
                              onClick={() => handleSelectMotivo(opt.key)}
                              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-red-600 bg-red-50/90 dark:bg-red-950/40 ring-2 ring-red-600/30 shadow-xs'
                                  : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-400 dark:hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-white">
                                  {opt.label}
                                </span>
                                {opt.isCritico && (
                                  <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-[10px] font-black border border-red-300 dark:border-red-800">
                                    Impeditivo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-snug font-medium">
                                {opt.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parecer do Técnico */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1.5">
                        Descrição Complementar / Parecer do Técnico (Opcional):
                      </label>
                      <textarea
                        rows={2}
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Descreva detalhes constatados no extintor ou no suporte do ponto..."
                        className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-2xs"
                      />
                    </div>

                    {/* Evidências Fotográficas Reais */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={cameraInputAntesRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileInputChange(e, 'antes')}
                      />
                      <input
                        type="file"
                        ref={galleryInputAntesRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileInputChange(e, 'antes')}
                      />
                      <input
                        type="file"
                        ref={cameraInputDepoisRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileInputChange(e, 'depois')}
                      />
                      <input
                        type="file"
                        ref={galleryInputDepoisRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileInputChange(e, 'depois')}
                      />

                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Evidências Fotográficas (Auditoria NBR):
                        </label>
                        <span className="text-[10px] text-slate-500 font-bold">
                          Fotos reais para laudo e conformidade
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Foto Antes */}
                        <div className="p-3.5 rounded-2xl border-2 border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between text-center min-h-[170px] shadow-2xs">
                          <span className="text-xs font-black text-slate-900 dark:text-white block mb-1.5">
                            1. Extintor Retirado (Avaria / Vencimento)
                          </span>

                          {processingPhoto === 'antes' ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2 text-red-600">
                              <Loader2 className="w-7 h-7 animate-spin" />
                              <span className="text-xs font-bold font-mono">Comprimindo foto...</span>
                            </div>
                          ) : fotoAntes ? (
                            <div className="space-y-2">
                              <div className="relative group w-full h-32 rounded-xl overflow-hidden border-2 border-red-500/40 bg-black/5 shadow-inner">
                                <img src={fotoAntes} alt="Extintor Retirado" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setZoomPhotoUrl(fotoAntes)}
                                    className="p-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition cursor-pointer shadow-sm"
                                    title="Ampliar Foto"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cameraInputAntesRef.current?.click()}
                                    className="p-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer shadow-sm"
                                    title="Tirar Outra Foto"
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFotoAntes('')}
                                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-sm"
                                    title="Excluir Foto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-1 text-[10px]">
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Foto Anexada
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setFotoAntes('')}
                                  className="text-red-600 hover:underline font-bold cursor-pointer"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 py-2">
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => cameraInputAntesRef.current?.click()}
                                  className="flex-1 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Tirar Foto</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => galleryInputAntesRef.current?.click()}
                                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-white border border-slate-300 dark:border-zinc-700 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Upload className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                                  <span>Galeria</span>
                                </button>
                              </div>
                              <span className="block text-[10px] text-slate-500 font-medium">
                                Fotografe o extintor no suporte ou o motivo da troca
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Foto Depois */}
                        <div className="p-3.5 rounded-2xl border-2 border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between text-center min-h-[170px] shadow-2xs">
                          <span className="text-xs font-black text-slate-900 dark:text-white block mb-1.5">
                            2. Extintor Substituto Instalado
                          </span>

                          {processingPhoto === 'depois' ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2 text-emerald-600">
                              <Loader2 className="w-7 h-7 animate-spin" />
                              <span className="text-xs font-bold font-mono">Comprimindo foto...</span>
                            </div>
                          ) : fotoDepois ? (
                            <div className="space-y-2">
                              <div className="relative group w-full h-32 rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-black/5 shadow-inner">
                                <img src={fotoDepois} alt="Extintor Instalado" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setZoomPhotoUrl(fotoDepois)}
                                    className="p-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition cursor-pointer shadow-sm"
                                    title="Ampliar Foto"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cameraInputDepoisRef.current?.click()}
                                    className="p-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer shadow-sm"
                                    title="Tirar Outra Foto"
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFotoDepois('')}
                                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-sm"
                                    title="Excluir Foto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-1 text-[10px]">
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Foto Anexada
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setFotoDepois('')}
                                  className="text-red-600 hover:underline font-bold cursor-pointer"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 py-2">
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => cameraInputDepoisRef.current?.click()}
                                  className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Tirar Foto</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => galleryInputDepoisRef.current?.click()}
                                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-white border border-slate-300 dark:border-zinc-700 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Upload className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                                  <span>Galeria</span>
                                </button>
                              </div>
                              <span className="block text-[10px] text-slate-500 font-medium">
                                Fotografe o extintor novo instalado e sinalizado
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* ETAPA 4: REVISÃO BILATERAL & CONFIRMAÇÃO ATÔMICA */}
                {/* =================================================================== */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-800 shadow-sm">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                        Resumo da Operação Bilateral:
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Ativo Retirado */}
                        <div className="p-3.5 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900/50 shadow-2xs">
                          <span className="text-[10px] font-black text-red-800 dark:text-red-300 uppercase tracking-wide block mb-1">
                            1. Ativo Recolhido da Área:
                          </span>
                          <div className="font-black text-slate-900 dark:text-white text-sm font-mono">
                            {formatFriendlyPatrimonio(selectedRetirado?.id_ativo, selectedRetirado?.patrimonio)}
                          </div>
                          <div className="text-slate-700 dark:text-zinc-300 text-xs font-bold mt-1">
                            Chassi: {selectedRetirado?.numero_serie || 'N/A'} • {selectedRetirado?.model}
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-400 font-black mt-1.5 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-md inline-block border border-red-300 dark:border-red-800">
                            Novo Status: ESTOQUE MANUTENÇÃO
                          </div>
                        </div>

                        {/* Ativo Substituto */}
                        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-900/50 shadow-2xs">
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide block mb-1">
                            2. Ativo Instalado no Ponto:
                          </span>
                          <div className="font-black text-slate-900 dark:text-white text-sm font-mono">
                            {formatFriendlyPatrimonio(selectedSubstituto?.id_ativo, selectedSubstituto?.patrimonio)}
                          </div>
                          <div className="text-slate-700 dark:text-zinc-300 text-xs font-bold mt-1">
                            Chassi: {selectedSubstituto?.numero_serie || 'N/A'} • {selectedSubstituto?.model}
                          </div>
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-black mt-1.5 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md inline-block border border-emerald-300 dark:border-emerald-800">
                            Novo Status: NA ÁREA (APLICADO)
                          </div>
                        </div>
                      </div>

                      {/* Metadados e Localização Integral */}
                      <div className="mt-4 pt-3 border-t-2 border-slate-200 dark:border-zinc-800 text-xs space-y-1.5">
                        <div className="break-words leading-snug">
                          <strong className="text-slate-900 dark:text-white font-extrabold">Setor Atendido:</strong>{' '}
                          <span className="text-slate-800 dark:text-zinc-200 font-bold">{selectedRetirado?.location} {selectedRetirado?.sub_location ? `• ${selectedRetirado?.sub_location}` : ''}</span>
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-white font-extrabold">Motivo da Substituição:</strong>{' '}
                          <span className="text-red-700 dark:text-red-400 font-black">{formatFriendlyMotivo(motivo)}</span>
                        </div>
                        {descricao && (
                          <div className="break-words">
                            <strong className="text-slate-900 dark:text-white font-extrabold">Observações:</strong>{' '}
                            <span className="text-slate-800 dark:text-zinc-300 font-semibold italic">"{descricao}"</span>
                          </div>
                        )}
                        <div>
                          <strong className="text-slate-900 dark:text-white font-extrabold">Técnico Executor:</strong>{' '}
                          <span className="text-slate-900 dark:text-white font-black">{currentUserName}</span>
                        </div>

                        {/* Evidências Fotográficas no Resumo */}
                        {(fotoAntes || fotoDepois) && (
                          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-zinc-800">
                            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-900 dark:text-white block mb-2">
                              Evidências Fotográficas Anexadas:
                            </span>
                            <div className="grid grid-cols-2 gap-2.5">
                              {fotoAntes ? (
                                <div
                                  onClick={() => setZoomPhotoUrl(fotoAntes)}
                                  className="relative group rounded-xl overflow-hidden border-2 border-red-400 dark:border-red-900/60 h-24 bg-black/5 cursor-pointer shadow-2xs"
                                  title="Clique para ampliar"
                                >
                                  <img src={fotoAntes} alt="Extintor Retirado" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                  <span className="absolute bottom-1 left-1 bg-red-900/90 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded">
                                    1. Retirado
                                  </span>
                                </div>
                              ) : (
                                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-800 h-24 flex items-center justify-center text-[10px] text-slate-400 font-semibold text-center p-2">
                                  Sem foto do extintor retirado
                                </div>
                              )}

                              {fotoDepois ? (
                                <div
                                  onClick={() => setZoomPhotoUrl(fotoDepois)}
                                  className="relative group rounded-xl overflow-hidden border-2 border-emerald-400 dark:border-emerald-900/60 h-24 bg-black/5 cursor-pointer shadow-2xs"
                                  title="Clique para ampliar"
                                >
                                  <img src={fotoDepois} alt="Extintor Substituto" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                  <span className="absolute bottom-1 left-1 bg-emerald-900/90 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded">
                                    2. Substituto
                                  </span>
                                </div>
                              ) : (
                                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-800 h-24 flex items-center justify-center text-[10px] text-slate-400 font-semibold text-center p-2">
                                  Sem foto do extintor substituto
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          {/* =================================================================== */}
          {/* RODAPÉ FIXO (STICKY FOOTER & SAFE AREA) */}
          {/* =================================================================== */}
          {!completedTroca && (
            <footer className="sticky bottom-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-3.5 sm:p-4 pb-safe flex items-center justify-between gap-2.5 shrink-0 shadow-sm">
              {step === 1 && (
                <button
                  type="button"
                  disabled={!selectedRetirado}
                  onClick={() => setStep(2)}
                  className="w-full min-h-[48px] sm:min-h-[52px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-red-600/20 active:scale-98"
                >
                  <span>Avançar para Substituto</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="min-h-[48px] sm:min-h-[52px] px-4 rounded-2xl text-slate-700 dark:text-zinc-300 text-xs font-black bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSubstituto}
                    onClick={() => setStep(3)}
                    className="flex-1 min-h-[48px] sm:min-h-[52px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-red-600/20 active:scale-98"
                  >
                    <span>Avançar para Motivo & Fotos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="min-h-[48px] sm:min-h-[52px] px-4 rounded-2xl text-slate-700 dark:text-zinc-300 text-xs font-black bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 min-h-[48px] sm:min-h-[52px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-600/20 active:scale-98"
                  >
                    <span>Revisar Troca Bilateral</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStep(3)}
                    className="min-h-[48px] sm:min-h-[52px] px-4 rounded-2xl text-slate-700 dark:text-zinc-300 text-xs font-black bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitSwap}
                    className="flex-1 min-h-[48px] sm:min-h-[52px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/25 active:scale-98 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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
              )}
            </footer>
          )}
        </motion.div>
      </div>

      {/* Lightbox / Zoom de Foto Ampliada */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomPhotoUrl}
              alt="Evidência Fotográfica Ampliada"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl border-2 border-white/20 shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomPhotoUrl(null)}
              className="mt-4 px-5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-white/30 shadow-md"
            >
              <X className="w-4 h-4" />
              <span>Fechar Visualização</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
