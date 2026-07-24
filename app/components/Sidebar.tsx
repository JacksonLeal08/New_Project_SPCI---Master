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
  ChevronRight
} from 'lucide-react';

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
    setSelectedAssetForInspection
  } = useSpci();

  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { id: 'dashboard', label: 'Dashboard / Visão Geral', icon: <LayoutDashboard className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/dashboard' },
    { id: 'extintores', label: 'Extintores', icon: <Flame className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/extintores' },
    { id: 'hidrantes', label: 'Hidrantes & Abrigos', icon: <Droplet className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/hidrantes' },
    { id: 'sinalizacao', label: 'Sinalização NBR', icon: <AlertTriangle className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/sinalizacao' },
    { id: 'iluminacao', label: 'Iluminação Emergência', icon: <Lightbulb className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/iluminacao' },
    { id: 'bombas', label: 'Casa de Bombas', icon: <Sliders className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/bombas' },
    { id: 'ronda', label: 'Despacho & Ronda Campo', icon: <Smartphone className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/ronda' },
    { id: 'alerts', label: 'Disparo de Alertas', icon: <Bell className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/alerts' },
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'logs', label: 'Logs do Sistema', icon: <History className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/logs' }] : []),
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'gestao-ativo', label: 'Gestão de Ativo', icon: <Boxes className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/gestao-ativo' }] : []),
    ...(isAdmin ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" />, path: '/configuracoes' }] : [])
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
      className={`bg-[#1b2a32] dark:bg-[#262626] text-white flex flex-col py-6 shrink-0 shadow-2xl border-r border-[#cfd8dc]/10 z-50 h-screen select-none font-sans fixed lg:static inset-y-0 left-0 transform lg:transform-none transition-all duration-300 ${
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
          className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-white border-none bg-transparent cursor-pointer p-1"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Botão para recolher/expandir a Sidebar no Desktop */}
      <button
        onClick={toggleCollapse}
        className="hidden lg:flex absolute -right-3.5 top-7 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full border-2 border-slate-900 shadow-xl cursor-pointer z-50 transition-transform hover:scale-110 active:scale-95"
        title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
        aria-label="Recolher/Expandir barra lateral"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Marca Principal Grupo OMG - Empilhada (Logo + SPCI MASTER abaixo) */}
      <div className={`flex flex-col items-center justify-center mb-6 pt-2 transition-all ${isCollapsed ? 'px-0' : 'px-2'}`}>
        <img 
          src="/logo-omg.png" 
          alt="Logo Grupo OMG" 
          className={`object-contain shrink-0 filter drop-shadow-[0_4px_12px_rgba(220,38,38,0.4)] transition-all ${
            isCollapsed ? 'h-10 w-auto' : 'h-14 w-auto'
          }`} 
        />
        {!isCollapsed && (
          <h2 className="text-xs font-black text-slate-100 tracking-wider uppercase mt-2 leading-none text-center">
            SPCI MASTER
          </h2>
        )}
      </div>

      {/* Botão para cadastrar novo ativo */}
      <button 
        onClick={handleRegisterNewAssetClick}
        className={`bg-[#af101a] hover:bg-[#d32f2f] text-white font-['Hanken_Grotesk'] font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 mb-6 group transition-all duration-300 transform hover:scale-[1.03] active:scale-95 shadow-md shadow-red-950/20 border-none cursor-pointer relative ${
          isCollapsed ? 'px-2' : 'px-4 w-full'
        }`}
        title={isCollapsed ? "Registrar Novo Ativo" : undefined}
      >
        <Plus className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span>REGISTRAR NOVO ATIVO</span>}
      </button>

      {/* Links de navegação semânticos com ícones 3D e Tooltips no hover */}
      <nav className="flex-grow space-y-1.5 overflow-y-auto px-1" aria-label="Navegação do painel">
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
                    ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-800 font-bold shadow-lg shadow-red-900/40 text-white border border-red-500/30' 
                    : 'text-slate-300 hover:bg-[#37474F]/60 hover:text-white hover:translate-x-0.5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="inline-flex items-center transition-transform duration-300 group-hover:scale-125 group-hover:rotate-3" aria-hidden="true">
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-50 border border-slate-700">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Indicador de banco conectado */}
      {!isCollapsed && (
        <div className="bg-[#2D424A]/20 border border-[#CFD8DC]/5 p-3 rounded-xl text-center text-xs space-y-1 mb-2 select-none">
          <p className="text-emerald-450 font-bold flex items-center justify-center gap-2 font-['Hanken_Grotesk']">
            <span aria-hidden="true">🟢</span> Banco SPCI Ativo
          </p>
          <p className="text-[10px] text-slate-400 font-mono leading-none truncate">
            {currentUser ? `User: ${currentUser.email?.split('@')[0]}` : 'Offline-first'}
          </p>
        </div>
      )}

      {/* Botão de Logout */}
      {onLogoutClick && (
        <button
          onClick={onLogoutClick}
          className={`mt-2 bg-[#2D424A]/20 hover:bg-[#af101a] border border-[#CFD8DC]/10 hover:border-transparent text-slate-300 hover:text-white font-['Hanken_Grotesk'] font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs active:scale-[0.98] relative group ${
            isCollapsed ? 'px-0 w-full' : 'px-4 w-full'
          }`}
          title={isCollapsed ? "Sair do Cockpit" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>SAIR DO COCKPIT</span>}

          {isCollapsed && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-red-950 text-red-200 rounded-lg shadow-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap z-50 border border-red-800">
              Sair do Cockpit
            </div>
          )}
        </button>
      )}
    </aside>
  );
};
