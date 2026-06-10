'use client';

import React from 'react';
import { useSpci } from '@/app/context/SpciContext';
import { motion } from 'motion/react';

export default function AcessoExpiradoPage() {
  const { handleSystemLogout } = useSpci();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-red-600"></div>
        
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner shadow-amber-500/20" aria-hidden="true">
          ⌛
        </div>

        <div className="space-y-2">
          <h2 className="font-['Hanken_Grotesk'] font-black text-2xl tracking-tight text-slate-100">
            Acesso Expirado
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            O período de vigência da sua credencial de acesso corporativo chegou ao fim no painel de governança do SPCI.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-3">
          <p className="flex gap-2">
            <span>🛡️</span>
            <span>Suas políticas de leitura e escrita do banco de dados (RLS) foram revogadas automaticamente.</span>
          </p>
          <p className="flex gap-2">
            <span>✉️</span>
            <span>Entre em contato com um <strong>Administrador</strong> ou <strong>Desenvolvedor</strong> da planta para restabelecer o seu prazo de validade.</span>
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button 
            onClick={async () => {
              try {
                await handleSystemLogout();
                window.location.href = '/';
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-['Hanken_Grotesk'] font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md border-none cursor-pointer"
          >
            Sair e Trocar de Conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
