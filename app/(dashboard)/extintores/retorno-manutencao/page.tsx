'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  Boxes,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  ChevronRight,
  Download,
  Building2,
  SlidersHorizontal,
  Archive,
  Layers,
  Award,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  LoteManutencaoRecord,
  getMaintenanceBatchesAction,
  getMaintenanceBatchDetailAction,
  getMaintenanceKpisAction,
  MaintenanceKpisResult
} from '@/app/actions/maintenanceBatchActions';
import { generateBatchRomaneioPDF, exportBatchRomaneioXLSX } from '@/lib/maintenanceBatchReports';
import ConferenciaRetornoModal from '@/app/components/ConferenciaRetornoModal';
import { useSpci } from '@/app/context/SpciContext';

export default function RetornoManutencaoPage() {
  const router = useRouter();
  const { currentUser, userProfile, triggerSuccessNotification, activeSite, isGlobalScope } = useSpci();

  const loggedUserName =
    userProfile?.name ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
    'Inspetor SPCI';
  const loggedUserEmail = userProfile?.email || currentUser?.email || undefined;

  // Determinar o contrato ativo para isolamento de dados
  const effectiveSite = (!isGlobalScope && userProfile?.site) ? userProfile.site : (activeSite || 'TODOS');

  const [activeMainTab, setActiveMainTab] = useState<'LOTES' | 'ARQUIVO_LAUDOS'>('LOTES');
  const [lotes, setLotes] = useState<LoteManutencaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_ANDAMENTO' | 'FINALIZADO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [kpis, setKpis] = useState<MaintenanceKpisResult>({
    lotesEmAndamento: 0,
    extintoresEmManutencao: 0,
    lotesPendentesConferencia: 0,
    taxaCondenacaoPercent: 0,
    totalCondenados: 0,
    totalAprovados: 0,
    totalLotes: 0
  });

  // Modal de Conferência
  const [selectedLoteForTriage, setSelectedLoteForTriage] = useState<string | null>(null);

  // Busca de lotes e KPIs com barreira de contrato
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchesRes, kpisRes] = await Promise.all([
        getMaintenanceBatchesAction(statusFilter, effectiveSite),
        getMaintenanceKpisAction(effectiveSite)
      ]);

      if (batchesRes.success && batchesRes.lotes) {
        setLotes(batchesRes.lotes);
      } else {
        setLotes([]);
      }
      if (kpisRes.success && kpisRes.kpis) {
        setKpis(kpisRes.kpis);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de manutenção:', err);
      setLotes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, effectiveSite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtragem de lotes
  const filteredLotes = lotes.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.numero_lote.toLowerCase().includes(term) ||
      l.fornecedor_nome.toLowerCase().includes(term) ||
      (l.observacoes || '').toLowerCase().includes(term)
    );
  });

  // Todos os itens condenados de todos os lotes para a aba de Arquivo Perpétuo
  const allCondemnedItems = lotes.flatMap((lote) =>
    (lote.itens || [])
      .filter((it) => it.status_triagem === 'CONDENADO')
      .map((it) => ({
        ...it,
        numero_lote: lote.numero_lote,
        fornecedor_nome: lote.fornecedor_nome,
        data_envio: lote.data_envio
      }))
  );

  const handleDownloadPDF = async (lote: LoteManutencaoRecord) => {
    try {
      const res = await getMaintenanceBatchDetailAction(lote.id);
      if (res.success && res.itens) {
        generateBatchRomaneioPDF(lote, res.itens);
      } else {
        generateBatchRomaneioPDF(lote);
      }
    } catch (e) {
      console.error(e);
      generateBatchRomaneioPDF(lote);
    }
  };

  const handleDownloadXLSX = async (lote: LoteManutencaoRecord) => {
    try {
      const res = await getMaintenanceBatchDetailAction(lote.id);
      if (res.success && res.itens) {
        exportBatchRomaneioXLSX(lote, res.itens);
      } else {
        exportBatchRomaneioXLSX(lote);
      }
    } catch (e) {
      console.error(e);
      exportBatchRomaneioXLSX(lote);
    }
  };

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Barra de Navegação Superior / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => router.push('/extintores')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Extintores</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="font-bold text-red-600 dark:text-red-400">
            Retorno de Manutenção & Lotes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Building2 className="w-3 h-3 text-red-500" />
            <span>Contrato: <strong>{effectiveSite === 'TODOS' ? 'Todos os Contratos' : effectiveSite}</strong></span>
          </span>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cabeçalho Principal Executivo */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              Controle de Lotes Externos NBR 12962
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Gestão de Retorno de Manutenção & Triagem
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
              Monitore cilindros em trânsito com empresas credenciadas, execute a conferência física com
              renovação automática de selos INMETRO e homologue laudos periciais de condenação.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMainTab('LOTES')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'LOTES'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Lotes em Trânsito ({kpis.lotesEmAndamento})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('ARQUIVO_LAUDOS')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'ARQUIVO_LAUDOS'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Arquivo Perpétuo ({allCondemnedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Painel Superior de Indicadores (Bento Grid com 4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Lotes em Aberto / Em Trânsito */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Lotes em Trânsito
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {kpis.lotesEmAndamento}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-sans flex items-center gap-1">
              <Clock className="w-3 h-3" /> Em prestadores credenciados
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Extintores em Manutenção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Cilindros Fora da Planta
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {kpis.extintoresEmManutencao}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Aguardando recarga / TH
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Lotes Pendentes de Conferência */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Aguardando Conferência
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {kpis.lotesPendentesConferencia}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Prontos para homologação
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Taxa de Condenação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Taxa de Condenação
            </span>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              {kpis.taxaCondenacaoPercent}%
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-400 font-sans flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {kpis.totalCondenados} cilindros sucateados
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Aba 1 (Lotes de Manutenção) vs Aba 2 (Arquivo Perpétuo) */}
      {activeMainTab === 'LOTES' ? (
        <div className="space-y-4">
          {/* Filtros e Barra de Ações */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'TODOS', label: `Todos (${lotes.length})` },
                { id: 'EM_ANDAMENTO', label: `🔵 Em Trânsito (${lotes.filter((l) => l.status === 'EM_ANDAMENTO').length})` },
                { id: 'FINALIZADO', label: `🟢 Finalizados (${lotes.filter((l) => l.status === 'FINALIZADO').length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por lote, fornecedor..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Listagem de Lotes (Bento Cards Expandidos) */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando lotes de manutenção...
            </div>
          ) : filteredLotes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold">Nenhum lote de manutenção localizado{effectiveSite !== 'TODOS' ? ` no contrato ${effectiveSite}` : ''}.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {effectiveSite !== 'TODOS'
                  ? `Não constam remessas ou lotes de cilindros em manutenção vinculados ao contrato ${effectiveSite}.`
                  : 'Gere remessas através do painel de "Gestão de Ativos & Estoque" selecionando extintores e clicando em "Mover em Lote".'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredLotes.map((lote) => {
                const isFinalizado = lote.status === 'FINALIZADO';
                const totalItensLote = lote.total_itens || (lote.itens || []).length || 0;
                const totalAprovadosLote = lote.total_aprovados || 0;
                const totalCondenadosLote = lote.total_condenados || 0;
                const triados = totalAprovadosLote + totalCondenadosLote;
                const percentConferido = totalItensLote > 0 ? Math.round((triados / totalItensLote) * 100) : 0;

                return (
                  <div
                    key={lote.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                              {lote.numero_lote}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isFinalizado
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {isFinalizado ? 'FINALIZADO / HOMOLOGADO' : 'EM TRÂNSITO'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-sans mt-0.5 flex items-center gap-2">
                            <span>Prestador: <strong className="text-slate-800 dark:text-slate-200">{lote.fornecedor_nome}</strong></span>
                            {lote.fornecedor_cnpj && <span>• CNPJ: {lote.fornecedor_cnpj}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(lote)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          title="Baixar Romaneio de Envio em PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span>Romaneio PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadXLSX(lote)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          title="Exportar planilha de itens"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Excel</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedLoteForTriage(lote.id)}
                          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{isFinalizado ? 'Ver Conferência' : 'Conferir Retorno'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadados e Barra de Progresso da Conferência */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Data de Envio</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {new Date(lote.data_envio).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                          {lote.dias_em_manutencao ?? 0} dias decorridos
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Previsão de Retorno</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {lote.previsao_retorno
                            ? new Date(lote.previsao_retorno).toLocaleDateString('pt-BR')
                            : 'Não especificada'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                          Responsável: {lote.usuario_envio_nome}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                          <span>Progresso da Conferência</span>
                          <span>{percentConferido}% ({triados}/{totalItensLote})</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentConferido}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span className="text-emerald-600 font-bold">{totalAprovadosLote} Aprovados</span>
                          <span>•</span>
                          <span className="text-red-600 font-bold">{totalCondenadosLote} Condenados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Aba 2: Arquivo Perpétuo de Laudos & Cilindros Condenados */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Archive className="w-4 h-4 text-red-600" />
              Arquivo Perpétuo de Cilindros Condenados & Sucateamento
            </h3>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Registros imutáveis de reprovação técnica conforme norma ABNT NBR 12962 e portarias do INMETRO.
              Estes extintores foram desincorporados da frota operacional ativa e permanecem arquivados para
              auditorias periciais do Corpo de Bombeiros e fiscalizações de SST.
            </p>
          </div>

          {allCondemnedItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold">Nenhum cilindro condenado no histórico.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Todas as inspeções hidrostáticas mantiveram conformidade regulamentar.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Patrimônio / ID</th>
                      <th className="p-3">Série / Chassi</th>
                      <th className="p-3">Tipo & Carga</th>
                      <th className="p-3">Lote de Origem</th>
                      <th className="p-3">Prestador Técnico</th>
                      <th className="p-3">Motivo da Condenação</th>
                      <th className="p-3 text-right">Laudo Pericial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allCondemnedItems.map((cond, i) => (
                      <tr key={cond.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-red-600 dark:text-red-400">
                          {cond.patrimonio || cond.id_ativo}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {cond.numero_serie || 'N/A'}
                        </td>
                        <td className="p-3">
                          {cond.modelo_tipo || 'EXTINTOR'} ({cond.capacidade || '6KG'})
                        </td>
                        <td className="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {cond.numero_lote}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-sans">
                          {cond.fornecedor_nome}
                        </td>
                        <td className="p-3 text-red-700 dark:text-red-400 font-sans font-medium">
                          {cond.motivo_condenacao || 'Condenação técnica em TH'}
                        </td>
                        <td className="p-3 text-right">
                          {cond.laudo_url ? (
                            <a
                              href={cond.laudo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              <span>Ver Laudo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Arquivado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Triagem e Conferência de Retorno */}
      {selectedLoteForTriage && (
        <ConferenciaRetornoModal
          isOpen={!!selectedLoteForTriage}
          onClose={() => setSelectedLoteForTriage(null)}
          loteId={selectedLoteForTriage}
          currentUserName={loggedUserName}
          currentUserEmail={loggedUserEmail}
          onTriageSuccess={() => {
            fetchData();
            triggerSuccessNotification?.(
              'CONFERÊNCIA HOMOLOGADA! 🟢',
              'O lote foi processado com sucesso. Cilindros aprovados estão de volta ao estoque de aplicação.'
            );
          }}
        />
      )}
    </div>
  );
}
