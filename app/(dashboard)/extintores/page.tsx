'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  Plus, 
  Trash2, 
  History, 
  Bell, 
  CheckSquare 
} from 'lucide-react';

export default function ExtintoresPage() {
  const {
    extintores,
    setExtintores,
    saveAssetsList,
    setShowAddForm,
    setNewAssetType,
    setSelectedAssetForInspection,
    setSelectedAssetForHistory,
    setPremiumAlert
  } = useSpci();

  const getCustomAttributes = (asset: any) => {
    const standardKeys = [
      'id', 'idAtivo', 'category', 'model', 'location', 'subLocation', 'seloInmetro', 'chassi', 'peso',
      'lastRecarga', 'recurrenceInterval', 'validadeRecarga', 'validadeTesteHidro', 'status', 'geolocation',
      'type', 'components', 'lastInsp', 'nextInsp', 'group', 'systemType', 'qty', 'battery', 'autonomy',
      'name', 'code', 'power', 'range', 'starts'
    ];
    return Object.keys(asset).filter(k => {
      if (standardKeys.includes(k)) return false;
      if (standardKeys.some(sk => sk.toLowerCase() === k.toLowerCase())) return false;
      return typeof asset[k] === 'string' && asset[k].trim() !== '';
    }).map(k => ({ key: k, value: asset[k] }));
  };

  const handleOpenAlertCenter = (asset: any) => {
    setPremiumAlert({
      show: true,
      title: 'Central de Emissão de Alertas Premium',
      message: 'Configure e despache alertas de vencimentos e relatórios para gestores de forma imediata via WhatsApp, Telegram ou Email.',
      type: 'critical',
      dispatchData: asset
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 select-none font-mono">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-650 rounded-t-2xl" />
        <div className="absolute -right-10 -bottom-10 opacity-5 text-9xl select-none pointer-events-none" aria-hidden="true">🧯</div>
        <div>
          <h2 className="font-bold text-xl text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>🧯</span> Inventário de Extintores SPCI
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-sans leading-relaxed">
            Visão consolidada do controle de conformidades, validades de recarga e teste hidrostático da planta corporativa.
          </p>
        </div>
        <button 
          onClick={() => { setShowAddForm(true); setNewAssetType('extintor'); }} 
          className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer rounded-xl border-none active:scale-[0.97] flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Extintor
        </button>
      </div>

      {/* Grid of Extinguisher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-800">
        {extintores.map((asset) => (
          <div key={asset.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-350 transition-all duration-300 group">
            {/* Color status bar */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-all duration-300 ${
              asset.status === 'Conforme' ? 'bg-emerald-600' : asset.status === 'Vencido' ? 'bg-rose-600' : 'bg-amber-500'
            }`}></div>
            
            <div className="p-5 pl-7">
              <div className="flex justify-between items-start mb-4 gap-2">
                <div>
                  <span className="font-mono text-slate-400 text-[10px] font-bold tracking-widest block uppercase">PATRIMÔNIO: {asset.idAtivo}</span>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight uppercase mt-0.5">{asset.model}</h3>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border shrink-0 ${
                  asset.status === 'Conforme' 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                    : asset.status === 'Vencido' 
                      ? 'text-rose-700 bg-rose-50 border-rose-100' 
                      : 'text-amber-700 bg-amber-50 border-amber-100'
                }`}>
                  {asset.status}
                </span>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Local:</span>
                  <span className="text-slate-900 font-extrabold truncate max-w-[80px]">{asset.location}</span> 
                  <span className="text-slate-400 font-sans">|</span> 
                  <span className="text-slate-600 truncate">{asset.subLocation}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Selo:</span>
                  <span className="text-slate-950 font-mono font-bold">{asset.seloInmetro}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px] w-12 tracking-wider shrink-0">Chassi:</span>
                  <span className="text-slate-950 font-mono font-bold uppercase">{asset.chassi}</span> 
                  <span className="text-slate-400 font-sans">|</span> 
                  <span className="text-slate-900 font-bold">{asset.peso}kg</span>
                </p>
                
                {getCustomAttributes(asset).length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200">
                    <p className="text-[8px] font-mono font-black text-teal-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">✨ Campos Auto-Modelados IA</p>
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[9px] font-mono text-slate-700 bg-teal-50/50 p-2 rounded-xl border border-teal-100/60 leading-tight">
                      {getCustomAttributes(asset).map((attr, idx) => (
                        <div key={idx} className="truncate" title={`${attr.key}: ${attr.value}`}>
                          <span className="font-bold text-teal-800">{attr.key}:</span> {attr.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-center border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                <div className="border-r border-slate-100">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Última Recarga</p>
                  <p className="font-extrabold text-slate-700 font-mono mt-0.5">{asset.lastRecarga}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Próxima Validade</p>
                  <p className={`font-black font-mono mt-0.5 ${asset.status === 'Vencido' ? 'text-rose-600 animate-pulse font-bold' : 'text-slate-800'}`}>{asset.validadeRecarga}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none rounded-b-2xl">
              <button 
                onClick={() => { setSelectedAssetForInspection(asset); }} 
                className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-2.5 tracking-wider rounded-xl border-none cursor-pointer flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Inspecionar
              </button>
              
              <button 
                onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'extintor' }); }} 
                className="border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase flex items-center gap-1.5 bg-white cursor-pointer transition-all active:scale-95 shadow-xs" 
                title="Ver Histórico NBR"
              >
                <History className="w-3.5 h-3.5" /> Histórico
              </button>
              
              <button 
                onClick={() => handleOpenAlertCenter(asset)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl border-none cursor-pointer transition-all active:scale-95 shadow-xs" 
                title="Alerta Corporativo"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={async () => {
                  const conf = confirm(`Deseja remover permanentemente o ativo ${asset.idAtivo}?`);
                  if (conf) {
                    const updated = extintores.filter(x => x.id !== asset.id);
                    setExtintores(updated);
                    await saveAssetsList('extintores', updated);
                  }
                }} 
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl border-none cursor-pointer transition-all active:scale-95 shadow-xs" 
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
