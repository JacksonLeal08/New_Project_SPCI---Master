'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, ShieldCheck, Flame, Droplets, QrCode } from 'lucide-react';
import AppFooter from '../components/AppFooter';

export default function ConsultaIndexClient() {
  const [assetId, setAssetId] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = assetId.trim().toUpperCase();
    if (cleanId) {
      router.push(`/consulta/${encodeURIComponent(cleanId)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 my-auto py-10">
        
        {/* Header da Consulta Pública */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/60 border border-red-800/70 text-red-400 text-[10px] uppercase font-bold tracking-widest rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Portal Público de Conformidade NBR
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-['Hanken_Grotesk']">
            Consulta Pública de Ativos SPCI
          </h1>
          <p className="text-xs text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
            Consulte a ficha técnica, selo Inmetro, data de recarga e integridade hidrostática de qualquer equipamento de combate a incêndio.
          </p>
        </header>

        {/* Formulário de Busca por ID */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl backdrop-blur-md space-y-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="assetInput" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Código de Patrimônio / ID do Ativo / Selo
              </label>
              <div className="relative">
                <input
                  id="assetInput"
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="Ex: EXT-001, HID-02, BOMBA-01"
                  className="w-full px-4 py-3.5 pl-11 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm uppercase tracking-wider focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                  required
                />
                <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-950/30 border-none cursor-pointer active:scale-95"
            >
              <span>Consultar Ficha Técnica</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Dicas Rápidas */}
          <div className="border-t border-slate-800/80 pt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400 font-sans">
            <div className="flex flex-col items-center gap-1">
              <Flame className="w-4 h-4 text-red-500" />
              <span>Extintores</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span>Hidrantes</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Conformidade</span>
            </div>
          </div>
        </div>

        {/* Voltar para Início */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider font-mono inline-flex items-center gap-1"
          >
            ← Voltar para a Página Inicial
          </Link>
        </div>

      </div>

      <AppFooter variant="fixed" />
    </div>
  );
}
