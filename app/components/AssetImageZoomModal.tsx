'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  MapPin,
  Camera,
  Info
} from 'lucide-react';

interface AssetImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  location?: string;
  date?: string;
}

export default function AssetImageZoomModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  location,
  date
}: AssetImageZoomModalProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Resetar zoom e posição ao abrir novo modal
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.8);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleDouble = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2.2);
    }
  };

  // Suporte a Pan/Arrasto com Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Suporte a Pan/Arrasto no Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom com a roda do mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-2xl font-mono select-none overflow-hidden">
        {/* Barra Superior Flutuante (Header) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-5xl px-4 py-3 flex items-center justify-between gap-4 z-20"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg">
              <Camera className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-black tracking-wide text-white uppercase">{title}</span>
            </div>
            {subtitle && (
              <span className="hidden sm:inline-block text-xs font-medium text-slate-300 truncate max-w-xs">
                {subtitle}
              </span>
            )}
            {location && (
              <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <MapPin className="w-3 h-3 text-red-400" />
                <span className="truncate max-w-[200px]">{location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shadow transition-all cursor-pointer active:scale-95"
                title="Abrir imagem original em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 shadow transition-all cursor-pointer active:scale-95"
              title="Fechar visualizador (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Área Central de Visualização e Zoom da Imagem */}
        <div
          ref={imageContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onDoubleClick={handleToggleDouble}
          className={`relative flex-1 w-full flex items-center justify-center overflow-hidden p-4 ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
        >
          {imageUrl ? (
            <motion.div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="relative max-w-full max-h-full flex items-center justify-center will-change-transform select-none pointer-events-auto"
            >
              <img
                src={imageUrl}
                alt={title}
                draggable={false}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-none"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-md">
              <Camera className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Sem Foto Cadastrada</h4>
              <p className="text-xs text-slate-400">
                Este ativo ainda não possui uma evidência fotográfica registrada. Uma foto pode ser anexada durante a próxima inspeção ou edição.
              </p>
            </div>
          )}
        </div>

        {/* Barra Inferior Flutuante (Controles de Zoom + Dica) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full max-w-2xl px-4 py-4 flex flex-col items-center gap-2 z-20"
        >
          {imageUrl && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-1.5 shadow-2xl">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.8}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                title="Reduzir Zoom (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Indicador de Porcentagem de Zoom */}
              <button
                type="button"
                onClick={handleReset}
                className="px-3 h-11 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-slate-800 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                title="Clique para redefinir para 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              {/* Zoom In */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-slate-700 mx-0.5" />

              {/* Rotacionar */}
              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer"
                title="Girar 90 graus"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Resetar */}
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer"
                title="Ajustar à tela (100%)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dica de usabilidade */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">
              Role a roda do mouse, use pinça no celular ou dê duplo clique para inspecionar lacre e manômetro.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
