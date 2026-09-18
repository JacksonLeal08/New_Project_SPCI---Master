'use client';

import React, { useState } from 'react';
import { AssetPrintItem } from './EtiquetaPreviewA4';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface EtiquetaPreviewTermicaProps {
  assets: AssetPrintItem[];
  format: 'thermal_50x50' | 'thermal_60x40';
  showLogo?: boolean;
  showBorder?: boolean;
  includeDetails?: boolean;
  highDensity?: boolean;
  originUrl: string;
  zoom?: number;
}

export const EtiquetaPreviewTermica: React.FC<EtiquetaPreviewTermicaProps> = ({
  assets,
  format,
  showLogo = true,
  showBorder = true,
  includeDetails = false,
  highDensity = false,
  originUrl,
  zoom = 100,
}) => {
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'roll'>('single');

  const is50x50 = format === 'thermal_50x50';
  const widthMm = is50x50 ? 50 : 60;
  const heightMm = is50x50 ? 50 : 40;

  const currentAsset = assets[activeAssetIndex] || assets[0];

  const getQrUrl = (idAtivo: string) => {
    const scanUrl = `${originUrl}/scan/${encodeURIComponent(idAtivo)}`;
    const size = highDensity ? 300 : 220;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(scanUrl)}`;
  };

  const scaleFactor = zoom / 100;

  const renderSingleThermalLabel = (asset: AssetPrintItem, idx: number, isPrint = false) => {
    return (
      <div
        key={`thermal-${asset.id}-${idx}`}
        className={`bg-white text-black font-mono flex flex-col justify-between overflow-hidden relative box-border ${
          showBorder ? 'border border-dashed border-slate-300 print:border-slate-400' : 'border border-transparent'
        }`}
        style={{
          width: `${widthMm}mm`,
          height: `${heightMm}mm`,
          padding: '2.5mm',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          pageBreakAfter: isPrint ? 'always' : 'auto',
          breakAfter: isPrint ? 'page' : 'auto'
        }}
      >
        {/* Cabeçalho Compacto */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-0.5">
          {showLogo ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 print:bg-black" />
              <span className="text-[7px] font-sans font-black tracking-tight text-slate-900">
                SPCI // OMG
              </span>
            </div>
          ) : (
            <span className="text-[6.5px] font-sans text-slate-500 font-bold">SPCI MASTER</span>
          )}
          <span className="text-[6.5px] font-bold uppercase tracking-wider text-slate-700">
            {asset.category}
          </span>
        </div>

        {/* Bloco Central: QR Code + Código */}
        <div className="flex items-center gap-2 my-auto">
          <div className="w-[20mm] h-[20mm] shrink-0 bg-white p-0.5 border border-slate-200 print:border-slate-400 rounded flex items-center justify-center">
            <img
              src={getQrUrl(asset.idAtivo)}
              alt={`QR ${asset.idAtivo}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0 leading-tight">
            <span className="text-[6px] text-slate-500 font-sans uppercase block font-semibold">
              PATRIMÔNIO
            </span>
            <strong className="text-[11px] font-black text-slate-950 font-mono truncate block">
              {asset.idAtivo}
            </strong>
            <span className="text-[7.5px] font-bold text-slate-800 truncate block mt-0.5">
              {asset.model}
            </span>
            {asset.capacidade && (
              <span className="text-[7px] text-slate-600 font-mono block">
                {asset.capacidade}
              </span>
            )}
          </div>
        </div>

        {/* Rodapé: Localização & Chassi/Selo */}
        <div className="border-t border-slate-300 pt-0.5 leading-none">
          <div className="text-[7px] font-bold text-slate-900 uppercase truncate">
            {asset.location} {asset.subLocation ? `› ${asset.subLocation}` : ''}
          </div>
          {includeDetails && (asset.seloInmetro || asset.chassi) && (
            <div className="text-[6px] text-slate-600 truncate mt-0.5">
              {asset.seloInmetro ? `Selo: ${asset.seloInmetro} ` : ''}
              {asset.chassi ? `Ch: ${asset.chassi}` : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (assets.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 font-sans text-xs">
        <p>Nenhum ativo selecionado para pré-visualização térmica.</p>
      </div>
    );
  }

  return (
    <>
      {/* =========================================================================
          1. SIMULADOR DE TELA (VISÍVEL NO NAVEGADOR / OCULTO NA IMPRESSÃO)
      ========================================================================= */}
      <div className="print:hidden w-full flex flex-col items-center gap-4">
        {/* Controles do Simulador Térmico */}
        <div className="flex items-center justify-between w-full max-w-[320px] px-2 py-1 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'single' ? 'roll' : 'single')}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={viewMode === 'single' ? 'Ver como bobina contínua' : 'Ver etiqueta individual'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              {is50x50 ? '50x50mm' : '60x40mm'} • {viewMode === 'single' ? 'Individual' : 'Rolo'}
            </span>
          </div>

          {viewMode === 'single' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeAssetIndex === 0}
                onClick={() => setActiveAssetIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                {activeAssetIndex + 1}/{assets.length}
              </span>
              <button
                type="button"
                disabled={activeAssetIndex >= assets.length - 1}
                onClick={() => setActiveAssetIndex((prev) => Math.min(assets.length - 1, prev + 1))}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Visualizador de Papel Térmico */}
        <div
          style={{
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out'
          }}
          className="flex flex-col items-center"
        >
          {viewMode === 'single' ? (
            <div className="shadow-2xl rounded-sm border border-slate-300 bg-white">
              {renderSingleThermalLabel(currentAsset, activeAssetIndex, false)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 max-h-[600px] overflow-y-auto p-4 bg-slate-800/10 dark:bg-black/40 rounded-2xl border border-slate-300/50 dark:border-zinc-800 shadow-inner">
              {assets.map((asset, idx) => (
                <div key={`roll-${asset.id}-${idx}`} className="shadow-md bg-white rounded-sm">
                  {renderSingleThermalLabel(asset, idx, false)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. MOTOR DE IMPRESSÃO COMPLETO (OCULTO NA TELA / ATIVO NO @media print)
      ========================================================================= */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        {assets.map((asset, idx) => (
          <div key={`print-thermal-${asset.id}-${idx}`} className="print-thermal-item">
            {renderSingleThermalLabel(asset, idx, true)}
          </div>
        ))}
      </div>
    </>
  );
};
