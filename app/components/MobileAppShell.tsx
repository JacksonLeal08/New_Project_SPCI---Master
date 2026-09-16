'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Flame, 
  Scan, 
  MapPin, 
  MoreHorizontal,
  Droplet,
  Cog,
  TriangleAlert,
  Lightbulb,
  Boxes,
  User,
  LogOut,
  Sun,
  Moon,
  Building2,
  FileCheck2,
  Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSpci } from '../context/SpciContext';
import BottomSheet from './ui/BottomSheet';

export interface MobileAppShellProps {
  onScanClick?: () => void;
  onProfileClick?: () => void;
  onGestaoAtivosClick?: () => void;
  onLogoutClick?: () => void;
}

export default function MobileAppShell({
  onScanClick,
  onProfileClick,
  onGestaoAtivosClick,
  onLogoutClick,
}: MobileAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { userProfile, currentUser } = useSpci();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Micro-interação de feedback háptico (vibração nativa suave)
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const handleScanAction = () => {
    triggerHaptic();
    if (onScanClick) {
      onScanClick();
    } else {
      router.push('/inspecao');
    }
  };

  const isDark = theme === 'dark';
  const userSite = userProfile?.site || 'SALOBO';

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO SUPERIOR COMPACTO (Mobile Only: < 768px)                     */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 pt-safe bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          {/* Marca / Identidade */}
          <Link 
            href="/" 
            onClick={triggerHaptic}
            className="flex items-center gap-2 touch-active focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-600/20">
              Ω
            </div>
            <div className="leading-tight">
              <span className="text-xs font-black tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1">
                SPCI <span className="text-red-600">MASTER</span>
              </span>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 block uppercase font-mono">
                App Shell
              </span>
            </div>
          </Link>

          {/* Seletor Rápido de Contrato & Ações Rápidas */}
          <div className="flex items-center gap-2">
            {/* Pílula de Contrato/Site */}
            <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Building2 size={12} className="text-red-600" />
              <span className="max-w-[85px] truncate uppercase">{userSite}</span>
            </div>

            {/* Alternador de Tema */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                toggleTheme();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 touch-active touch-target"
              aria-label="Alternar tema de cores"
            >
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGAÇÃO INFERIOR FIXA (Thumb Zone: < 768px)                 */}
      {/* ========================================================================= */}
      <nav 
        aria-label="Navegação mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200/90 dark:border-zinc-800/90 pb-safe transition-colors"
      >
        <div className="relative h-16 px-2 flex items-center justify-around">
          {/* Destino 1: Painel */}
          <Link
            href="/"
            onClick={triggerHaptic}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 touch-active touch-target ${
              pathname === '/'
                ? 'text-red-600 dark:text-red-500 font-bold'
                : 'text-slate-500 dark:text-zinc-400 font-medium'
            }`}
          >
            <LayoutDashboard size={20} className={pathname === '/' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[10px] mt-1 tracking-tight">Painel</span>
          </Link>

          {/* Destino 2: Extintores */}
          <Link
            href="/extintores"
            onClick={triggerHaptic}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 touch-active touch-target ${
              pathname.startsWith('/extintores')
                ? 'text-red-600 dark:text-red-500 font-bold'
                : 'text-slate-500 dark:text-zinc-400 font-medium'
            }`}
          >
            <Flame size={20} className={pathname.startsWith('/extintores') ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[10px] mt-1 tracking-tight">Extintores</span>
          </Link>

          {/* BOTÃO CENTRAL ELEVADO (FAB: Scan QR / Vistoria) */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              type="button"
              onClick={handleScanAction}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-rose-500 text-white flex flex-col items-center justify-center shadow-lg shadow-red-600/40 border-4 border-white dark:border-zinc-950 touch-active touch-target focus:outline-none"
              aria-label="Escanear QR Code ou Iniciar Ronda"
            >
              <Scan size={24} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Destino 3: Mapa */}
          <Link
            href="/mapa"
            onClick={triggerHaptic}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 touch-active touch-target ${
              pathname.startsWith('/mapa')
                ? 'text-red-600 dark:text-red-500 font-bold'
                : 'text-slate-500 dark:text-zinc-400 font-medium'
            }`}
          >
            <MapPin size={20} className={pathname.startsWith('/mapa') ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[10px] mt-1 tracking-tight">Mapa</span>
          </Link>

          {/* Destino 4: Menu Mais */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setIsMoreOpen(true);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 touch-active touch-target ${
              isMoreOpen
                ? 'text-red-600 dark:text-red-500 font-bold'
                : 'text-slate-500 dark:text-zinc-400 font-medium'
            }`}
          >
            <MoreHorizontal size={20} className={isMoreOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[10px] mt-1 tracking-tight">Mais</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. GAVETA INFERIOR (BOTTOM SHEET) DO MENU MAIS                            */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="Módulos & Operações SPCI"
        subtitle="Acesso rápido a todos os recursos da planta"
        snapPoint="half"
      >
        <div className="space-y-4">
          {/* Módulos de Combate & Proteção */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block px-1 mb-2">
              Sistemas de Proteção
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/hidrantes"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 touch-active"
              >
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Droplet size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">Hidrantes</span>
                  <span className="text-[10px] text-slate-400">Linhas & Abrigos</span>
                </div>
              </Link>

              <Link
                href="/bombas"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 touch-active"
              >
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Cog size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">Bombas</span>
                  <span className="text-[10px] text-slate-400">Pressurização</span>
                </div>
              </Link>

              <Link
                href="/sinalizacao"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 touch-active"
              >
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <TriangleAlert size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">Sinalização</span>
                  <span className="text-[10px] text-slate-400">Rotas de Fuga</span>
                </div>
              </Link>

              <Link
                href="/iluminacao"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 touch-active"
              >
                <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400">
                  <Lightbulb size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">Iluminação</span>
                  <span className="text-[10px] text-slate-400">Autonomia</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Operações de Estoque & Auditoria */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block px-1 mb-2">
              Gestão Operacional
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                  if (onGestaoAtivosClick) onGestaoAtivosClick();
                }}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between touch-active text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Boxes size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Gestão de Ativos & Estoque
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Entradas, saídas e substituições em lote
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">Abrir →</span>
              </button>

              <Link
                href="/ronda"
                onClick={() => {
                  triggerHaptic();
                  setIsMoreOpen(false);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between touch-active text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <FileCheck2 size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Ronda & Vistorias Realizadas
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Histórico mensal e laudos técnicos
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">Abrir →</span>
              </Link>
            </div>
          </div>

          {/* Conta & Perfil */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800 flex gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setIsMoreOpen(false);
                if (onProfileClick) onProfileClick();
              }}
              className="flex-1 py-3 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 touch-active touch-target"
            >
              <User size={16} />
              Meu Perfil
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setIsMoreOpen(false);
                if (onLogoutClick) onLogoutClick();
              }}
              className="py-3 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 touch-active touch-target"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
