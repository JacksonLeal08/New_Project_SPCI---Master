'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { 
  fetchSitesAction, 
  fetchContratosAction 
} from '@/app/actions/userActions';
import ProfileManagementBento from '@/app/components/ProfileManagementBento';
import UsersManagementBento from '@/app/components/UsersManagementBento';
import SuppliersManagementBento from '@/app/components/SuppliersManagementBento';
import ContractsManagementBento from '@/app/components/ContractsManagementBento';
import { Moon, Sun } from 'lucide-react';

const DEFAULT_SITES = [
  'TODOS OS SITES (Acesso Global)',
  'SALOBO',
  'ONÇA PUMA'
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  
  const {
    userProfile,
    authChecking
  } = useSpci();

  // Estado da aba ativa
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'suppliers' | 'contratos'>('profile');

  // Estado do tema local para garantir alta fidelidade de contraste (Dark Cockpit vs Executive Light)
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Lista de sites e contratos
  const [sitesList, setSitesList] = useState<string[]>(DEFAULT_SITES);

  // Detecção inicial de tema do sistema ou preferência salva
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') || 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const handleThemeChange = (newPref: 'dark' | 'light' | 'system') => {
    if (newPref === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      setTheme(newPref);
      if (newPref === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Guard: exclusivo para administradores credenciados do SPCI
  const isAdmin = userProfile?.role === 'Administrador' || 
    userProfile?.role === 'Desenvolvedor' || 
    userProfile?.role === 'Gestor' || 
    userProfile?.role === 'admin';

  const canManageContratos = userProfile?.role === 'Desenvolvedor' || 
    userProfile?.role === 'Gestor' || 
    userProfile?.role === 'Administrador';

  // Sincronização de Sites e Contratos oficiais
  useEffect(() => {
    async function syncSites() {
      try {
        const res = await fetchContratosAction();
        if (res.success && res.contratos) {
          const dbNomes = res.contratos.map((c: any) => c.nome);
          const combined = Array.from(new Set([...DEFAULT_SITES, ...dbNomes]));
          setSitesList(combined);
        } else {
          const sitesRes = await fetchSitesAction();
          const combined = Array.from(new Set([...DEFAULT_SITES, ...(sitesRes.sites || [])]));
          setSitesList(combined);
        }
      } catch (e) {
        console.warn('Erro ao carregar sites:', e);
      }
    }
    syncSites();
  }, []);

  // Bloqueio de visualização para operadores sem papel administrativo
  if (!isAdmin && !authChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md mx-auto shadow-2xl space-y-4 my-12 font-mono relative text-slate-800 dark:text-zinc-100">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-2xl" />
        <span className="text-4xl" role="img" aria-label="Acesso restrito">🚫</span>
        <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans leading-relaxed">
          Esta área de configurações e governança do sistema é exclusiva para administradores credenciados do SPCI Master.
        </p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer rounded-xl border-none active:scale-95 shadow-sm"
        >
          Voltar para Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`w-full space-y-6 pb-24 font-mono select-none transition-colors duration-200 ${
        theme === 'dark' ? 'text-zinc-100' : 'text-slate-900'
      }`}
    >
      {/* 1. CABEÇALHO EXECUTIVO COM ALTERNADOR RÁPIDO DE TEMA */}
      <div
        className={`border p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl shadow-xs transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-700" />
        <div className="absolute -right-10 -bottom-10 opacity-5 text-9xl select-none pointer-events-none" aria-hidden="true">⚙️</div>

        <div>
          <h2 className="font-black text-xl uppercase tracking-wider flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-rose-500 border border-red-500/20 text-lg">
              ⚙️
            </span>
            <span>Painel de Configurações & Governança</span>
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1.5 font-sans leading-relaxed">
            Centralize o gerenciamento do seu perfil, governança de credenciais, fornecedores e controle multi-tenant de contratos operacionais.
          </p>
        </div>

        {/* Alternador Rápido de Tema (Dark / Light) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Mudar para Tema Claro (Executive Light)' : 'Mudar para Tema Escuro (Cockpit Dark)'}
            className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-amber-400 hover:border-zinc-700'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} />
                <span className="hidden sm:inline">Executive Light</span>
              </>
            ) : (
              <>
                <Moon size={15} />
                <span className="hidden sm:inline">Cockpit Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO POR ABAS HORIZONTAIS */}
      <div
        className={`flex border-b gap-1 overflow-x-auto shrink-0 scrollbar-none transition-colors duration-200 ${
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-200'
        }`}
      >
        {/* Aba 1: Meu Perfil */}
        <button 
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
            activeTab === 'profile' 
              ? theme === 'dark'
                ? 'bg-zinc-900 border-t-2 border-t-red-500 border-x border-x-zinc-800 text-red-500 font-black shadow-xs'
                : 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <span>👤</span> Meu Perfil
        </button>

        {/* Aba 2: Controle de Usuários */}
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
            activeTab === 'users' 
              ? theme === 'dark'
                ? 'bg-zinc-900 border-t-2 border-t-red-500 border-x border-x-zinc-800 text-red-500 font-black shadow-xs'
                : 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <span>👥</span> Controle de Usuários
        </button>

        {/* Aba 3: Fornecedores & Prestadores */}
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
            activeTab === 'suppliers' 
              ? theme === 'dark'
                ? 'bg-zinc-900 border-t-2 border-t-red-500 border-x border-x-zinc-800 text-red-500 font-black shadow-xs'
                : 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40'
          }`}
        >
          <span>🏢</span> Fornecedores & Prestadores
        </button>

        {/* Aba 4: Gestão de Contratos (Sites) */}
        {canManageContratos && (
          <button 
            onClick={() => setActiveTab('contratos')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-xl flex items-center gap-2 ${
              activeTab === 'contratos' 
                ? theme === 'dark'
                  ? 'bg-zinc-900 border-t-2 border-t-red-500 border-x border-x-zinc-800 text-red-500 font-black shadow-xs'
                  : 'bg-white border-t-2 border-t-red-600 border-x border-x-slate-200 text-red-600 font-extrabold shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <span>📋</span> Gestão de Contratos (SITES)
          </button>
        )}
      </div>

      {/* 3. CONTEÚDO DA ABA ATIVA (COMPONENTES BENTO MODULARES) */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="tab-profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ProfileManagementBento 
              availableSites={sitesList} 
              currentTheme={theme} 
              onThemeChange={handleThemeChange} 
            />
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="tab-users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <UsersManagementBento 
              availableSites={sitesList} 
              theme={theme} 
            />
          </motion.div>
        )}

        {activeTab === 'suppliers' && (
          <motion.div
            key="tab-suppliers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <SuppliersManagementBento />
          </motion.div>
        )}

        {activeTab === 'contratos' && canManageContratos && (
          <motion.div
            key="tab-contratos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ContractsManagementBento theme={theme} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
