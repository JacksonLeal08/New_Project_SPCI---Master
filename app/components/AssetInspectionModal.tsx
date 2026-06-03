import React from 'react';
import { motion } from 'motion/react';
import { AnyAsset, AssetStatus } from '@/lib/types';

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
  if (!isOpen || !asset) return null;

  // Requisitos NBR genéricos baseados nas normas brasileiras de incêndio
  const getRequirements = () => {
    switch (asset.category) {
      case 'extintores':
        return [
          "Posição e Localização recomendada conforme NBR 12962?",
          "Acesso desobstruído com sinalização de piso regulamentar?",
          "Selo Inmetro presente e com legibilidade de data de recarga?",
          "Pressão indicada no manômetro está na faixa verde operacional?",
          "Integridade estrutural da carcaça, mangueira, bico e lacre de segurança?"
        ];
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

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-2xl border border-slate-800 bg-slate-900 shadow-2xl rounded-none relative my-8 font-mono text-xs text-slate-200"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" aria-hidden="true" />
        
        {/* Cabeçalho do HUD */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex flex-col gap-0.5">
            <span className="bg-red-950 text-red-400 border border-red-900/50 text-[9px] font-bold py-0.5 px-2 w-max uppercase tracking-widest">
              LAUDO DE VISTORIA ATIVO
            </span>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mt-1">
              Conformidade NBR - {asset.idAtivo || asset.id}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-700 bg-slate-850 px-2 py-1 transition-all rounded-none cursor-pointer"
          >
            DESCARTAR ×
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900">
          {/* Informações Básicas do Equipamento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-800/60 p-4 bg-slate-950/30">
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Equipamento</span>
              <p className="font-bold text-slate-100 truncate">{(asset as any).model || 'Modelo SPCI'}</p>
              <p className="text-[10px] text-slate-400 mt-1">Selo/Inmetro: {(asset as any).seloInmetro || 'Isento/NBR'}</p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Localização</span>
              <p className="font-bold text-slate-100 truncate">{asset.location}</p>
              <p className="text-[10px] text-slate-400 mt-1">Subsetor: {asset.subLocation || 'Não especificado'}</p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Status Atual</span>
              <span className={`inline-block font-bold uppercase border px-2 py-0.5 text-[9px] mt-1 ${
                asset.status === 'Conforme' || asset.status === 'Operacional'
                  ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' 
                  : 'text-red-400 border-red-950 bg-red-950/20'
              }`}>
                {asset.status}
              </span>
            </div>
          </div>

          {/* Laudo Fotográfico Mandatório */}
          <div className="border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base text-red-500 animate-pulse">📸</span>
              <div>
                <p className="text-xs font-bold text-slate-100 uppercase tracking-wide">Laudo Fotográfico Obrigatório *</p>
                <p className="text-[10px] text-slate-400">Grave em close-up do selo de identificação e vista geral do abrigo.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => onDemoDrop('patrimonio')}
                className={`py-3 text-center border transition-all rounded-none cursor-pointer text-[10px] font-bold ${
                  photoPatrimonio 
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                {photoPatrimonio ? '✔️ FOTO PATRIMÔNIO ANEXADA' : '📸 FOTO PATRIMÔNIO'}
              </button>
              <button 
                type="button" 
                onClick={() => onDemoDrop('frontal')}
                className={`py-3 text-center border transition-all rounded-none cursor-pointer text-[10px] font-bold ${
                  photoFrontal 
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                {photoFrontal ? '✔️ FOTO FRONTAL ANEXADA' : '📸 FOTO FRONTAL'}
              </button>
            </div>
          </div>

          {/* Requisitos NBR */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 pb-1 border-b border-slate-800">
              Checklist Requisitos NBR
            </h3>
            {requirements.map((req, i) => (
              <div 
                key={i} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-slate-850 bg-slate-900/50 hover:bg-slate-900 transition-colors"
              >
                <p className="text-[11px] font-sans leading-relaxed text-slate-300 flex-grow pr-2">
                  <span className="font-mono text-red-500 mr-1">{i + 1}.</span> {req}
                </p>
                <div className="flex gap-2 shrink-0">
                  <button 
                    type="button" 
                    className="px-2 py-1 text-[9px] font-bold uppercase border border-emerald-900/50 bg-emerald-950/10 hover:bg-emerald-950/30 text-emerald-400 transition-all cursor-pointer rounded-none"
                  >
                    CONFORME
                  </button>
                  <button 
                    type="button" 
                    className="px-2 py-1 text-[9px] font-bold uppercase border border-red-900/50 bg-red-950/10 hover:bg-red-950/30 text-red-400 transition-all cursor-pointer rounded-none"
                  >
                    INCONFORME
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Notas do Técnico */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">
              Parecer Rápido / Observações do Técnico
            </label>
            <textarea 
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650 font-mono" 
              placeholder="Descreva observações de integridade, lacres, pressão ou avarias identificadas..."
            />
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/20">
          <button 
            type="button" 
            onClick={() => onFinalize('Não Conforme')}
            className="px-4 py-2 text-[10px] uppercase font-bold text-red-400 bg-red-950/30 hover:bg-red-950/50 border border-red-900/60 transition-all rounded-none cursor-pointer active:scale-[0.98]"
          >
            ⚠️ NÃO CONFORME
          </button>
          <button 
            type="button" 
            onClick={() => onFinalize('Conforme')}
            className="px-5 py-2 text-[10px] uppercase font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-450 transition-all rounded-none cursor-pointer active:scale-[0.98]"
          >
            🟢 HOMOLOGAR REGISTRO
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
