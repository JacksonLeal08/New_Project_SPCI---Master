'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useSpci } from '../context/SpciContext';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';

const STATUS_MESSAGES = [
  'Encerrando Handshake Seguro...',
  'Desfazendo conexões de banco de dados Supabase...',
  'Limpando tokens de autenticação criptografados...',
  'Preservando fila de sincronismo local (IndexedDB)...',
  'Sessão Finalizada com Segurança. Até logo! 🚒'
];

export default function LogoutClient() {
  const router = useRouter();
  const { handleGoogleLogout } = useSpci();

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando encerramento de sessão...');

  useEffect(() => {
    if (!isConfirmed) return;

    // Execute real logout
    const triggerLogout = async () => {
      try {
        await handleGoogleLogout();
      } catch (err) {
        console.error('Erro ao efetuar logout no client:', err);
      }
    };
    triggerLogout();

    // Progress bar animation (3 seconds)
    const totalDuration = 3000;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            router.push('/login');
          }, 400);
          return 100;
        }
        return Math.min(prev + step, 100);
      });
    }, intervalTime);

    // Messages rotation
    let currentMsgIndex = 0;
    const messageInterval = setInterval(() => {
      if (currentMsgIndex < STATUS_MESSAGES.length - 1) {
        currentMsgIndex++;
        setLoadingStatus(STATUS_MESSAGES[currentMsgIndex]);
      }
    }, 600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isConfirmed, handleGoogleLogout, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono relative overflow-hidden select-none text-slate-400">
      {/* Decorative absolute background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      <div className="max-w-md w-full p-6 space-y-8 relative text-center z-10">
        
        {/* Shield Icon container with neon glow */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 20px rgba(220,38,38,0.1), inset 0 0 15px rgba(220,38,38,0.1)',
                '0 0 35px rgba(220,38,38,0.4), inset 0 0 25px rgba(220,38,38,0.3)',
                '0 0 20px rgba(220,38,38,0.1), inset 0 0 15px rgba(220,38,38,0.1)'
              ]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-20 h-20 bg-slate-900 border-2 border-red-600 rounded-full flex items-center justify-center shadow-lg relative"
          >
            <Shield className="w-9 h-9 text-red-500 drop-shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
          </motion.div>
        </div>

        {isConfirmed ? (
          <>
            {/* HUD Text Indicators */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase text-slate-100 tracking-widest">
                SPCI COMPLIANCE SYSTEM
              </h3>
              
              <div className="h-6 flex items-center justify-center">
                <motion.p
                  key={loadingStatus}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[10px] text-red-400 font-bold uppercase tracking-wider"
                >
                  {loadingStatus}
                </motion.p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto space-y-2">
              <div className="h-1 bg-slate-900 border border-slate-800 relative w-full overflow-hidden">
                <motion.div 
                  className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase px-1">
                <span>Sessão Encerrando</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">
                Encerrar Sessão no SPCI?
              </h3>
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed px-4">
                Deseja realmente sair do cockpit? Todas as suas configurações e registros de sincronismo local no IndexedDB continuarão seguros neste dispositivo.
              </p>
            </div>

            <div className="flex gap-4 max-w-xs mx-auto">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 text-[9px] uppercase font-bold tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancelar
              </button>
              
              <button
                onClick={() => setIsConfirmed(true)}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white text-[9px] uppercase font-black tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border-none shadow-md shadow-red-950/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/login')}
          className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
        >
          <LogOut className="w-3 h-3" />
          Ir para Login Manualmente
        </button>

      </div>
    </div>
  );
}
