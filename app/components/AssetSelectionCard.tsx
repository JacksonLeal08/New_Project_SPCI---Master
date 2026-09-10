'use client';

import React from 'react';
import {
  Flame,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';

export interface AssetSelectionCardProps {
  asset: {
    id: string;
    id_ativo?: string;
    patrimonio?: string;
    numero_serie?: string;
    model?: string;
    peso_capacidade?: string;
    location?: string;
    sub_location?: string;
    status?: string;
    tipo?: string;
    capacidade?: string;
    [key: string]: any;
  };
  isSelected: boolean;
  onSelect: () => void;
  type?: 'retirado' | 'substituto';
  isSameModelAsRetirado?: boolean;
  selectionLabel?: string;
}

/**
 * AssetSelectionCard - Componente de Card Mobile Responsivo com Zero Truncamento
 * 
 * Exibe todas as informações críticas operacionais (Patrimônio, Chassi,
 * Especificação Técnica e Localização completa sem reticências).
 * Otimizado para alto contraste sob luz solar (Light Mode) e modo escuro.
 */
export default function AssetSelectionCard({
  asset,
  isSelected,
  onSelect,
  type = 'retirado',
  isSameModelAsRetirado = false,
  selectionLabel
}: AssetSelectionCardProps) {
  const isRetirado = type === 'retirado';
  const defaultLabel = isSelected
    ? (isRetirado ? 'Selecionado p/ Baixa' : 'Selecionado p/ Instalação')
    : 'Selecionar';
  const activeLabel = selectionLabel || defaultLabel;

  const modeloFormatado = asset.model || asset.tipo || 'PQS ABC';
  const capacidadeFormatada = asset.peso_capacidade || asset.capacidade || '6 kg';
  const setorTexto = asset.location || 'Localização não informada';
  const subLocalTexto = asset.sub_location ? ` • ${asset.sub_location}` : '';

  return (
    <div
      onClick={onSelect}
      className={`relative w-full rounded-2xl border-2 transition-all duration-200 cursor-pointer p-3.5 sm:p-4 text-left flex flex-col justify-between gap-3 ${
        isSelected
          ? isRetirado
            ? 'border-red-600 bg-red-50/90 dark:bg-red-950/40 ring-2 ring-red-600/30 shadow-md'
            : 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-600/30 shadow-md'
          : 'border-slate-300/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-400 dark:hover:border-zinc-700 shadow-xs hover:shadow-md'
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
    >
      {/* Topo do Card: Ícone, Patrimônio, Chassi e Badge de Estado */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          {/* Ícone Temático */}
          <div
            className={`p-2.5 rounded-xl shrink-0 transition-colors ${
              isSelected
                ? isRetirado
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-emerald-600 text-white shadow-xs'
                : isRetirado
                ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
            }`}
          >
            {isRetirado ? <Flame className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>

          {/* Dados Principais: Patrimônio e Chassi */}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                {formatFriendlyPatrimonio(asset.id_ativo, asset.patrimonio || asset.id)}
              </span>

              {asset.numero_serie && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  Chassi: {asset.numero_serie}
                </span>
              )}

              {isSameModelAsRetirado && (
                <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Mesmo Agente
                </span>
              )}
            </div>

            {/* Especificação Técnica: Modelo e Capacidade */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200">
              <span className="font-extrabold text-slate-900 dark:text-white">{modeloFormatado}</span>
              <span className="text-slate-400 dark:text-zinc-500 font-bold">•</span>
              <span className="font-bold text-slate-700 dark:text-zinc-300">{capacidadeFormatada}</span>
              {!isRetirado && (
                <>
                  <span className="text-slate-400 dark:text-zinc-500 font-bold">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-black text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
                    Pronto p/ Uso
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botão de Ação "Selecionar" / "Selecionado" */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs ${
              isSelected
                ? isRetirado
                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-600/30'
                  : 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700'
            }`}
          >
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{activeLabel}</span>
          </span>
        </div>
      </div>

      {/* Localização / Setor Completo (ZERO TRUNCAMENTO) */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-start gap-1.5 text-xs">
        <MapPin className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
        <div className="text-slate-700 dark:text-zinc-300 font-medium leading-snug break-words">
          <strong className="text-slate-900 dark:text-white font-bold">Setor:</strong>{' '}
          <span>{setorTexto}{subLocalTexto}</span>
        </div>
      </div>
    </div>
  );
}
