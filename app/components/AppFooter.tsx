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
      <footer className={`w-full bg-transparent px-4 py-4 text-center text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none shrink-0 ${className}`}>
        <p className="tracking-wide truncate">
          {textContent}
        </p>
      </footer>
    );
  }

  return (
    <footer className={`w-full py-2 px-2 text-center text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none mt-auto shrink-0 bg-transparent ${className}`}>
      <p className="tracking-wider uppercase truncate">
        © {COPYRIGHT_YEAR} - Todos os direitos reservados <span className="mx-1 text-red-500 font-bold">|</span> <span className="font-bold text-slate-700 dark:text-slate-200">{COMPANY_NAME}</span> <span className="mx-1 text-red-500 font-bold">|</span> Versão {SYSTEM_VERSION}
      </p>
    </footer>
  );
}
