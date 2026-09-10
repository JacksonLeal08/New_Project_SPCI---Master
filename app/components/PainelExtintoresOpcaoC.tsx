'use client';

import React from 'react';
import { Eye, ShieldAlert, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';

interface PainelExtintoresOpcaoCProps {
  extintores: any[];
  onSelectHistory?: (asset: any) => void;
  calculateDaysRemaining?: (dateStr?: string) => number | null;
}

export const PainelExtintoresOpcaoC: React.FC<PainelExtintoresOpcaoCProps> = ({
  extintores,
  onSelectHistory,
  calculateDaysRemaining: customCalcDays
}) => {
  // Cálculo padrão de dias restantes caso não seja passado via props
  const calculateDaysRemaining = (dateStr?: string): number | null => {
    if (customCalcDays) return customCalcDays(dateStr);
    if (!dateStr) return null;
    try {
      const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
      let targetDate: Date;
      if (dateStr.includes('/')) {
        targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      if (isNaN(targetDate.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
      {/* Container de Rolagem Isolada (Strict Isolated Scroll) */}
      <div className="overflow-y-auto max-h-[calc(100vh-220px)] relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700">
        <table className="w-full text-left font-mono text-xs border-collapse min-w-[950px]">
          {/* Cabeçalho Fixo Flutuante (Sticky Header) com Backdrop Blur */}
          <thead className="sticky top-0 z-20 shadow-sm bg-slate-900/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-700/60">
            <tr>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                Identificação / Patrimônio
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                Localização Setorial
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                Tipo & Carga
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider text-center">
                Manômetro (Pressão)
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                Validade Carga
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                Teste Hidrostático
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider text-center">
                Acessibilidade
              </th>
              <th className="py-3 px-4 text-slate-200 font-semibold text-xs uppercase tracking-wider text-center">
                Ações
              </th>
            </tr>
          </thead>

          {/* Corpo com Rolagem Isolada */}
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-sans text-xs text-slate-800 dark:text-zinc-200">
            {extintores.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500 dark:text-zinc-500 font-mono">
                  <Flame className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2 opacity-50" />
                  Nenhum extintor encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              extintores.map((ext: any) => {
                const days = calculateDaysRemaining(ext.validadeRecarga || ext.data_vencimento_teste || ext.lastRecarga);
                const isExpiredRecarga = days !== null && days <= 0;
                const currentYear = new Date().getFullYear();
                const anoTeste = parseInt(ext.ano_ultimo_teste_hidro || ext.ultimoTesteHidro || currentYear, 10);
                const isExpiredHidro = (currentYear - anoTeste) >= 5;
                const isCo2 = (ext.model || '').toUpperCase().includes('CO2') || (ext.model || '').toUpperCase().includes('CO²');
                const isObstructed = ext.acessibilidade === 'Obstruído' || ext.status === 'Obstruído';
                const isManometroIrregular = !isCo2 && (ext.pressao_manometro === 'Fora da Faixa' || ext.status === 'Pressão Irregular');

                return (
                  <tr 
                    key={`opcao-c-${ext.id || ext.idAtivo}`} 
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors"
                  >
                    {/* Patrimônio / Chassi */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-black text-slate-900 dark:text-white">
                        {ext.idAtivo || ext.patrimonio || 'EXT-SEM-ID'}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal block">
                        Chassi: {ext.chassi || ext.numero_serie || 'N/A'}
                      </span>
                    </td>

                    {/* Localização */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">
                        {ext.location || ext.area || 'Setor Geral'}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans block">
                        {ext.subLocation || 'Posição Padrão'}
                      </span>
                    </td>

                    {/* Modelo & Capacidade */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1">
                        <span>🧯 {ext.model || 'PQS ABC'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">
                        {ext.peso_capacidade || ext.peso || '6KG'} | Fab: {ext.fabricante || 'Kidde'}
                      </span>
                    </td>

                    {/* Manômetro (Pressão) */}
                    <td className="py-3 px-4 text-center">
                      {isCo2 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          N/A (CO2)
                        </span>
                      ) : isManometroIrregular ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800/60 animate-pulse">
                          🔴 Fora da Faixa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                          🟢 OK
                        </span>
                      )}
                    </td>

                    {/* Validade Recarga */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">
                        {ext.validadeRecarga || ext.data_vencimento_teste || 'N/D'}
                      </div>
                      {days === null ? (
                        <span className="text-slate-400 dark:text-zinc-500 text-[10px]">Indefinido</span>
                      ) : isExpiredRecarga ? (
                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 block">🚨 Vencido</span>
                      ) : days <= 30 ? (
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block">⚠️ {days}d</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">+{days}d</span>
                      )}
                    </td>

                    {/* Teste Hidrostático */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">Ano: {anoTeste}</div>
                      {isExpiredHidro ? (
                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 block">🚨 Vencido</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">Até {anoTeste + 5}</span>
                      )}
                    </td>

                    {/* Acessibilidade */}
                    <td className="py-3 px-4 text-center">
                      {isObstructed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                          ⚠️ Obstruído
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                          🟢 Desobstruído
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectHistory && onSelectHistory({ ...ext, category: 'Extintor' })}
                        className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg transition-all cursor-pointer border border-slate-200 dark:border-zinc-700 hover:scale-105 active:scale-95"
                        title="Ver Histórico de Auditoria"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PainelExtintoresOpcaoC;
