'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function SinalizacaoPage() {
  const {
    sinalizacoes,
    setSinalizacoes,
    saveAssetsList,
    setShowAddForm,
    setNewAssetType,
    setSelectedAssetForInspection,
    setSelectedAssetForHistory,
    setPremiumAlert
  } = useSpci();

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
          <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">⚠️ Inventário de Sinalização NBR 13434</h2>
          <p className="text-slate-500 text-xs">Controle de fotoluminescentes e placas de rotas de fuga</p>
        </div>
        <button onClick={() => { setShowAddForm(true); setNewAssetType('sinalizacao'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors border-none cursor-pointer">
          ➕ Nova Placa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sinalizacoes.map((asset) => (
          <div key={asset.id} className="bg-white rounded-2xl border border-[#CFD8DC] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-shadow group">
            <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Conforme' ? 'bg-[#2E7D32]' : 'bg-[#D32F2F]'}`}></div>
            
            <div className="p-5 pl-7">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-mono text-slate-400 text-xs">SIN: {asset.idAtivo}</span>
                  <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">{asset.model}</h3>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Conforme' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`}>
                  {asset.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                <p>📍 <strong>Local:</strong> {asset.location} | Sub-Local: {asset.subLocation}</p>
                <p>🔖 <strong>Tipo de Placa:</strong> {asset.group}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-between gap-2 overflow-x-auto shrink-0 font-['Hanken_Grotesk'] font-bold uppercase">
              <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-grow text-center bg-[#2E7D32] hover:bg-green-700 text-white text-xs py-2 tracking-wider rounded-lg border-none cursor-pointer">📋 Inspecionar</button>
              <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'sinalizacao' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0 bg-white cursor-pointer" title="Ver Histórico NBR">📜 Histórico</button>
              <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200 border-none cursor-pointer" title="Alerta Corporativo">🔔</button>
              <button onClick={async () => {
                const conf = confirm(`Remover placa ${asset.idAtivo}?`);
                if (conf) {
                  const updated = sinalizacoes.filter(x => x.id !== asset.id);
                  setSinalizacoes(updated);
                  await saveAssetsList('sinalizacoes', updated);
                }
              }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 border-none cursor-pointer">❌</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
