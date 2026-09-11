'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export interface FlyoutSubItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  path?: string;
  isActive?: boolean;
  badge?: number;
  alertBadge?: number;
  badgeTag?: string;
  isAction?: boolean;
  onClick?: () => void;
}

interface SidebarCollapsedFlyoutProps {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  totalCount: number;
  subItems: FlyoutSubItem[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}

export const SidebarCollapsedFlyout: React.FC<SidebarCollapsedFlyoutProps> = ({
  isOpen,
  triggerRef,
  totalCount,
  subItems,
  onMouseEnter,
  onMouseLeave,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recalcula a posição precisa na viewport com base no elemento gatilho
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const flyoutHeight = 280; // Altura estimada do container
      const flyoutWidth = 260; // Largura do container

      // Posiciona imediatamente à direita da sidebar com gap de 8px
      let left = rect.right + 8;
      // Alinha ao topo do item mestre
      let top = rect.top - 4;

      // Proteção de overflow vertical na viewport
      if (top + flyoutHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - flyoutHeight - 16);
      }

      // Proteção de overflow horizontal
      if (left + flyoutWidth > window.innerWidth - 16) {
        left = window.innerWidth - flyoutWidth - 16;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef]);

  // Fecha no Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={flyoutRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      aria-orientation="vertical"
      aria-label="Submenu Módulo Extintores"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className={`
        z-[9999] pointer-events-auto select-none
        w-[264px] rounded-2xl
        bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
        border border-slate-200/90 dark:border-slate-800
        shadow-2xl shadow-slate-900/25 dark:shadow-black/50
        p-1.5
        animate-in fade-in-0 zoom-in-95 duration-150
        
        /* 1. PONTE INVISÍVEL DE TOQUE (Hover Bridge / Hitbox) */
        /* Estende a área interativa 12px à esquerda para cobrir 100% do gap físico */
        before:absolute before:-left-3 before:top-0 before:h-full before:w-4 before:content-[''] before:z-10
      `}
    >
      {/* Hitbox lateral transparente adicional para máxima segurança geométrica */}
      <div 
        className="absolute -left-3 top-0 w-3 h-full cursor-default" 
        aria-hidden="true" 
      />

      {/* Cabeçalho Informativo Corporativo */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50 rounded-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
            <Flame className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
            Módulo Extintores
          </span>
        </div>
        <span 
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-600/60 shrink-0"
          title="Total de extintores do contrato"
        >
          {totalCount}
        </span>
      </div>

      {/* Lista Interativa de Subrotas & Ações */}
      <div className="space-y-1">
        {subItems.map((subItem) => {
          if (subItem.isAction) {
            return (
              <button
                key={subItem.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  if (subItem.onClick) subItem.onClick();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-all duration-150 cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {subItem.icon}
                  </span>
                  <span className="truncate tracking-wide">{subItem.shortLabel}</span>
                </div>
                {subItem.badgeTag && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 shrink-0">
                    {subItem.badgeTag}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={subItem.id}
              href={subItem.path || '/extintores'}
              role="menuitem"
              onClick={() => {
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group cursor-pointer ${
                subItem.isActive
                  ? 'bg-red-600/10 text-red-600 dark:text-red-400 font-bold border border-red-500/20'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`transition-colors ${
                    subItem.isActive
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400'
                  }`}
                >
                  {subItem.icon}
                </span>
                <span className="truncate tracking-wide">{subItem.shortLabel}</span>
              </div>

              {/* Badges de Status */}
              {subItem.alertBadge !== undefined && subItem.alertBadge > 0 && (
                <span
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 animate-pulse shrink-0"
                  title={`${subItem.alertBadge} lote(s) pendente(s)`}
                >
                  {subItem.alertBadge}
                </span>
              )}

              {subItem.badge !== undefined && subItem.badge > 0 && (
                <span
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700 shrink-0"
                  title={`${subItem.badge} substituição(ões)`}
                >
                  {subItem.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

export default SidebarCollapsedFlyout;
