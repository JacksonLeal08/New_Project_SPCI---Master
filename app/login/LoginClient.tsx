'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '../context/SpciContext';
import { Shield, Key, Mail, AlertTriangle, ArrowRight, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import AppFooter from '../components/AppFooter';
import { SYSTEM_VERSION } from '../config/version';
import { supabase } from '@/lib/supabaseClient';

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

export default function LoginClient() {
  const router = useRouter();
  const { 
    currentUser, 
    authChecking, 
    handleCredentialsLogin 
  } = useSpci();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progress, setProgress] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authChecking && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, authChecking, router]);

  // Capturar e tratar erros de links de e-mail expirados / hash de autenticação
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes('error=') || hash.includes('otp_expired') || hash.includes('invalid')) {
        setErrorMsg('⚠️ O link de e-mail expirou ou é inválido. Por favor, utilize suas credenciais corporativas de login.');
        window.history.replaceState(null, '', window.location.pathname);
      } else if (hash.includes('type=recovery')) {
        setShowForgotModal(true);
        setForgotMsg({ type: 'success', text: 'Link de recuperação identificado! Digite seu e-mail para atualizar a nova senha.' });
        window.history.replaceState(null, '', window.location.pathname);
      } else if (hash.includes('type=signup') || hash.includes('access_token')) {
        router.push('/dashboard' + hash);
      }
    }
  }, [router]);

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

      return () => {
        clearInterval(progressInterval);
        clearInterval(messageInterval);
      };
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await handleCredentialsLogin(identifier, password);
      if (result) {
        setTimeout(() => {
          setLoading(false);
          router.push('/dashboard');
        }, 1200);
      } else {
        setLoading(false);
        setErrorMsg('Credenciais inválidas.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Erro ao efetuar login.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        setForgotMsg({ type: 'error', text: error.message || 'Falha ao enviar e-mail de redefinição.' });
      } else {
        setForgotMsg({ type: 'success', text: 'E-mail de redefinição enviado! Verifique sua caixa de entrada.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: 'Ocorreu um erro ao processar a solicitação.' });
    } finally {
      setForgotLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-400 font-mono">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Verificando Sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-mono relative overflow-hidden select-none">
      
      {/* Decorative absolute background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row w-full min-h-screen z-10">
        
        {/* LEFT COLUMN: Industrial Conceptual & Compliance (Dominante 65%) */}
        <div className="hidden md:flex md:w-[62%] lg:w-[65%] relative flex-col justify-between p-12 overflow-hidden border-r border-slate-200 dark:border-slate-900">
          {/* Background image with high contrast brand gradient overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-[0.7] dark:brightness-[0.4] saturate-[0.8] transition-transform duration-10000 ease-out" 
            style={{ backgroundImage: `url('/login-bg.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent dark:from-slate-950" />

          {/* Logo Brand top - Grupo OMG */}
          <div className="relative flex items-center gap-5">
            <img 
              src="/logo-omg.png" 
              alt="Logo Grupo OMG" 
              className="h-14 lg:h-16 w-auto object-contain brightness-110 drop-shadow-[0_4px_16px_rgba(220,38,38,0.4)] transition-transform hover:scale-105" 
            />
            <div>
              <span className="text-[10px] text-red-500 font-bold tracking-[0.2em] block uppercase leading-none">PLATAFORMA</span>
              <span className="text-base font-black text-white tracking-tight leading-none mt-1 block">SPCI MASTER</span>
            </div>
          </div>

          {/* Title and Legal Compliance middle/bottom */}
          <div className="relative space-y-6 max-w-xl mt-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/60 border border-red-800/70 text-red-400 text-[10px] uppercase font-extrabold tracking-wider rounded-lg backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Conformidade Legal NBR 12962 / 13434 / 13714
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-tight">
                Gestão & Governança de Combate a Incêndio
              </h2>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                Centralização de laudos técnicos, vistorias em tempo real, rastreabilidade offline-first de ativos e relatórios executivos para governança predial e industrial.
              </p>
            </div>
          </div>

          {/* Footer stats bottom */}
          <div className="relative pt-6 border-t border-slate-800/80 flex items-center justify-start text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-12">
            <span>SISTEMA DE SEGURANÇA GRUPO OMG</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Light-First / Dual Theme Card (35%) */}
        <div className="md:w-[38%] lg:w-[35%] flex-1 flex flex-col justify-between px-6 py-8 sm:px-10 bg-white/90 dark:bg-slate-950/65 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 shadow-2xl relative z-20">
          
          <div className="my-auto w-full max-w-sm mx-auto space-y-8">
            {/* Header info for mobile (logo + branding) */}
            <div className="md:hidden flex items-center gap-3 mb-6">
              <img src="/logo-omg.png" alt="Logo Grupo OMG" className="h-10 w-auto object-contain drop-shadow-md" />
              <div>
                <span className="text-[8px] text-red-600 dark:text-red-500 font-bold tracking-[0.2em] block uppercase leading-none">PLATAFORMA</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-1 block">SPCI MASTER</span>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h1 className="text-xl font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wider">Acessar Cockpit SPCI</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Entre com suas credenciais corporativas SPCI.</p>
            </div>

            {/* Error box */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 flex gap-3 text-red-600 dark:text-red-400 rounded-xl"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-[11px] font-bold leading-normal">
                    <p className="uppercase">Erro de Acesso</p>
                    <p className="font-sans font-medium mt-0.5">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="usuario ou email@empresa.com"
                    className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/30 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-all duration-300 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                  Senha Geral
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/30 rounded-xl py-3 pl-10 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-all duration-300 font-bold"
                  />

                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors border-none bg-transparent cursor-pointer"
                      aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-red-600 dark:text-red-500" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Opções Adicionais: Checkbox Permanecer Logado + Link Esqueci Minha Senha */}
              <div className="flex items-center justify-between text-[11px] font-sans">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  {rememberMe ? (
                    <CheckSquare className="w-4 h-4 text-red-600 dark:text-red-500" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                  )}
                  <span>Permanecer conectado</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMsg(null);
                    setForgotEmail(identifier.includes('@') ? identifier : '');
                    setShowForgotModal(true);
                  }}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors border-none bg-transparent cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 shadow-md text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 border-none rounded-xl active:scale-[0.98]"
              >
                ENTRAR NO SISTEMA <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-4 mt-6 text-center">
            <AppFooter variant="flow" className="py-0 text-[10px]" />
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
            className="fixed inset-0 bg-slate-50/95 dark:bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="max-w-md w-full space-y-8 relative">
              {/* Pulsating Center Shield */}
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
                  className="w-20 h-20 bg-white dark:bg-slate-900 border-2 border-red-600 rounded-full flex items-center justify-center shadow-lg relative"
                >
                  <Shield className="w-9 h-9 text-red-600 dark:text-red-500 drop-shadow-[0_0_6px_rgba(220,38,38,0.6)]" />
                </motion.div>
              </div>

              {/* Text indicator */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase text-slate-900 dark:text-slate-100 tracking-widest">
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
                      className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider"
                    >
                      {loadingStatus}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Horizontal neon progress bar */}
              <div className="w-full max-w-xs mx-auto">
                <div className="h-1 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 relative w-full overflow-hidden rounded-full">
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

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl relative space-y-5 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase text-slate-900 dark:text-slate-100 tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-red-600 dark:text-red-500" />
                  Recuperar Acesso
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs uppercase cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                Informe o seu e-mail corporativo cadastrado para receber as instruções de redefinição de senha.
              </p>

              {forgotMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-sans font-medium ${
                    forgotMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}
                >
                  {forgotMsg.text}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                    E-mail Cadastrado
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/30 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-all font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase border-none cursor-pointer transition-all shadow-md"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar E-mail'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
