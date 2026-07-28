import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnyAsset } from '@/lib/types';
import AppFooter from '@/app/components/AppFooter';
import { useSpci } from '@/app/context/SpciContext';
import { MediaCaptureModal } from '@/app/components/MediaCaptureModal';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Camera, 
  Trash2, 
  AlertTriangle, 
  Tag, 
  CheckSquare, 
  Upload,
  Info,
  X
} from 'lucide-react';

interface AssetInspectionModalProps {
  isOpen: boolean;
  asset: AnyAsset | null;
  onClose: () => void;
  onFinalize: (statusResult: 'Conforme' | 'Não Conforme') => Promise<void>;
  inspectionNotes: string;
  setInspectionNotes: (notes: string) => void;
  photoPatrimonio: string | null;
  photoFrontal: string | null;
  onDemoDrop: (type: 'patrimonio' | 'frontal') => void;
}

export interface ItemInspectionState {
  status: 'Conforme' | 'Não Conforme' | 'NA';
  ocorrencia: string;
  fotoEvidencia1: string | null;
  fotoEvidencia2: string | null;
}

const SUGESTOES_OCORRENCIAS = [
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

export default function AssetInspectionModal({
  isOpen,
  asset,
  onClose,
  onFinalize,
  inspectionNotes,
  setInspectionNotes,
  photoPatrimonio,
  photoFrontal,
  onDemoDrop
}: AssetInspectionModalProps) {
  const { extintorChecklist } = useSpci();

  // Estado para armazenar a resposta e fotos de cada quesito do checklist NBR
  const [itemStates, setItemStates] = useState<{ [key: number]: ItemInspectionState }>({});

  // Estado do Modal Seletor de Câmera vs Galeria
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    title: string;
    onCaptured: (url: string) => void;
  }>({
    isOpen: false,
    title: '',
    onCaptured: () => {}
  });

  useEffect(() => {
    // Reseta os estados de inspeção quando o ativo muda
    setItemStates({});
  }, [asset?.id, isOpen]);

  if (!isOpen || !asset) return null;

  // Requisitos NBR genéricos baseados nas normas brasileiras de incêndio e no checklist ativo
  const getRequirements = () => {
    switch (asset.category) {
      case 'extintores': {
        if (extintorChecklist && extintorChecklist.length > 0) {
          const modelUpper = ((asset as any).model || '').toUpperCase();
          const pesoVal = parseFloat(String((asset as any).peso_capacidade || (asset as any).peso || '0').replace(/\D/g, '')) || 0;
          const isCarreta = modelUpper.includes('CARRETA') || modelUpper.includes('RODAS') || pesoVal >= 20;

          // Mapeia Tipo
          let tipoAgente = 'PQS';
          if (modelUpper.includes('CO2')) tipoAgente = 'CO2';
          else if (modelUpper.includes('AGUA') || modelUpper.includes('ÁGUA') || modelUpper.includes('AP')) tipoAgente = 'AP';
          else if (modelUpper.includes('ESPUMA')) tipoAgente = 'Espuma';
          else if (modelUpper.includes('K')) tipoAgente = 'K';

          const activeItems = extintorChecklist.filter((chk: any) => {
            if (chk.status !== 'Ativado') return false;

            // Valida Tipo
            const tipos = chk.tiposAplicaveis || ['Todos'];
            const matchesTipo = tipos.includes('Todos') || tipos.includes(tipoAgente);

            // Valida Peso
            const pesos = chk.pesosAplicaveis || ['Todos'];
            const matchesPeso =
              pesos.includes('Todos') ||
              (isCarreta && pesos.includes('Carreta / Sobre Rodas')) ||
              (!isCarreta && pesos.includes('Portátil'));

            return matchesTipo && matchesPeso;
          });

          if (activeItems.length > 0) {
            return activeItems.map((x: any) => x.item);
          }
        }
        return [
          "Localização, classe e modelo de extintores conforme projeto de incêndio e pânico",
          "Suporte e Altura de instalação adequada (Máximo 1,60 m do piso)",
          "Equipamento desobstruído e de fácil acesso visual e físico",
          "Sinalização de parede visível e dentro da norma vigente NBR 13434",
          "Sinalização de Piso visível e dentro da norma vigente NBR 13434",
          "Aspecto externo sem dano, amassado, vazamento ou corrosão",
          "Lacre de segurança íntegro e sem violação",
          "Selo Inmetro e Etiquetas de validade/manutenção íntegros e legíveis",
          "Prazo de manutenção anual e teste hidrostático dentro da validade",
          "Indicador de pressão (Manômetro) na faixa verde de operação",
          "Acessórios íntegros (mangueira, difusor, punho, gatilho e válvula)"
        ];
      }
      case 'hidrantes':
        return [
          "Abrigo de hidrante limpo, desobstruído e sinalizado conforme NBR 13714?",
          "Mangueiras enroladas corretamente (aduchadas ou em ziguezague)?",
          "Presença de esguicho regulável e chaves Storz em perfeito estado?",
          "Válvula globo angular sem vazamentos?",
          "Sinalização de solo e parede em conformidade?"
        ];
      case 'sinalizacoes':
        return [
          "Placa fixada na altura correta recomendada pela NBR 13434?",
          "Propriedades fotoluminescentes legíveis e sem desgaste?",
          "Indicação de rota de fuga ou equipamento correta para o layout?",
          "Fixação rígida sem risco de queda em rota de evacuação?"
        ];
      case 'iluminacao':
        return [
          "Bloco autônomo fixado em local desobstruído?",
          "LEDs de sinalização de carga ativos?",
          "Autonomia de bateria atende aos requisitos mínimos de 2 horas?",
          "Botão de teste rápido operacional?"
        ];
      default:
        return [
          "Posição e Localização recomendada conforme normas?",
          "Acesso desobstruído com faixa de segurança?",
          "Sinalização fotoluminescente regulamentar?",
          "Lacre e legibilidade de validade de manutenção?",
          "Integridade estrutural e pintura do equipamento?"
        ];
    }
  };

  const requirements = getRequirements();

  const getItemState = (index: number): ItemInspectionState => {
    return itemStates[index] || {
      status: 'Conforme',
      ocorrencia: '',
      fotoEvidencia1: null,
      fotoEvidencia2: null
    };
  };

  const updateItemState = (index: number, patch: Partial<ItemInspectionState>) => {
    setItemStates((prev) => ({
      ...prev,
      [index]: {
        ...getItemState(index),
        ...patch
      }
    }));
  };

  // Abre o seletor nativo de foto (Câmera ou Galeria) para um slot de foto
  const handleOpenPhotoPicker = (title: string, onCaptured: (url: string) => void) => {
    setPickerState({
      isOpen: true,
      title,
      onCaptured
    });
  };

  const handleClearEvidencePhoto = (index: number, slot: 1 | 2) => {
    if (slot === 1) {
      updateItemState(index, { fotoEvidencia1: null });
    } else {
      updateItemState(index, { fotoEvidencia2: null });
    }
  };

  // Avalia se há alguma inconformidade na lista
  const hasInconformity = requirements.some((_, idx) => getItemState(idx).status === 'Não Conforme');

  const handleConfirmFinalize = (userChoiceStatus?: 'Conforme' | 'Não Conforme') => {
    const finalStatus = userChoiceStatus || (hasInconformity ? 'Não Conforme' : 'Conforme');

    // Monta laudo consolidado de parecer
    let compiledNotes = inspectionNotes ? `${inspectionNotes}\n\n` : '';
    const inconformities = requirements
      .map((req, idx) => ({ req, state: getItemState(idx), idx: idx + 1 }))
      .filter((item) => item.state.status === 'Não Conforme');

    if (inconformities.length > 0) {
      compiledNotes += `⚠️ INCONFORMIDADES REGISTRADAS NO CHECKLIST:\n`;
      inconformities.forEach((inc) => {
        compiledNotes += `- Item ${inc.idx}: ${inc.req}\n  Ocorrência: ${inc.state.ocorrencia || 'Não especificada'}\n`;
        if (inc.state.fotoEvidencia1) compiledNotes += `  Evidência 1: Anexada ✔️\n`;
        if (inc.state.fotoEvidencia2) compiledNotes += `  Evidência 2: Anexada ✔️\n`;
      });
    }

    setInspectionNotes(compiledNotes.trim());
    onFinalize(finalStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 font-mono text-xs select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-5xl lg:max-w-6xl 2xl:max-w-7xl border border-slate-200 bg-white shadow-2xl rounded-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
      >
        <div className="h-1.5 bg-red-600 w-full" aria-hidden="true" />
        
        {/* CABEÇALHO DO MODAL - TEMA CLARO */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center border border-red-200 shadow-inner">
              <CheckSquare className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <span className="bg-red-100 text-red-800 border border-red-200 text-[9.5px] font-black py-0.5 px-2.5 uppercase tracking-widest rounded-md">
                LAUDO DE VISTORIA TÉCNICA NBR
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider mt-0.5 font-['Hanken_Grotesk']">
                INSPEÇÃO EXTINTOR - {asset.idAtivo || asset.id}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-100 px-3.5 py-1.5 transition-all rounded-xl cursor-pointer font-extrabold text-xs shadow-xs"
          >
            DESCARTAR ×
          </button>
        </div>

        {/* CORPO ROLÁVEL DE INSPEÇÃO */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin bg-white">
          
          {/* Informações Básicas do Equipamento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 p-4 bg-slate-50 rounded-xl shadow-xs">
            <div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider block mb-1">Equipamento / Modelo</span>
              <p className="font-black text-slate-900 truncate text-sm">{(asset as any).model || 'Modelo SPCI'}</p>
              <p className="text-[11px] text-slate-700 mt-1 font-bold">Selo/Inmetro: {(asset as any).seloInmetro || 'Isento/NBR'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider block mb-1">Localização</span>
              <p className="font-black text-slate-900 truncate text-sm">{asset.location}</p>
              <p className="text-[11px] text-slate-700 mt-1 font-bold">Subsetor: {asset.subLocation || 'Não especificado'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider block mb-1">Status Atual do Ativo</span>
              <span className={`inline-block font-black uppercase border px-3 py-1 text-[11px] mt-1 rounded-lg shadow-2xs ${
                asset.status === 'Conforme' || asset.status === 'Operacional'
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                  : 'text-red-800 bg-red-100 border-red-300'
              }`}>
                {asset.status}
              </span>
            </div>
          </div>

          {/* LAUDO FOTOGRÁFICO MANDATÓRIO DO EQUIPAMENTO */}
          <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base text-red-600 animate-pulse">📸</span>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-wide">Fotos Obrigatórias do Equipamento *</p>
                <p className="text-[11px] text-slate-700 font-bold font-sans">Capture a foto do Patrimônio/Selo Inmetro e a foto Frontal da instalação.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => handleOpenPhotoPicker('Foto Patrimônio / Selo Inmetro', () => onDemoDrop('patrimonio'))}
                className={`py-3 px-4 text-center border transition-all rounded-xl cursor-pointer text-[10px] font-black flex items-center justify-center gap-2 shadow-xs ${
                  photoPatrimonio 
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900' 
                    : 'bg-white border-slate-300 hover:border-red-600 text-slate-900 hover:bg-red-50/50'
                }`}
              >
                <Camera className="w-4 h-4 text-red-600" />
                <span>{photoPatrimonio ? '✔️ FOTO PATRIMÔNIO ANEXADA' : '📸 FOTO PATRIMÔNIO (CÂMERA / GALERIA)'}</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleOpenPhotoPicker('Foto Frontal da Instalação', () => onDemoDrop('frontal'))}
                className={`py-3 px-4 text-center border transition-all rounded-xl cursor-pointer text-[10px] font-black flex items-center justify-center gap-2 shadow-xs ${
                  photoFrontal 
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900' 
                    : 'bg-white border-slate-300 hover:border-red-600 text-slate-900 hover:bg-red-50/50'
                }`}
              >
                <Camera className="w-4 h-4 text-red-600" />
                <span>{photoFrontal ? '✔️ FOTO FRONTAL ANEXADA' : '📸 FOTO FRONTAL (CÂMERA / GALERIA)'}</span>
              </button>
            </div>
          </div>

          {/* QUESITOS DO CHECKLIST NBR */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2 tracking-wide">
                <CheckSquare className="w-4 h-4 text-red-600" />
                Checklist de Verificação Técnica NBR ({requirements.length} itens)
              </h3>
              <span className="text-[11px] text-slate-700 font-bold font-sans">
                {requirements.filter((_, idx) => getItemState(idx).status === 'Não Conforme').length} inconformidade(s)
              </span>
            </div>

            <div className="space-y-3">
              {requirements.map((reqText, i) => {
                const state = getItemState(i);
                const isNonConform = state.status === 'Não Conforme';

                return (
                  <div
                    key={i}
                    className={`border rounded-xl p-3.5 transition-all space-y-3 shadow-2xs ${
                      isNonConform
                        ? 'border-2 border-red-500 bg-red-50 text-slate-900 shadow-xs'
                        : state.status === 'Conforme'
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-200 bg-slate-50 opacity-90'
                    }`}
                  >
                    {/* TÍTULO E BOTÕES DE OPÇÃO */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs font-sans font-black leading-relaxed text-slate-900 flex-1">
                        <span className="font-mono font-black text-red-700 mr-1.5">{i + 1}-</span>
                        {reqText}
                      </p>

                      {/* OPÇÕES: CONFORME | NÃO CONFORME | N/A */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateItemState(i, { status: 'Conforme' })}
                          className={`px-3 py-1.5 text-[10.5px] font-mono font-black rounded-lg border transition-all flex items-center gap-1 shadow-xs cursor-pointer ${
                            state.status === 'Conforme'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateItemState(i, { status: 'Não Conforme' })}
                          className={`px-3 py-1.5 text-[10.5px] font-mono font-black rounded-lg border transition-all flex items-center gap-1 shadow-xs cursor-pointer ${
                            state.status === 'Não Conforme'
                              ? 'bg-red-600 text-white border-red-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Não conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateItemState(i, { status: 'NA' })}
                          className={`px-2.5 py-1.5 text-[10.5px] font-mono font-black rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                            state.status === 'NA'
                              ? 'bg-slate-700 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>N/A</span>
                        </button>
                      </div>
                    </div>

                    {/* EXPANSÃO DE NÃO CONFORMIDADE E FOTOS DUPLAS */}
                    <AnimatePresence>
                      {isNonConform && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 border-t border-red-200 space-y-3 font-sans"
                        >
                          {/* SELETOR DE OCORRÊNCIA ENCONTRADA */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-mono font-black uppercase text-red-800 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              Selecione ou Descreva a Ocorrência Encontrada *
                            </label>

                            <div className="space-y-2">
                              <select
                                value={SUGESTOES_OCORRENCIAS.includes(state.ocorrencia) ? state.ocorrencia : 'OUTRO'}
                                onChange={(e) => {
                                  if (e.target.value !== 'OUTRO') {
                                    updateItemState(i, { ocorrencia: e.target.value });
                                  }
                                }}
                                className="w-full bg-white border border-red-300 focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none shadow-xs"
                              >
                                <option value="">SELECIONE UMA OPÇÃO DE FALHA</option>
                                {SUGESTOES_OCORRENCIAS.map((sug, idx) => (
                                  <option key={idx} value={sug}>
                                    {sug}
                                  </option>
                                ))}
                                <option value="OUTRO">OUTRA OCORRÊNCIA (DIGITAR MANUALMENTE)</option>
                              </select>

                              <input
                                type="text"
                                value={state.ocorrencia}
                                onChange={(e) => updateItemState(i, { ocorrencia: e.target.value })}
                                placeholder="Descreva os detalhes específicos da não conformidade..."
                                className="w-full bg-white border border-red-300 focus:border-red-600 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none shadow-xs"
                              />
                            </div>
                          </div>

                          {/* CAMPOS DE UPLOAD DUPLO DE FOTOS DE EVIDÊNCIA */}
                          <div className="space-y-1 pt-1">
                            <label className="block text-[10px] font-mono font-black uppercase text-red-800">
                              Fotos de Evidência da Inconformidade (2 Fotos)
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {/* SLOT EVIDÊNCIA FOTO 1 */}
                              <div className="bg-white border border-slate-200 p-2.5 rounded-xl space-y-2 text-center shadow-xs">
                                <span className="text-[9.5px] font-mono font-bold uppercase text-slate-700 block">
                                  Evidência Foto 1
                                </span>

                                {state.fotoEvidencia1 ? (
                                  <div className="relative group rounded-lg overflow-hidden border border-emerald-500">
                                    <img
                                      src={state.fotoEvidencia1}
                                      alt="Evidência 1"
                                      className="w-full h-28 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleClearEvidencePhoto(i, 1)}
                                      className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-md shadow-md cursor-pointer"
                                      title="Remover Foto 1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenPhotoPicker(`Foto Evidência 1 - Quesito ${i + 1}`, (url) =>
                                        updateItemState(i, { fotoEvidencia1: url })
                                      )
                                    }
                                    className="w-full py-4 border-2 border-dashed border-red-300 hover:border-red-600 bg-red-50 hover:bg-red-100 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-red-800 cursor-pointer font-bold"
                                  >
                                    <Camera className="w-5 h-5 text-red-600" />
                                    <span className="text-[10px] font-black">📸 ENVIAR FOTO EVIDÊNCIA 1</span>
                                    <span className="text-[8.5px] font-sans text-slate-600">Câmera ou Galeria</span>
                                  </button>
                                )}
                              </div>

                              {/* SLOT EVIDÊNCIA FOTO 2 */}
                              <div className="bg-white border border-slate-200 p-2.5 rounded-xl space-y-2 text-center shadow-xs">
                                <span className="text-[9.5px] font-mono font-bold uppercase text-slate-700 block">
                                  Evidência Foto 2 (Opcional)
                                </span>

                                {state.fotoEvidencia2 ? (
                                  <div className="relative group rounded-lg overflow-hidden border border-emerald-500">
                                    <img
                                      src={state.fotoEvidencia2}
                                      alt="Evidência 2"
                                      className="w-full h-28 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleClearEvidencePhoto(i, 2)}
                                      className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-md shadow-md cursor-pointer"
                                      title="Remover Foto 2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenPhotoPicker(`Foto Evidência 2 - Quesito ${i + 1}`, (url) =>
                                        updateItemState(i, { fotoEvidencia2: url })
                                      )
                                    }
                                    className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-slate-800 cursor-pointer font-bold"
                                  >
                                    <Camera className="w-5 h-5 text-slate-600" />
                                    <span className="text-[10px] font-black">📸 ENVIAR FOTO EVIDÊNCIA 2</span>
                                    <span className="text-[8.5px] font-sans text-slate-600">Câmera ou Galeria</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notas do Técnico */}
          <div className="space-y-2 pt-2">
            <label className="block text-[10px] font-black uppercase text-slate-800">
              Parecer Rápido / Observações Finais do Técnico
            </label>
            <textarea 
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-red-600 font-mono shadow-xs" 
              placeholder="Descreva observações de integridade, lacres, pressão ou avarias identificadas..."
            />
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 font-mono">
          <div className="flex items-center gap-2 text-[11px] text-slate-800 font-bold">
            <Info className="w-4 h-4 text-slate-600" />
            <span>
              {hasInconformity ? '🔴 Laudo marcado como NÃO CONFORME devido a falhas técnicas.' : '🟢 Todos os itens verificados estão em conformidade.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => handleConfirmFinalize('Não Conforme')}
              className="px-4 py-2 text-[10.5px] uppercase font-black text-red-800 bg-red-100 hover:bg-red-200 border border-red-300 transition-all rounded-xl cursor-pointer active:scale-[0.98] shadow-xs"
            >
              ⚠️ REGISTRAR NÃO CONFORME
            </button>
            <button 
              type="button" 
              onClick={() => handleConfirmFinalize('Conforme')}
              className="px-5 py-2 text-[10.5px] uppercase font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all rounded-xl cursor-pointer active:scale-[0.98] shadow-md border-none"
            >
              🟢 HOMOLOGAR LAUDO NBR
            </button>
          </div>
        </div>
        <AppFooter variant="fixed" />
      </motion.div>

      {/* MODAL SELETOR DE CÂMERA OU GALERIA */}
      <MediaCaptureModal
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState((prev) => ({ ...prev, isOpen: false }))}
        onPhotoCaptured={pickerState.onCaptured}
        title={pickerState.title}
      />
    </div>
  );
}
