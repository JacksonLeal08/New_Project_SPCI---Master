'use client';

import React from 'react';
import { QrCode as QrIcon } from 'lucide-react';

export interface AssetPrintItem {
  id: string;
  idAtivo: string;
  category: string;
  model: string;
  capacidade: string;
  location: string;
  subLocation?: string;
  seloInmetro?: string;
  chassi?: string;
  validade?: string;
}

interface EtiquetaPreviewA4Props {
  assets: AssetPrintItem[];
  showLogo?: boolean;
  showBorder?: boolean;
  includeDetails?: boolean;
  highDensity?: boolean;
  originUrl: string;
  currentPage?: number;
  zoom?: number; // percentual: 100, 75, 50, etc.
}

export const EtiquetaPreviewA4: React.FC<EtiquetaPreviewA4Props> = ({
  assets,
  showLogo = true,
  showBorder = true,
  includeDetails = false,
  highDensity = false,
  originUrl,
  currentPage = 1,
  zoom = 100,
}) => {
  const ITEMS_PER_SHEET = 24; // 3 colunas x 8 linhas (Padrão Pimaco / Universal A4)
  const totalSheets = Math.max(1, Math.ceil(assets.length / ITEMS_PER_SHEET));
  const activePage = Math.min(Math.max(1, currentPage), totalSheets);

  // Ativos da folha ativa para visualização na tela
  const startIndex = (activePage - 1) * ITEMS_PER_SHEET;
  const pageAssets = assets.slice(startIndex, startIndex + ITEMS_PER_SHEET);

  // Divide todos os ativos em grupos de 24 para renderização completa no @media print
  const allPages: (AssetPrintItem | null)[][] = [];
  for (let s = 0; s < totalSheets; s++) {
    const sheetItems: (AssetPrintItem | null)[] = [];
    for (let i = 0; i < ITEMS_PER_SHEET; i++) {
      const globalIdx = s * ITEMS_PER_SHEET + i;
      sheetItems.push(assets[globalIdx] || null);
    }
    allPages.push(sheetItems);
  }

  // Gera o QR Code URL via serviço estável e rápido
  const getQrUrl = (idAtivo: string) => {
    const scanUrl = `${originUrl}/scan/${encodeURIComponent(idAtivo)}`;
    const size = highDensity ? 300 : 200;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(scanUrl)}`;
  };

  const renderLabel = (asset: AssetPrintItem, idx: number, isPrintMode = false) => {
    return (
      <div
        key={`${asset.id}-${idx}`}
        className={`h-[32.5mm] w-full p-2 bg-white text-black font-mono flex items-center justify-between gap-1.5 overflow-hidden relative box-border ${
          showBorder ? 'border border-dashed border-slate-300 print:border-slate-400' : 'border border-transparent'
        }`}
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        {/* Lado Esquerdo: QR Code */}
        <div className="w-[26mm] h-[26mm] shrink-0 flex flex-col items-center justify-center bg-white p-0.5 border border-slate-200 print:border-slate-300 rounded">
          <img
            src={getQrUrl(asset.idAtivo)}
            alt={`QR ${asset.idAtivo}`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
          <span className="text-[6.5px] font-sans text-slate-500 uppercase tracking-tighter mt-0.5 leading-none">
            SCAN NBR
          </span>
        </div>

        {/* Lado Direito: Informações Técnicas e Patrimônio */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-[27mm] py-0.5 pl-1 leading-tight">
          {/* Cabeçalho do Cartão */}
          {showLogo && (
            <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 print:bg-red-700" />
                <span className="text-[7.5px] font-sans font-black tracking-tighter uppercase text-slate-800">
                  SPCI MASTER // OMG
                </span>
              </div>
              <span className="text-[7px] font-bold uppercase text-red-700 bg-red-50 print:bg-transparent px-1 rounded">
                {asset.category}
              </span>
            </div>
          )}

          {/* Código e Patrimônio */}
          <div className="my-auto">
            <span className="text-[6.5px] uppercase font-sans text-slate-500 font-semibold tracking-wider block">
              PATRIMÔNIO / ID
            </span>
            <span className="text-[12px] font-black tracking-tight text-slate-950 truncate block leading-none font-mono">
              {asset.idAtivo}
            </span>
            <div className="text-[8px] font-bold text-slate-800 truncate mt-0.5">
              {asset.model} {asset.capacidade ? `• ${asset.capacidade}` : ''}
            </div>
          </div>

          {/* Localização & Sub-Local */}
          <div className="border-t border-slate-100 pt-0.5">
            <span className="text-[7.5px] text-slate-700 font-bold uppercase truncate block">
              {asset.location} {asset.subLocation ? `› ${asset.subLocation}` : ''}
            </span>
            {includeDetails && (asset.seloInmetro || asset.chassi) && (
              <span className="text-[6.5px] text-slate-500 truncate block">
                {asset.seloInmetro ? `Selo: ${asset.seloInmetro} ` : ''}
                {asset.chassi ? `Chassi: ${asset.chassi}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmptySlot = (slotIdx: number) => {
    return (
      <div
        key={`empty-${slotIdx}`}
        className="h-[32.5mm] w-full p-2 bg-slate-50/50 border border-dashed border-slate-300/80 rounded flex flex-col items-center justify-center text-slate-300 print:opacity-0 print:border-transparent"
      >
        <QrIcon className="w-4 h-4 mb-1 text-slate-300" />
        <span className="text-[8px] font-sans uppercase font-bold tracking-wider">
          Slot {slotIdx + 1} Livre
        </span>
      </div>
    );
  };

  const scaleFactor = zoom / 100;

  return (
    <>
      {/* =========================================================================
          1. SIMULADOR DE TELA (VISÍVEL NO NAVEGADOR / OCULTO NA IMPRESSÃO)
      ========================================================================= */}
      <div className="print:hidden w-full flex flex-col items-center transition-transform origin-top">
        <div
          style={{
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out'
          }}
          className="bg-white text-black p-[8mm] shadow-2xl border border-slate-200 rounded-sm relative box-border"
        >
          {/* Dimensões precisas proporcionais a uma folha A4 (210mm x 297mm) */}
          <div
            className="w-[200mm] min-h-[285mm] grid grid-cols-3 gap-x-[2.5mm] gap-y-[2.5mm]"
            style={{ gridTemplateRows: 'repeat(8, 32.5mm)' }}
          >
            {Array.from({ length: ITEMS_PER_SHEET }).map((_, idx) => {
              const asset = pageAssets[idx];
              if (asset) {
                return renderLabel(asset, idx, false);
              }
              return renderEmptySlot(idx);
            })}
          </div>

          {/* Marcador de Rodapé Discreto na Prévia da Tela */}
          <div className="absolute bottom-2 right-4 text-[8px] font-sans text-slate-400">
            Folha A4 (Grade 3x8 • 24un) — Página {activePage} de {totalSheets}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MOTOR DE IMPRESSÃO COMPLETO (OCULTO NA TELA / ATIVO NO @media print)
      ========================================================================= */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        {allPages.map((sheetItems, sheetIdx) => (
          <div
            key={`print-sheet-${sheetIdx}`}
            className="print-sheet-a4"
            style={{
              width: '194mm',
              margin: '0 auto',
              pageBreakAfter: sheetIdx < allPages.length - 1 ? 'always' : 'auto',
              breakAfter: sheetIdx < allPages.length - 1 ? 'page' : 'auto'
            }}
          >
            <div
              className="grid grid-cols-3 gap-x-[2.5mm] gap-y-[2.5mm]"
              style={{ gridTemplateRows: 'repeat(8, 32.5mm)' }}
            >
              {sheetItems.map((asset, idx) => {
                if (asset) {
                  return renderLabel(asset, idx, true);
                }
                return (
                  <div
                    key={`print-empty-${idx}`}
                    className="h-[32.5mm] w-full border border-transparent"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
