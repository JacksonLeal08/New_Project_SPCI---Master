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
  Check
} from 'lucide-react';
import { ChecklistItemData } from '@/app/components/ChecklistEditModal';
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

      {/* Barra Superior: Progresso Visual e Ação Rápida */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800 shadow-md' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="space-y-1.5 flex-grow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-red-500 flex items-center gap-1.5">
              <CheckSquare size={13} />
              Quesitos NBR 12962 / 15808
            </span>
            <span className={`text-xs font-black font-mono ${progressPercent === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>
              {checkedCount} de {applicableItems.length} ({progressPercent}%)
            </span>
          </div>

          {/* Barra de Progresso Animada */}
          <div className="w-full h-2 rounded-full bg-slate-800/40 overflow-hidden border border-slate-700/30">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-red-600 to-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Botão de Preenchimento Rápido */}
        {checkedCount < applicableItems.length && (
          <button
            type="button"
            onClick={handleMarkAllConforme}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-450 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles size={13} />
            Marcar Restantes Conforme
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
                  ? 'border-red-500/60 bg-red-950/20' 
                  : isConforme 
                  ? 'border-emerald-500/40 bg-emerald-950/10' 
                  : isDark 
                  ? 'border-slate-800/80 bg-slate-900/60' 
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              {/* Título do Quesito & Tag Impeditivo */}
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[9px] font-bold flex items-center justify-center mt-0.5 border border-slate-700">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-sans font-bold leading-snug text-slate-100">
                    {item.item}
                  </p>
                </div>

                {item.isImpeditivo && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-450 text-[8px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                    <ShieldAlert size={10} />
                    Impeditivo
                  </span>
                )}
              </div>

              {/* Botões de Ação de 48px na Zona de Toque (Fitts' Law) */}
              <div className="grid grid-cols-3 gap-2">
                {/* Conforme */}
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { status: 'Conforme' })}
                  className={`min-h-[48px] rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer active:scale-95 ${
                    isConforme
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                      : isDark
                      ? 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Conforme
                </button>

                {/* Não Conforme */}
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { status: 'Não Conforme' })}
                  className={`min-h-[48px] rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer active:scale-95 ${
                    isReprovado
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                      : isDark
                      ? 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <XCircle size={16} />
                  Não Conforme
                </button>

                {/* N/A */}
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { status: 'NA' })}
                  className={`min-h-[48px] rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border cursor-pointer active:scale-95 ${
                    isNA
                      ? 'bg-slate-600 text-white border-slate-500'
                      : isDark
                      ? 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <MinusCircle size={16} />
                  N/A
                </button>
              </div>

              {/* BLOCO DE NÃO CONFORMIDADE (Idêntico ao Web Admin com 2 Fotos Obrigatórias) */}
              <AnimatePresence>
                {isReprovado && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-3 border-t border-red-500/30 space-y-3 font-sans overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                      <AlertTriangle size={13} className="shrink-0 animate-pulse" />
                      Registro Obrigatório de Ocorrência & Evidências
                    </div>

                    {/* Seleção rápida de falha ou texto livre */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Motivo da Inconformidade:
                      </label>
                      <select
                        value={state.ocorrencia}
                        onChange={(e) => updateItem(item.id, { ocorrencia: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition-colors"
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
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* REGISTRO FOTOGRÁFICO: 2 IMAGENS OBRIGATÓRIAS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-300 font-bold uppercase flex items-center gap-1">
                          <Camera size={12} className="text-red-400" />
                          2 Fotos Comprobatórias (Obrigatórias):
                        </span>
                        <span className={`font-bold ${state.fotoEvidencia1 && state.fotoEvidencia2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {state.fotoEvidencia1 && state.fotoEvidencia2 ? '✓ 2 fotos anexadas' : 'Pendente de fotos'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Slot Foto 1 */}
                        <div className="relative">
                          {state.fotoEvidencia1 ? (
                            <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-video bg-black flex items-center justify-center group">
                              <img src={state.fotoEvidencia1} alt="Evidência 1" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { fotoEvidencia1: null })}
                                className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity border-none cursor-pointer"
                                title="Remover Foto 1"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-mono text-emerald-350">
                                Foto 1 OK
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerUpload(item.id, 1)}
                              disabled={compressingSlot === `${item.id}-1`}
                              className="w-full aspect-video rounded-xl border-2 border-dashed border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/30 flex flex-col items-center justify-center gap-1 text-red-400 font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer p-2 active:scale-95"
                            >
                              {compressingSlot === `${item.id}-1` ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent animate-spin rounded-full" />
                              ) : (
                                <>
                                  <Camera size={16} />
                                  <span>Tirar Foto 1</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Slot Foto 2 */}
                        <div className="relative">
                          {state.fotoEvidencia2 ? (
                            <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-video bg-black flex items-center justify-center group">
                              <img src={state.fotoEvidencia2} alt="Evidência 2" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { fotoEvidencia2: null })}
                                className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity border-none cursor-pointer"
                                title="Remover Foto 2"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-mono text-emerald-350">
                                Foto 2 OK
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerUpload(item.id, 2)}
                              disabled={compressingSlot === `${item.id}-2`}
                              className="w-full aspect-video rounded-xl border-2 border-dashed border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/30 flex flex-col items-center justify-center gap-1 text-red-400 font-mono text-[9px] uppercase font-bold tracking-wider transition-all cursor-pointer p-2 active:scale-95"
                            >
                              {compressingSlot === `${item.id}-2` ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent animate-spin rounded-full" />
                              ) : (
                                <>
                                  <Camera size={16} />
                                  <span>Tirar Foto 2</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {(!state.fotoEvidencia1 || !state.fotoEvidencia2 || !state.ocorrencia.trim()) && (
                        <p className="text-[9px] text-amber-400 font-mono leading-tight">
                          ⚠️ Para registrar Não Conforme, descreva o motivo e anexe as 2 fotos comprobatórias.
                        </p>
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
