'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { CompressionResult, formatFileSize } from '@/lib/imageCompressor';

interface ImageCompressionBadgeProps {
  stats: CompressionResult | null;
  className?: string;
}

export const ImageCompressionBadge: React.FC<ImageCompressionBadgeProps> = ({ stats, className = '' }) => {
  if (!stats) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 dark:bg-black/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-mono shadow-lg shadow-emerald-950/20 select-none ${className}`}
      >
        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
          <Zap className="w-2.5 h-2.5 fill-current animate-pulse" />
        </div>

        <span className="font-semibold text-slate-300">
          {formatFileSize(stats.originalSizeKb)} <span className="text-emerald-400">➔</span> {formatFileSize(stats.compressedSizeKb)}
        </span>

        {stats.reductionPercentage > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
            -{stats.reductionPercentage}%
          </span>
        )}

        <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-emerald-500/20 text-[10px] text-emerald-400/80">
          <ShieldCheck className="w-3 h-3" />
          <span>Qualidade NBR Preservada</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
