import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnyAsset } from '@/lib/types';
import AppFooter from '@/app/components/AppFooter';
import { useSpci } from '@/app/context/SpciContext';
import { MediaCaptureModal } from '@/app/components/MediaCaptureModal';
import { NormasExtintorModal } from '@/app/components/NormasExtintorModal';
import { DEFAULT_EXTINTOR_CHECKLIST } from './ChecklistEditModal';
import { getAssetStockItemsAction, moveAssetStatusAction } from '@/app/actions/assetStockActions';
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
  X,
  BookOpen,
  RotateCcw,
  Save,
  ShieldAlert,
  Search,
  Scale,
  Clock,
  Calendar,
  ShieldCheck,
  Ban,
  ArrowRight,
  Sparkles,
  AlertCircle
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
  status: 'Conforme' | 'Não Conforme' | 'NA' | null;
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

// Helper para cálculo regressivo de dias até o vencimento
export const calculateDaysRemaining = (expiryDateStr?: string | null): number | null => {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expiryDate: Date;
  if (expiryDateStr.length === 7) {
    const [y, m] = expiryDateStr.split('-').map(Number);
    expiryDate = new Date(y, m - 1, 1);
  } else if (expiryDateStr.includes('/')) {
    const parts = expiryDateStr.split('/');
    if (parts.length === 3) {
      expiryDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else {
      expiryDate = new Date(expiryDateStr);
    }
  } else {
    expiryDate = new Date(expiryDateStr);
  }

  if (isNaN(expiryDate.getTime())) return null;
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper para formatar e extrair a capacidade/peso do extintor
export const getAssetCapacityLabel = (ext: any): string => {
  if (ext?.peso_capacidade) {
    const raw = String(ext.peso_capacidade).trim();
    if (!raw.toUpperCase().includes('KG') && !raw.toUpperCase().includes('L') && !isNaN(Number(raw))) {
      return `${raw} KG`;
    }
    return raw.toUpperCase();
  }
  if (ext?.peso) {
    const raw = String(ext.peso).trim();
    if (!raw.toUpperCase().includes('KG') && !raw.toUpperCase().includes('L') && !isNaN(Number(raw))) {
      return `${raw} KG`;
    }
    return raw.toUpperCase();
  }
  const model = String(ext?.model || ext?.modelo || '');
  const match = model.match(/(\d+[\.,]?\d*)\s*(kg|k|l|litros?)/i);
  if (match) {
    const unit = match[2].toLowerCase().startsWith('l') ? 'L' : 'KG';
    return `${match[1]} ${unit}`.toUpperCase();
  }
  return 'PADRÃO';
};

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
  const { extintorChecklist, extintores, setExtintores, updateAsset } = useSpci();

  // Estado para armazenar a resposta e fotos de cada quesito do checklist NBR
  const [itemStates, setItemStates] = useState<{ [key: number]: ItemInspectionState }>({});

  // Estado do Modal de Normas Aplicáveis NBR
  const [normasModalOpen, setNormasModalOpen] = useState(false);

  // Mensagem de feedback ao gravar dados
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // ESTADOS DO FLUXO DE SUBSTITUIÇÃO IMPEDITIVA EM CAMPO
  const [substituicaoOpcao, setSubstituicaoOpcao] = useState<'SIM' | 'NAO' | null>(null);
  const [substitutoSearchTerm, setSubstitutoSearchTerm] = useState('');
  const [selectedSubstituto, setSelectedSubstituto] = useState<any | null>(null);
  const [stockAssets, setStockAssets] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Campos de novo cadastro quando o ativo não é encontrado no Estoque
  const [novoPatrimonio, setNovoPatrimonio] = useState('');
  const [novoChassi, setNovoChassi] = useState('');
  const [novoSeloInmetro, setNovoSeloInmetro] = useState('');
  const [novoModelo, setNovoModelo] = useState('PQS 6kg (Portátil)');
  const [novaValidadeRecarga, setNovaValidadeRecarga] = useState('');

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

  // Carrega os ativos da tabela de estoque (assets) para disponibilizar todos os 51+ extintores
  useEffect(() => {
    if (isOpen) {
      setLoadingStock(true);
      getAssetStockItemsAction('ESTOQUE APLICAÇÃO')
        .then((res) => {
          if (res.success && res.assets && res.assets.length > 0) {
            setStockAssets(res.assets);
          }
        })
        .catch((err) => console.warn('[AssetInspectionModal] Erro ao carregar estoque:', err))
        .finally(() => setLoadingStock(false));
    }
  }, [isOpen, substituicaoOpcao]);

  useEffect(() => {
    // Reseta os estados de inspeção e substituição quando o ativo muda
    setItemStates({});
    setSubstituicaoOpcao(null);
    setSubstitutoSearchTerm('');
    setSelectedSubstituto(null);
    setNovoPatrimonio('');
    setNovoChassi('');
    setNovoSeloInmetro('');
    setNovoModelo('PQS 6kg (Portátil)');
    setNovaValidadeRecarga('');
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
            const tipos = chk.tiposAplicaveis || chk.tipos_aplicaveis || ['Todos'];
            const matchesTipo = tipos.includes('Todos') || tipos.includes(tipoAgente);

            // Valida Peso
            const pesos = chk.pesosAplicaveis || chk.pesos_aplicaveis || ['Todos'];
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
      status: null,
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

  // Avalia inconformidades impeditivas (caráter de substituição imediata)
  const impeditivoInconformities = requirements
    .map((reqText) => {
      const chkObj = extintorChecklist?.find((c: any) => c.item === reqText) || DEFAULT_EXTINTOR_CHECKLIST.find(c => c.item === reqText);
      const isImp = chkObj ? !!(chkObj.is_impeditivo ?? chkObj.isImpeditivo) : false;
      const idx = requirements.indexOf(reqText);
      return { reqText, isImp, state: getItemState(idx) };
    })
    .filter(x => x.isImp && x.state.status === 'Não Conforme');

  const hasImpeditivoNonConformity = asset.category === 'extintores' && impeditivoInconformities.length > 0;

  // Limpa todas as opções selecionadas, notas e pareceres
  const handleClearAll = () => {
    setItemStates({});
    setInspectionNotes('');
    setSubstituicaoOpcao(null);
    setSubstitutoSearchTerm('');
    setSelectedSubstituto(null);
  };

  // Grava os dados atualmente inseridos
  const handleSaveDraft = () => {
    let compiledNotes = inspectionNotes ? `${inspectionNotes}\n\n` : '';
    const inconformities = requirements
      .map((req, idx) => ({ req, state: getItemState(idx), idx: idx + 1 }))
      .filter((item) => item.state.status === 'Não Conforme');

    if (inconformities.length > 0) {
      compiledNotes += `⚠️ INCONFORMIDADES REGISTRADAS NO CHECKLIST:\n`;
      inconformities.forEach((inc) => {
        compiledNotes += `- Item ${inc.idx}: ${inc.req}\n  Ocorrência: ${inc.state.ocorrencia || 'Não especificada'}\n`;
      });
    }

    setInspectionNotes(compiledNotes.trim());
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const handleConfirmFinalize = async (userChoiceStatus?: 'Conforme' | 'Não Conforme') => {
    const finalStatus = userChoiceStatus || (hasInconformity ? 'Não Conforme' : 'Conforme');

    // Validação de substituição impeditiva obrigatória
    if (hasImpeditivoNonConformity && substituicaoOpcao === null) {
      alert('Atenção: Existem não conformidades de caráter IMPEDITIVO neste extintor! Por favor, informe no final do formulário se o equipamento foi substituído no local antes de homologar.');
      return;
    }

    if (hasImpeditivoNonConformity && substituicaoOpcao === 'SIM' && !selectedSubstituto && !novoPatrimonio.trim()) {
      alert('Por favor, selecione um extintor do estoque ou informe o número do novo patrimônio para registrar a substituição.');
      return;
    }

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

    // Processamento da Substituição de Ativo Impeditivo
    if (hasImpeditivoNonConformity && substituicaoOpcao === 'SIM') {
      const assetAny = asset as any;
      if (selectedSubstituto) {
        const substCap = selectedSubstituto._capacityLabel || getAssetCapacityLabel(selectedSubstituto);
        const substPat = selectedSubstituto.numero_patrimonio || selectedSubstituto.idAtivo || selectedSubstituto.id;
        const oldPat = assetAny.numero_patrimonio || assetAny.idAtivo || asset.id;

        compiledNotes += `\n\n🔄 SUBSTITUIÇÃO DE ATIVO EM CAMPO (ESTOQUE):\n- Extintor Retirado (Não Conforme): ${oldPat}\n- Extintor Substituto Instalado: ${substPat} (${selectedSubstituto.model || selectedSubstituto.modelo || 'SPCI'}, Capacidade: ${substCap}, Selo Inmetro: ${selectedSubstituto.seloInmetro || selectedSubstituto.selo_inmetro || 'Isento'})\n- Local de Instalação Assumido: ${asset.location || 'Área Industrial'}${asset.subLocation ? ` - ${asset.subLocation}` : ''}`;

        // 1. Aloca o extintor do estoque na localização do ativo na planta e marca como NA ÁREA (APLICADO)
        if (updateAsset) {
          updateAsset('extintores', {
            ...selectedSubstituto,
            location: asset.location || 'Área Industrial',
            subLocation: asset.subLocation || '',
            area: assetAny.area || 'Planta Principal',
            projeto: assetAny.projeto || 'SPCI',
            status: 'Conforme',
            tipo_movimentacao: 'na_area_aplicado',
            status_estoque: 'NA ÁREA (APLICADO)'
          });
        }

        // 2. Transfere o extintor retirado para ESTOQUE (AG. MANUT.)
        if (updateAsset) {
          updateAsset('extintores', {
            ...assetAny,
            status: 'Não Conforme',
            tipo_movimentacao: 'estoque_ag_manut',
            status_estoque: 'ESTOQUE (AG. MANUT.)',
            location: 'ALMOXARIFADO / ESTOQUE',
            subLocation: 'AGUARDANDO MANUTENÇÃO'
          });
        }

        // Trilha de auditoria na tabela ativo_movimentacoes
        try {
          moveAssetStatusAction(
            selectedSubstituto.id || selectedSubstituto.idAtivo,
            substPat,
            'NA ÁREA (APLICADO)' as any,
            selectedSubstituto.status_estoque || 'ESTOQUE APLICAÇÃO',
            `Instalação na área (${asset.location || 'Planta'}) em substituição ao extintor ${oldPat}`,
            'Inspetor de Campo'
          );
          moveAssetStatusAction(
            asset.id,
            oldPat,
            'ESTOQUE MANUTENÇÃO',
            assetAny.status_estoque || 'NA ÁREA (APLICADO)',
            'Retirada de campo por inconformidade impeditiva na inspeção',
            'Inspetor de Campo'
          );
        } catch (mErr) {
          console.warn('[handleConfirmFinalize] Aviso ao gravar auditoria de movimentação:', mErr);
        }
      } else if (novoPatrimonio.trim()) {
        const oldPat = assetAny.numero_patrimonio || assetAny.idAtivo || asset.id;
        compiledNotes += `\n\n🔄 SUBSTITUIÇÃO DE ATIVO EM CAMPO (NOVO CADASTRO):\n- Extintor Retirado (Não Conforme): ${oldPat}\n- Novo Extintor Instalado na Área: ${novoPatrimonio} (Modelo: ${novoModelo}, Selo Inmetro: ${novoSeloInmetro || 'Isento'})\n- Local de Instalação Assumido: ${asset.location || 'Área Industrial'}${asset.subLocation ? ` - ${asset.subLocation}` : ''}`;

        // Cria o novo ativo e insere no estado de extintores
        const newAssetObj: any = {
          id: `ext-novo-${Date.now()}`,
          idAtivo: novoPatrimonio.trim(),
          numero_patrimonio: novoPatrimonio.trim(),
          chassi: novoChassi.trim() || `CH-${Date.now().toString().slice(-5)}`,
          selo_inmetro: novoSeloInmetro.trim() || 'NBR-ISENTO',
          seloInmetro: novoSeloInmetro.trim() || 'NBR-ISENTO',
          modelo: novoModelo,
          model: novoModelo,
          peso_capacidade: novoModelo.includes('6kg') ? '6kg' : novoModelo.includes('4kg') ? '4kg' : '10L',
          data_ultima_recarga: novaValidadeRecarga || new Date().toISOString().split('T')[0],
          area: assetAny.area || 'Planta Principal',
          projeto: assetAny.projeto || 'SPCI',
          location: asset.location || 'Área Industrial',
          subLocation: asset.subLocation || '',
          status: 'Conforme',
          category: 'extintores',
          tipo_movimentacao: 'na_area_aplicado',
          status_estoque: 'NA ÁREA (APLICADO)'
        };

        if (setExtintores) {
          setExtintores((prev: any[]) => [newAssetObj, ...prev]);
        }

        // Transfere o extintor avariado para ESTOQUE (AG. MANUT.)
        if (updateAsset) {
          updateAsset('extintores', {
            ...assetAny,
            status: 'Não Conforme',
            tipo_movimentacao: 'estoque_ag_manut',
            status_estoque: 'ESTOQUE (AG. MANUT.)',
            location: 'ALMOXARIFADO / ESTOQUE',
            subLocation: 'AGUARDANDO MANUTENÇÃO'
          });
        }

        try {
          moveAssetStatusAction(
            asset.id,
            oldPat,
            'ESTOQUE MANUTENÇÃO',
            assetAny.status_estoque || 'NA ÁREA (APLICADO)',
            'Retirada de campo por inconformidade impeditiva na inspeção',
            'Inspetor de Campo'
          );
        } catch (mErr) {}
      }
    } else if (hasImpeditivoNonConformity && substituicaoOpcao === 'NAO') {
      compiledNotes += `\n\n⚠️ ALERTA: O extintor impeditivo foi retirado da área e NÃO foi substituído no momento da inspeção. Área encontra-se desprovida de extintor!`;
      
      const assetAny = asset as any;
      const oldPat = assetAny.numero_patrimonio || assetAny.idAtivo || asset.id;
      if (updateAsset) {
        updateAsset('extintores', {
          ...assetAny,
          status: 'Não Conforme',
          tipo_movimentacao: 'estoque_ag_manut',
          status_estoque: 'ESTOQUE (AG. MANUT.)',
          location: 'ALMOXARIFADO / ESTOQUE',
          subLocation: 'AGUARDANDO MANUTENÇÃO'
        });
      }

      try {
        moveAssetStatusAction(
          asset.id,
          oldPat,
          'ESTOQUE MANUTENÇÃO',
          assetAny.status_estoque || 'NA ÁREA (APLICADO)',
          'Retirada de campo por inconformidade impeditiva (sem substituição)',
          'Inspetor de Campo'
        );
      } catch (mErr) {}
    }

    setInspectionNotes(compiledNotes.trim());
    await onFinalize(finalStatus);
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
          <div className="flex items-center gap-2">
            {asset.category === 'extintores' && (
              <button
                type="button"
                onClick={() => setNormasModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                title="Consultar Normas ABNT NBR do Ativo Extintor"
              >
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>Normas Aplicáveis</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-100 px-3.5 py-1.5 transition-all rounded-xl cursor-pointer font-extrabold text-xs shadow-xs"
            >
              DESCARTAR ×
            </button>
          </div>
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
              <div className="flex items-center gap-3 text-[11px] font-sans">
                <span className="text-slate-600 font-bold">
                  {requirements.filter((_, idx) => getItemState(idx).status !== null).length} de {requirements.length} verificados
                </span>
                {requirements.filter((_, idx) => getItemState(idx).status === 'Não Conforme').length > 0 && (
                  <span className="text-red-600 font-black bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    {requirements.filter((_, idx) => getItemState(idx).status === 'Não Conforme').length} inconformidade(s)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {requirements.map((reqText, i) => {
                const state = getItemState(i);
                const isNonConform = state.status === 'Não Conforme';
                const chkObj = extintorChecklist?.find((c: any) => c.item === reqText) || DEFAULT_EXTINTOR_CHECKLIST.find(c => c.item === reqText);
                const isImpeditivo = asset.category === 'extintores' && (chkObj ? !!(chkObj.is_impeditivo ?? chkObj.isImpeditivo) : false);

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
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-sans font-black leading-relaxed text-slate-900">
                          <span className="font-mono font-black text-red-700 mr-1.5">{i + 1}-</span>
                          {reqText}
                        </p>
                        {isImpeditivo && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 font-mono text-[9px] font-black shadow-xs">
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              Impeditivo Permanecer na Área
                            </span>
                          </div>
                        )}
                      </div>

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
                          {/* BANNER DE AVISO IMPEDITIVO SE FOR ITEM IMPEDITIVO REPROVADO */}
                          {isImpeditivo && (
                            <div className="bg-red-700 text-white p-3 rounded-xl flex items-center gap-2.5 font-mono text-[11px] font-black shadow-sm border border-red-800">
                              <ShieldAlert className="w-5 h-5 text-yellow-300 shrink-0" />
                              <span>INCONFORMIDADE CRÍTICA IMPEDITIVA: Esta falha impede a permanência do extintor na área. O equipamento deve ser substituído imediatamente!</span>
                            </div>
                          )}

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

          {/* CARD DE SUBSTITUIÇÃO DE ATIVO IMPEDITIVO EM CAMPO */}
          {hasImpeditivoNonConformity && (
            <div className="border-2 border-red-500 bg-red-50/90 p-4.5 rounded-2xl space-y-4 shadow-md font-sans transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-xs">
                  🚨
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-red-950 font-mono tracking-wider flex items-center gap-2">
                    SUBSTITUIÇÃO DE ATIVO IMPEDITIVO EM CAMPO
                  </h4>
                  <p className="text-[11px] text-red-800 font-bold mt-0.5">
                    Foram encontradas não conformidades que **impedem a permanência deste extintor na área**.
                  </p>
                </div>
              </div>

              {/* PERGUNTA DE SUBSTITUIÇÃO */}
              <div className="bg-white p-4 border border-red-200 rounded-xl space-y-2.5 shadow-xs">
                <label className="block text-xs font-mono font-black uppercase text-slate-900">
                  O extintor foi substituído no local? *
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSubstituicaoOpcao('SIM');
                      setSelectedSubstituto(null);
                      setSubstitutoSearchTerm('');
                    }}
                    className={`flex-1 py-2.5 text-xs font-mono font-black rounded-xl border transition-all cursor-pointer shadow-xs ${
                      substituicaoOpcao === 'SIM'
                        ? 'bg-emerald-600 text-white border-emerald-700 font-black scale-[1.01]'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    ✅ SIM, SUBSTITUÍDO NO LOCAL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubstituicaoOpcao('NAO');
                      setSelectedSubstituto(null);
                    }}
                    className={`flex-1 py-2.5 text-xs font-mono font-black rounded-xl border transition-all cursor-pointer shadow-xs ${
                      substituicaoOpcao === 'NAO'
                        ? 'bg-red-600 text-white border-red-700 font-black scale-[1.01]'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    ❌ NÃO SUBSTITUÍDO (RETIRADO DA ÁREA)
                  </button>
                </div>
              </div>

              {/* BUSCA NO ESTOQUE OU NOVO CADASTRO */}
              {substituicaoOpcao === 'SIM' && (
                <div className="bg-white p-4.5 border border-red-200 rounded-2xl space-y-4 shadow-xs">
                  
                  {/* CABEÇALHO DA SEÇÃO DE SUBSTITUIÇÃO */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <label className="block text-xs font-mono font-black uppercase text-slate-900 flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-red-600" />
                        Extintor Substituto do Estoque (Aplicação Imediata) *
                      </label>
                      <p className="text-[11px] text-slate-600 font-sans">
                        Selecione um extintor apto em estoque ou informe um novo patrimônio para instalação na área.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-black">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ESTOQUE (APLICAÇÃO)
                      </span>
                    </div>
                  </div>

                  {/* CAMPO DE BUSCA INSTANTÂNEA */}
                  {!selectedSubstituto && (
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={substitutoSearchTerm}
                        onChange={(e) => {
                          setSubstitutoSearchTerm(e.target.value);
                          setNovoPatrimonio(e.target.value);
                        }}
                        placeholder="Buscar por Patrimônio, Chassi, Selo ou Capacidade (ex: EXT-01, 6 KG, CO2)..."
                        className="w-full bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs text-slate-900 font-bold shadow-xs focus:outline-none font-mono transition-all"
                      />
                      {substitutoSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setSubstitutoSearchTerm('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          title="Limpar busca"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* RESULTADOS DA BUSCA OU FORMULÁRIO DE NOVO CADASTRO */}
                  {!selectedSubstituto && (
                    <div>
                      {(() => {
                        const searchLower = (substitutoSearchTerm || '').toLowerCase().trim();

                        // Combina extintores do contexto + ativos de estoque do Supabase (51 itens)
                        const poolMap = new Map<string, any>();
                        
                        (stockAssets || []).forEach((item: any) => {
                          const key = String(item.patrimonio || item.id_ativo || item.id).trim().toLowerCase();
                          if (key) {
                            poolMap.set(key, {
                              ...item,
                              idAtivo: item.id_ativo || item.patrimonio || item.id,
                              numero_patrimonio: item.patrimonio || item.id_ativo || item.id,
                              chassi: item.numero_serie || item.chassi || '',
                              seloInmetro: item.details?.seloInmetro || item.seloInmetro || '',
                              tipo_movimentacao: item.tipo_movimentacao || 'estoque_aplicacao',
                              status_estoque: item.status_estoque || 'ESTOQUE APLICAÇÃO'
                            });
                          }
                        });

                        (extintores || []).forEach((item: any) => {
                          const key = String(item.numero_patrimonio || item.idAtivo || item.id).trim().toLowerCase();
                          if (key) {
                            const existing = poolMap.get(key);
                            if (!existing) {
                              poolMap.set(key, item);
                            } else {
                              poolMap.set(key, { ...item, ...existing });
                            }
                          }
                        });

                        const combinedList = Array.from(poolMap.values());

                        // Filtra estritamente extintores que estão em ESTOQUE (APLICAÇÃO)
                        const stockList = combinedList.filter((ext: any) => {
                          const mov = String(ext.tipo_movimentacao || '').toLowerCase();
                          const stEstoque = String(ext.status_estoque || '').toUpperCase();
                          
                          const isEstoqueAplicacao = 
                            mov === 'estoque_aplicacao' || 
                            mov.includes('estoque') ||
                            stEstoque === 'ESTOQUE APLICAÇÃO' || 
                            stEstoque === 'ESTOQUE (APLICAÇÃO)' ||
                            stEstoque.includes('APLICAÇÃO') ||
                            stEstoque.includes('APLICACAO');
                          
                          if (!isEstoqueAplicacao) return false;

                          if (searchLower.length > 0) {
                            const pat = String(ext.numero_patrimonio || ext.idAtivo || ext.id || '').toLowerCase();
                            const chassi = String(ext.chassi || ext.numero_serie || '').toLowerCase();
                            const selo = String(ext.seloInmetro || ext.selo_inmetro || '').toLowerCase();
                            const mod = String(ext.model || ext.modelo || '').toLowerCase();
                            const cap = getAssetCapacityLabel(ext).toLowerCase();
                            return pat.includes(searchLower) || chassi.includes(searchLower) || selo.includes(searchLower) || mod.includes(searchLower) || cap.includes(searchLower);
                          }
                          return true;
                        });

                        // Mapeia atributos e calcula dias a vencer
                        const mapped = stockList.map((ext: any) => {
                          const expiryDate = ext.validadeRecarga || ext.data_vencimento_teste || ext.data_vencimento || ext.data_ultima_recarga || ext.lastRecarga;
                          const daysRemaining = calculateDaysRemaining(expiryDate);
                          const capacityLabel = getAssetCapacityLabel(ext);
                          const isExpired = daysRemaining !== null && daysRemaining < 0;

                          return {
                            ...ext,
                            _daysRemaining: daysRemaining,
                            _capacityLabel: capacityLabel,
                            _isExpired: isExpired,
                            _expiryDateStr: expiryDate
                          };
                        });

                        // Ordenação Inteligente (FEFO):
                        // 1º Dias a Vencer (crescente) - Válidos com menor prazo aparecem primeiro
                        // 2º Capacidade (peso)
                        // Ativos vencidos vão para o final
                        const matchingStock = mapped.sort((a: any, b: any) => {
                          if (a._isExpired && !b._isExpired) return 1;
                          if (!a._isExpired && b._isExpired) return -1;

                          const daysA = a._daysRemaining ?? 999999;
                          const daysB = b._daysRemaining ?? 999999;
                          if (daysA !== daysB) {
                            return daysA - daysB;
                          }

                          return a._capacityLabel.localeCompare(b._capacityLabel);
                        });

                        if (matchingStock.length > 0) {
                          const totalDisponiveis = matchingStock.filter((x: any) => !x._isExpired).length;
                          const totalBloqueados = matchingStock.length - totalDisponiveis;

                          return (
                            <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono font-black uppercase text-slate-800 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  Extintores em Estoque Disponíveis ({totalDisponiveis} aptos{totalBloqueados > 0 ? `, ${totalBloqueados} vencidos` : ''}):
                                </span>
                                <span className="text-[9.5px] font-mono text-slate-500 font-bold">
                                  Prioridade FEFO (Menor Validade Primeiro)
                                </span>
                              </div>

                              {/* GRID BENTO DE ATIVOS EM ESTOQUE */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                                {matchingStock.map((stockAsset: any) => {
                                  const isExpired = stockAsset._isExpired;
                                  const days = stockAsset._daysRemaining;

                                  return (
                                    <div
                                      key={stockAsset.id || stockAsset.idAtivo}
                                      onClick={() => {
                                        if (!isExpired) {
                                          setSelectedSubstituto(stockAsset);
                                        }
                                      }}
                                      className={`text-left rounded-xl p-3 transition-all flex flex-col justify-between space-y-2.5 border ${
                                        isExpired
                                          ? 'bg-red-50/60 border-red-200 opacity-65 cursor-not-allowed'
                                          : 'bg-white hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-500 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99]'
                                      }`}
                                    >
                                      {/* TOPO: PATRIMÔNIO & CHIP DE CAPACIDADE */}
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <span className="font-mono font-black text-xs text-slate-900 block leading-tight">
                                            {stockAsset.numero_patrimonio || stockAsset.idAtivo || stockAsset.id}
                                          </span>
                                          <span className="text-[9px] font-mono text-slate-500 block">
                                            Série: {stockAsset.chassi || stockAsset.numero_serie || 'N/A'}
                                          </span>
                                        </div>

                                        {/* BADGE DE CAPACIDADE (PESO) */}
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-black shrink-0 shadow-2xs">
                                          <Scale className="w-3 h-3 text-amber-400" />
                                          {stockAsset._capacityLabel}
                                        </span>
                                      </div>

                                      {/* MEIO: MODELO / AGENTE & SELO INMETRO */}
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold text-slate-700 truncate font-sans">
                                          {stockAsset.model || stockAsset.modelo || 'Extintor SPCI'}
                                        </p>
                                        <p className="text-[9.5px] text-slate-500 font-mono flex items-center gap-1">
                                          <span>Selo:</span>
                                          <strong className="text-slate-700">{stockAsset.seloInmetro || stockAsset.selo_inmetro || 'Isento'}</strong>
                                        </p>
                                      </div>

                                      {/* RODAPÉ: DIAS A VENCER (SEMÂNTICO) + BOTÃO DE SELEÇÃO */}
                                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                        {/* BADGE DIAS A VENCER */}
                                        <div>
                                          {days === null ? (
                                            <span className="text-[9.5px] text-slate-400 font-mono font-bold">Validade N/D</span>
                                          ) : isExpired ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-red-100 text-red-800 border border-red-300">
                                              <Ban className="w-3 h-3 text-red-600" />
                                              VENCIDO ({Math.abs(days)}d atrás)
                                            </span>
                                          ) : days > 60 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                              <Clock className="w-3 h-3 text-emerald-600" />
                                              +{days} dias (No Prazo)
                                            </span>
                                          ) : days >= 30 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                              <Clock className="w-3 h-3 text-amber-700" />
                                              {days} dias restantes
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-400 animate-pulse">
                                              <AlertTriangle className="w-3 h-3 text-orange-600" />
                                              A VENCER ({days}d)
                                            </span>
                                          )}
                                        </div>

                                        {/* AÇÃO */}
                                        {isExpired ? (
                                          <span className="text-[9px] font-mono font-bold text-red-600 uppercase">
                                            Bloqueado
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-emerald-700 group-hover:text-emerald-900">
                                            Selecionar
                                            <ArrowRight className="w-3 h-3" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Caso nenhum ativo seja encontrado com o termo ou no estoque
                        return (
                          <div className="bg-amber-50/90 border-2 border-amber-300 p-4 rounded-xl space-y-3 font-sans shadow-xs">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-xs font-mono font-black uppercase text-amber-950">
                                {substitutoSearchTerm.trim() 
                                  ? `Nenhum extintor disponível em estoque com o termo "${substitutoSearchTerm}"`
                                  : 'Nenhum extintor disponível no momento com status "ESTOQUE (APLICAÇÃO)"'}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900 font-bold">
                              Se você está instalando um extintor que ainda não foi cadastrado no estoque, preencha os dados abaixo para registrá-lo imediatamente:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono">
                              <div>
                                <label className="block text-[9.5px] font-black uppercase text-slate-700 mb-1">
                                  Nº Patrimônio / ID *
                                </label>
                                <input
                                  type="text"
                                  value={novoPatrimonio}
                                  onChange={(e) => setNovoPatrimonio(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
                                  placeholder="Ex: EXT-1099"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] font-black uppercase text-slate-700 mb-1">
                                  Nº Chassi / Recipiente
                                </label>
                                <input
                                  type="text"
                                  value={novoChassi}
                                  onChange={(e) => setNovoChassi(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
                                  placeholder="Ex: CH-88741"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] font-black uppercase text-slate-700 mb-1">
                                  Selo Inmetro *
                                </label>
                                <input
                                  type="text"
                                  value={novoSeloInmetro}
                                  onChange={(e) => setNovoSeloInmetro(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
                                  placeholder="Ex: 14253678"
                                />
                              </div>
                              <div>
                                <label className="block text-[9.5px] font-black uppercase text-slate-700 mb-1">
                                  Modelo / Agente
                                </label>
                                <select
                                  value={novoModelo}
                                  onChange={(e) => setNovoModelo(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
                                >
                                  <option value="PQS 4kg (Portátil)">PQS 4kg (Portátil)</option>
                                  <option value="PQS 6kg (Portátil)">PQS 6kg (Portátil)</option>
                                  <option value="CO2 6kg (Portátil)">CO2 6kg (Portátil)</option>
                                  <option value="AP 10L (Portátil)">AP 10L (Portátil)</option>
                                  <option value="Espuma Mecânica 9L">Espuma Mecânica 9L</option>
                                  <option value="PQS 20kg (Carreta / Sobre Rodas)">PQS 20kg (Carreta)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9.5px] font-black uppercase text-slate-700 mb-1">
                                  Validade da Recarga
                                </label>
                                <input
                                  type="date"
                                  value={novaValidadeRecarga}
                                  onChange={(e) => setNovaValidadeRecarga(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* EXIBIÇÃO DO ATIVO DO ESTOQUE SELECIONADO NO ESTILO BENTO MASTER */}
                  {selectedSubstituto && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-50/90 border-2 border-emerald-500 p-4.5 rounded-2xl space-y-3.5 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-mono font-black uppercase text-emerald-900 block tracking-wider">
                              EXTINTOR DO ESTOQUE SELECIONADO PARA SUBSTITUIÇÃO:
                            </span>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-slate-900 font-mono">
                                {selectedSubstituto.numero_patrimonio || selectedSubstituto.idAtivo || selectedSubstituto.id}
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-black">
                                <Scale className="w-3 h-3 text-amber-400" />
                                {selectedSubstituto._capacityLabel || getAssetCapacityLabel(selectedSubstituto)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSubstituto(null)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 border border-slate-300 hover:border-red-400 text-xs font-mono font-black text-red-600 hover:text-red-700 cursor-pointer shadow-2xs transition-all"
                        >
                          Alterar Seleção
                        </button>
                      </div>

                      {/* DETALHES TÉCNICOS DO ATIVO SUBMETIDO */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 font-mono text-[11px] text-slate-800 bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Modelo</span>
                          <span className="font-black truncate block">{selectedSubstituto.model || selectedSubstituto.modelo || 'PQS'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Selo Inmetro</span>
                          <span className="font-black">{selectedSubstituto.seloInmetro || selectedSubstituto.selo_inmetro || 'Isento'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Dias a Vencer</span>
                          <span className="font-black text-emerald-700">
                            {selectedSubstituto._daysRemaining !== null 
                              ? `${selectedSubstituto._daysRemaining} dias` 
                              : 'Válido'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-bold block uppercase">Local a Assumir</span>
                          <span className="font-black text-slate-900 truncate block">
                            {asset.location || 'Área Industrial'}{asset.subLocation ? ` (${asset.subLocation})` : ''}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}

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

        {/* BANNER NOTIFICAÇÃO DE GRAVAÇÃO */}
        <AnimatePresence>
          {saveSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-600 text-white px-4 py-2.5 text-center text-xs font-bold font-sans flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Dados da inspeção gravados com sucesso! Você pode prosseguir ou homologar o laudo.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RODAPÉ DE AÇÕES */}
        <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 font-mono">
          <div className="flex items-center gap-2 text-[11px] text-slate-800 font-bold">
            <Info className="w-4 h-4 text-slate-600" />
            <span>
              {hasInconformity ? '🔴 Laudo marcado como NÃO CONFORME devido a falhas técnicas.' : '🟢 Todos os itens verificados em conformidade.'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button" 
              onClick={handleClearAll}
              className="px-3.5 py-2 text-[10.5px] uppercase font-black text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 border border-slate-300 transition-all rounded-xl cursor-pointer active:scale-[0.98] shadow-xs flex items-center gap-1.5"
              title="Limpar todas as marcações, fotos e pareceres"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>LIMPAR DADOS</span>
            </button>

            <button 
              type="button" 
              onClick={handleSaveDraft}
              className="px-4 py-2 text-[10.5px] uppercase font-black text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-all rounded-xl cursor-pointer active:scale-[0.98] shadow-xs flex items-center gap-1.5"
              title="Gravar informações inseridas e marcações realizadas"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" />
              <span>GRAVAR DADOS</span>
            </button>

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
              className="px-5 py-2 text-[10.5px] uppercase font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all rounded-xl cursor-pointer active:scale-[0.98] shadow-md border-none flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>HOMOLOGAR LAUDO NBR</span>
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

      {/* MODAL DE NORMAS ABNT APLICÁVEIS */}
      <NormasExtintorModal
        isOpen={normasModalOpen}
        onClose={() => setNormasModalOpen(false)}
      />
    </div>
  );
}
