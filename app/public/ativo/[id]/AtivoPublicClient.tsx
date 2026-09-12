'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Droplets,
  Sliders,
  Lightbulb,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MapPin,
  Award,
  FileText,
  Clock,
  Send,
  X,
  ExternalLink,
  ZoomIn,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Wrench,
  Gauge,
  Layers,
  ArrowRight
} from 'lucide-react';
import { reportPublicAnomalyAction } from '@/app/actions/publicReportActions';
import AppFooter from '@/app/components/AppFooter';
import ThemeToggle from '@/app/components/ThemeToggle';

export interface PublicAssetData {
  id: string;
  idAtivo: string;
  category: 'extintores' | 'hidrantes' | 'bombas' | 'iluminacao' | 'sinalizacoes' | string;
  model: string;
  location: string;
  subLocation?: string;
  status: string;
  statusEstoque?: string;
  fabricante?: string;
  pesoCapacidade?: string;
  numeroSerie?: string;
  patrimonio?: string;
  seloInmetro?: string;
  chassi?: string;
  dataUltimaRecarga?: string;
  validadeRecarga?: string;
  anoUltimoTesteHidro?: number;
  dataVencimentoTesteHidro?: string;
  fotoUrl?: string;
  details?: any;
  updatedAt?: string;
}

interface Props {
  initialAsset: PublicAssetData | null;
  searchedId: string;
}

const WHATSAPP_CECOM = '5594991194895';

const ANOMALIAS_PRESETS = [
  { id: 'LACRE_ROMPIDO', label: 'Lacre Rompido ou Inexistente' },
  { id: 'DESPRESSURIZADO', label: 'Despressurizado (Manômetro na faixa vermelha)' },
  { id: 'MANGUEIRA_AVARIADA', label: 'Avaria na Mangueira, Bico ou Válvula' },
  { id: 'SELO_DANIFICADO', label: 'Etiqueta ou Selo Inmetro Danificado/Ilegível' },
  { id: 'ACESSO_OBSTRUIDO', label: 'Acesso Obstruído ou Sinalização Ausente' },
  { id: 'OUTRO', label: 'Outro defeito ou necessidade de manutenção' }
];

