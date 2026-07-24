'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Flame, Droplet, AlertTriangle, Lightbulb, Sliders, Zap } from 'lucide-react';
import { useSpci } from '../context/SpciContext';
import { AssetCategory } from '@/lib/types';

export default function QuickAssetFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { setShowAddForm, setSelectedAssetForInspection } = useSpci();

  const handleSelectCategory = (category: AssetCategory) => {
    setSelectedAssetForInspection(null);
    setShowAddForm(true);
    setIsOpen(false);
  };

  const assetOptions = [
    {
      id: 'extintores' as AssetCategory,
      label: 'Novo Extintor',
      icon: <Flame className="w-4 h-4 text-red-500" />,
      badgeBg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800'
    },
    {
      id: 'hidrantes' as AssetCategory,
      label: 'Novo Hidrante & Abrigo',
      icon: <Droplet className="w-4 h-4 text-sky-500" />,
      badgeBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800'
    },
    {
      id: 'sinalizacoes' as AssetCategory,
      label: 'Nova Sinalização NBR',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'iluminacao' as AssetCategory,
      label: 'Nova Iluminação Emergência',
      icon: <Lightbulb className="w-4 h-4 text-yellow-500" />,
      badgeBg: 'bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800'
    },
    {
      id: 'bombas' as AssetCategory,
      label: 'Nova Casa de Bombas',
      icon: <Sliders className="w-4 h-4 text-emerald-500" />,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      
      {/* Backdrop sutil ao abrir */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40"
          />
        )}
      </AnimatePresence>

      {/* Pílulas flutuantes Speed Dial */}
      <div className="relative z-50 flex flex-col items-end gap-3 mb-3">
        <AnimatePresence>
          {isOpen && assetOptions.map((opt, idx) => (
            <motion.button
              key={opt.id}
              onClick={() => handleSelectCategory(opt.id)}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.8 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 25, 
                delay: (assetOptions.length - 1 - idx) * 0.04 
              }}
              type="button"
              className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 pl-4 pr-2 py-2 rounded-full shadow-2xl border border-slate-200/80 dark:border-slate-700/80 cursor-pointer backdrop-blur-md transition-all transform hover:scale-105 group"
            >
              <span className="font-['Hanken_Grotesk'] text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {opt.label}
              </span>
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-110 ${opt.badgeBg}`}>
                {opt.icon}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Botão principal FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        type="button"
        className="w-14 h-14 bg-gradient-to-tr from-red-700 via-rose-600 to-red-500 hover:from-red-600 hover:to-rose-500 text-white rounded-full shadow-[0_8px_25px_rgba(220,38,38,0.5)] border-2 border-white/20 flex items-center justify-center cursor-pointer relative z-50 group"
        aria-label="Acesso Rápido a Cadastro de Ativos"
        title="Cadastro Rápido de Ativos SPCI"
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
