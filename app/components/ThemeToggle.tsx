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

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer border border-slate-700/60 bg-slate-800/60 hover:bg-slate-700/80 text-amber-400 dark:text-sky-300 shadow-md backdrop-blur-md ${className}`}
      title={theme === 'dark' ? 'Alternar para Modo Claro (☀️)' : 'Alternar para Modo Escuro (🌙)'}
      aria-label="Alternar tema de cor"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {theme === 'dark' ? (
          <Moon className="w-4 h-4 text-sky-300" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}
