'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';

export default function RondaPage() {
  const router = useRouter();
  const {
    extintores,
    hidrantes,
    setSelectedAssetForInspection
  } = useSpci();

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      
      {/* Immersive Mobile view design layout */}
      <div className="max-w-md mx-auto bg-white border border-[#CFD8DC] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col h-[640px]">
        
        {/* Mobile telephone top speaker design details */}
        <div className="bg-[#121c21] p-3 text-white text-center text-xs flex justify-between px-6 shrink-0 relative z-10 font-mono">
          <span className="text-[10px]">✨ SPCI Ronda (Field)</span>
          <div className="w-20 h-4 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2"></div>
          <span className="text-[10px] text-green-400">⚡ 100% On</span>
        </div>

        {/* Header mimicking mobile style */}
        <div className="bg-gradient-to-r from-[#af101a] to-[#d32f2f] text-white p-5 shrink-0 select-none text-center">
          <h3 className="font-['Hanken_Grotesk'] font-black text-xl tracking-wider uppercase font-mono">INSP <span className="bg-green-600 text-white py-0.5 px-2.5 text-xs rounded-full">✓</span> FIELD</h3>
          <p className="text-[10px] text-rose-100 font-bold mt-1">EXTENSÃO FORMULÁRIO DE INSPEÇÕES DE CAMPO</p>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 font-mono">Toque em qualquer ativo cadastrado abaixo para carregar o checklist de campo instantâneo.</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold pl-1">Selecione Ativo no Campo</p>
            
            {/* Grid mapping for fast inspection selection */}
            {extintores.map(ext => (
              <button 
                key={ext.id} 
                onClick={() => setSelectedAssetForInspection(ext)}
                className="w-full bg-white p-3 border border-slate-200 rounded-xl hover:border-red-600 transition-colors flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">{ext.idAtivo}</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">{ext.model}</p>
                  <p className="text-[10px] text-slate-500">{ext.location}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase p-1 rounded ${ext.status === 'Conforme' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                  {ext.status}
                </span>
              </button>
            ))}

            {hidrantes.map(hid => (
              <button 
                key={hid.id} 
                onClick={() => setSelectedAssetForInspection(hid)}
                className="w-full bg-white p-3 border border-slate-200 rounded-xl hover:border-red-600 transition-colors flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-[9px] bg-[#bee9ff] text-[#005f7b] px-1.5 py-0.5 rounded font-bold uppercase">{hid.idAtivo}</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">Hidrante + Mangueira</p>
                  <p className="text-[10px] text-slate-500">{hid.location}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase p-1 rounded ${hid.status === 'Conforme' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                  {hid.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Telephone simulated back button */}
        <div className="bg-[#121c21] p-3 text-center shrink-0">
          <button 
            onClick={() => { router.push('/dashboard'); }}
            className="bg-white/20 hover:bg-white/40 text-white font-['Hanken_Grotesk'] text-[10px] uppercase font-bold py-1.5 px-6 rounded-full border-none cursor-pointer"
          >
            Voltar Para Principal
          </button>
        </div>
      </div>
    </motion.div>
  );
}
