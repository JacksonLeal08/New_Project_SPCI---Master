'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Camera, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CheckSquare, 
  Upload, 
  Info,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  Check,
  CheckCheck
} from 'lucide-react';
import { ChecklistItemData } from '@/app/components/ChecklistEditModal';
import { NBRChecklistButtonGroup } from './NBRChecklistButtonGroup';
import { compressImage } from '@/lib/imageCompression';

export interface ItemInspectionState {
  status: 'Conforme' | 'Não Conforme' | 'NA' | null;
  ocorrencia: string;
  fotoEvidencia1: string | null;
  fotoEvidencia2: string | null;
}

export const SUGESTOES_OCORRENCIAS = [
  "Lacre de segurança violado, ausente ou quebrado",
  "Indicador de pressão (Manômetro) fora da faixa verde operacional",
  "Selo do Inmetro ausente, danificado ou com data ilegível",
  "Prazo de manutenção anual ou teste hidrostático (5 anos) vencido",
  "Mangueira de descarga com rachaduras, ressecamento ou obstrução",
  "Suporte de fixação danificado ou altura inadequada (> 1,60 m)",
  "Sinalização de parede ou piso ausente ou fora da NBR 13434",
  "Carcaça do extintor com amassados, corrosão ou marcas de colisão",
  "Pesagem semestral de CO2 vencida ou com perda de carga >10%"
];

export interface DynamicChecklistRendererProps {
  asset: any;
  checklistTemplates: ChecklistItemData[];
  isDark?: boolean;
  onChange: (payload: {
    itemStates: Record<string, ItemInspectionState>;
    isAllChecked: boolean;
    hasNonConformity: boolean;
    impeditivoReprovado: boolean;
    nonConformityCount: number;
    checkedCount: number;
    totalCount: number;
    allEvidencesFilled: boolean;
  }) => void;
}

