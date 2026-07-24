'use client';

import React from 'react';
import { SYSTEM_VERSION, COMPANY_NAME, COPYRIGHT_YEAR } from '../config/version';

interface AppFooterProps {
  variant?: 'fixed' | 'flow';
  className?: string;
}

export default function AppFooter({ variant = 'flow', className = '' }: AppFooterProps) {
  const textContent = `© ${COPYRIGHT_YEAR} - Todos os direitos reservados | ${COMPANY_NAME} | Versão ${SYSTEM_VERSION}`;

  if (variant === 'fixed') {
    return (
      <footer className={`w-full bg-slate-900 border-t border-slate-800/80 px-4 py-2.5 text-center text-[10.5px] font-mono text-slate-400 select-none shrink-0 rounded-b-2xl ${className}`}>
        <p className="tracking-wide">
          {textContent}
        </p>
      </footer>
    );
  }

  return (
    <footer className={`w-full py-6 text-center text-xs font-mono text-slate-500 select-none ${className}`}>
      <p className="tracking-wider uppercase text-[11px]">
        © {COPYRIGHT_YEAR} - Todos os direitos reservados <span className="mx-1 text-red-500 font-bold">|</span> <span className="font-bold text-slate-700">{COMPANY_NAME}</span> <span className="mx-1 text-red-500 font-bold">|</span> Versão {SYSTEM_VERSION}
      </p>
    </footer>
  );
}
