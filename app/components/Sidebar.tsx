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
  Plus,
  History,
  LogOut,
  X,
  Boxes
} from 'lucide-react';

interface SidebarProps {
  onProfileClick: () => void;
  onLogoutClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ onProfileClick, onLogoutClick, isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { 
    userProfile, 
    currentUser, 
    setShowAddForm, 
    setSelectedAssetForInspection
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
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'logs', label: 'Logs do Sistema', icon: <History className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/logs' }] : []),
    ...(userProfile?.role === 'Desenvolvedor' ? [{ id: 'gestao-ativo', label: 'Gestão de Ativo', icon: <Boxes className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/gestao-ativo' }] : []),
    ...(isAdmin ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />, path: '/configuracoes' }] : [])
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
      className={`w-72 bg-[#1b2a32] text-white flex flex-col px-4 py-6 shrink-0 shadow-2xl border-r border-[#cfd8dc]/10 z-50 h-screen select-none font-sans fixed lg:static inset-y-0 left-0 transform lg:transform-none transition-transform duration-300 ${
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

      {/* Marca Principal Grupo OMG */}
      <div className="flex items-center gap-3 mb-6 p-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
        <div className="bg-white p-1.5 rounded-xl shrink-0 shadow-md">
          <img 
            src="/logo-omg.png" 
            alt="Logo Grupo OMG" 
            className="h-8 w-auto object-contain" 
          />
        </div>
        <div className="min-w-0">
          <span className="text-[9px] text-red-500 font-bold tracking-widest block uppercase leading-none">GRUPO OMG</span>
          <h2 className="text-xs font-black text-slate-100 tracking-tight leading-none mt-1">SPCI MASTER</h2>
        </div>
      </div>

      {/* Botão de Perfil do Usuário */}
      <div 
        onClick={onProfileClick}
        className="flex items-center gap-3 mb-6 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-300 group hover:scale-[1.02] border border-slate-800/50 bg-slate-900/40"
        title="Clique para editar seu perfil e logo"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProfileClick(); }}
      >
        {userProfile?.logoUrl ? (
          <img 
            src={userProfile.logoUrl} 
            alt={`Logo da empresa de ${userProfile?.name || 'técnico'}`}
            className="w-9 h-9 rounded-xl object-contain border border-slate-600 bg-white p-0.5 shadow-md transition-transform duration-300 group-hover:scale-105" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <div 
            className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-base shadow-lg border border-red-500 group-hover:scale-105 transition-transform duration-300"
            aria-hidden="true"
          >
            🧯
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="sr-only">Perfil de usuário ativo:</span>
          <h3 className="font-['Hanken_Grotesk'] text-xs font-black tracking-tight text-white m-0 truncate group-hover:text-amber-200 transition-colors">
            {userProfile?.name ? userProfile.name.toUpperCase() : 'SISTEMA SPCI'}
          </h3>
          <p className="font-mono text-[8.5px] text-slate-400 tracking-wider uppercase block leading-tight mt-0.5">
            {userProfile ? `🛡️ ${userProfile.role === 'Desenvolvedor' ? 'DEV' : userProfile.role === 'Administrador' ? 'ADMIN' : 'TÉCNICO'}` : 'Offline-first'}
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
        {filteredNavItems.map(item => {
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
      <div className="bg-[#2D424A]/20 border border-[#CFD8DC]/5 p-3 rounded-xl text-center text-xs space-y-1 mb-2 select-none">
        <p className="text-emerald-450 font-bold flex items-center justify-center gap-2 font-['Hanken_Grotesk']">
          <span aria-hidden="true">🟢</span> Banco SPCI Ativo
        </p>
        <p className="text-[10px] text-slate-400 font-mono leading-none">
          {currentUser ? `User: ${currentUser.email?.split('@')[0]}` : 'Offline-first'}
        </p>
      </div>

      {/* Botão de Logout */}
      {onLogoutClick && (
        <button
          onClick={onLogoutClick}
          className="w-full mt-2 bg-[#2D424A]/20 hover:bg-[#af101a] border border-[#CFD8DC]/10 hover:border-transparent text-slate-350 hover:text-white font-['Hanken_Grotesk'] font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>SAIR DO COCKPIT</span>
        </button>
      )}
    </aside>
  );
};
