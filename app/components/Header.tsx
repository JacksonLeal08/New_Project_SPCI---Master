import React from 'react';
import { useSpci } from '../context/SpciContext';
import { Search, User as UserIcon, LogIn } from 'lucide-react';

interface HeaderProps {
  onScanClick: () => void;
  onProfileClick: () => void;
}

export const Header = ({ onScanClick, onProfileClick }: HeaderProps) => {
  const { 
    currentUser, 
    userProfile, 
    handleGoogleLogin 
  } = useSpci();

  return (
    <header className="bg-white text-slate-800 flex justify-between items-center w-full px-6 h-16 shrink-0 shadow-xs border-b border-slate-100 z-10 select-none font-sans">
      <div className="flex items-center gap-4">
        <span className="md:hidden text-lg font-black tracking-tight text-red-600">SPCI</span>
        <span className="hidden md:inline-block font-['Hanken_Grotesk'] font-extrabold tracking-tight text-slate-900 text-sm flex items-center gap-2">
          <span className="text-red-600">🚒</span> PLANTA DE SEGURANÇA SPCI
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Busca Rápida / QR Scan */}
        <button 
          onClick={onScanClick}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xs font-['Hanken_Grotesk'] font-bold uppercase rounded-xl tracking-wider border border-slate-200 flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 shadow-xs hover:scale-[1.02]"
          aria-label="Buscar ou Escanear Ativo"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span>Scan / Buscar</span>
        </button>

        {/* Informações de Perfil ou Botão de Login */}
        {currentUser ? (
          <div 
            onClick={onProfileClick}
            className="hidden lg:flex items-center gap-2 border-l border-slate-100 pl-4 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all hover:scale-[1.02]"
            title={`Editar Perfil Técnico: ${currentUser.email}`}
            id="header-user-profile-active"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProfileClick(); }}
          >
            {userProfile?.logoUrl ? (
              <img 
                alt={`Logo corporativo de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-xl border border-red-500 object-cover bg-white p-0.5 shadow-xs" 
                src={userProfile.logoUrl}
                referrerPolicy="no-referrer"
              />
            ) : currentUser.photoURL ? (
              <img 
                alt={`Foto de perfil de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-xl border border-red-500 object-cover shadow-xs" 
                src={currentUser.photoURL}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs uppercase border border-red-200"
                aria-hidden="true"
              >
                {currentUser.email?.charAt(0)}
              </div>
            )}
            <div className="text-left leading-tight">
              <span className="sr-only">Conectado como:</span>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide truncate max-w-[120px]">
                {userProfile?.name || currentUser.displayName || 'Técnico SPCI'}
              </p>
              <p className="text-[8px] font-mono text-red-600 uppercase tracking-wider font-bold">
                {userProfile?.role === 'admin' ? '🛡️ Admin' : '👷 Técnico'}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-l border-slate-100 pl-4">
            <button
              onClick={handleGoogleLogin}
              className="bg-white text-slate-800 text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition-all border border-slate-200 cursor-pointer shadow-xs hover:scale-[1.02]"
              aria-label="Conectar com conta Google"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-600" />
              <span>Conectar Google</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
