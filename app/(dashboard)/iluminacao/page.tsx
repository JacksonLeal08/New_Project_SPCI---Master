'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import DisintegrationOverlay from '@/app/components/DisintegrationOverlay';

export default function IluminacaoPage() {
  const {
    iluminacoes,
    setIluminacoes,
    saveAssetsList,
    deleteAsset,
    setShowAddForm,
    setNewAssetType,
    setSelectedAssetForInspection,
    setSelectedAssetForHistory,
    setPremiumAlert,
    userProfile,
    deletingAssetId,
    setDeletingAssetId,
    requestAssetDeletion
  } = useSpci();

  const canDelete = userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'Administrador';

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
          <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">💡 Iluminação de Emergência</h2>
          <p className="text-slate-500 text-xs">Registro de baterias, testes de centrais e motogeradores</p>
        </div>
        <button onClick={() => { setShowAddForm(true); setNewAssetType('iluminacao'); }} className="bg-[#af101a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors border-none cursor-pointer">
          ➕ Nova Luminária
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { title: 'Normais', count: iluminacoes.filter(x => x.status === 'Operacional').length, color: 'border-l-green-600', emoji: '🔋' },
          { title: 'Atenção Bateria', count: iluminacoes.filter(x => x.status === 'Atenção').length, color: 'border-l-amber-500', emoji: '⚠️' },
          { title: 'Falha de Carga', count: iluminacoes.filter(x => x.status === 'Falha Carga').length, color: 'border-l-red-600', emoji: '🛑' },
          { title: 'Baterias Totais', count: iluminacoes.length, color: 'border-l-slate-700', emoji: '💡' }
        ].map((sub, i) => (
          <div key={i} className={`bg-white border border-[#CFD8DC] rounded-xl p-4 shadow-sm border-l-4 ${sub.color} flex justify-between items-center`}>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{sub.title}</p>
              <p className="text-xl font-bold font-mono text-slate-800 mt-1">{sub.count}</p>
            </div>
            <span className="text-xl">{sub.emoji}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {iluminacoes.map((asset) => (
          <div 
            key={asset.id} 
            className={`transition-all duration-300 group flex flex-col justify-between rounded-2xl ${
              deletingAssetId === asset.id 
                ? 'border-transparent shadow-none bg-transparent overflow-visible' 
                : 'bg-white border border-[#CFD8DC] shadow-sm relative overflow-hidden hover:shadow-lg transition-shadow'
            }`}
          >
            <DisintegrationOverlay
              isActive={deletingAssetId === asset.id}
              themeColor="#f59e0b"
            />
            
            <div className={`flex flex-col justify-between h-full w-full transition-all duration-300 ${
              deletingAssetId === asset.id ? 'opacity-0 scale-95 pointer-events-none' : ''
            }`}>
              <div className={`absolute top-0 left-0 bottom-0 w-2 ${asset.status === 'Operacional' ? 'bg-[#2E7D32]' : asset.status === 'Falha Carga' ? 'bg-[#D32F2F]' : 'bg-[#F57C00]'}`}></div>
              
              <div className="p-5 pl-7">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-mono text-slate-400 text-xs">LUM: {asset.idAtivo}</span>
                    <h3 className="font-['Hanken_Grotesk'] font-bold text-slate-800 text-base">{asset.model}</h3>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'}`}>
                    {asset.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border">
                  <p>📍 <strong>Local:</strong> {asset.location} - {asset.subLocation}</p>
                  <p>⚡ <strong>Sistema:</strong> {asset.systemType}</p>
                </div>

                <div className="flex justify-between text-[11px] font-mono border-t pt-3">
                  <span>🔋 Carga: <strong className="text-slate-800">{asset.battery}</strong></span>
                  <span>⏲️ Autonomia: <strong className="text-slate-800">{asset.autonomy}</strong></span>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between gap-1 overflow-x-auto shrink-0 rounded-b-2xl">
                <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] hover:bg-green-700 text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg border-none cursor-pointer">📋 Inspecionar</button>
                <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'iluminacao' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0 bg-white cursor-pointer" title="Ver Histórico NBR">📜 Histórico</button>
                <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200 border-none cursor-pointer">🔔</button>
                {canDelete && (
                  <button onClick={() => {
                    requestAssetDeletion(asset, 'iluminacao', async () => {
                      setDeletingAssetId(asset.id);
                      await new Promise((resolve) => setTimeout(resolve, 1200));
                      await deleteAsset('iluminacao', asset.id);
                      setDeletingAssetId(null);
                    });
                  }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 border-none cursor-pointer">❌</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