export default function AtivoPublicClient({ initialAsset, searchedId }: Props) {
  const [asset] = useState<PublicAssetData | null>(initialAsset);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAnomalias, setSelectedAnomalias] = useState<string[]>([]);
  const [descricaoExtra, setDescricaoExtra] = useState('');
  const [nomeComunicante, setNomeComunicante] = useState('');
  const [contatoComunicante, setContatoComunicante] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessFeedback, setReportSuccessFeedback] = useState<string | null>(null);
  const [isClassesAccordionOpen, setIsClassesAccordionOpen] = useState(false);

  // -------------------------------------------------------------
  // MOTOR DE "STATUS VIVO" EM TEMPO REAL (Live Status Engine)
  // -------------------------------------------------------------
  const statusVivo = useMemo(() => {
    if (!asset) return { status: 'DESCONHECIDO', label: 'Não Localizado', color: 'slate', isOk: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawStatus = (asset.status || '').toUpperCase();
    if (rawStatus.includes('NÃO CONFORME') || rawStatus.includes('REPROVADO') || rawStatus.includes('INTERDITADO')) {
      return {
        status: 'INTERDITADO',
        label: 'INTERDITADO / NÃO CONFORME',
        subtext: 'Equipamento apontado com anomalia impeditiva em inspeção técnica.',
        badgeBg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-700',
        glowClass: 'border-red-500/50 shadow-[0_0_25px_rgba(220,38,38,0.15)] dark:shadow-[0_0_30px_rgba(220,38,38,0.35)]',
        isOk: false,
        isVencido: true
      };
    }

    // 1. Avalia Vencimento de Carga / Recarga
    let dataValidadeRecarga: Date | null = null;
    if (asset.validadeRecarga) {
      dataValidadeRecarga = new Date(asset.validadeRecarga);
    } else if (asset.dataUltimaRecarga) {
      const dt = new Date(asset.dataUltimaRecarga);
      dt.setFullYear(dt.getFullYear() + 1);
      dataValidadeRecarga = dt;
    }

    // 2. Avalia Vencimento do Teste Hidrostático (5 anos)
    let dataValidadeHidro: Date | null = null;
    if (asset.dataVencimentoTesteHidro) {
      dataValidadeHidro = new Date(asset.dataVencimentoTesteHidro);
    } else if (asset.anoUltimoTesteHidro) {
      dataValidadeHidro = new Date(asset.anoUltimoTesteHidro + 5, 11, 31);
    }

    // Verifica Vencimento
    let isVencido = false;
    let motivoVencido = '';

    if (dataValidadeRecarga && dataValidadeRecarga < today) {
      isVencido = true;
      motivoVencido = 'Garantia de Carga Vencida';
    } else if (dataValidadeHidro && dataValidadeHidro < today) {
      isVencido = true;
      motivoVencido = 'Teste Hidrostático Vencido (5 Anos NBR)';
    }

    if (isVencido) {
      return {
        status: 'VENCIDO',
        label: 'VENCIDO!',
        subtext: `${motivoVencido}. Requer intervenção imediata da equipe SPCI.`,
        badgeBg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/90 dark:text-red-400 dark:border-red-700 animate-pulse',
        glowClass: 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)] dark:shadow-[0_0_35px_rgba(220,38,38,0.45)] ring-2 ring-red-500/50',
        isOk: false,
        isVencido: true
      };
    }

    // Verifica se vence nos próximos 30 dias
    const trintaDias = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const isAVencer = (dataValidadeRecarga && dataValidadeRecarga <= trintaDias) || (dataValidadeHidro && dataValidadeHidro <= trintaDias);

    if (isAVencer) {
      return {
        status: 'A_VENCER',
        label: 'A VENCER (30 DIAS)',
        subtext: 'Próximo ao vencimento. Programado para manutenção de rotina.',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700',
        glowClass: 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] dark:shadow-[0_0_25px_rgba(245,158,11,0.25)]',
        isOk: true,
        isVencido: false
      };
    }

    return {
      status: 'NO_PRAZO',
      label: 'NO PRAZO / CONFORME',
      subtext: 'Equipamento auditado, pressurizado e apto para uso operacional imediato.',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600',
      glowClass: 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.12)] dark:shadow-[0_0_30px_rgba(16,185,129,0.25)]',
      isOk: true,
      isVencido: false
    };
  }, [asset]);

  // Helpers de formatação
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return 'Não informado';
    const clean = dateStr.substring(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleToggleAnomalia = (id: string) => {
    setSelectedAnomalias((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Envio de Reporte (Ação Dupla: WhatsApp + Webhook SPCI)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnomalias.length === 0 && !descricaoExtra.trim()) {
      alert('Selecione pelo menos uma anomalia ou descreva o problema.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      // 1. Dispara Server Action para o banco do SPCI Master
      const result = await reportPublicAnomalyAction({
        assetId: asset?.id || searchedId,
        anomalias: selectedAnomalias,
        descricao: descricaoExtra,
        comunicanteNome: nomeComunicante || undefined,
        comunicanteContato: contatoComunicante || undefined
      });

      // 2. Monta mensagem formatada para WhatsApp do CECOM
      const anomaliasTexto = selectedAnomalias
        .map((a) => {
          const found = ANOMALIAS_PRESETS.find((p) => p.id === a);
          return `• ${found?.label || a}`;
        })
        .join('\n');

      const msgWhatsApp = `*🚨 REPORTE DE ANOMALIA EM ATIVO SPCI*
----------------------------------------
*Ativo:* ${asset?.idAtivo || asset?.patrimonio || searchedId}
*Categoria:* ${asset?.category?.toUpperCase() || 'SPCI'}
*Modelo:* ${asset?.model || 'Não especificado'}
*Localização:* ${asset?.location || 'Área Geral'}${asset?.subLocation ? ` - ${asset.subLocation}` : ''}
*Status do Sistema:* ${statusVivo.label}

*ANOMALIAS REPORTADAS:*
${anomaliasTexto || '• Não conformidade relatada em campo'}

${descricaoExtra ? `*Observações:* ${descricaoExtra}\n` : ''}*Comunicante:* ${nomeComunicante || 'Colaborador no Local'}
*Contato:* ${contatoComunicante || 'Via Portal Público'}
*Protocolo:* ${result.ticketId || 'PUB-' + Date.now().toString().slice(-4)}
----------------------------------------
_Mensagem gerada automaticamente via Portal Público SPCI Master._`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_CECOM}&text=${encodeURIComponent(msgWhatsApp)}`;

      setReportSuccessFeedback(
        `Chamado ${result.ticketId || 'registrado'} com sucesso! Redirecionando para o WhatsApp do CECOM...`
      );

      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setIsReportModalOpen(false);
        setIsSubmittingReport(false);
        setReportSuccessFeedback(null);
        setSelectedAnomalias([]);
        setDescricaoExtra('');
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao reportar anomalia:', err);
      alert('Erro ao registrar chamado. Você ainda pode comunicar via WhatsApp.');
      setIsSubmittingReport(false);
    }
  };

  // Se o ativo não foi localizado
  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-200">
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <Link href="/public/ativos" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-700 to-rose-600 flex items-center justify-center text-white font-black text-xs shadow-md">
              SPCI
            </div>
            <div>
              <span className="font-['Hanken_Grotesk'] text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                SPCI MASTER
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                Portal Público
              </span>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        <div className="max-w-xl mx-auto w-full my-auto py-12 px-6 text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl dark:shadow-none transition-colors">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700/80 text-red-600 dark:text-red-500 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-md">
            ⚠️
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] uppercase font-bold tracking-widest rounded-full">
              Ativo Não Localizado
            </span>
            <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white font-['Hanken_Grotesk']">
              Identificador [{searchedId.toUpperCase()}]
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
              O equipamento informado não foi encontrado na base de dados ativa ou o código de patrimônio foi lido incorretamente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/public/ativos"
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-600/20 active:scale-95"
            >
              Consultar Catálogo de Ativos
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Acesso Técnico / Brigada
            </Link>
          </div>
        </div>
        <AppFooter variant="fixed" />
      </div>
    );
  }

  const isExtintor = (asset?.category || '').toLowerCase().includes('extintor');
  const isHidrante = (asset?.category || '').toLowerCase().includes('hidrante');
  const isBomba = (asset?.category || '').toLowerCase().includes('bomba');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono flex flex-col justify-between selection:bg-red-600 selection:text-white transition-colors duration-200">
      
      {/* HEADER INSTITUCIONAL ELEGANTE */}
      <header className="border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
        <Link href="/public/ativos" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-700 to-rose-600 flex items-center justify-center text-white font-black text-xs shadow-md group-hover:scale-105 transition-transform">
            SPCI
          </div>
          <div>
            <span className="font-['Hanken_Grotesk'] text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white block">
              SPCI MASTER
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
              Portal Público de Conformidade
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <Link
            href="/public/ativos"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all uppercase"
          >
            <span>Ver Todos na Área</span>
          </Link>

          <Link
            href={`/inspecao/${encodeURIComponent(asset.idAtivo || asset.id)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition-all uppercase"
            title="Acesso rápido para técnicos e brigadistas com sessão ativa"
          >
            <span>Área Técnica</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DA FICHA TÉCNICA */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        
        {/* CARD MESTRE COM MOTOR DE STATUS VIVO */}
        <div className={`bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-lg dark:shadow-none transition-all duration-300 relative overflow-hidden ${statusVivo.glowClass}`}>
          
          {/* Barra Superior Decorativa */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              statusVivo.isVencido ? 'bg-red-600 animate-pulse' : statusVivo.status === 'A_VENCER' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {(asset.category || 'ATIVO').toUpperCase()}
                </span>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusVivo.badgeBg}`}>
                  ● {statusVivo.label}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-3">
                <span>{asset.idAtivo || asset.patrimonio}</span>
              </h1>

              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 font-sans">
                {asset.model || 'Equipamento de Proteção Contra Incêndio'}
              </p>
            </div>

            {/* Localização e Setor em Destaque */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 flex items-start gap-3 md:max-w-xs shrink-0 transition-colors">
              <MapPin className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                  Local de Instalação Física
                </span>
                <p className="text-xs font-black uppercase text-slate-900 dark:text-white font-mono">
                  {asset.location}
                </p>
                {asset.subLocation && (
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-sans">
                    {asset.subLocation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* MENSAGEM DO MOTOR DE STATUS VIVO */}
          <div className={`mt-5 p-4 rounded-2xl border flex items-center gap-3.5 transition-colors ${
            statusVivo.isVencido
              ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-800/80 dark:text-red-200'
              : statusVivo.status === 'A_VENCER'
              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-200'
          }`}>
            {statusVivo.isVencido ? (
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 animate-bounce" />
            ) : statusVivo.status === 'A_VENCER' ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="text-xs font-sans">
              <strong className="font-mono uppercase font-bold block">{statusVivo.label}</strong>
              <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{statusVivo.subtext}</span>
            </div>
          </div>

          {/* GRID POLIMÓRFICO DE DADOS TÉCNICOS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6">
            
            {/* Capacidade / Carga */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {isExtintor ? 'Carga Nominal' : isHidrante ? 'Diâmetro Mangueiras' : 'Capacidade'}
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono">
                {asset.pesoCapacidade || asset.details?.capacidade || (isHidrante ? '1 ½" / 2 ½"' : 'Padrão NBR')}
              </p>
            </div>

            {/* Selo Inmetro / Certificação */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {isExtintor ? 'Selo Inmetro' : 'Certificação / Norma'}
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono truncate">
                {asset.seloInmetro || asset.details?.seloInmetro || 'NBR / ABNT'}
              </p>
            </div>

            {/* Vencimento da Carga / Vistoria */}
            <div className={`p-3.5 rounded-2xl space-y-1 border transition-colors ${
              statusVivo.isVencido 
                ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700/60 dark:text-red-300' 
                : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200/80 dark:border-slate-800/80'
            }`}>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {isExtintor ? 'Validade da Recarga' : 'Próxima Inspeção'}
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono">
                {formatDateBR(asset.validadeRecarga || asset.details?.nextInsp)}
              </p>
            </div>

            {/* Teste Hidrostático (5 anos) */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Teste Hidrostático
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono">
                {asset.anoUltimoTesteHidro ? `${asset.anoUltimoTesteHidro} (Vence ${asset.anoUltimoTesteHidro + 5})` : 'Conforme NBR'}
              </p>
            </div>

            {/* Número de Série / Chassi */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Nº Série / Chassi
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono truncate">
                {asset.numeroSerie || asset.chassi || asset.details?.chassi || 'SN-SPCI'}
              </p>
            </div>

            {/* Fabricante */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Fabricante
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono truncate">
                {asset.fabricante || asset.details?.fabricante || 'HOMOLOGADO'}
              </p>
            </div>

            {/* Última Recarga / Vistoria */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Última Vistoria Realizada
              </span>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono">
                {formatDateBR(asset.dataUltimaRecarga || asset.updatedAt)}
              </p>
            </div>

            {/* Status Operacional na Área */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-1 transition-colors">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Alocação de Estoque
              </span>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase font-mono truncate">
                {asset.statusEstoque || 'NA ÁREA (APLICADO)'}
              </p>
            </div>
          </div>

          {/* FOTO DO EQUIPAMENTO COM ZOOM LIGHTBOX */}
          {asset.fotoUrl && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center gap-4">
              <div
                onClick={() => setIsPhotoZoomOpen(true)}
                className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 shrink-0 cursor-pointer group shadow-md"
              >
                <img
                  src={asset.fotoUrl}
                  alt={`Ativo ${asset.idAtivo}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Registro Fotográfico em Campo
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">
                  Foto comprovatória capturada no ponto de fixação durante a última intervenção técnica.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPhotoZoomOpen(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Ampliar Fotografia em Alta Resolução</span>
                </button>
              </div>
            </div>
          )}

          {/* BOTÃO EM DESTAQUE: REPORTAR ANOMALIA NO ATIVO */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono">
                Identificou algum defeito neste equipamento?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Comunique imediatamente a Brigada de Emergência e o CECOM.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Reportar Anomalia no Ativo</span>
            </button>
          </div>
        </div>

        {/* BANNER DE ATALHO RÁPIDO PARA TÉCNICOS / BRIGADISTAS */}
        <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm dark:shadow-lg dark:shadow-emerald-950/20 transition-colors">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl shadow-sm">
              🛠️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Acesso Operacional
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Técnico / Brigadista
                </span>
              </div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono mt-1">
                Você é o responsável pela vistoria deste equipamento?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Inicie a ronda de inspeção técnica ou checklist NBR imediatamente.
              </p>
            </div>
          </div>

          <Link
            href={`/inspecao/${encodeURIComponent(asset.idAtivo || asset.id)}`}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <span>Iniciar Vistoria Técnica</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* ACORDEOM EDUCACIONAL: CLASSES DE FOGO E MODO DE OPERAÇÃO NBR 12693 (PARA EXTINTORES) */}
        {isExtintor && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 rounded-3xl overflow-hidden backdrop-blur-md shadow-sm dark:shadow-none transition-colors">
            <button
              type="button"
              onClick={() => setIsClassesAccordionOpen(!isClassesAccordionOpen)}
              className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-500 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono">
                    Classes de Fogo & Modo de Uso NBR 12693
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    Instruções para combate primário e operação segura do extintor.
                  </p>
                </div>
              </div>
              {isClassesAccordionOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {isClassesAccordionOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 space-y-6"
                >
                  {/* Classes de Fogo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-1.5 transition-colors">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-md font-mono font-bold text-[10px] uppercase">
                        Classe A
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">Sólidos Combustíveis</h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Madeira, papel, tecido e fibras que queimam em superfície e profundidade.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-1.5 transition-colors">
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-md font-mono font-bold text-[10px] uppercase">
                        Classe B
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">Líquidos Inflamáveis</h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Óleos, gasolina, solventes e graxas que queimam em superfície sem resíduos.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-1.5 transition-colors">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800 rounded-md font-mono font-bold text-[10px] uppercase">
                        Classe C
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">Equipamentos Elétricos</h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Motores, quadros elétricos e geradores energizados (não usar água condutiva).
                      </p>
                    </div>
                  </div>

                  {/* 4 Passos de Operação */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 font-mono">
                      Passo a Passo de Operação Rápida (P-A-M-P):
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-sans">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-black text-xs inline-flex items-center justify-center">1</span>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px]">Puxe a Trava</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Rompa o lacre plástico</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-black text-xs inline-flex items-center justify-center">2</span>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px]">Aponte o Bico</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Para a base do fogo</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-black text-xs inline-flex items-center justify-center">3</span>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px]">Aperte o Gatilho</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Comprima a alavanca</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white font-mono font-black text-xs inline-flex items-center justify-center">4</span>
                        <p className="font-bold text-slate-900 dark:text-white text-[11px]">Movimento em Leque</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Varra de um lado ao outro</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* POLIMORFISMO PARA HIDRANTES: CHECKLIST DE ABRIGO */}
        {isHidrante && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 rounded-3xl p-5 sm:p-6 backdrop-blur-md space-y-4 shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-500 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono">
                  Guarnição do Abrigo de Hidrante
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  Componentes obrigatórios para combate por rede pressurizada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-medium">2x Mangueiras 15m</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-medium">1x Esguicho Regulável</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-medium">2x Chaves Storz</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-medium">Válvula Angular 45º</span>
              </div>
            </div>
          </div>
        )}

        {/* POLIMORFISMO PARA CASAS DE BOMBAS */}
        {isBomba && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 rounded-3xl p-5 sm:p-6 backdrop-blur-md space-y-4 shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-500 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white font-mono">
                  Parâmetros da Casa de Bombas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  Pressurização da rede e prontidão de partida automática.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold block">Pressão Nominal</span>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono">100 - 125 PSI</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold block">Bomba Jockey</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">Operacional / Automática</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold block">Bomba Principal</span>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono">Prontidão Standby</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE REPORTE DE ANOMALIA */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden space-y-5 transition-colors"
            >
              {/* Barra superior */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-3xl" />

              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-500 flex items-center justify-center text-xl shrink-0">
                    🚨
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Reportar Anomalia no Ativo
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ativo: <strong className="text-slate-900 dark:text-white font-mono">{asset.idAtivo || asset.patrimonio}</strong> ({asset.location})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportSuccessFeedback ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl border border-emerald-200 dark:border-emerald-800 animate-pulse">
                    ✓
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{reportSuccessFeedback}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block mb-2 font-mono">
                      1. Selecione as Não Conformidades Encontradas:
                    </label>
                    <div className="space-y-2">
                      {ANOMALIAS_PRESETS.map((ano) => {
                        const isSelected = selectedAnomalias.includes(ano.id);
                        return (
                          <div
                            key={ano.id}
                            onClick={() => handleToggleAnomalia(ano.id)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-red-50 dark:bg-red-950/60 border-red-500 dark:border-red-600 text-red-900 dark:text-white font-bold'
                                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-red-600 border-red-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}>
                              {isSelected && <span className="text-[10px]">✓</span>}
                            </div>
                            <span className="text-[11px]">{ano.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block mb-1 font-mono">
                      2. Detalhes Adicionais (Opcional):
                    </label>
                    <textarea
                      rows={2}
                      value={descricaoExtra}
                      onChange={(e) => setDescricaoExtra(e.target.value)}
                      placeholder="Descreva detalhes como vazamento, amassados ou referência exata do local..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 text-xs transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] block mb-1 font-mono">
                        Seu Nome (Opcional)
                      </label>
                      <input
                        type="text"
                        value={nomeComunicante}
                        onChange={(e) => setNomeComunicante(e.target.value)}
                        placeholder="Ex: Carlos Oliveira"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 text-xs transition-colors"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] block mb-1 font-mono">
                        Seu WhatsApp / Telefone
                      </label>
                      <input
                        type="tel"
                        value={contatoComunicante}
                        onChange={(e) => setContatoComunicante(e.target.value)}
                        placeholder="Ex: (94) 99999-9999"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 text-xs transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 uppercase font-bold text-[10px] cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white uppercase font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReport ? 'Enviando Chamado...' : 'Despachar ao CECOM'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ZOOM DA FOTO (LIGHTBOX) */}
      <AnimatePresence>
        {isPhotoZoomOpen && asset.fotoUrl && (
          <div
            onClick={() => setIsPhotoZoomOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setIsPhotoZoomOpen(false)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={asset.fotoUrl}
                alt={`Foto do ativo ${asset.idAtivo}`}
                className="w-auto h-auto max-h-[75vh] max-w-full rounded-2xl border border-slate-800 shadow-2xl object-contain"
              />
              <p className="text-center text-xs text-slate-400 font-mono mt-3 uppercase tracking-wider">
                Ativo: {asset.idAtivo} | {asset.location}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER PÚBLICO */}
      <AppFooter variant="fixed" />
    </div>
  );
}
