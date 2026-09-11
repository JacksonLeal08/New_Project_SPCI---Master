'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import {
  getAssetSwapsAction,
  getSwapKpisAction,
  SubstituicaoAtivoRecord,
  MotivoTrocaType
} from '@/app/actions/assetSwapActions';
import { formatFriendlyPatrimonio } from '@/lib/maintenanceBatchReports';
import {
  formatFriendlyMotivo,
  generateSwapReportPDF,
  exportSwapsToXLSX
} from '@/lib/assetSwapReports';
import { soundNotificationService } from '@/lib/soundNotificationService';
import { useSpci } from '@/app/context/SpciContext';

export default function GestaoTrocasPage() {
  const router = useRouter();
  const { currentUser, userProfile, activeSite, isGlobalScope, openSwapModal } = useSpci();

  const loggedUserName = userProfile?.name || currentUser?.displayName || 'Operador SPCI';
  const loggedUserEmail = userProfile?.email || currentUser?.email || undefined;

  // Determinar o contrato ativo para isolamento de dados
  const effectiveSite = (!isGlobalScope && userProfile?.site) ? userProfile.site : (activeSite || 'TODOS');

  const [trocas, setTrocas] = useState<SubstituicaoAtivoRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [kpis, setKpis] = useState({
    totalTrocas: 0,
    trocasImpeditivos: 0,
    chamadosSetores: 0,
    motivoMaisRecorrente: 'Nenhum'
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMotivo, setSelectedMotivo] = useState('todos');

  // Som ativo/inativo
  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    setSoundActive(soundNotificationService.isEnabled());
  }, []);

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    soundNotificationService.setEnabled(next);
    if (next) {
      soundNotificationService.playNeutralBlip();
    }
  };

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [trocasRes, kpisRes] = await Promise.all([
        getAssetSwapsAction({
          motivo: selectedMotivo,
          termoBusca: searchTerm,
          site: effectiveSite
        }),
        getSwapKpisAction(effectiveSite)
      ]);

      if (trocasRes.success && trocasRes.trocas) {
        setTrocas(trocasRes.trocas);
      } else {
        setTrocas([]);
      }
      if (kpisRes.success && kpisRes.kpis) {
        setKpis(kpisRes.kpis);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de trocas:', err);
      setTrocas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMotivo, searchTerm, effectiveSite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwapSuccess = (newTroca: SubstituicaoAtivoRecord) => {
    setTrocas((prev) => [newTroca, ...prev]);
    fetchData();
  };

  const getMotivoBadgeColor = (m: MotivoTrocaType) => {
    switch (m) {
      case 'IMPEDITIVO_NBR':
      case 'DESPRESSURIZADO':
        return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40';
      case 'VENCIDO':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40';
      case 'SOLICITACAO_SETOR':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-bold text-slate-800 dark:text-slate-100">Gestão de Trocas & Substituições</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Contrato Ativo */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Building2 className="w-3 h-3 text-red-500" />
            <span>Contrato: <strong>{effectiveSite === 'TODOS' ? 'Todos os Contratos' : effectiveSite}</strong></span>
          </span>

          {/* Toggle Som */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              soundActive
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
            title={soundActive ? 'Alertas sonoros ativados (Clique p/ silenciar)' : 'Alertas sonoros desativados (Clique p/ ativar)'}
          >
            {soundActive ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{soundActive ? 'Som Ligado' : 'Mudo'}</span>
          </button>

          {/* Recarregar */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
          </button>

          {/* Exportar Excel */}
          <button
            type="button"
            onClick={() => exportSwapsToXLSX(trocas)}
            disabled={trocas.length === 0}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Exportar registros de trocas em planilha Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Planilha XLSX</span>
          </button>

          {/* Botão Principal: Nova Troca */}
          <button
            type="button"
            onClick={openSwapModal}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Substituição</span>
          </button>
        </div>
      </div>

      {/* Bento Grid: 4 Indicadores KPIs de Trocas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total de Trocas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Substituições
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-['Hanken_Grotesk']">
            {kpis.totalTrocas}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Registros atômicos homologados</p>
        </div>

        {/* KPI 2: Por Impeditivo NBR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              Impeditivos NBR
            </span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-2 font-['Hanken_Grotesk']">
            {kpis.trocasImpeditivos}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Trocas compulsórias em vistoria</p>
        </div>

        {/* KPI 3: Chamados de Setores */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chamados de Áreas
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-['Hanken_Grotesk']">
            {kpis.chamadosSetores}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Solicitações por líderes locais</p>
        </div>

        {/* KPI 4: Motivo Recorrente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Motivo Recorrente
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-black text-amber-700 dark:text-amber-400 mt-2 truncate uppercase">
            {kpis.motivoMaisRecorrente}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Causa predominante de troca</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por chassi, código, setor, técnico..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Motivo:</span>
          <select
            value={selectedMotivo}
            onChange={(e) => setSelectedMotivo(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os Motivos</option>
            <option value="IMPEDITIVO_NBR">Impeditivo NBR</option>
            <option value="DESPRESSURIZADO">Despressurizado</option>
            <option value="VENCIDO">Vencido</option>
            <option value="LACRE_ROMPIDO">Lacre Rompido</option>
            <option value="AVARIA_MECANICA">Avaria Mecânica</option>
            <option value="USO_EMERGENCIA">Uso em Emergência</option>
            <option value="SOLICITACAO_SETOR">Chamado por Setor</option>
          </select>
        </div>
      </div>

      {/* Tabela de Substituições Bilaterais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Histórico Perpétuo de Substituições Bilaterais ({trocas.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Rastreabilidade Total NBR 12962</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-red-600" />
            <span>Carregando registros de trocas...</span>
          </div>
        ) : trocas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Nenhuma substituição de extintor encontrada{effectiveSite !== 'TODOS' ? ` para o contrato ${effectiveSite}` : ''}.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {effectiveSite !== 'TODOS'
                ? `Não há histórico de trocas bilaterais registradas para a planta ${effectiveSite}.`
                : 'Utilize o botão "Nova Substituição" para registrar a troca de um extintor em campo.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Protocolo / Data</th>
                  <th className="py-3 px-4">Ativo Retirado (Baixa)</th>
                  <th className="py-3 px-4">Ativo Instalado (Substituto)</th>
                  <th className="py-3 px-4">Setor / Ponto</th>
                  <th className="py-3 px-4">Motivo da Troca</th>
                  <th className="py-3 px-4">Técnico Executor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {trocas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                        {t.id}
                      </div>
                      <div className="text-[9.5px] text-slate-400">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')} • {new Date(t.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                        <span>{formatFriendlyPatrimonio(t.ativo_retirado_id, t.ativo_retirado_patrimonio)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Chassi: {t.ativo_retirado_chassi || 'S/N'} • {t.ativo_retirado_modelo}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <span>{formatFriendlyPatrimonio(t.ativo_substituto_id, t.ativo_substituto_patrimonio)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Chassi: {t.ativo_substituto_chassi || 'S/N'} • {t.ativo_substituto_modelo}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{t.setor}</span>
                      </div>
                      {t.sub_local && <div className="text-[9.5px] text-slate-400 ml-4">{t.sub_local}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold ${getMotivoBadgeColor(t.motivo_troca)}`}>
                        {formatFriendlyMotivo(t.motivo_troca)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {t.tecnico_responsavel_nome}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => generateSwapReportPDF(t)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Imprimir Laudo de Troca em PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push(`/extintores/trocas/${t.id}/relatorio`)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Visualizar laudo completo em tela cheia"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
