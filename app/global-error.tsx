'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('[SPCI Global Root Error]', error);
  }, [error]);

  const handleCopy = () => {
    const text = `[SPCI CRITICAL ROOT ERROR]
Timestamp: ${new Date().toISOString()}
Message: ${error.message}
Digest: ${error.digest || 'N/A'}
Stack: ${error.stack || 'N/A'}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold">
            SISTEMA SPCI // FALHA GLOBAL DE INICIALIZAÇÃO
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase">
            Recuperação de Sistema
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
            Houve uma falha na inicialização do aplicativo. Suas vistorias e fotos salvas localmente no aparelho continuam preservadas.
          </p>

          <div className="w-full my-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-red-400 overflow-x-auto max-h-24">
            {error.message || 'Erro crítico de renderização no layout raiz.'}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar Sistema</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Erro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
