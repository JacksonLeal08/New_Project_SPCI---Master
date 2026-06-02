'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function BombasPage() {
  const {
    bombas,
    triggerSuccessNotification
  } = useSpci();

  const [pressure, setPressure] = useState(125);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // --- PUMP PRESSURE FLUTTER SIMULATOR ---
  useEffect(() => {
    if (!isTestRunning) return;
    const interval = setInterval(() => {
      setPressure(prev => {
        const delta = Math.floor(Math.random() * 20) - 10;
        const target = prev + delta;
        return target < 80 ? 80 : target > 160 ? 160 : target;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isTestRunning]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-['Hanken_Grotesk'] font-bold text-2xl text-slate-800">⚙️ Casa de Bombas Combate a Incêndio</h2>
          <p className="text-slate-500 text-xs">Pressão da rede principal em tempo real (PSI) e RTI</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (isTestRunning) {
                setPressure(125);
              }
              setIsTestRunning(!isTestRunning);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-sm flex items-center gap-2 border-none cursor-pointer ${isTestRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-700 hover:bg-red-800'}`}
          >
            <span>🔄</span> {isTestRunning ? 'Parar Teste de Pressão' : 'Iniciar Simulação de Vazão'}
          </button>
        </div>
      </div>

      {/* Network Pressure indicator visual widget */}
      <div className="bg-white rounded-3xl border border-[#CFD8DC] p-6 shadow-sm relative overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="absolute top-0 bottom-0 left-0 w-2 bg-[#2E7D32]"></div>
        
        <div className="md:col-span-8 space-y-4 pl-4">
          <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800">Pressão Estável da Rede de Hidrantes</h3>
          <div className="flex h-3 bg-slate-100 rounded-full overflow-hidden border">
            <div className="bg-[#af101a] h-full" style={{ width: '25%' }}></div>
            <div className="bg-[#2E7D32] h-full" style={{ width: '50%' }}></div>
            <div className="bg-amber-505 h-full" style={{ width: '25%' }}></div>
          </div>
          <div className="flex justify-between font-mono text-[9px] text-slate-400">
            <span>0 PSI</span>
            <span>50 PSI</span>
            <span>100 PSI (MÍN)</span>
            <span>120 PSI (IDEAL)</span>
            <span>160 PSI (MAX)</span>
          </div>
        </div>

        <div className="md:col-span-4 text-center bg-slate-50 border p-4 rounded-2xl relative">
          <p className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">PSI Atual Estabilizado</p>
          <p className={`font-['Hanken_Grotesk'] text-5xl font-black transition-all ${pressure < 110 ? 'text-amber-500' : 'text-green-700'}`}>{pressure}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Garantia NBR regulamente operável</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bombas.map((pump) => (
          <div key={pump.id} className="bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-[#CFD8DC] group">
            <div className={`absolute top-0 bottom-0 left-0 w-2 ${pump.status === 'Operacional' || pump.status === 'Standby' ? 'bg-[#2E7D32]' : 'bg-[#F57C00]'}`}></div>
            
            <div className="pl-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-['Hanken_Grotesk'] font-bold text-[#37474F] text-base">{pump.name}</h4>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize ${pump.status === 'Operacional' ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'}`}>{pump.status}</span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 bg-slate-50 border rounded-lg p-2.5">
                <p>🎛️ <strong>Alimentação:</strong> {pump.power}</p>
                <p>📌 <strong>Faixa Operada:</strong> {pump.range}</p>
                <p>🔩 <strong>Partidas:</strong> {pump.starts}</p>
              </div>
            </div>

            <div className="border-t pt-3 mt-4 flex items-center justify-between pl-4">
              <button onClick={() => triggerSuccessNotification(`Teste manual enviado para ${pump.name}`, `Acionamento remoto NBR do dispositivo efetuado com sucesso.`)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 text-xs font-bold uppercase rounded-lg border-none cursor-pointer">⚡ Acionar Teste</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
