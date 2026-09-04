'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Image, X, MapPin, Loader2 } from 'lucide-react';
import { useGeoCapture } from '@/hooks/useGeoCapture';
import { GeoCoordinates } from '@/lib/geoUtils';

interface MediaCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoDataUrl: string, coords?: GeoCoordinates | null) => void;
  title?: string;
  autoCaptureGeo?: boolean;
}

export const MediaCaptureModal: React.FC<MediaCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  title = 'Adicionar Foto de Evidência',
  autoCaptureGeo = true
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { isCapturing, capturePosition } = useGeoCapture();
  const [capturingCoords, setCapturingCoords] = useState(false);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturingCoords(true);

      // Captura GPS simultaneamente em alta precisão
      let coords: GeoCoordinates | null = null;
      if (autoCaptureGeo) {
        try {
          coords = await capturePosition({ enableHighAccuracy: true, timeout: 8000 });
        } catch (err) {
          console.warn('[MediaCaptureModal] Não foi possível capturar GPS:', err);
        }
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCapturingCoords(false);
          onPhotoCaptured(result, coords);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerCamera = () => {
    // Pré-aciona a busca de satélite no clique para diminuir latência
    if (autoCaptureGeo) {
      capturePosition({ enableHighAccuracy: true, timeout: 10000 });
    }
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    if (autoCaptureGeo) {
      capturePosition({ enableHighAccuracy: true, timeout: 10000 });
    }
    galleryInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900"
      >
        {/* CABEÇALHO */}
        <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between border-b border-red-800 shadow-md">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer font-bold border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OPÇÕES DE CAPTURA */}
        <div className="p-6 space-y-4 bg-white">
          <p className="text-xs text-slate-700 font-sans text-center font-bold">
            Escolha o método desejado para capturar a imagem da vistoria:
          </p>

          {/* INDICADOR DE GEOLOCALIZAÇÃO ATIVA */}
          {autoCaptureGeo && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-[10px] font-sans font-semibold mx-auto w-fit">
              {isCapturing || capturingCoords ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span>Sincronizando satélite GPS de alta precisão...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Geocaptura Automática Ativa (Precisão Satelital)</span>
                </>
              )}
            </div>
          )}

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
              onClick={triggerCamera}
              disabled={capturingCoords}
              className="p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-600 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer text-left shadow-xs disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-red-800 block">
                  📸 Tirar Foto com a Câmera
                </span>
                <span className="text-[10.5px] font-sans font-bold text-slate-600 mt-0.5 block">
                  Abre a câmera traseira e coleta as coordenadas GPS
                </span>
              </div>
            </button>

            {/* BOTÃO GALERIA / ARQUIVOS */}
            <button
              type="button"
              onClick={triggerGallery}
              disabled={capturingCoords}
              className="p-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-400 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer text-left shadow-xs disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-slate-900 block">
                  📁 Escolher da Galeria / Arquivos
                </span>
                <span className="text-[10.5px] font-sans font-bold text-slate-600 mt-0.5 block">
                  Selecionar foto salva da memória ou arquivos
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-black border border-slate-300 bg-white hover:bg-slate-100 rounded-xl text-slate-800 cursor-pointer shadow-xs"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
