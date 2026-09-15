'use client';

import React from 'react';
import Link from 'next/link';
import { SYSTEM_VERSION, COMPANY_NAME, COPYRIGHT_YEAR } from '../config/version';

interface AppFooterProps {
  variant?: 'fixed' | 'flow';
  className?: string;
  showLinks?: boolean;
}

export default function AppFooter({ variant = 'flow', className = '', showLinks = false }: AppFooterProps) {
  const textContent = `© ${COPYRIGHT_YEAR} - Todos os direitos reservados | ${COMPANY_NAME} | Versão ${SYSTEM_VERSION}`;

  return (
    <footer className={`w-full text-center text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none shrink-0 ${variant === 'fixed' ? 'px-4 py-4 bg-transparent' : 'py-2 px-2 mt-auto bg-transparent'} ${className}`}>
      {showLinks && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-sans">
          <Link href="/consulta" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
            Consulta Rápida
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/public/ativos" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
            Catálogo de Equipamentos
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/login" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
            Acesso Restrito
          </Link>
        </div>
      )}
      <p className="tracking-wider uppercase truncate">
        © {COPYRIGHT_YEAR} - Todos os direitos reservados <span className="mx-1 text-red-500 font-bold">|</span> <span className="font-bold text-slate-700 dark:text-slate-200">{COMPANY_NAME}</span> <span className="mx-1 text-red-500 font-bold">|</span> Versão {SYSTEM_VERSION}
      </p>
    </footer>
  );
}

