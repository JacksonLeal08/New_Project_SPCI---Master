'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center w-14 h-8 p-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200/90 dark:bg-slate-800/90 backdrop-blur-md shadow-inner transition-colors duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-red-500/50 ${className}`}
      title={isDark ? 'Alternar para Modo Claro (☀️)' : 'Alternar para Modo Escuro (🌙)'}
      aria-label="Alternar tema estilo Telegram"
    >
      {/* Ícones de fundo da pílula */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-40 text-amber-400' : 'opacity-0'}`} />
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-sky-400'}`} />
      </div>

      {/* Pino deslizante estilo Telegram / Working Scale */}
      <motion.div
        className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center border border-slate-200 dark:border-slate-700 z-10"
        animate={{ x: isDark ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
          )}
        </motion.div>
      </motion.div>
    </button>
  );
}