export const DynamicChecklistRenderer: React.FC<DynamicChecklistRendererProps> = ({
  asset,
  checklistTemplates,
  isDark = true,
  onChange
}) => {
  const [itemStates, setItemStates] = useState<Record<string, ItemInspectionState>>({});
  const [compressingSlot, setCompressingSlot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<{ itemId: string; slot: 1 | 2 } | null>(null);

  // 1. Filtra os itens aplicáveis ao extintor específico com base no Agente Extintor e Porte
  const applicableItems = useMemo(() => {
    if (!checklistTemplates || checklistTemplates.length === 0) return [];

    const modelUpper = String(asset?.model || asset?.modelo || '').toUpperCase();
    const rawPeso = String(asset?.peso_capacidade || asset?.peso || '0');
    const pesoVal = parseFloat(rawPeso.replace(/\D/g, '')) || 0;
    const isCarreta = modelUpper.includes('CARRETA') || modelUpper.includes('RODAS') || pesoVal >= 20;

    let tipoAgente = 'PQS';
    if (modelUpper.includes('CO2')) tipoAgente = 'CO2';
    else if (modelUpper.includes('AGUA') || modelUpper.includes('ÁGUA') || modelUpper.includes('AP')) tipoAgente = 'AP';
    else if (modelUpper.includes('ESPUMA')) tipoAgente = 'Espuma';
    else if (modelUpper.includes('K')) tipoAgente = 'K';

    return checklistTemplates.filter(chk => {
      if (chk.status !== 'Ativado') return false;

      const tipos = (chk as any).tiposAplicaveis || (chk as any).tipos_aplicaveis || ['Todos'];
      const matchesTipo = tipos.includes('Todos') || tipos.includes(tipoAgente);

      const pesos = (chk as any).pesosAplicaveis || (chk as any).pesos_aplicaveis || ['Todos'];
      const matchesPeso =
        pesos.includes('Todos') ||
        (isCarreta && pesos.includes('Carreta / Sobre Rodas')) ||
        (!isCarreta && pesos.includes('Portátil'));

      return matchesTipo && matchesPeso;
    });
  }, [asset, checklistTemplates]);

  // Atualização de estado de um item específico
  const updateItem = (itemId: string, patch: Partial<ItemInspectionState>) => {
    setItemStates(prev => {
      const current = prev[itemId] || {
        status: null,
        ocorrencia: '',
        fotoEvidencia1: null,
        fotoEvidencia2: null
      };
      return {
        ...prev,
        [itemId]: { ...current, ...patch }
      };
    });
  };

  // Botão Rápido: Marcar todos os não preenchidos como Conforme
  const handleMarkAllConforme = () => {
    setItemStates(prev => {
      const next = { ...prev };
      applicableItems.forEach(item => {
        if (!next[item.id] || next[item.id].status === null) {
          next[item.id] = {
            status: 'Conforme',
            ocorrencia: '',
            fotoEvidencia1: null,
            fotoEvidencia2: null
          };
        }
      });
      return next;
    });
  };

  // Trata upload e compressão automática de imagem para um dos slots de evidência
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlotRef.current) return;

    const { itemId, slot } = activeSlotRef.current;
    const slotKey = `${itemId}-${slot}`;
    setCompressingSlot(slotKey);

    try {
      // Compressão client-side: máx 800px e JPEG 75%
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
      if (slot === 1) {
        updateItem(itemId, { fotoEvidencia1: compressed });
      } else {
        updateItem(itemId, { fotoEvidencia2: compressed });
      }
    } catch (err) {
      console.error('[DynamicChecklistRenderer] Erro na compressão da imagem:', err);
      alert('Falha ao processar a foto. Tente novamente com outra imagem.');
    } finally {
      setCompressingSlot(null);
      activeSlotRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (itemId: string, slot: 1 | 2) => {
    activeSlotRef.current = { itemId, slot };
    fileInputRef.current?.click();
  };

  // Computa métricas e comunica ao componente pai
  useEffect(() => {
    const totalCount = applicableItems.length;
    let checkedCount = 0;
    let nonConformityCount = 0;
    let impeditivoReprovado = false;
    let allEvidencesFilled = true;

    applicableItems.forEach(item => {
      const st = itemStates[item.id];
      if (st && st.status !== null) {
        checkedCount++;
        if (st.status === 'Não Conforme') {
          nonConformityCount++;
          if (item.isImpeditivo) {
            impeditivoReprovado = true;
          }
          // Verifica se as duas fotos e a ocorrência foram preenchidas
          if (!st.ocorrencia?.trim() || !st.fotoEvidencia1 || !st.fotoEvidencia2) {
            allEvidencesFilled = false;
          }
        }
      }
    });

    const isAllChecked = totalCount > 0 && checkedCount === totalCount;
    const hasNonConformity = nonConformityCount > 0;

    onChange({
      itemStates,
      isAllChecked,
      hasNonConformity,
      impeditivoReprovado,
      nonConformityCount,
      checkedCount,
      totalCount,
      allEvidencesFilled
    });
  }, [itemStates, applicableItems, onChange]);

  const checkedCount = applicableItems.filter(i => itemStates[i.id]?.status !== null && itemStates[i.id]?.status !== undefined).length;
  const progressPercent = applicableItems.length > 0 ? Math.round((checkedCount / applicableItems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Input oculto compartilhado para captura/upload de fotos das evidências */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Barra Superior: Progresso Visual e Ação Rápida no padrão Base44 / Clean UI */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-200 ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200/90'
      }`}>
        <div className="space-y-2 flex-grow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <CheckSquare size={14} />
              Quesitos NBR 12962 / 15808
            </span>
            <span className={`text-xs font-black font-mono transition-all ${progressPercent === 100 ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
              {checkedCount} de {applicableItems.length} respondidos ({progressPercent}%)
            </span>
          </div>

          {/* Barra de Progresso Segmentada Moderna */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            isDark ? 'bg-zinc-800' : 'bg-slate-200'
          }`}>
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-red-600 via-rose-500 to-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Botão de Preenchimento Rápido Corporativo */}
        {checkedCount < applicableItems.length && (
          <button
            type="button"
            onClick={handleMarkAllConforme}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-98 shrink-0 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 shadow-xs"
          >
            <CheckCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Marcar Restantes Conforme</span>
          </button>
        )}
      </div>

      {/* Lista de Quesitos Dinâmicos */}
      <div className="space-y-3">
        {applicableItems.map((item, idx) => {
          const state = itemStates[item.id] || {
            status: null,
            ocorrencia: '',
            fotoEvidencia1: null,
            fotoEvidencia2: null
          };
          const isReprovado = state.status === 'Não Conforme';
          const isConforme = state.status === 'Conforme';
          const isNA = state.status === 'NA';

          return (
            <div 
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                isReprovado 
                  ? isDark 
                    ? 'border-red-500/60 bg-red-950/25' 
                    : 'border-2 border-red-400 bg-white shadow-md' 
                  : isConforme 
                  ? isDark 
                    ? 'border-emerald-500/40 bg-emerald-950/10' 
                    : 'border-emerald-400/80 bg-emerald-50/40 shadow-xs'
                  : isDark 
                  ? 'border-slate-800/80 bg-slate-900/60' 
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              {/* Título do Quesito & Tag Impeditivo */}
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full font-mono text-[9px] font-black flex items-center justify-center mt-0.5 border ${
                    isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300 font-black'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className={`text-xs font-sans font-bold leading-snug ${
                    isReprovado 
                      ? isDark ? 'text-red-200' : 'text-red-950 font-black'
                      : isConforme 
                      ? isDark ? 'text-emerald-200' : 'text-emerald-950 font-extrabold'
                      : isDark ? 'text-slate-100' : 'text-slate-900 font-extrabold'
                  }`}>
                    {item.item}
                  </p>
                </div>

                {item.isImpeditivo && (
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-md border text-[8px] font-mono font-black uppercase tracking-widest flex items-center gap-1 ${
                    isDark ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-red-100 border-red-300 text-red-700'
                  }`}>
                    <ShieldAlert size={10} />
                    Impeditivo
                  </span>
                )}
              </div>

              {/* Segmented Control / Action Toggle Group NBR com Háptica */}
              <NBRChecklistButtonGroup
                itemId={item.id}
                status={state.status}
                onChange={(newStatus) => updateItem(item.id, { status: newStatus })}
              />

              {/* BLOCO DE NÃO CONFORMIDADE (Alto Contraste Mobile e 2 Fotos Obrigatórias) */}
              <AnimatePresence>
                {isReprovado && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-4 pt-3.5 border-t space-y-3 font-sans overflow-hidden ${
                      isDark ? 'border-red-500/30' : 'border-red-300'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider ${
                      isDark ? 'text-red-400' : 'text-red-700'
                    }`}>
                      <AlertTriangle size={13} className="shrink-0 animate-pulse" />
                      Registro Obrigatório de Ocorrência & Evidências
                    </div>

                    {/* Seleção rápida de falha ou texto livre */}
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-sans font-black uppercase tracking-wider block ${
                        isDark ? 'text-slate-300' : 'text-slate-900'
                      }`}>
                        Motivo da Inconformidade:
                      </label>
                      <select
                        value={state.ocorrencia}
                        onChange={(e) => updateItem(item.id, { ocorrencia: e.target.value })}
                        className={`w-full p-2.5 rounded-xl text-xs focus:outline-none focus:border-red-500 transition-colors font-medium ${
                          isDark 
                            ? 'bg-slate-900 border border-slate-750 text-slate-200' 
                            : 'bg-white border-2 border-slate-300 text-slate-900 shadow-xs'
                        }`}
                      >
                        <option value="">-- Selecione uma ocorrência padrão --</option>
                        {SUGESTOES_OCORRENCIAS.map((sug, sIdx) => (
                          <option key={sIdx} value={sug}>{sug}</option>
                        ))}
                      </select>

                      <input 
                        type="text"
                        placeholder="Ou digite a descrição detalhada da falha..."
                        value={state.ocorrencia}
                        onChange={(e) => updateItem(item.id, { ocorrencia: e.target.value })}
                        className={`w-full p-2.5 rounded-xl text-xs focus:outline-none focus:border-red-500 transition-colors font-medium ${
                          isDark 
                            ? 'bg-slate-900 border border-slate-750 text-slate-100 placeholder:text-slate-500' 
                            : 'bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
                        }`}
                      />
                    </div>

                    {/* REGISTRO FOTOGRÁFICO: 2 IMAGENS OBRIGATÓRIAS */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-sans font-black uppercase flex items-center gap-1.5 ${
                          isDark ? 'text-slate-300' : 'text-slate-900'
                        }`}>
                          <Camera size={13} className={isDark ? 'text-red-400' : 'text-red-600'} />
                          2 Fotos Comprobatórias (Obrigatórias):
                        </span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[9px] ${
                          state.fotoEvidencia1 && state.fotoEvidencia2
                            ? isDark ? 'bg-emerald-500/20 text-emerald-350' : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-black'
                            : isDark ? 'bg-amber-500/20 text-amber-350' : 'bg-amber-100 text-amber-950 border border-amber-300 font-black'
                        }`}>
                          {state.fotoEvidencia1 && state.fotoEvidencia2 ? '✓ 2 fotos anexadas' : 'Pendente de fotos'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Slot Foto 1 */}
                        <div className="relative">
                          {state.fotoEvidencia1 ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/60 aspect-video bg-black flex items-center justify-center group shadow-xs">
                              <img src={state.fotoEvidencia1} alt="Evidência 1" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { fotoEvidencia1: null })}
                                className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity border-none cursor-pointer"
                                title="Remover Foto 1"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-mono text-emerald-300 font-bold">
                                Foto 1 OK
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerUpload(item.id, 1)}
                              disabled={compressingSlot === `${item.id}-1`}
                              className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 font-sans text-[9.5px] uppercase font-black tracking-wider transition-all cursor-pointer p-2 active:scale-95 ${
                                isDark 
                                  ? 'border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/30 text-red-400' 
                                  : 'border-red-400 hover:border-red-600 bg-white hover:bg-red-50/60 text-red-700 shadow-2xs'
                              }`}
                            >
                              {compressingSlot === `${item.id}-1` ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
                              ) : (
                                <>
                                  <Camera size={16} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                  <span>Tirar Foto 1</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Slot Foto 2 */}
                        <div className="relative">
                          {state.fotoEvidencia2 ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/60 aspect-video bg-black flex items-center justify-center group shadow-xs">
                              <img src={state.fotoEvidencia2} alt="Evidência 2" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { fotoEvidencia2: null })}
                                className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity border-none cursor-pointer"
                                title="Remover Foto 2"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-mono text-emerald-300 font-bold">
                                Foto 2 OK
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerUpload(item.id, 2)}
                              disabled={compressingSlot === `${item.id}-2`}
                              className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 font-sans text-[9.5px] uppercase font-black tracking-wider transition-all cursor-pointer p-2 active:scale-95 ${
                                isDark 
                                  ? 'border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/30 text-red-400' 
                                  : 'border-red-400 hover:border-red-600 bg-white hover:bg-red-50/60 text-red-700 shadow-2xs'
                              }`}
                            >
                              {compressingSlot === `${item.id}-2` ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent animate-spin rounded-full" />
                              ) : (
                                <>
                                  <Camera size={16} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                  <span>Tirar Foto 2</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {(!state.fotoEvidencia1 || !state.fotoEvidencia2 || !state.ocorrencia.trim()) && (
                        <div className={`p-2.5 rounded-xl border text-[10.5px] font-sans font-bold flex items-center gap-2 ${
                          isDark 
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' 
                            : 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
                        }`}>
                          <AlertTriangle size={15} className={`shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span>Para registrar Não Conforme, descreva o motivo e anexe as 2 fotos comprobatórias.</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
