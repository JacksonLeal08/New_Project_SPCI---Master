'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '../context/SpciContext';
import { Shield, Key, Mail, AlertTriangle, ArrowRight } from 'lucide-react';

export default function LoginClient() {
  const router = useRouter();
  const { 
    currentUser, 
    authChecking, 
    handleCredentialsLogin, 
    handleGoogleLogin 
  } = useSpci();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progress, setProgress] = useState(0);

  // Status messages for interactive loading
  const statusMessages = [
    'Validando chaves criptográficas...',
    'Resolvendo endpoint Supabase...',
    'Mapeando políticas de Row Level Security (RLS)...',
    'Conectando chaves assimétricas...',
    'Iniciando handshake seguro com servidor...',
    'Sincronizando cache local IndexedDB...',
    'Carregando credenciais corporativas...',
    'Acesso concedido. Bem-vindo ao SPCI!'
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (!authChecking && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, authChecking, router]);

  // Loading animation simulation
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;

    if (loading) {
      setTimeout(() => {
        setProgress(0);
        setLoadingStatus(statusMessages[0]);
      }, 0);

      // Progress bar animation
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          const step = Math.floor(Math.random() * 8) + 4; // random increments
          return Math.min(prev + step, 100);
        });
      }, 150);

      // Status text message rotation
      let currentMsgIndex = 0;
      messageInterval = setInterval(() => {
        if (currentMsgIndex < statusMessages.length - 1) {
          currentMsgIndex++;
          setLoadingStatus(statusMessages[currentMsgIndex]);
        }
      }, 400);
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Preencha todos os campos.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const success = await handleCredentialsLogin(identifier, password);
      if (success) {
        // Wait a bit to show 100% progress and final welcome status message
        setProgress(100);
        setLoadingStatus(statusMessages[statusMessages.length - 1]);
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        setLoading(false);
        setErrorMsg('Credenciais inválidas.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Erro ao efetuar login.');
    }
  };

  const handleGoogleSubmit = async () => {
    setErrorMsg('');
    try {
      await handleGoogleLogin();
      // Google Login redirects, so loading is handled by the browser redirection
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao efetuar login com o Google.');
    }
  };

  if (authChecking) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center text-slate-400 font-mono">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Verificando Sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-mono relative overflow-hidden select-none">
      {/* Decorative absolute background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row z-10 w-full">
        
        {/* LEFT COLUMN: Industrial Conceptual & Compliance */}
        <div className="hidden md:flex md:w-[45%] lg:w-[50%] relative flex-col justify-between p-12 overflow-hidden border-r border-slate-900">
          {/* Background image with high contrast brand gradient overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-[0.4] saturate-[0.8] transition-transform duration-10000 ease-out" 
            style={{ backgroundImage: `url('/login-bg.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

          {/* Logo Brand top */}
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-500 text-lg font-black shadow-lg shadow-red-950/30">
              🧯
            </div>
            <div>
              <span className="text-[10px] text-red-500 font-bold tracking-[0.2em] block uppercase leading-none">Plataforma</span>
              <h2 className="text-base font-black text-slate-100 tracking-tight leading-none mt-1">SPCI COMPLIANCE</h2>
            </div>
          </div>

          {/* Title and Legal Compliance middle/bottom */}
          <div className="relative space-y-6 max-w-lg mt-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/50 border border-red-900/60 text-red-400 text-[10px] uppercase font-extrabold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Conformidade Legal NBR 12962 / 13434
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl lg:text-4xl font-black text-slate-100 uppercase tracking-tight leading-none">
                Gestão & Governança de Combate a Incêndio
              </h1>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Centralização de laudos técnicos, vistorias em tempo real, rastreabilidade offline-first de ativos e relatórios executivos para governança predial e industrial.
              </p>
            </div>
          </div>

          {/* Footer stats bottom */}
          <div className="relative pt-6 border-t border-slate-900/80 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-12">
            <span>SISTEMA DE SEGURANÇA</span>
            <span>v2.1.0</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean premium dark form */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 bg-slate-950/80 backdrop-blur-md relative">
          
          <div className="mx-auto w-full max-w-sm space-y-8">
            {/* Header info for mobile (logo + branding) */}
            <div className="md:hidden flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-500 text-base font-black">
                🧯
              </div>
              <div>
                <span className="text-[8px] text-red-500 font-bold tracking-[0.2em] block uppercase leading-none">Plataforma</span>
                <h2 className="text-sm font-black text-slate-100 tracking-tight leading-none mt-1">SPCI COMPLIANCE</h2>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Acessar Cockpit</h2>
              <p className="text-xs text-slate-400 font-sans">Entre com suas credenciais corporativas SPCI.</p>
            </div>

            {/* Error box */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-red-950/40 border border-red-900/60 p-4 flex gap-3 text-red-400"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-[11px] font-bold leading-normal">
                    <p className="uppercase">Erro de Acesso</p>
                    <p className="font-sans font-medium mt-0.5">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="usuario ou email@empresa.com"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-red-600/80 focus:shadow-[0_0_12px_rgba(220,38,38,0.15)] rounded-none py-3 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Senha Geral
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-red-600/80 focus:shadow-[0_0_12px_rgba(220,38,38,0.15)] rounded-none py-3 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.25)] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 border border-transparent active:scale-[0.98]"
              >
                ENTRAR NO SISTEMA <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-900"></div>
              <span className="flex-shrink mx-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">OU ACESSO SECUNDÁRIO</span>
              <div className="flex-grow border-t border-slate-900"></div>
            </div>

            {/* Google OAuth spectating disclaimer */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSubmit}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4 mr-1 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </button>

              <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-none space-y-1">
                <p className="text-[9px] text-amber-500 font-extrabold uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Observação Google Auth (Espectador)
                </p>
                <p className="text-[9px] text-slate-500 font-sans leading-normal">
                  Usuários autenticados via Google assumem perfil de **Espectador** e não possuem permissão para acessar o painel de **Configurações** corporativo.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* INTERACTIVE LOADING OVERLAY */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="max-w-md w-full space-y-8 relative">
              {/* Pulsating Center Shield with red neon inner shadow */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.08, 1],
                    boxShadow: [
                      '0 0 20px rgba(220,38,38,0.2), inset 0 0 15px rgba(220,38,38,0.2)',
                      '0 0 35px rgba(220,38,38,0.5), inset 0 0 25px rgba(220,38,38,0.4)',
                      '0 0 20px rgba(220,38,38,0.2), inset 0 0 15px rgba(220,38,38,0.2)'
                    ]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-20 h-20 bg-slate-900 border-2 border-red-600 rounded-full flex items-center justify-center shadow-lg relative"
                >
                  <Shield className="w-9 h-9 text-red-500 drop-shadow-[0_0_6px_rgba(220,38,38,0.6)]" />
                </motion.div>
              </div>

              {/* Text indicator */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase text-slate-100 tracking-widest">
                  ESTABELECENDO ACESSO SEGURO
                </h3>
                {/* Dynamically changing message status */}
                <div className="h-6 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingStatus}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-[10px] text-red-400 font-bold uppercase tracking-wider"
                    >
                      {loadingStatus}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Horizontal neon progress bar */}
              <div className="w-full max-w-xs mx-auto">
                <div className="h-1 bg-slate-900 border border-slate-800 relative w-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase mt-2 px-1">
                  <span>SEGURANÇA SPCI</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
