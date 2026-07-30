'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSpci } from '../context/SpciContext';
import { 
  LayoutDashboard, 
  Flame, 
  Droplet, 
  AlertTriangle, 
  Lightbulb, 
  Sliders, 
  Smartphone, 
  Bell, 
  Settings, 
  Plus,
  History,
  LogOut,
  X,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Bot,
  Sparkles
} from 'lucide-react';
import { SYSTEM_VERSION } from '@/config/version';
import WhatsNewModal from './WhatsNewModal';

interface SidebarProps {
  onProfileClick?: () => void;
  onLogoutClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export const Sidebar = ({ onProfileClick, onLogoutClick, isOpen, onClose, onCollapseChange }: SidebarProps) => {
  const pathname = usePathname();
  const { 
    userProfile, 
    currentUser, 
    setShowAddForm, 
    setSelectedAssetForInspection,
    setChatOpened
  } = useSpci();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('spci_sidebar_collapsed');
    if (savedState === 'true') {
      setIsCollapsed(true);
      if (onCollapseChange) onCollapseChange(true);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('spci_sidebar_collapsed', String(nextState));
    if (onCollapseChange) onCollapseChange(nextState);
  };

  const getActiveTab = () => {
    if (pathname === '/') return 'dashboard';
    const firstSegment = pathname.split('/')[1];
    return firstSegment || 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleRegisterNewAssetClick = () => {
    setSelectedAssetForInspection(null);
    setShowAddForm(true);
  };

  const isAdmin = userProfile?.role === 'Administrador' || userProfile?.role === 'Desenvolvedor' || userProfile?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard / Visão Geral', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
    { id: 'extintores', label: 'Extintores', icon: <Flame className="w-5 h-5" />, path: '/extintores' },
    { id: 'hidrantes', label: 'Hidrantes & Abrigos', icon: <Droplet className="w-5 h-5" />, path: '/hidrantes' },
    { id: 'sinalizacao', label: 'Sinalização NBR', icon: <AlertTriangle className="w-5 h-5" />, path: '/sinalizacao' },
    { id: 'iluminacao', label: 'Iluminação Emergência', icon: <Lightbulb className="w-5 h-5" />, path: '/iluminacao' },
    { id: 'bombas', label: 'Casa de Bombas', icon: <Sliders className="w-5 h-5" />, path: '/bombas' },
    { id: 'ronda', label: 'Despacho & Ronda Campo', icon: <Smartphone className="w-5 h-5" />, path: '/ronda' },
    { id: 'alerts', label: 'Disparo de Alertas', icon: <Bell className="w-5 h-5" />, path: '/alerts' },
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'logs', label: 'Logs do Sistema', icon: <History className="w-5 h-5" />, path: '/logs' }] : []),
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'gestao-ativo', label: 'Gestão de Ativo', icon: <Boxes className="w-5 h-5" />, path: '/gestao-ativo' }] : []),
    ...(isAdmin ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5" />, path: '/configuracoes' }] : [])
  ];

  const filteredNavItems = navItems.filter(item => {
    if (userProfile?.role === 'Desenvolvedor') return true;
    if (item.id === 'logs' || item.id === 'gestao-ativo') return false;
    if (item.id === 'configuracoes') return isAdmin;
    if (item.id === 'dashboard') return true;
    if (userProfile?.permissions && userProfile.permissions.length > 0) {
      return userProfile.permissions.includes(item.id);
    }
    return false;
  });

  return (
    <aside 
      className={`bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col py-6 shrink-0 shadow-xl border-r border-slate-200 dark:border-slate-800 z-50 h-screen select-none font-sans fixed lg:static inset-y-0 left-0 transform lg:transform-none transition-all duration-300 ${
        isCollapsed ? 'w-20 px-2' : 'w-72 px-4'
      } ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      aria-label="Menu principal"
    >
      {/* Botão de Fechar no Mobile */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white border-none bg-transparent cursor-pointer p-1"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Botão para recolher/expandir a Sidebar no Desktop */}
      <button
        onClick={toggleCollapse}
        className="hidden lg:flex absolute -right-3.5 top-6 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900 shadow-xl cursor-pointer z-50 transition-transform hover:scale-110 active:scale-95"
        title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
        aria-label="Recolher/Expandir barra lateral"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Marca Principal Grupo OMG - Empilhada (Logo + SPCI MASTER abaixo) */}
      <div className={`flex flex-col items-center justify-center mb-6 pt-1 transition-all shrink-0 ${isCollapsed ? 'px-0' : 'px-2'}`}>
        <img 
          src="/logo-omg.png" 
          alt="Logo Grupo OMG" 
          className={`object-contain shrink-0 filter drop-shadow-md transition-all ${
            isCollapsed ? 'h-8 w-auto max-w-[48px]' : 'h-14 w-auto'
          }`} 
        />
        {!isCollapsed && (
          <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider uppercase mt-2 leading-none text-center">
            SPCI MASTER
          </h2>
        )}
      </div>

      {/* Links de navegação semânticos com ícones e Tooltips no hover */}
      <nav className={`flex-grow space-y-1.5 px-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`} aria-label="Navegação do painel">
        {filteredNavItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative group">
              <Link
                href={item.path}
                className={`flex items-center gap-3 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-300 text-left relative ${
                  isCollapsed ? 'justify-center px-0' : 'px-4'
                } ${
                  isActive 
                    ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-800 font-bold shadow-lg shadow-red-900/30 text-white border border-red-500/30' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:translate-x-0.5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`inline-flex items-center transition-transform duration-300 group-hover:scale-125 group-hover:rotate-3 ${isActive ? 'text-white' : 'text-red-600 dark:text-red-400'}`} aria-hidden="true">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="font-['Hanken_Grotesk'] transition-transform duration-300 truncate">
                    {item.label}
                  </span>
                )}
              </Link>

              {/* Tooltip flutuante quando a sidebar está recolhida */}
              {isCollapsed && (
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white rounded-xl shadow-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-50 border border-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Botão 3D Tactile Cyber-Red Inspe IA (Posicionado abaixo de Configurações) */}
      <div className={`my-3 px-1 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="relative group w-full">
          <button
            type="button"
            onClick={() => setChatOpened(true)}
            className={`w-full relative flex items-center bg-gradient-to-r from-red-700 via-rose-700 to-slate-900 hover:from-red-600 hover:to-rose-800 text-white rounded-2xl shadow-lg shadow-rose-950/40 hover:shadow-xl hover:shadow-rose-950/60 active:translate-y-0.5 border border-rose-500/30 hover:border-rose-400/50 transition-all duration-200 cursor-pointer overflow-hidden font-sans ${
              isCollapsed ? 'p-3 justify-center h-12 w-12' : 'p-3.5 gap-3'
            }`}
            title="Abrir Assistente Virtual Inspe IA SPCI 24h"
            aria-label="Abrir Assistente Virtual Inspe IA 24h"
          >
            {/* Brilho diagonal de reflexo de vidro */}
            <div className="absolute -top-10 -left-10 w-20 h-32 bg-white/10 rotate-45 transform pointer-events-none group-hover:translate-x-48 transition-transform duration-700 ease-in-out" aria-hidden="true" />

            {/* Ícone Robô 3D com Indicador LED Verde Pulsante */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-400/50 flex items-center justify-center shadow-inner text-white group-hover:scale-110 transition-transform">
                <Bot className="w-5 h-5 text-red-100" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            {/* Rótulos e Badge quando expandida */}
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-['Hanken_Grotesk'] font-black text-xs uppercase tracking-wider text-white truncate">
                    INSPE IA SPCI
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full shrink-0 font-mono flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> 24H
                  </span>
                </div>
                <span className="text-[9.5px] font-medium text-red-200/90 font-mono mt-0.5 truncate">
                  Assistente NBR & Laudos
                </span>
              </div>
            )}

            {/* Tooltip quando a sidebar está recolhida */}
            {isCollapsed && (
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3.5 py-2 bg-slate-900 text-white rounded-xl shadow-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-50 border border-red-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>INSPE IA SPCI (AGENTE 24H)</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Indicador de banco conectado e versão */}
      {!isCollapsed && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-center text-xs space-y-1 mb-2 select-none shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[11px]">
              <span aria-hidden="true">🟢</span> Banco SPCI Ativo
            </p>
            <button 
              onClick={() => setShowWhatsNew(true)}
              className="text-[9px] font-bold bg-red-100 dark:bg-red-600/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/40 px-1.5 py-0.5 rounded-md hover:scale-105 transition-transform cursor-pointer"
              title="Clique para ver as novidades da versão"
            >
              {SYSTEM_VERSION}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-none truncate text-left pt-0.5">
            {currentUser ? `User: ${currentUser.email?.split('@')[0]}` : 'Offline-first'}
          </p>
        </div>
      )}

      {/* Modal de Novidades da Versão */}
      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

      {/* Botão de Logout */}
      {onLogoutClick && (
        <button
          onClick={onLogoutClick}
          className={`mt-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-red-600 border border-slate-200 dark:border-slate-700 hover:border-transparent text-slate-600 dark:text-slate-300 hover:text-white font-['Hanken_Grotesk'] font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs active:scale-[0.98] relative group shrink-0 ${
            isCollapsed ? 'px-0 w-full' : 'px-4 w-full'
          }`}
          title={isCollapsed ? "Sair do Cockpit" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>SAIR DO COCKPIT</span>}

          {isCollapsed && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-red-950 text-red-200 rounded-xl shadow-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-50 border border-red-800">
              Sair do Cockpit
            </div>
          )}
        </button>
      )}
    </aside>
  );
};
