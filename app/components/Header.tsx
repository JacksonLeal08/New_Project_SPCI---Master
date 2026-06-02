'use client';

import React from 'react';
import { useSpci } from '../context/SpciContext';

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
    <header className="bg-gradient-to-r from-[#af101a] via-[#d32f2f] to-[#be123c] text-white flex justify-between items-center w-full px-6 h-16 shrink-0 shadow-lg border-b border-rose-950/20 z-10 select-none">
      <div className="flex items-center gap-4">
        <span className="md:hidden text-lg font-bold tracking-tight">SPCI SINALIZAÇÃO</span>
        <span className="hidden md:inline-block font-['Hanken_Grotesk'] font-black tracking-tight text-white text-lg">
          🚒 PLANTA DE SEGURANÇA SPCI
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Busca Rápida / QR Scan */}
        <button 
          onClick={onScanClick}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-['Hanken_Grotesk'] font-bold uppercase rounded-lg tracking-wider border border-white/20 flex items-center gap-2 cursor-pointer"
          aria-label="Buscar ou Escanear Ativo"
        >
          <span aria-hidden="true">🔍</span> Scan / Buscar
        </button>

        {/* Informações de Perfil ou Botão de Login */}
        {currentUser ? (
          <div 
            onClick={onProfileClick}
            className="hidden lg:flex items-center gap-2 border-l border-white/20 pl-4 cursor-pointer hover:bg-white/10 p-1.5 rounded-xl transition-all"
            title={`Editar Perfil Técnico: ${currentUser.email}`}
            id="header-user-profile-active"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProfileClick(); }}
          >
            {userProfile?.logoUrl ? (
              <img 
                alt={`Logo corporativo de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-full border border-teal-400 object-cover bg-white p-0.5" 
                src={userProfile.logoUrl}
                referrerPolicy="no-referrer"
              />
            ) : currentUser.photoURL ? (
              <img 
                alt={`Foto de perfil de ${userProfile?.name || 'técnico'}`} 
                className="w-8 h-8 rounded-full border border-teal-400 object-cover" 
                src={currentUser.photoURL}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs uppercase border border-teal-400"
                aria-hidden="true"
              >
                {currentUser.email?.charAt(0)}
              </div>
            )}
            <div className="text-left leading-tight">
              <span className="sr-only">Conectado como:</span>
              <p className="text-[10px] font-bold text-slate-100 uppercase tracking-wide truncate max-w-[100px]">
                {userProfile?.name || currentUser.displayName || 'Técnico SPCI'}
              </p>
              <p className="text-[8px] font-mono text-teal-200 uppercase tracking-wider font-bold">
                {userProfile?.role === 'admin' ? '🛡️ Admin' : '👷 Técnico'}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-l border-white/20 pl-4">
            <button
              onClick={handleGoogleLogin}
              className="bg-white text-slate-800 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-all border-0 cursor-pointer shadow-md"
              aria-label="Conectar com conta Google"
            >
              Conectar Google 🔑
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
