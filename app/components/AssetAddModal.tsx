import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  Flame, 
  Droplet, 
  AlertTriangle, 
  Lightbulb, 
  Sliders, 
  Check, 
  X 
} from 'lucide-react';

interface AssetAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetAddModal({ isOpen, onClose }: AssetAddModalProps) {
  const {
    newAssetType,
    setNewAssetType,
    extintores,
    setExtintores,
    hidrantes,
    setHidrantes,
    sinalizacoes,
    setSinalizacoes,
    iluminacoes,
    setIluminacoes,
    bombas,
    setBombas,
    saveAssetsList,
    triggerSuccessNotification
  } = useSpci();

  // --- ESTADOS LOCAIS DO FORMULÁRIO ---
  const [formLocal, setFormLocal] = useState('MANGANÊS');
  const [formSubLocal, setFormSubLocal] = useState('BARRAGEM DO AZUL');
  const [formPatrimonio, setFormPatrimonio] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSelo, setFormSelo] = useState('');
  const [formChassi, setFormChassi] = useState('');
  const [formWeight, setFormWeight] = useState('6');
  const [formSystemType, setFormSystemType] = useState('CONJUNTO DE BLOCO AUTÔNOMO');
  const [multiSelectModels, setMultiSelectModels] = useState<string[]>([]);

  if (!isOpen) return null;

  const SECTORS_LIST = [
    'MANGANÊS', 'ALMOXARIFADO', 'SALA ELÉTRICA', 'BARRAGEM DO AZUL', 
    'ROTA DE FUGA 01', 'ROTA DE FUGA 02', 'RECEPÇÃO', 'COBRE', 'FERRO'
  ];

  // Categories config
  const CATEGORIES: { id: 'extintor' | 'hidrante' | 'sinalizacao' | 'iluminacao' | 'bomba'; label: string; sublabel: string; icon: any }[] = [
    { id: 'extintor', label: 'Extintor', sublabel: 'Combate Primário', icon: Flame },
    { id: 'hidrante', label: 'Hidrante', sublabel: 'Rede Hidrantes', icon: Droplet },
    { id: 'sinalizacao', label: 'Sinalização', sublabel: 'Rota de Fuga', icon: AlertTriangle },
    { id: 'iluminacao', label: 'Iluminação', sublabel: 'Blocos Emerg.', icon: Lightbulb },
    { id: 'bomba', label: 'Bombas', sublabel: 'Casa de Bombas', icon: Sliders }
  ];

  // Helper to dynamically calculate next inspection MM/YYYY
  const getNextInspectionDateStr = () => {
    const today = new Date();
    let targetMonth = today.getMonth() + 1; // 1-indexed
    let targetYear = today.getFullYear();

    if (newAssetType === 'extintor') {
      targetYear += 1;
    } else if (newAssetType === 'hidrante') {
      targetMonth += 6;
      if (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
    } else {
      // Outros: Rota/Bloco/Bomba padrão 1 ano
      targetYear += 1;
    }

    const monthStr = String(targetMonth).padStart(2, '0');
    return `${monthStr}/${targetYear}`;
  };

  const handleAddNewAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatrimonio) {
      alert("Preencha o Número de Patrimônio!");
      return;
    }

    const uniqueId = String(Date.now());
    const getPrefix = () => {
      switch (newAssetType) {
        case 'extintor': return 'EXT-';
        case 'hidrante': return 'HD-';
        case 'sinalizacao': return 'SE-';
        case 'iluminacao': return 'IE-';
        case 'bomba': return 'CB-';
        default: return 'PAT-';
      }
    };
    const prefix = getPrefix();
    const codePatrimonio = formPatrimonio.toUpperCase().startsWith(prefix) 
      ? formPatrimonio.toUpperCase() 
      : `${prefix}${formPatrimonio.toUpperCase()}`;

    if (newAssetType === 'extintor') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        model: formModel || 'PQS ABC - 8KG',
        location: formLocal,
        subLocation: formSubLocal,
        seloInmetro: formSelo || 'S-' + Math.floor(Math.random() * 100000),
        chassi: formChassi || 'C-' + Math.floor(Math.random() * 100000),
        peso: formWeight,
        lastRecarga: new Date().toISOString().substring(0, 10),
        recurrenceInterval: '1 Ano',
        validadeRecarga: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        validadeTesteHidro: '2031',
        status: 'Conforme',
        category: 'extintores'
      };
      const updated = [newObj, ...extintores];
      setExtintores(updated);
      await saveAssetsList('extintores', updated);
    } else if (newAssetType === 'hidrante') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        components: ['2 Mangueiras (15m)', '1 Esguicho Regulável', '2 Chaves Storz'],
        lastInsp: new Date().toISOString().substring(0, 10),
        nextInsp: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        status: 'Conforme',
        category: 'hidrantes'
      };
      const updated = [newObj, ...hidrantes];
      setHidrantes(updated);
      await saveAssetsList('hidrantes', updated);
    } else if (newAssetType === 'sinalizacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        model: multiSelectModels.join(', ') || 'Placa Multi-Direcional - C3',
        group: 'Rota de Fuga',
        status: 'Conforme',
        category: 'sinalizacoes'
      };
      const updated = [newObj, ...sinalizacoes];
      setSinalizacoes(updated);
      await saveAssetsList('sinalizacoes', updated);
    } else if (newAssetType === 'iluminacao') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        systemType: formSystemType,
        model: multiSelectModels.join(', ') || 'Bloco 30 LEDs',
        qty: 1,
        battery: '100%',
        autonomy: '120m / 120m',
        status: 'Operacional',
        category: 'iluminacao'
      };
      const updated = [newObj, ...iluminacoes];
      setIluminacoes(updated);
      await saveAssetsList('iluminacao', updated);
    } else if (newAssetType === 'bomba') {
      const newObj = {
        id: uniqueId,
        idAtivo: codePatrimonio,
        location: formLocal,
        subLocation: formSubLocal,
        model: formModel || 'Bomba Centrífuga Principal',
        pressure: 'Estável - 120 MCA',
        starts: '0',
        power: 'Rede 380V',
        range: '100 - 125 PSI',
        status: 'Standby',
        category: 'bombas'
      };
      const updated = [newObj, ...bombas];
      setBombas(updated);
      await saveAssetsList('bombas', updated);
    }

    setFormPatrimonio('');
    setFormModel('');
    setFormSelo('');
    setFormChassi('');
    setMultiSelectModels([]);
    onClose();
    triggerSuccessNotification('Equipamento Registrado!', `Ativo ${codePatrimonio} foi cadastrado no banco de dados SPCI.`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-45 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl relative my-8 font-mono text-xs text-slate-800"
      >
        {/* Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650 rounded-t-2xl" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pt-7">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
              CADASTRO DE EQUIPAMENTOS
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mt-1 flex items-center gap-1.5">
              ✍️ Cadastrar Novo Ativo no Sistema SPCI
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-800 border border-slate-200 hover:border-slate-300 bg-white p-2 transition-all rounded-xl cursor-pointer shadow-xs"
            title="Fechar Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable Form) */}
        <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
          
          {/* Visual Category Selection Grid */}
          <div>
            <span className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-3">
              Selecione a Categoria do Ativo
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const isSelected = newAssetType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewAssetType(item.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer text-center group active:scale-95 ${
                      isSelected 
                        ? 'border-2 border-red-600 bg-red-50/40 text-red-600 font-bold shadow-xs' 
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {/* Badge Checkmark */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-650 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 font-bold" />
                      </div>
                    )}
                    <Icon className={`w-6 h-6 mb-2 transition-transform group-hover:scale-110 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] uppercase font-extrabold leading-none">{item.label}</span>
                    <span className="text-[8px] text-slate-400 font-medium font-sans mt-1 leading-none">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddNewAssetSubmit} className="space-y-5 text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Local */}
              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Local da Instalação *</label>
                <select 
                  value={formLocal} 
                  onChange={(e) => setFormLocal(e.target.value)} 
                  className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs cursor-pointer"
                >
                  {SECTORS_LIST.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>

              {/* Sub-Local */}
              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Sub Local (Sala / Doca) *</label>
                <input 
                  type="text" 
                  value={formSubLocal} 
                  onChange={(e) => setFormSubLocal(e.target.value)} 
                  className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs" 
                  placeholder="Ex: Sala de Geradores, Coluna 12" 
                  required
                />
              </div>

              {/* Patrimonio */}
              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Número do Patrimônio *</label>
                <div className="flex shadow-xs rounded-xl overflow-hidden border border-slate-200 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600">
                  <span className="bg-slate-100 text-slate-500 text-xs px-4 flex items-center border-r border-slate-200 select-none font-bold">
                    {newAssetType === 'extintor' ? 'EXT-' : newAssetType === 'hidrante' ? 'HD-' : newAssetType === 'sinalizacao' ? 'SE-' : newAssetType === 'iluminacao' ? 'IE-' : newAssetType === 'bomba' ? 'CB-' : 'PAT-'}
                  </span>
                  <input 
                    type="text" 
                    value={formPatrimonio} 
                    onChange={(e) => setFormPatrimonio(e.target.value)} 
                    className="w-full bg-white p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold uppercase" 
                    placeholder="Ex: 1042" 
                    required 
                  />
                </div>
              </div>

              {/* EXTINTORES EXTRA FIELDS */}
              {newAssetType === 'extintor' && (
                <>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Modelo / Carga *</label>
                    <select 
                      value={formModel} 
                      onChange={(e) => setFormModel(e.target.value)} 
                      className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-850 outline-none font-bold shadow-xs cursor-pointer"
                    >
                      <option value="PQS ABC - 8KG">Pós Químico ABC - 8KG</option>
                      <option value="CO2 - 6KG">Gás Carbônico CO2 - 6KG</option>
                      <option value="Água Pressurizada - 10L">Água Pressurizada - 10L</option>
                      <option value="PQS BC - 4KG">Pós Químico BC - 4KG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Selo Inmetro (Opcional)</label>
                    <input 
                      type="text" 
                      value={formSelo} 
                      onChange={(e) => setFormSelo(e.target.value)} 
                      className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-mono" 
                      placeholder="S-123456" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Chassi Corporativo</label>
                    <input 
                      type="text" 
                      value={formChassi} 
                      onChange={(e) => setFormChassi(e.target.value)} 
                      className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none uppercase" 
                      placeholder="E-4099" 
                    />
                  </div>
                </>
              )}

              {/* SINALIZACOES EXTRA FIELDS */}
              {newAssetType === 'sinalizacao' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-3">Selecione os Modelos Visuais *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'C3 Seta Esquerda', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNNbUfk2-mF0LxprKV2C7RKYXByvjbUXy_XWGbND3PaNoNkZwm1WPALDNXzWKlln0_0NhdfGno-XDTHgppxN_u_498yg03tdmYfiXnVOZmjdDfRjlduzDfLIZOdwrukwEBBsjFja9AeeWHamh8Oj6ix518U7tf8MlGGpDq_EoeNy-CpyAUiBoiAeQIdJ8TsTDvlPcjLNk61VGY7vOr1sIpD81yn4jzCVzqDrNzI9qIwa3kLdAva8y-52WbK7TegbKDD9z-fC8hNds', desc: 'Saída Esquerda' },
                      { key: 'C2 Seta Escada', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4jlkr2uN2Tr6OJK6xOqq__Dmr4HqtdL80oYJ6xWONK9spyiKxm43StnH--3VPFVk3V2XvVl_oGmZF5F5Uckdfj_OMtvTldfCBdMMEs8kM6bKlsvNx4Dhk1iFXyYzAXZOs4XY-8L9NBBMOfMOj391GSo1Giw5N39-HB3gvS6RBY0QOmesGudZbE-gzJGedDPv9HK6BepGwGVEUC9sN4FqqkHlrCtabrdHhw-CcdWchRdmKVmkhJleznOXtmpaGQsIbLWLIQCOHztk', desc: 'Saída Descendo' },
                      { key: 'C3 Seta Direita', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqRdNZ3PxX3jI5lZpnWd--u2m8jxVQqLaqU5vQ0pkiBWzfqr50eBZzbBsJKE85XpDbsDZEa31a6kA6sqnv8_Am4020bV21UWRP3xqBcxjHNQtlqgZ6cQI-s8sXNS25S4tlRyp4FgxG2ni9Wz4f5tlN28lxhNVEVU48Np-IXSp9m588pUkW-fDPGTsWVIglvkAXH9H2yl9Z7t9W71qZKjMsRzE4HCaRnTv6XkbI2BUqhUF5lx86aP3hEpAt7kez4KrFHpv8Tw3ieGM', desc: 'Saída Direita' }
                    ].map(item => {
                      const isChecked = multiSelectModels.includes(item.key);
                      return (
                        <label 
                          key={item.key} 
                          className={`relative border p-3 flex flex-col items-center cursor-pointer transition-all rounded-xl hover:bg-slate-50 ${
                            isChecked ? 'border-red-600 bg-red-50/20' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setMultiSelectModels([...multiSelectModels, item.key]);
                              else setMultiSelectModels(multiSelectModels.filter(g => g !== item.key));
                            }}
                            className="absolute top-2 left-2 cursor-pointer w-4.5 h-4.5 accent-red-650" 
                          />
                          <img src={item.url} alt={item.desc} className="h-12 w-full object-contain mb-2 brightness-95 saturate-50 mix-blend-multiply" />
                          <span className="text-[9px] text-center font-black text-slate-600 uppercase leading-none">{item.desc}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ILUMINACAO EXTRA FIELDS */}
              {newAssetType === 'iluminacao' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Tipo de Sistema *</label>
                  <select 
                    value={formSystemType} 
                    onChange={(e) => setFormSystemType(e.target.value)} 
                    className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs cursor-pointer"
                  >
                    <option value="CONJUNTO DE BLOCO AUTÔNOMO">CONJUNTO DE BLOCO AUTÔNOMO</option>
                    <option value="SISTEMA CENTRALIZADO BATERIAS">SISTEMA CENTRALIZADO BATERIAS</option>
                  </select>
                </div>
              )}

              {/* BOMBAS EXTRA FIELDS */}
              {newAssetType === 'bomba' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-slate-500 mb-2">Modelo da Bomba *</label>
                  <input 
                    type="text" 
                    value={formModel} 
                    onChange={(e) => setFormModel(e.target.value)} 
                    className="w-full bg-white border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl p-3 text-xs sm:text-sm text-slate-800 outline-none font-bold shadow-xs" 
                    placeholder="Ex: Bomba Centrífuga Principal" 
                  />
                </div>
              )}

            </div>

            {/* Dynamic Alert Banner */}
            <div className="border border-amber-300 bg-[#fff5f5] border-l-4 border-l-amber-500 rounded-xl p-4 transition-all">
              <div className="flex gap-3 items-start text-amber-850 font-sans text-xs leading-relaxed">
                <span className="text-base select-none">⚠️</span>
                <div>
                  <span className="font-extrabold block text-[10px] uppercase tracking-wide text-amber-900 mb-0.5 font-mono">
                    Aviso Automático SPCI
                  </span>
                  No cadastro do equipamento, a próxima inspeção periódica obrigatória é agendada para o mesmo mês do cadastro. 
                  Próxima inspeção agendada: <span className="font-mono font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">{getNextInspectionDateStr()}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-between items-center pt-5 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider text-[10px] sm:text-xs underline decoration-dotted transition-all cursor-pointer"
              >
                Cancelar Operação
              </button>
              <button 
                type="submit" 
                className="px-6 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-[#007F3E] hover:bg-[#006631] rounded-xl cursor-pointer shadow-sm transition-all active:scale-[0.97]"
              >
                Salvar no Banco SPCI
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
