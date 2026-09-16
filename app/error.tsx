'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowLeft,
  Terminal,
  HelpCircle
} from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    // Loga o erro em ambiente de desenvolvimento ou telemetria
    console.error('[SPCI Route Error]', error);
  }, [error]);

  const handleCopyDiagnostics = () => {
    const diagnostics = `[SPCI SYSTEM RECOVERY DIAGNOSTICS]
Timestamp: ${new Date().toISOString()}
Message: ${error.message}
Digest: ${error.digest || 'N/A'}
Stack: ${error.stack || 'N/A'}
UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(diagnostics).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans select-none relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative z-10 overflow-hidden flex flex-col">
        {/* Barra superior de status */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Cabeçalho */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold">
                ESCUDO DE PROTEÇÃO // SISTEMA SPCI
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight">
              Instabilidade Temporária
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              Ocorreu uma oscilação na renderização desta página. Nenhum dado de vistoria, foto ou ativo foi perdido.
            </p>
          </div>
        </div>

        {/* Cartão de Garantia de Dados Locais */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl mb-5 flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-300 font-bold block mb-0.5">
              Armazenamento Local Protegido
            </strong>
            Suas vistorias e fotos salvas localmente no celular continuam preservadas com segurança na base do IndexedDB.
          </div>
        </div>

        {/* Detalhes Técnicos Expansíveis */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showTechnicalDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes do Erro'}</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl font-mono text-[11px] text-red-400 overflow-x-auto max-h-36 scrollbar-thin">
              <p className="font-bold text-slate-400 mb-1">Causa:</p>
              <p className="whitespace-pre-wrap">{error.message || 'Erro inesperado na aplicação.'}</p>
              {error.digest && (
                <p className="text-slate-500 text-[10px] mt-2">Código Digest: {error.digest}</p>
              )}
            </div>
          )}
        </div>

        {/* Grade Bento de Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/30 min-h-[48px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Página</span>
          </button>

          <Link
            href="/"
            className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            <Home className="w-4 h-4" />
            <span>Painel Principal</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Diagnóstico Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Diagnóstico</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
