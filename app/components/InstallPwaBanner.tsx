'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Impede que o mini-infobar padrão do Chrome apareça no mobile
      e.preventDefault();
      // Salva o evento para ser acionado depois
      setDeferredPrompt(e);
      // Exibe o banner apenas se o usuário ainda não tiver instalado
      const isDismissed = localStorage.getItem('spci_pwa_install_dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se a app já estiver instalada (standalone)
    const handleAppInstalled = () => {
      console.log('SPCI foi instalado com sucesso.');
      setDeferredPrompt(null);
      setIsVisible(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostra o prompt de instalação
    deferredPrompt.prompt();
    
    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Limpa o prompt
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Evita incomodar o usuário por 7 dias
    localStorage.setItem('spci_pwa_install_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 z-50 ring-1 ring-slate-800 overflow-hidden"
      >
        {/* Subtle background orange ambient glow */}
        <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500 shrink-0 mt-0.5">
          <Download size={18} className="animate-bounce" />
        </div>

        <div className="flex-grow space-y-1">
          <h4 className="text-xs font-black font-sans tracking-tight uppercase text-slate-100 flex items-center gap-1.5">
            Instalar Aplicativo SPCI
          </h4>
          <p className="text-[10.5px] leading-relaxed text-slate-400 font-sans">
            Acesse o portal mais rápido, realize inspeções e vistorias offline em campo sem interrupções de rede.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-mono text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none font-bold"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              Agora Não
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-350 cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0"
          aria-label="Fechar banner"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
