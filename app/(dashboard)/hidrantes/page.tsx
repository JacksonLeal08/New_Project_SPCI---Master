'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function HidrantesPage() {
  const {
    hidrantes,
    setHidrantes,
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">💧 Hidrantes & Abrigos</h2>
          <p className="text-slate-500 text-xs">Acompanhamento de mangueiras (NBR 12779) e chaves Storz</p>
        </div>
        <button onClick={() => { setShowAddForm(true); setNewAssetType('hidrante'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors border-none cursor-pointer">
          ➕ Novo Hidrante
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hidrantes.map((asset) => (
          <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
            <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Conforme' ? 'bg-[#2E7D32]' : asset.status === 'Vencido' ? 'bg-[#D32F2F]' : 'bg-[#F57C00]'}`}></div>
            
            <div className="p-5 pl-7">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-mono text-slate-400 text-xs">HD: {asset.idAtivo}</span>
                  <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">Abrigo + Acessórios</h3>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Conforme' ? 'text-green-800 bg-green-100' : asset.status === 'Vencido' ? 'text-red-800 bg-red-100' : 'text-amber-800 bg-amber-100'}`}>
                  {asset.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                <p>📍 <strong>Local:</strong> {asset.location} - {asset.subLocation}</p>
                <p>📦 <strong>Componentes:</strong> {asset.components.join(', ')}</p>
                {getCustomAttributes(asset).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                    <p className="text-[9px] font-mono font-black text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">✨ Campos Auto-Modelados IA</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-mono text-slate-600 bg-teal-50/50 p-1.5 rounded border border-teal-100/60 leading-tight">
                      {getCustomAttributes(asset).map((attr, idx) => (
                        <div key={idx} className="truncate" title={`${attr.key}: ${attr.value}`}>
                          <span className="font-bold text-teal-800">{attr.key}:</span> {attr.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-3 text-[10px]">
                <div>
                  <p className="text-slate-400 font-['Hanken_Grotesk'] uppercase font-extrabold pb-0.5">Último Teste</p>
                  <p className="font-semibold text-slate-700 font-mono">{asset.lastInsp}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-['Hanken_Grotesk'] uppercase font-extrabold pb-0.5">Próximo Teste</p>
                  <p className={`font-semibold font-mono ${asset.status === 'Vencido' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{asset.nextInsp}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0">
              <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] hover:bg-green-700 text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg border-none cursor-pointer">📋 Inspecionar</button>
              <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'hidrante' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0 bg-white cursor-pointer" title="Ver Histórico NBR">📜 Histórico</button>
              <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200 border-none cursor-pointer" title="Alerta Corporativo">🔔</button>
              <button onClick={async () => {
                const conf = confirm(`Remover hidrante ${asset.idAtivo}?`);
                if (conf) {
                  const updated = hidrantes.filter(x => x.id !== asset.id);
                  setHidrantes(updated);
                  await saveAssetsList('hidrantes', updated);
                }
              }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 border-none cursor-pointer">❌</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
