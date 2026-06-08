import React from 'react';
import { motion } from 'motion/react';
import { X, Share2, Shield, AlertTriangle, CheckCircle, HelpCircle, ClipboardList } from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';

interface ConformidadeStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  conformes: number;
  vencidos: number;
  manutencao: number;
  compliancePercent: number;
}

export default function ConformidadeStudyModal({
  isOpen,
  onClose,
  total,
  conformes,
  vencidos,
  manutencao,
  compliancePercent
}: ConformidadeStudyModalProps) {
  const { complianceLogs, extintores } = useSpci();
  const now = new Date();

  // Filter inspections of the current month that are related to extintores
  const extintoresIds = new Set((extintores || []).map(e => e.idAtivo));
  const currentMonthExtintoresLogs = (complianceLogs || []).filter(log => {
    if (!log.date) return false;
    const logDate = new Date(log.date + 'T00:00:00');
    const isCurrentMonth = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    const isExtintor = extintoresIds.has(log.assetId) || log.assetId?.startsWith('EXT-');
    return isCurrentMonth && isExtintor;
  });

  const totalInspecoes = currentMonthExtintoresLogs.length;

  // FEITAS: Unique extintores inspected this month
  const uniqueInspectedExtintores = new Set(currentMonthExtintoresLogs.map(log => log.assetId));
  const feitasCount = uniqueInspectedExtintores.size;
  const totalAssets = extintores?.length || total || 0;
  const feitasPercent = totalAssets > 0 ? Math.round((feitasCount / totalAssets) * 100) : 0;

  // NÃO FEITAS: Extintores pending inspection this month
  const naoFeitasCount = Math.max(0, totalAssets - feitasCount);
  const naoFeitasPercent = totalAssets > 0 ? Math.round((naoFeitasCount / totalAssets) * 100) : 100;

  // OCORRÊNCIAS: Inspections with non-conforming status
  const ocorrenciasCount = currentMonthExtintoresLogs.filter(log => {
    const statusUpper = (log.status || '').toUpperCase();
    return statusUpper.includes('NÃO') || statusUpper.includes('INCONFORME') || statusUpper.includes('FALHA') || statusUpper.includes('VENCIDO') || statusUpper === 'ERROR';
  }).length;

  const ocorrenciasPercent = totalInspecoes > 0 ? Math.round((ocorrenciasCount / totalInspecoes) * 100) : 0;

  if (!isOpen) return null;

  // Determine dynamic highlight color based on compliance percentage
  const getStatusTheme = () => {
    if (compliancePercent >= 90) {
      return {
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/20',
        border: 'border-emerald-500/30',
        bar: 'bg-emerald-500',
        label: 'EXCELENTE'
      };
    }
    if (compliancePercent >= 75) {
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-950/20',
        border: 'border-amber-500/30',
        bar: 'bg-amber-500',
        label: 'ATENÇÃO REQUERIDA'
      };
    }
    return {
      color: 'text-rose-400',
      bg: 'bg-rose-955/20',
      border: 'border-rose-500/30',
      bar: 'bg-rose-500',
      label: 'NÍVEL CRÍTICO'
    };
  };

  const theme = getStatusTheme();

  const handleShare = async () => {
    const shareText = `🧯 SPCI - Relatório de Conformidade (Planta Extintores)
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Taxa de Conformidade: ${compliancePercent}%
--------------------------------------
• Total de Equipamentos: ${total}
• Em Conformidade: ${conformes}
• Validade Vencida: ${vencidos}
• Em Manutenção: ${manutencao}

Status Geral de Segurança baseado nas normas de conformidade NBR 12962.
Acesse o painel para verificar os detalhes: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SPCI - Relatório de Conformidade',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.warn('Native sharing failed or cancelled:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Copiado! O relatório formatado de conformidade foi salvo na sua Área de Transferência.');
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 font-mono select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl relative overflow-hidden flex flex-col"
      >
        {/* Dynamic Accent Bar */}
        <div className={`h-1.5 w-full ${theme.bar}`} />

        {/* Header HUD */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex flex-col gap-0.5">
            <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${theme.color}`}>
              <Shield className="w-3.5 h-3.5" /> ESTUDO DE INDICADORES NBR 12962
            </span>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mt-1">
              ESTATÍSTICA DE CONFORMIDADE DA PLANTA
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-700 bg-slate-950 p-2.5 transition-all rounded-xl cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
          
          {/* Main Formula Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute right-4 bottom-2 text-6xl opacity-5">∑</div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">Fórmula de Cálculo do Indicador</span>
            <div className="mt-3 flex flex-col items-center justify-center p-3.5 bg-slate-900/80 border border-slate-800/60 rounded-lg text-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Taxa de Conformidade (%)</span>
              <div className="flex items-center gap-3 font-mono font-bold text-xs text-slate-200">
                <div className="flex flex-col items-center border-b border-slate-700 pb-1 px-3">
                  <span>Ativos Conformes</span>
                </div>
                <span>/</span>
                <div className="px-3">
                  <span>Total de Ativos</span>
                </div>
                <span>×</span>
                <span>100</span>
              </div>
              <span className="text-[9px] text-slate-500 font-sans mt-2">
                * Ativos com status de conformidade ativa, excluindo vencidos ou sob manutenção corretiva.
              </span>
            </div>
          </div>

          {/* Current Numbers breakdown */}
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-3">
              Mapeamento de Dados Atuais
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                <span className="text-[8px] text-slate-500 uppercase font-black block">Total de Ativos</span>
                <span className="text-xl font-black text-slate-200 block mt-1">{total}</span>
              </div>
              <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded-xl">
                <span className="text-[8px] text-emerald-500 uppercase font-black block">OK / No Prazo</span>
                <span className="text-xl font-black text-emerald-400 block mt-1 flex items-center gap-1">
                  {conformes} <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                </span>
              </div>
              <div className="p-3 bg-rose-955/10 border border-rose-900/20 rounded-xl">
                <span className="text-[8px] text-rose-500 uppercase font-black block">Vencido</span>
                <span className="text-xl font-black text-rose-400 block mt-1 flex items-center gap-1">
                  {vencidos} <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                </span>
              </div>
              <div className="p-3 bg-amber-955/10 border border-amber-900/20 rounded-xl">
                <span className="text-[8px] text-amber-500 uppercase font-black block">Manutenção</span>
                <span className="text-xl font-black text-amber-400 block mt-1">{manutencao}</span>
              </div>
            </div>
          </div>

        {/* Inspeções no Período */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-3">
            Inspeções no Período
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Inspections */}
            <div className="p-3 bg-slate-950/40 border border-sky-500/30 rounded-xl text-center shadow-sm flex flex-col justify-between min-h-[95px] transition-all hover:bg-slate-950/60">
              <div className="flex flex-col items-center gap-0.5">
                <ClipboardList className="w-4 h-4 text-sky-400" />
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mt-1">TOTAL INSPEÇÕES</span>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl font-black text-sky-400 block">{totalInspecoes}</span>
                <span className="text-[8px] text-slate-500 font-sans mt-0.5">Realizadas</span>
              </div>
            </div>

            {/* Feitas */}
            <div className="p-3 bg-slate-950/40 border border-rose-500/30 rounded-xl text-center shadow-sm flex flex-col justify-between min-h-[95px] transition-all hover:bg-slate-950/60">
              <div className="flex flex-col items-center gap-0.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mt-1">FEITAS</span>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl font-black text-rose-400 block">{feitasCount}</span>
                <span className="text-[8.5px] text-rose-450 font-sans mt-0.5 font-bold">{feitasPercent}% dos ativos</span>
              </div>
            </div>

            {/* Não Feitas */}
            <div className="p-3 bg-slate-950/40 border border-amber-500/30 rounded-xl text-center shadow-sm flex flex-col justify-between min-h-[95px] transition-all hover:bg-slate-950/60">
              <div className="flex flex-col items-center gap-0.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mt-1">NÃO FEITAS</span>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl font-black text-amber-400 block">{naoFeitasCount}</span>
                <span className="text-[8.5px] text-amber-450 font-sans mt-0.5 font-bold">▲ {naoFeitasPercent}% pendentes</span>
              </div>
            </div>

            {/* Ocorrências */}
            <div className="p-3 bg-slate-950/40 border border-emerald-500/30 rounded-xl text-center shadow-sm flex flex-col justify-between min-h-[95px] transition-all hover:bg-slate-950/60">
              <div className="flex flex-col items-center gap-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mt-1">OCORRÊNCIAS</span>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl font-black text-emerald-400 block">{ocorrenciasCount}</span>
                <span className="text-[8.5px] text-emerald-450 font-sans mt-0.5 font-bold">✓ {ocorrenciasPercent}% das insp.</span>
              </div>
            </div>
          </div>
        </div>

          {/* Detailed Study Text */}
          <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl">
            <h3 className="font-mono text-[10px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-red-500" /> O que representa este indicador?
            </h3>
            <p>
              A conformidade dos extintores na planta industrial segue os requisitos rígidos da norma <strong>NBR 12962</strong>, que estabelece os intervalos e métodos para inspeções periódicas obrigatórias de primeiro, segundo e terceiro grau.
            </p>
            <p>
              Manter o indicador de conformidade em níveis elevados (acima de 90%) garante que o sistema de combate a incêndio primário da edificação estará totalmente funcional em caso de sinistro. Extintores com validade vencida ou despressurizados comprometem a segurança da planta e podem invalidar apólices de seguro, além de gerar autuações pelos órgãos fiscalizadores (como o Corpo de Bombeiros).
            </p>
            <div className="pt-2 border-t border-slate-800/60 font-mono text-[9px] text-slate-500 flex flex-col gap-1">
              <span>• Grau 1: Verificação mensal de pressão, lacre e sinalização (Ronda Técnica).</span>
              <span>• Grau 2: Recarga e manutenção preventiva a cada 12 meses.</span>
              <span>• Grau 3: Teste hidrostático obrigatório a cada 5 anos (NBR 13419).</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
            <button 
              type="button" 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-350 font-bold uppercase tracking-wider text-[10px] underline decoration-dotted transition-all cursor-pointer"
            >
              Fechar Detalhes
            </button>
            <button 
              type="button" 
              onClick={handleShare}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-950 bg-sky-450 hover:bg-sky-400 rounded-xl cursor-pointer shadow-lg transition-all active:scale-[0.97] flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar Relatório
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
