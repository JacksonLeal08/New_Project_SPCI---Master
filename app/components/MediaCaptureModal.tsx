'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Image, X, Sparkles } from 'lucide-react';

interface MediaCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoDataUrl: string) => void;
  title?: string;
}

export const MediaCaptureModal: React.FC<MediaCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  title = 'Adicionar Foto de Evidência'
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onPhotoCaptured(result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* CABEÇALHO */}
        <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OPÇÕES DE CAPTURA */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-sans text-center">
            Escolha o método desejado para capturar a imagem da vistoria:
          </p>

          {/* INPUTS ESCONDIDOS */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />

          <div className="grid grid-cols-1 gap-3 pt-2">
            {/* BOTÃO CÂMERA */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 border-2 border-red-500/40 hover:border-red-600 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer text-left shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-300 block">
                  📸 Tirar Foto com a Câmera
                </span>
                <span className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-0.5 block">
                  Abre a câmera traseira do celular ou notebook
                </span>
              </div>
            </button>

            {/* BOTÃO GALERIA / ARQUIVOS */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer text-left shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100 block">
                  📁 Escolher da Galeria / Arquivos
                </span>
                <span className="text-[10px] font-sans text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Selecionar foto salva da memória ou arquivos
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
