'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Home, ClipboardCheck, ArrowLeft, QrCode } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans select-none relative overflow-hidden">
      {/* Glow de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative z-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-4">
          <Search className="w-8 h-8" />
        </div>

        <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
          CÓDIGO 404 // RECURSO NÃO LOCALIZADO
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase tracking-tight">
          Página Não Encontrada
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
          O equipamento, relatório ou rota solicitada não foi encontrado ou pode ter sido movido.
        </p>

        <div className="w-full grid grid-cols-1 gap-2.5 mt-6">
          <Link
            href="/"
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/20 min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            <span>Ir para o Dashboard</span>
          </Link>

          <Link
            href="/inspecao"
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <span>Central de Vistorias</span>
          </Link>

          <Link
            href="/scan"
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Escanear QR Code</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
