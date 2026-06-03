import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

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
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-xl border border-slate-800 bg-slate-900 shadow-2xl rounded-none relative my-8 font-mono text-xs text-slate-200"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" aria-hidden="true" />

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex flex-col gap-0.5">
            <span className="bg-slate-800 text-slate-400 text-[9px] font-bold py-0.5 px-2 w-max uppercase tracking-widest">
              CADASTRO DE EQUIPAMENTOS
            </span>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mt-1">
              Inserir Novo Ativo no SPCI
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-700 bg-slate-850 px-2 py-1 transition-all rounded-none cursor-pointer"
          >
            FECHAR ×
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-3">
              Selecione a Categoria do Ativo
            </span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'extintor', label: 'Extintor', icon: '🧯' },
                { id: 'hidrante', label: 'Hidrante', icon: '💧' },
                { id: 'sinalizacao', label: 'Sinalização', icon: '⚠️' },
                { id: 'iluminacao', label: 'Iluminação', icon: '💡' },
                { id: 'bomba', label: 'Bombas', icon: '⚙️' }
              ].map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNewAssetType(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-none border transition-all cursor-pointer ${
                    newAssetType === item.id 
                      ? 'border-red-600 bg-red-950/20 text-red-400' 
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-750 text-slate-400'
                  }`}
                >
                  <span className="text-2xl mb-2">{item.icon}</span>
                  <span className="text-[10px] uppercase font-bold text-center leading-none">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddNewAssetSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Local da Instalação *</label>
                <select 
                  value={formLocal} 
                  onChange={(e) => setFormLocal(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650"
                >
                  {SECTORS_LIST.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Sub Local (Sala / Doca) *</label>
                <input 
                  type="text" 
                  value={formSubLocal} 
                  onChange={(e) => setFormSubLocal(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650" 
                  placeholder="Ex: Sala de Geradores, Coluna 12" 
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Número do Patrimônio *</label>
                <div className="flex">
                  <span className="bg-slate-950 text-slate-500 text-xs px-3 flex items-center border-y border-l border-slate-800 select-none">
                    {newAssetType === 'extintor' ? 'EXT-' : newAssetType === 'hidrante' ? 'HD-' : newAssetType === 'sinalizacao' ? 'SE-' : newAssetType === 'iluminacao' ? 'IE-' : newAssetType === 'bomba' ? 'CB-' : 'PAT-'}
                  </span>
                  <input 
                    type="text" 
                    value={formPatrimonio} 
                    onChange={(e) => setFormPatrimonio(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650 uppercase font-bold" 
                    placeholder="Ex: 1042" 
                    required 
                  />
                </div>
              </div>

              {newAssetType === 'extintor' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Modelo / Agente e Carga *</label>
                    <select 
                      value={formModel} 
                      onChange={(e) => setFormModel(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650"
                    >
                      <option value="PQS ABC - 8KG">Pós Químico ABC - 8KG</option>
                      <option value="CO2 - 6KG">Gás Carbônico CO2 - 6KG</option>
                      <option value="Água Pressurizada - 10L">Água Pressurizada - 10L</option>
                      <option value="PQS BC - 4KG">Pós Químico BC - 4KG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Selo Inmetro (Opcional)</label>
                    <input 
                      type="text" 
                      value={formSelo} 
                      onChange={(e) => setFormSelo(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650 font-mono" 
                      placeholder="S-123456" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Chassi Corporativo</label>
                    <input 
                      type="text" 
                      value={formChassi} 
                      onChange={(e) => setFormChassi(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650 uppercase" 
                      placeholder="E-4099" 
                    />
                  </div>
                </>
              )}

              {newAssetType === 'sinalizacao' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-3">Selecione os Modelos Visuais *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'C3 Seta Esquerda', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNNbUfk2-mF0LxprKV2C7RKYXByvjbUXy_XWGbND3PaNoNkZwm1WPALDNXzWKlln0_0NhdfGno-XDTHgppxN_u_498yg03tdmYfiXnVOZmjdDfRjlduzDfLIZOdwrukwEBBsjFja9AeeWHamh8Oj6ix518U7tf8MlGGpDq_EoeNy-CpyAUiBoiAeQIdJ8TsTDvlPcjLNk61VGY7vOr1sIpD81yn4jzCVzqDrNzI9qIwa3kLdAva8y-52WbK7TegbKDD9z-fC8hNds', desc: 'Saída Esquerda' },
                      { key: 'C2 Seta Escada', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4jlkr2uN2Tr6OJK6xOqq__Dmr4HqtdL80oYJ6xWONK9spyiKxm43StnH--3VPFVk3V2XvVl_oGmZF5F5Uckdfj_OMtvTldfCBdMMEs8kM6bKlsvNx4Dhk1iFXyYzAXZOs4XY-8L9NBBMOfMOj391GSo1Giw5N39-HB3gvS6RBY0QOmesGudZbE-gzJGedDPv9HK6BepGwGVEUC9sN4FqqkHlrCtabrdHhw-CcdWchRdmKVmkhJleznOXtmpaGQsIbLWLIQCOHztk', desc: 'Saída Descendo' },
                      { key: 'C3 Seta Direita', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqRdNZ3PxX3jI5lZpnWd--u2m8jxVQqLaqU5vQ0pkiBWzfqr50eBZzbBsJKE85XpDbsDZEa31a6kA6sqnv8_Am4020bV21UWRP3xqBcxjHNQtlqgZ6cQI-s8sXNS25S4tlRyp4FgxG2ni9Wz4f5tlN28lxhNVEVU48Np-IXSp9m588pUkW-fDPGTsWVIglvkAXH9H2yl9Z7t9W71qZKjMsRzE4HCaRnTv6XkbI2BUqhUF5lx86aP3hEpAt7kez4KrFHpv8Tw3ieGM', desc: 'Saída Direita' }
                    ].map(item => (
                      <label key={item.key} className="border border-slate-800 bg-slate-950/30 p-3 flex flex-col items-center cursor-pointer hover:bg-slate-900/50 relative">
                        <input 
                          type="checkbox" 
                          checked={multiSelectModels.includes(item.key)}
                          onChange={(e) => {
                            if (e.target.checked) setMultiSelectModels([...multiSelectModels, item.key]);
                            else setMultiSelectModels(multiSelectModels.filter(g => g !== item.key));
                          }}
                          className="absolute top-2 left-2 cursor-pointer" 
                        />
                        <img src={item.url} alt={item.desc} className="h-12 w-full object-contain mb-2 brightness-90 saturate-50 mix-blend-screen" />
                        <span className="text-[9px] text-center font-bold text-slate-300 uppercase leading-none">{item.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {newAssetType === 'iluminacao' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Tipo de Sistema *</label>
                  <select 
                    value={formSystemType} 
                    onChange={(e) => setFormSystemType(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-none p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-650"
                  >
                    <option value="CONJUNTO DE BLOCO AUTÔNOMO">CONJUNTO DE BLOCO AUTÔNOMO</option>
                    <option value="SISTEMA CENTRALIZADO BATERIAS">SISTEMA CENTRALIZADO BATERIAS</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-850 rounded-none cursor-pointer"
              >
                CANCELAR
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-950 bg-emerald-500 hover:bg-emerald-450 rounded-none cursor-pointer"
              >
                SALVAR NO BANCO
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
