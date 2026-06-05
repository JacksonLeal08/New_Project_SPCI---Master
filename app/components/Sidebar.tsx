import React from 'react';
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
  Plus 
} from 'lucide-react';

interface SidebarProps {
  onProfileClick: () => void;
}

export const Sidebar = ({ onProfileClick }: SidebarProps) => {
  const pathname = usePathname();
  const { 
    userProfile, 
    currentUser, 
    setShowAddForm, 
    setSelectedAssetForInspection,
    isGoogleUser
  } = useSpci();

  // Deriva o tab ativo a partir do pathname da URL
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
    { id: 'dashboard', label: 'Dashboard / Visão Geral', icon: <LayoutDashboard className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/dashboard' },
    { id: 'extintores', label: 'Extintores', icon: <Flame className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/extintores' },
    { id: 'hidrantes', label: 'Hidrantes & Abrigos', icon: <Droplet className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/hidrantes' },
    { id: 'sinalizacao', label: 'Sinalização NBR', icon: <AlertTriangle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/sinalizacao' },
    { id: 'iluminacao', label: 'Iluminação Emergência', icon: <Lightbulb className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/iluminacao' },
    { id: 'bombas', label: 'Casa de Bombas', icon: <Sliders className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/bombas' },
    { id: 'ronda', label: 'Despacho & Ronda Campo', icon: <Smartphone className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/ronda' },
    { id: 'alerts', label: 'Disparo de Alertas', icon: <Bell className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/alerts' },
    ...(isAdmin && !isGoogleUser ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/configuracoes' }] : [])
  ];

  return (
    <aside 
      className="w-72 bg-[#1b2a32] text-white flex flex-col px-4 py-6 shrink-0 shadow-2xl border-r border-[#cfd8dc]/10 z-20 h-screen select-none font-sans"
      aria-label="Menu principal"
    >
      {/* Botão de Perfil do Usuário */}
      <div 
        onClick={onProfileClick}
        className="flex items-center gap-3 mb-8 mt-2 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-300 group hover:scale-[1.02]"
        title="Clique para editar seu perfil e logo"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProfileClick(); }}
      >
        {userProfile?.logoUrl ? (
          <img 
            src={userProfile.logoUrl} 
            alt={`Logo da empresa de ${userProfile?.name || 'técnico'}`}
            className="w-11 h-11 rounded-xl object-contain border border-slate-500 bg-white p-1 shadow-md transition-transform duration-300 group-hover:scale-105" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <div 
            className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center text-xl shadow-lg border border-red-500 animate-pulse group-hover:scale-105 transition-transform duration-300"
            aria-hidden="true"
          >
            🧯
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="sr-only">Perfil de usuário ativo:</span>
          <h1 className="font-['Hanken_Grotesk'] text-sm font-black tracking-tight text-white m-0 truncate group-hover:text-amber-200 transition-colors">
            {userProfile?.name ? userProfile.name.toUpperCase() : 'SISTEMA SPCI'}
          </h1>
          <p className="font-mono text-[9px] text-slate-400 tracking-wider uppercase block leading-tight mt-0.5">
            {userProfile ? `🛡️ ${isAdmin ? 'ADMIN' : 'TÉCNICO'}` : 'Offline-first'}
          </p>
        </div>
      </div>

      {/* Botão para cadastrar novo ativo */}
      <button 
        onClick={handleRegisterNewAssetClick}
        className="w-full bg-[#af101a] hover:bg-[#d32f2f] text-white font-['Hanken_Grotesk'] font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 group transition-all duration-300 transform hover:scale-[1.03] active:scale-95 shadow-md shadow-red-950/20 border-none cursor-pointer"
      >
        <Plus className="w-4 h-4" /> REGISTRAR NOVO ATIVO
      </button>

      {/* Links de navegação semânticos e com tags ARIA */}
      <nav className="flex-grow space-y-1 overflow-y-auto" aria-label="Navegação do painel">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-300 text-left group ${
                isActive 
                  ? 'bg-gradient-to-r from-red-700 to-rose-600 font-bold shadow-md shadow-red-900/30 text-white' 
                  : 'text-slate-350 hover:bg-[#37474F]/50 hover:text-white hover:translate-x-1'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="inline-flex items-center" aria-hidden="true">{item.icon}</span>
              <span className="font-['Hanken_Grotesk'] transition-transform duration-300 group-hover:translate-x-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Indicador de banco conectado */}
      {isAdmin && !isGoogleUser ? (
        <Link 
          href="/configuracoes"
          className="bg-[#2D424A]/40 border border-[#CFD8DC]/10 p-3 rounded-xl text-center text-xs space-y-1.5 mb-2 cursor-pointer hover:bg-[#37474F]/75 transition-all group block hover:scale-[1.01]"
        >
          <p className="text-[#a5d6a7] font-bold flex items-center justify-center gap-2 font-['Hanken_Grotesk']">
            <span aria-hidden="true">{currentUser ? '🟢' : '⚪'}</span> {currentUser ? 'Google DB Conectante' : 'DB Sheets Off'}
          </p>
          <p className="text-[10px] text-slate-400 font-mono leading-none group-hover:text-amber-200 transition-colors">
            {currentUser ? `User: ${currentUser.email?.split('@')[0]}` : 'Clique para Configurar'}
          </p>
        </Link>
      ) : (
        <div className="bg-[#2D424A]/20 border border-[#CFD8DC]/5 p-3 rounded-xl text-center text-xs space-y-1.5 mb-2 select-none">
          <p className="text-slate-400 font-bold flex items-center justify-center gap-2 font-['Hanken_Grotesk']">
            <span aria-hidden="true">{currentUser ? '🟢' : '⚪'}</span> {currentUser ? 'Google DB Ativo' : 'DB Offline'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono leading-none">
            {currentUser ? `User: ${currentUser.email?.split('@')[0]}` : 'Sem planilhas'}
          </p>
        </div>
      )}
    </aside>
  );
};
