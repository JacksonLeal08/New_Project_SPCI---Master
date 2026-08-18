'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import DisintegrationOverlay from '@/app/components/DisintegrationOverlay';

export default function HidrantesPage() {
  const {
    hidrantes,
    setHidrantes,
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

  const getCustomAttributes = (asset: any) => {
    const standardKeys = [
      'id', 'idAtivo', 'id_ativo', 'patrimonio', 'numero_patrimonio', 'numeroPatrimonio', 'cod_patrimonio', 'patrimonio_sugerido',
      'category', 'model', 'modelo', 'location', 'subLocation', 'sub_location', 'seloInmetro', 'selo_inmetro', 'selo_inmetro_anterior',
      'chassi', 'numero_serie', 'numeroSerie', 'serialNumber', 'peso', 'peso_capacidade', 'capacidade', 'capacidade_peso',
      'lastRecarga', 'data_ultima_recarga', 'ultima_recarga', 'recurrenceInterval', 'meses_validade_recarga', 'mes_ano_ultima_recarga', 'mes_ano_vencimento',
      'validadeRecarga', 'validade_recarga', 'validadeTesteHidro', 'data_vencimento_teste', 'status', 'status_estoque', 'statusEstoque',
      'tipo_movimentacao', 'tipoMovimentacao', 'statusConformidade', 'status_conformidade', 'geolocation', 'type', 'components',
      'lastInsp', 'nextInsp', 'group', 'systemType', 'qty', 'battery', 'autonomy', 'name', 'code', 'power', 'range', 'starts',
      'qr_code_hash', 'qrCodeHash', 'fotoUrl', 'foto_url', 'ultimoTesteHidro', 'anoFabricacao', 'ano_fabricacao', 'ano_ultimo_teste_hidro',
      'anoUltimoTesteHidro', 'created_at', 'updated_at', 'validadeRecargaMeses', 'data_pesagem_co2', 'details', 'lote_manutencao_atual_id',
      'fabricante', 'etiqueta_garantia', 'area', 'projeto', 'local', 'setor', 'tipo_equipamento', 'agente_extintor', 'sub_local', 'prateleira',
      'formattedRecarga', 'formattedVencimento', 'createdAt', 'updatedAt', 'loteId', 'lote_id'
    ];

    const formatLabel = (rawKey: string): string => {
      const clean = rawKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    return Object.keys(asset).filter(k => {
      if (standardKeys.includes(k)) return false;
      if (standardKeys.some(sk => sk.toLowerCase() === k.toLowerCase())) return false;
      const val = asset[k];
      return val !== null && val !== undefined && typeof val !== 'object' && String(val).trim() !== '' && String(val).trim() !== '---';
    }).map(k => ({ key: formatLabel(k), rawKey: k, value: String(asset[k]) }));
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
              themeColor="#14b8a6"
            />
            
            <div className={`flex flex-col justify-between h-full w-full transition-all duration-300 ${
              deletingAssetId === asset.id ? 'opacity-0 scale-95 pointer-events-none' : ''
            }`}>
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
                    <div className="mt-2 pt-2 border-t border-slate-200/80">
                      <p className="text-[8.5px] font-mono font-black text-indigo-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Atributos Avançados IA
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-slate-100/70 p-2 rounded-xl border border-slate-200/60 leading-tight">
                        {getCustomAttributes(asset).map((attr, idx) => (
                          <div key={idx} className="truncate flex items-center gap-1" title={`${attr.key}: ${attr.value}`}>
                            <span className="font-bold text-slate-700">{attr.key}:</span>
                            <span className="text-slate-900 font-semibold truncate">{attr.value}</span>
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

              <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between gap-2 overflow-x-auto shrink-0 rounded-b-2xl">
                <button onClick={() => { setSelectedAssetForInspection(asset); }} className="flex-1 text-center bg-[#2E7D32] hover:bg-green-700 text-white text-xs font-bold uppercase py-2 tracking-wider rounded-lg border-none cursor-pointer">📋 Inspecionar</button>
                <button onClick={() => { setSelectedAssetForHistory({ ...asset, type: 'hidrante' }); }} className="border border-slate-200 hover:bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] uppercase flex items-center gap-1 shrink-0 bg-white cursor-pointer" title="Ver Histórico NBR">📜 Histórico</button>
                <button onClick={() => handleOpenAlertCenter(asset)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200 border-none cursor-pointer" title="Alerta Corporativo">🔔</button>
                {canDelete && (
                  <button onClick={() => {
                    requestAssetDeletion(asset, 'hidrante', async () => {
                      setDeletingAssetId(asset.id);
                      await new Promise((resolve) => setTimeout(resolve, 1200));
                      await deleteAsset('hidrantes', asset.id);
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
