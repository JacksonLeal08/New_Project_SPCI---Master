'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wrench,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Gauge,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Edit3,
  FileSpreadsheet
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';
import { calculateDaysRemaining } from './GestaoAtivosModal';
import ExtintorAddModal from './ExtintorAddModal';

export default function ExtintoresManagementDashboard() {
  const { extintores, setExtintores, setSelectedAssetForHistory, triggerSuccessNotification } = useSpci();

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'OPERACIONAIS' | 'VENCIDOS' | 'A_VENCER' | 'MANUTENCAO' | 'OBSTRUIDOS' | 'MANOMETRO_FALHA'>('TODOS');
  const [sectorFilter, setSectorFilter] = useState('TODOS');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // --- 1. MATRIZ DE KPIS EXECUTIVOS (spci-kpi-analytics) ---
  const kpis = useMemo(() => {
    const total = extintores.length;
    if (total === 0) {
      return {
        total: 0,
        operacionaisCount: 0,
        ipoPercentage: 100,
        ipoColor: 'text-emerald-600',
        ipoBg: 'bg-emerald-50 border-emerald-200',
        ipoStatus: 'Operacional',
        vencidosCount: 0,
        aVencer30dCount: 0,
        manutencaoExternaCount: 0,
        obstruidosCount: 0,
        manometroFalhaCount: 0
      };
    }

    let operacionais = 0;
    let vencidos = 0;
    let aVencer30d = 0;
    let manutencaoExterna = 0;
    let obstruidos = 0;
    let manometroFalha = 0;

    const currentYear = new Date().getFullYear();

    extintores.forEach((ext: any) => {
      const days = calculateDaysRemaining(ext.validadeRecarga || ext.data_vencimento_teste || ext.lastRecarga);
      const isExpiredRecarga = days !== null && days <= 0;
      
      const anoTeste = parseInt(ext.ano_ultimo_teste_hidro || ext.ultimoTesteHidro || currentYear, 10);
      const isExpiredHidro = (currentYear - anoTeste) >= 5;

      const isMaintenance = ext.status_estoque === 'EM MANUTENÇÃO' || ext.status === 'Em Manutenção';
      const isObstructed = ext.acessibilidade === 'Obstruído' || ext.status === 'Obstruído';
      
      // Manômetro: se não for CO2 e tiver indicador de pressão irregular
      const isCo2 = (ext.model || '').toUpperCase().includes('CO2') || (ext.model || '').toUpperCase().includes('CO²');
      const isManometroIrregular = !isCo2 && (ext.pressao_manometro === 'Fora da Faixa' || ext.status === 'Pressão Irregular');

      if (isMaintenance) manutencaoExterna++;
      if (isObstructed) obstruidos++;
      if (isManometroIrregular) manometroFalha++;

      if (isExpiredRecarga || isExpiredHidro || ext.status === 'Vencido') {
        vencidos++;
      } else if (days !== null && days > 0 && days <= 30) {
        aVencer30d++;
      }

      // 100% Operacional = sem vencimento, desobstruído, manômetro OK e não em manutenção
      if (!isExpiredRecarga && !isExpiredHidro && !isMaintenance && !isObstructed && !isManometroIrregular) {
        operacionais++;
      }
    });

    const ipoPercentage = Math.round((operacionais / total) * 100);

    // Thresholds Semânticos da Skill spci-kpi-analytics:
    // Verde: >= 95% | Amarelo: 85% a 94.9% | Vermelho: < 85%
    let ipoColor = 'text-emerald-700';
    let ipoBg = 'bg-emerald-50/80 border-emerald-300';
    let ipoStatus = 'Excelente (ABNT)';

    if (ipoPercentage < 85) {
      ipoColor = 'text-red-700';
      ipoBg = 'bg-red-50/80 border-red-300';
      ipoStatus = 'Crítico / Risco de Interdição';
    } else if (ipoPercentage < 95) {
      ipoColor = 'text-amber-700';
      ipoBg = 'bg-amber-50/80 border-amber-300';
      ipoStatus = 'Atenção Operacional';
    }

    return {
      total,
      operacionaisCount: operacionais,
      ipoPercentage,
      ipoColor,
      ipoBg,
      ipoStatus,
      vencidosCount: vencidos,
      aVencer30dCount: aVencer30d,
      manutencaoExternaCount: manutencaoExterna,
      obstruidosCount: obstruidos,
      manometroFalhaCount: manometroFalha
    };
  }, [extintores]);

  // --- 2. ANÁLISE TEMPORAL (PROJEÇÃO 6 MESES - RECARGAS, TESTES E ORÇAMENTO) ---
  const temporalData = useMemo(() => {
    const months: Array<{
      label: string;
      key: string;
      cargasCount: number;
      hidroCount: number;
      custoEstimado: number;
    }> = [];

    const now = new Date();
    const currentYear = now.getFullYear();

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNumber = d.getMonth() + 1;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      const key = `${year}-${String(monthNumber).padStart(2, '0')}`;

      let cargas = 0;
      let hidro = 0;
      let custo = 0;

      extintores.forEach((ext: any) => {
        // Checa mês de vencimento de recarga
        const dateStr = ext.validadeRecarga || ext.data_vencimento_teste;
        if (dateStr && dateStr.startsWith(key)) {
          cargas++;
          const isCo2 = (ext.model || '').toUpperCase().includes('CO2');
          custo += isCo2 ? 85 : 45; // Preço médio estimado de recarga
        }

        // Checa ano de teste hidrostático
        const anoTeste = parseInt(ext.ano_ultimo_teste_hidro || ext.ultimoTesteHidro || currentYear, 10);
        if (year - anoTeste === 5 && monthNumber === (d.getMonth() + 1)) {
          hidro++;
          custo += 60; // Preço médio de teste hidrostático
        }
      });

      months.push({
        label,
        key,
        cargasCount: cargas,
        hidroCount: hidro,
        custoEstimado: custo
      });
    }

    return months;
  }, [extintores]);

  const maxMonthVolume = useMemo(() => {
    const maxVal = Math.max(...temporalData.map(m => m.cargasCount + m.hidroCount), 1);
    return maxVal;
  }, [temporalData]);

  // Lista de setores únicos para filtro
  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    extintores.forEach((ext: any) => {
      if (ext.location) sectors.add(ext.location);
      if (ext.area) sectors.add(ext.area);
    });
    return Array.from(sectors);
  }, [extintores]);

  // Filtragem da tabela operacional
  const filteredExtintores = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return extintores.filter((ext: any) => {
      const days = calculateDaysRemaining(ext.validadeRecarga || ext.data_vencimento_teste || ext.lastRecarga);
      const isExpiredRecarga = days !== null && days <= 0;
      const anoTeste = parseInt(ext.ano_ultimo_teste_hidro || ext.ultimoTesteHidro || currentYear, 10);
      const isExpiredHidro = (currentYear - anoTeste) >= 5;
      const isMaintenance = ext.status_estoque === 'EM MANUTENÇÃO' || ext.status === 'Em Manutenção';
      const isObstructed = ext.acessibilidade === 'Obstruído' || ext.status === 'Obstruído';
      const isCo2 = (ext.model || '').toUpperCase().includes('CO2');
      const isManometroIrregular = !isCo2 && (ext.pressao_manometro === 'Fora da Faixa' || ext.status === 'Pressão Irregular');

      // Filtro por Status
      let matchStatus = true;
      if (statusFilter === 'OPERACIONAIS') {
        matchStatus = !isExpiredRecarga && !isExpiredHidro && !isMaintenance && !isObstructed && !isManometroIrregular;
      } else if (statusFilter === 'VENCIDOS') {
        matchStatus = isExpiredRecarga || isExpiredHidro || ext.status === 'Vencido';
      } else if (statusFilter === 'A_VENCER') {
        matchStatus = days !== null && days > 0 && days <= 30;
      } else if (statusFilter === 'MANUTENCAO') {
        matchStatus = isMaintenance;
      } else if (statusFilter === 'OBSTRUIDOS') {
        matchStatus = isObstructed;
      } else if (statusFilter === 'MANOMETRO_FALHA') {
        matchStatus = isManometroIrregular;
      }

      // Filtro por Setor
      let matchSector = true;
      if (sectorFilter !== 'TODOS') {
        matchSector = ext.location === sectorFilter || ext.area === sectorFilter;
      }

      // Filtro por Busca Textual
      const term = searchTerm.toLowerCase().trim();
      let matchSearch = true;
      if (term) {
        matchSearch =
          (ext.idAtivo || '').toLowerCase().includes(term) ||
          (ext.patrimonio || '').toLowerCase().includes(term) ||
          (ext.chassi || '').toLowerCase().includes(term) ||
          (ext.model || '').toLowerCase().includes(term) ||
          (ext.location || '').toLowerCase().includes(term) ||
          (ext.subLocation || '').toLowerCase().includes(term) ||
          (ext.area || '').toLowerCase().includes(term) ||
          (ext.fabricante || '').toLowerCase().includes(term);
      }

      return matchStatus && matchSector && matchSearch;
    });
  }, [extintores, statusFilter, sectorFilter, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* ═══ CABEÇALHO DO MÓDULO DE EXTINTORES ═══ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shadow-inner">
            <Flame className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-mono font-bold rounded uppercase tracking-wider border border-red-500/30">
                Módulo Executivo ABNT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">NBR 12962 / NBR 13434</span>
            </div>
            <h2 className="text-lg font-black font-['Hanken_Grotesk'] tracking-wide text-white uppercase mt-0.5">
              Gestão & Dashboard de Extintores de Incêndio
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Extintor</span>
          </button>
        </div>
      </div>

      {/* ═══ 1. CARDS DE KPI EXECUTIVOS (RESUMO EXECUTIVO COM CORES SEMÂNTICAS) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: % de Extintores 100% Operacionais (IPO) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl border ${kpis.ipoBg} shadow-xs relative overflow-hidden flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600">
              Índice de Prontidão (IPO)
            </span>
            <ShieldCheck className={`w-5 h-5 ${kpis.ipoColor}`} />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-['Hanken_Grotesk'] ${kpis.ipoColor}`}>
                {kpis.ipoPercentage}%
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                ({kpis.operacionaisCount}/{kpis.total} ativos)
              </span>
            </div>
            <span className={`text-[10px] font-bold block mt-1 ${kpis.ipoColor}`}>
              ● {kpis.ipoStatus}
            </span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                kpis.ipoPercentage >= 95 ? 'bg-emerald-600' : kpis.ipoPercentage >= 85 ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${kpis.ipoPercentage}%` }}
            />
          </div>
        </motion.div>

        {/* KPI 2: Volume de Cargas ou Testes Hidrostáticos Vencidos (Alerta Crítico) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl border border-red-200 bg-red-50/70 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-red-800">
              Vencidos (Carga / Teste)
            </span>
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-['Hanken_Grotesk'] text-red-700">
              {kpis.vencidosCount}
            </span>
            <p className="text-[10px] text-red-800 font-medium font-sans mt-0.5">
              {kpis.vencidosCount > 0
                ? '⚠️ Requer recarga ou teste hidrostático imediato'
                : '🟢 Nenhum extintor vencido no parque'}
            </p>
          </div>
          <span className="text-[9px] font-mono font-bold text-red-600 uppercase">
            Alerta Crítico de Conformidade
          </span>
        </motion.div>

        {/* KPI 3: Vencimentos Próximos nos próximos 30 dias */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-800">
              A Vencer (Próximos 30 dias)
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-['Hanken_Grotesk'] text-amber-800">
              {kpis.aVencer30dCount}
            </span>
            <p className="text-[10px] text-amber-800 font-medium font-sans mt-0.5">
              📅 Janela de acionamento preventivo de fornecedor
            </p>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-700 uppercase">
            Planejamento de Manutenção
          </span>
        </motion.div>

        {/* KPI 4: Extintores em Manutenção Externa / Fora de Base */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/70 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-900">
              Em Manutenção Externa
            </span>
            <Wrench className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-['Hanken_Grotesk'] text-indigo-900">
              {kpis.manutencaoExternaCount}
            </span>
            <p className="text-[10px] text-indigo-800 font-medium font-sans mt-0.5">
              {kpis.manutencaoExternaCount > 0
                ? '🔁 Alerta: verificar alocação de extintor reserva'
                : '✅ 100% dos extintores instalados na base'}
            </p>
          </div>
          <span className="text-[9px] font-mono font-bold text-indigo-700 uppercase">
            Rastreabilidade de Reserva
          </span>
        </motion.div>
      </div>

      {/* ═══ 2. ANÁLISE TEMPORAL (GRÁFICO INTERATIVO DE PROJEÇÃO DE VENCIMENTOS E CUSTOS) ═══ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-['Hanken_Grotesk'] font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Análise Temporal · Curva de Vencimentos & Projeção Orçamentária (6 Meses)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Previsão de lotes de recargas (1 ano) e testes hidrostáticos (5 anos) com estimativa de custo financeiro
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-indigo-700 font-bold">
              <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" /> Recargas Previstas
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Teste Hidrostático (5 anos)
            </span>
          </div>
        </div>

        {/* Gráfico Visual de Barras Interativo com Estimativa Orçamentária */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {temporalData.map((month, idx) => {
            const isHovered = hoveredMonthIndex === idx;
            const totalItems = month.cargasCount + month.hidroCount;
            const barHeightPercent = Math.max(Math.round((totalItems / maxMonthVolume) * 100), totalItems > 0 ? 15 : 4);

            return (
              <div
                key={month.key}
                onMouseEnter={() => setHoveredMonthIndex(idx)}
                onMouseLeave={() => setHoveredMonthIndex(null)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                  isHovered
                    ? 'bg-indigo-50/70 border-indigo-400 shadow-md ring-2 ring-indigo-200'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-800 uppercase">
                      {month.label}
                    </span>
                    {totalItems > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-indigo-100 text-indigo-800">
                        {totalItems} un
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    R$ {month.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Barra Visual */}
                <div className="w-full bg-slate-200 rounded-lg h-20 flex items-end p-1 overflow-hidden my-2">
                  <div className="w-full flex items-end gap-1 h-full">
                    {/* Barra Recargas */}
                    <div
                      style={{ height: `${(month.cargasCount / maxMonthVolume) * 100}%` }}
                      className="flex-1 bg-indigo-600 rounded-t transition-all duration-500 min-h-[2px]"
                      title={`${month.cargasCount} recargas`}
                    />
                    {/* Barra Teste Hidro */}
                    <div
                      style={{ height: `${(month.hidroCount / maxMonthVolume) * 100}%` }}
                      className="flex-1 bg-amber-500 rounded-t transition-all duration-500 min-h-[2px]"
                      title={`${month.hidroCount} testes hidro`}
                    />
                  </div>
                </div>

                {/* Subdetalhes */}
                <div className="text-[9px] font-mono text-slate-600 flex justify-between border-t border-slate-200 pt-1">
                  <span>Rec: {month.cargasCount}</span>
                  <span>Hidro: {month.hidroCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 3. GESTÃO OPERACIONAL E TABELA DE ATIVOS (CRUD COMPLETO) ═══ */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
        
        {/* Barra de Filtros e Busca da Tabela */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Busca Textual */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Patrimônio, Série, Modelo, Local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 pl-9 pr-3 py-2 rounded-xl text-xs font-sans text-slate-900 font-bold focus:outline-none focus:border-red-600 shadow-xs"
            />
          </div>

          {/* Filtro por Setor */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Setor:
            </span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
            >
              <option value="TODOS">Todos os Setores ({extintores.length})</option>
              {availableSectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pills de Filtragem de Integridade e Status Operacional */}
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono scrollbar-thin">
          <span className="font-bold text-slate-500 pr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filtros Rápidos:
          </span>
          {[
            { id: 'TODOS', label: `Todos (${extintores.length})` },
            { id: 'OPERACIONAIS', label: `🟢 100% Operacionais (${kpis.operacionaisCount})` },
            { id: 'VENCIDOS', label: `🔴 Vencidos (${kpis.vencidosCount})` },
            { id: 'A_VENCER', label: `🟡 A Vencer 30d (${kpis.aVencer30dCount})` },
            { id: 'MANUTENCAO', label: `🔵 Manutenção Externa (${kpis.manutencaoExternaCount})` },
            { id: 'OBSTRUIDOS', label: `⚠️ Obstruídos (${kpis.obstruidosCount})` },
            { id: 'MANOMETRO_FALHA', label: `🔴 Manômetro Fora da Faixa (${kpis.manometroFalhaCount})` }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Tabela de Extintores */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs border-collapse min-w-[950px]">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Identificação / Patrimônio</th>
                <th className="py-3 px-4">Localização Setorial</th>
                <th className="py-3 px-4">Tipo & Carga</th>
                <th className="py-3 px-4 text-center">Manômetro (Pressão)</th>
                <th className="py-3 px-4">Validade Carga</th>
                <th className="py-3 px-4">Teste Hidrostático</th>
                <th className="py-3 px-4 text-center">Acessibilidade</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs text-slate-800">
              {filteredExtintores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    Nenhum extintor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExtintores.map((ext: any) => {
                  const days = calculateDaysRemaining(ext.validadeRecarga || ext.data_vencimento_teste || ext.lastRecarga);
                  const isExpiredRecarga = days !== null && days <= 0;
                  const currentYear = new Date().getFullYear();
                  const anoTeste = parseInt(ext.ano_ultimo_teste_hidro || ext.ultimoTesteHidro || currentYear, 10);
                  const isExpiredHidro = (currentYear - anoTeste) >= 5;
                  const isCo2 = (ext.model || '').toUpperCase().includes('CO2') || (ext.model || '').toUpperCase().includes('CO²');
                  const isObstructed = ext.acessibilidade === 'Obstruído' || ext.status === 'Obstruído';
                  const isManometroIrregular = !isCo2 && (ext.pressao_manometro === 'Fora da Faixa' || ext.status === 'Pressão Irregular');

                  return (
                    <tr key={ext.id || ext.idAtivo} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Identificação */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-black text-slate-900">{ext.idAtivo || ext.patrimonio || 'EXT-SEM-ID'}</div>
                        <span className="text-[10px] text-slate-500 font-normal block">
                          Chassi: {ext.chassi || ext.numero_serie || 'N/A'}
                        </span>
                      </td>

                      {/* Localização Setorial */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ext.location || ext.area || 'Setor Geral'}</div>
                        <span className="text-[10px] text-slate-500 font-sans block">
                          {ext.subLocation || 'Posição Padrão'}
                        </span>
                      </td>

                      {/* Tipo / Capacidade */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <span>🧯 {ext.model || 'PQS ABC'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {ext.peso_capacidade || ext.peso || '6KG'} | Fab: {ext.fabricante || 'Kidde'}
                        </span>
                      </td>

                      {/* Pressão do Manômetro */}
                      <td className="py-3 px-4 text-center">
                        {isCo2 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            N/A (CO2 Alta Pressão)
                          </span>
                        ) : isManometroIrregular ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            🔴 Fora da Faixa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Faixa Verde
                          </span>
                        )}
                      </td>

                      {/* Validade da Carga */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {ext.validadeRecarga || ext.data_vencimento_teste || 'N/D'}
                        </div>
                        {days === null ? (
                          <span className="text-slate-400 text-[10px]">Indefinido</span>
                        ) : isExpiredRecarga ? (
                          <span className="text-[10px] font-black text-red-600 block">
                            🚨 Vencido ({Math.abs(days)}d)
                          </span>
                        ) : days <= 30 ? (
                          <span className="text-[10px] font-black text-amber-700 block">
                            ⚠️ Vence em {days} dias
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            +{days} dias
                          </span>
                        )}
                      </td>

                      {/* Teste Hidrostático (5 anos ABNT) */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          Ano: {anoTeste}
                        </div>
                        {isExpiredHidro ? (
                          <span className="text-[10px] font-black text-red-600 block">
                            🚨 Teste Vencido ({currentYear - anoTeste} anos)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            Válido até {anoTeste + 5}
                          </span>
                        )}
                      </td>

                      {/* Acessibilidade / Desobstrução */}
                      <td className="py-3 px-4 text-center">
                        {isObstructed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ⚠️ Obstruído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Desobstruído
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <button
                            onClick={() => setSelectedAssetForHistory({ ...ext, category: 'Extintor' })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer border border-slate-200"
                            title="Ver Histórico de Auditoria"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
          <span>Exibindo {filteredExtintores.length} de {extintores.length} extintores monitorados</span>
          <span className="font-bold">Conformidade ABNT NBR 12962 / SPCI Master</span>
        </div>
      </div>

      {/* Modal de Cadastro de Extintor */}
      <ExtintorAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
