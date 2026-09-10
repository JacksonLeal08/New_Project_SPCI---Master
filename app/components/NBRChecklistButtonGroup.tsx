'use client';

import React from 'react';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

export type NBRStatusValue = 'Conforme' | 'Não Conforme' | 'NA' | null;

interface NBRChecklistButtonGroupProps {
  itemId: string;
  status: NBRStatusValue;
  onChange: (status: 'Conforme' | 'Não Conforme' | 'NA') => void;
  disabled?: boolean;
}

export const NBRChecklistButtonGroup: React.FC<NBRChecklistButtonGroupProps> = ({
  itemId,
  status,
  onChange,
  disabled = false
}) => {
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
    } catch {
      // Ignora silenciosamente se o navegador bloquear API de vibração
    }
  };

  const handleSelect = (value: 'Conforme' | 'Não Conforme' | 'NA') => {
    if (disabled) return;
    triggerHaptic();
    onChange(value);
  };

  const isConforme = status === 'Conforme';
  const isNaoConforme = status === 'Não Conforme';
  const isNA = status === 'NA';

  return (
    <div 
      className="grid grid-cols-3 gap-2 w-full select-none"
      role="radiogroup" 
      aria-label={`Status do quesito ${itemId}`}
    >
      {/* 1. CONFORME */}
      <button
        type="button"
        role="radio"
        aria-checked={isConforme}
        disabled={disabled}
        onClick={() => handleSelect('Conforme')}
        className={`min-h-[48px] rounded-xl font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 border ${
          isConforme
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 font-bold scale-[1.02]'
            : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:border-emerald-400 hover:bg-emerald-50/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CheckCircle2 size={16} className={isConforme ? 'text-white' : 'text-emerald-500'} />
        <span className="font-bold">Conforme</span>
      </button>

      {/* 2. NÃO CONFORME */}
      <button
        type="button"
        role="radio"
        aria-checked={isNaoConforme}
        disabled={disabled}
        onClick={() => handleSelect('Não Conforme')}
        className={`min-h-[48px] rounded-xl font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 border ${
          isNaoConforme
            ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25 font-bold scale-[1.02]'
            : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:border-red-400 hover:bg-red-50/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <XCircle size={16} className={isNaoConforme ? 'text-white' : 'text-red-500'} />
        <span className="font-bold">Não Conforme</span>
      </button>

      {/* 3. N/A (Não se Aplica) */}
      <button
        type="button"
        role="radio"
        aria-checked={isNA}
        disabled={disabled}
        onClick={() => handleSelect('NA')}
        className={`min-h-[48px] rounded-xl font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 border ${
          isNA
            ? 'bg-slate-700 dark:bg-zinc-700 text-white border-slate-700 shadow-sm font-semibold scale-[1.02]'
            : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <MinusCircle size={15} className={isNA ? 'text-white' : 'text-slate-400'} />
        <span className="font-semibold">N/A</span>
      </button>
    </div>
  );
};

export default NBRChecklistButtonGroup;
