'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  History,
  Search,
  Filter,
  ArrowLeft,
  FileText,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Camera,
  Calendar,
  User,
  ShieldCheck,
  RefreshCw,
  Eye,
  Download,
  X,
  Building,
  Check
} from 'lucide-react';
import { useSpci } from '@/app/context/SpciContext';
import {
  fetchAllInspecoes,
  updateInspecaoNotes,
  cancelarInspecao,
  createManualInspecao
} from '@/lib/supabaseDb';
import { InspecaoRealizada } from '@/lib/types';

function HistoricoInspecoesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramAtivo = searchParams?.get('ativo') || '';

  const { userProfile, extintores } = useSpci();

  // Estados de dados
  const [inspecoes, setInspecoes] = useState<InspecaoRealizada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>(paramAtivo);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'Conforme' | 'Não Conforme' | 'Cancelada'>('TODOS');
  const [selectedSite, setSelectedSite] = useState<string>('TODOS');

  // Modais de Ação
  const [editModalItem, setEditModalItem] = useState<InspecaoRealizada | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const [cancelModalItem, setCancelModalItem] = useState<InspecaoRealizada | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState<string>('');
  const [savingCancel, setSavingCancel] = useState<boolean>(false);

  const [newManualModal, setNewManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    asset_patrimonio: paramAtivo || '',
    status: 'Conforme' as 'Conforme' | 'Não Conforme',
    tecnico_nome: userProfile?.name || 'Técnico SPCI',
    data_inspecao: new Date().toISOString().slice(0, 16),
    observacoes: '',
    site: 'SALOBO'
  });
  const [savingManual, setSavingManual] = useState<boolean>(false);

  // Carregar inspeções
  const loadData = async () => {
    try {
      setRefreshing(true);
      const data = await fetchAllInspecoes({ limit: 350 });
      setInspecoes(data);
    } catch (err) {
      console.error('Erro ao carregar histórico de inspeções:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sincronizar nome do técnico se perfil carregar depois
  useEffect(() => {
    if (userProfile?.name && manualForm.tecnico_nome === 'Técnico SPCI') {
      setManualForm((prev) => ({ ...prev, tecnico_nome: userProfile.name }));
    }
  }, [userProfile?.name]);

  // Se paramAtivo mudar na URL
  useEffect(() => {
    if (paramAtivo) {
      setSearchTerm(paramAtivo);
    }
  }, [paramAtivo]);

  // Filtros aplicados
  const filteredList = useMemo(() => {
    return inspecoes.filter((item) => {
      // Filtro Status
      if (statusFilter !== 'TODOS') {
        const s = item.status || '';
        if (statusFilter === 'Conforme') {
          if (!s.toLowerCase().includes('conforme') || s.toLowerCase().includes('não') || s.toLowerCase().includes('nao')) {
            return false;
          }
        } else if (statusFilter === 'Não Conforme') {
          if (!s.toLowerCase().includes('não') && !s.toLowerCase().includes('nao')) {
            return false;
          }
        } else if (statusFilter === 'Cancelada') {
          if (!s.toLowerCase().includes('cancel')) {
            return false;
          }
        }
      }

      // Filtro Site
      if (selectedSite !== 'TODOS' && selectedSite !== 'TODOS OS SITES (Acesso Global)') {
        if (item.site && item.site !== selectedSite) return false;
      }

      // Filtro Busca
      if (searchTerm.trim()) {
        const s = searchTerm.trim().toLowerCase();
        const pat = (item.asset_patrimonio || '').toLowerCase();
        const tec = (item.tecnico_nome || '').toLowerCase();
        const obs = (item.observacoes || '').toLowerCase();
        const sit = (item.site || '').toLowerCase();
        if (!pat.includes(s) && !tec.includes(s) && !obs.includes(s) && !sit.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [inspecoes, statusFilter, selectedSite, searchTerm]);

  // Contadores para os KPIs do topo
  const kpis = useMemo(() => {
    let conf = 0;
    let naoConf = 0;
    let canc = 0;

    inspecoes.forEach((i) => {
      const s = (i.status || '').toLowerCase();
      if (s.includes('cancel')) canc++;
      else if (s.includes('não') || s.includes('nao')) naoConf++;
      else conf++;
    });

    return {
      total: inspecoes.length,
      conforme: conf,
      naoConforme: naoConf,
      canceladas: canc
    };
  }, [inspecoes]);

  // Handler: Salvar Edição de Notas
  const handleSaveNotes = async () => {
    if (!editModalItem?.id) return;
    try {
      setSavingEdit(true);
      const ok = await updateInspecaoNotes(
        editModalItem.id,
        editNotes,
        userProfile?.name || 'Sistema'
      );
      if (ok) {
        setInspecoes((prev) =>
          prev.map((i) => (i.id === editModalItem.id ? { ...i, observacoes: editNotes } : i))
        );
        setEditModalItem(null);
      } else {
        alert('Não foi possível retificar as anotações. Tente novamente.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler: Cancelar Vistoria (Soft-delete)
  const handleConfirmCancel = async () => {
    if (!cancelModalItem?.id || !cancelJustificativa.trim()) {
      alert('A justificativa de cancelamento é obrigatória para fins de conformidade regulatória.');
      return;
    }
    try {
      setSavingCancel(true);
      const ok = await cancelarInspecao(
        cancelModalItem.id,
        cancelJustificativa.trim(),
        userProfile?.name || 'Sistema'
      );
      if (ok) {
        setInspecoes((prev) =>
          prev.map((i) =>
            i.id === cancelModalItem.id
              ? {
                  ...i,
                  status: 'Cancelada',
                  justificativa_reinspecao: cancelJustificativa.trim()
                }
              : i
          )
        );
        setCancelModalItem(null);
        setCancelJustificativa('');
      } else {
        alert('Não foi possível cancelar a vistoria. Verifique suas permissões.');
      }
    } finally {
      setSavingCancel(false);
    }
  };

  // Handler: Cadastrar Vistoria Manual
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.asset_patrimonio.trim()) {
      alert('Por favor, informe o patrimônio do extintor.');
      return;
    }

    try {
      setSavingManual(true);
      const newId = await createManualInspecao({
        asset_id: manualForm.asset_patrimonio.trim(),
        asset_patrimonio: manualForm.asset_patrimonio.trim().toUpperCase(),
        status: manualForm.status,
        tecnico_nome: manualForm.tecnico_nome.trim() || 'Técnico SPCI',
        data_inspecao: new Date(manualForm.data_inspecao).toISOString(),
        observacoes: manualForm.observacoes.trim(),
        site: manualForm.site,
        details: {
          origem: 'REGISTRO_MANUAL_WEB',
          criado_por: userProfile?.name || 'Usuário Web'
        }
      });

      if (newId) {
        await loadData();
        setNewManualModal(false);
        setManualForm({
          asset_patrimonio: '',
          status: 'Conforme',
          tecnico_nome: userProfile?.name || 'Técnico SPCI',
          data_inspecao: new Date().toISOString().slice(0, 16),
          observacoes: '',
          site: 'SALOBO'
        });
      } else {
        alert('Erro ao registrar vistoria manual. Tente novamente.');
      }
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header com Navegação e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <button
            onClick={() => router.push('/extintores')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Gestão de Extintores
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Histórico Geral de Inspeções
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/40">
                  ABNT NBR 12962
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rastreabilidade completa de vistorias com telemetria GPS, evidências fotográficas e emissão de laudo pericial.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setNewManualModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Vistoria Manual</span>
          </button>
        </div>
      </div>

      {/* Régua de Cards KPIs Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Vistorias</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono">
            {kpis.total}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-1 block">Registros computados</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Conformes</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2 font-mono">
            {kpis.conforme}
          </div>
          <span className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">
            {kpis.total > 0 ? `${Math.round((kpis.conforme / kpis.total) * 100)}% de conformidade` : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800 dark:text-red-400">Não Conformes</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-700 dark:text-red-300">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-2 font-mono">
            {kpis.naoConforme}
          </div>
          <span className="text-[10.5px] text-red-600/80 dark:text-red-400/80 mt-1 block">
            Requerem manutenção
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Canceladas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-2 font-mono">
            {kpis.canceladas}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-1 block">Com justificativa auditada</span>
        </div>
      </div>

      {/* Barra de Filtros & Pesquisa */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Campo de Pesquisa */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Patrimônio (ex: EXT-337), Inspetor ou Observações..."
              className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600 transition placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro por Contrato/Site */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="TODOS">Todos os Contratos / Sites</option>
              <option value="SALOBO">Contrato: SALOBO</option>
            </select>
          </div>
        </div>

        {/* Chips de Status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Status:
          </span>
          {(['TODOS', 'Conforme', 'Não Conforme', 'Cancelada'] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition text-xs ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {st === 'TODOS' ? 'Todos os Registros' : st}
              </button>
            );
          })}

          {paramAtivo && (
            <div className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
              <span>Filtro Ativo: {paramAtivo}</span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  router.push('/extintores/historico-inspecoes');
                }}
                className="hover:text-amber-950 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Listagem de Inspeções (Tabela Desktop + Cards Mobile) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Carregando vistorias do Supabase...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma vistoria encontrada
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Tente alterar os termos de busca, limpar os filtros ou cadastre uma nova vistoria manual.
            </p>
          </div>
        ) : (
          <>
            {/* Versão Desktop (Tabela) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 w-36">Data / Hora</th>
                    <th className="py-3 px-4 w-32">Patrimônio</th>
                    <th className="py-3 px-4">Técnico Inspetor</th>
                    <th className="py-3 px-4">Telemetria GPS</th>
                    <th className="py-3 px-4 w-36 text-center">Parecer</th>
                    <th className="py-3 px-4">Observações Técnicas</th>
                    <th className="py-3 px-4 w-44 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredList.map((item) => {
                    const isConf =
                      item.status?.toLowerCase().includes('conforme') &&
                      !item.status?.toLowerCase().includes('não') &&
                      !item.status?.toLowerCase().includes('nao');
                    const isCanc = item.status?.toLowerCase().includes('cancel');

                    const dataFormatada = item.data_inspecao
                      ? new Date(item.data_inspecao).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/D';

                    const hasGps = item.latitude != null && item.longitude != null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {dataFormatada}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-red-600 dark:text-red-400 text-xs">
                            {item.asset_patrimonio}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {item.tecnico_nome || 'Inspetor SPCI'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {hasGps ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              <MapPin className="w-3 h-3" />
                              GPS Capturado
                              {item.precisao_gps ? ` (±${Math.round(item.precisao_gps)}m)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Sem GPS</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCanc ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <AlertTriangle className="w-3 h-3 text-slate-500" />
                              Cancelada
                            </span>
                          ) : isConf ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Conforme
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Não Conforme
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.observacoes}>
                          {item.observacoes || (
                            <span className="text-slate-400 italic">Sem anotações</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver Laudo Técnico / Imprimir */}
                            <button
                              type="button"
                              onClick={() => router.push(`/relatorios/inspecao/${item.id}`)}
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 border border-red-200 dark:border-red-900/40 transition"
                              title="Ver Laudo Técnico Pericial & PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Retificar Notas */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditModalItem(item);
                                setEditNotes(item.observacoes || '');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                              title="Retificar Anotações Técnicas"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Cancelar Vistoria (se não cancelada) */}
                            {!isCanc && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModalItem(item);
                                  setCancelJustificativa('');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                title="Cancelar Vistoria com Justificativa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Versão Mobile (Cards Compactos) */}
            <div className="block lg:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filteredList.map((item) => {
                const isConf =
                  item.status?.toLowerCase().includes('conforme') &&
                  !item.status?.toLowerCase().includes('não') &&
                  !item.status?.toLowerCase().includes('nao');
                const isCanc = item.status?.toLowerCase().includes('cancel');

                const dataFormatada = item.data_inspecao
                  ? new Date(item.data_inspecao).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'N/D';

                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                            {item.asset_patrimonio}
                          </span>
                          {isCanc ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600">
                              Cancelada
                            </span>
                          ) : isConf ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              Conforme
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                              Não Conforme
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] font-mono text-slate-500 block mt-0.5">
                          {dataFormatada} &bull; {item.tecnico_nome || 'Inspetor SPCI'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push(`/relatorios/inspecao/${item.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Laudo</span>
                      </button>
                    </div>

                    {item.observacoes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                        {item.observacoes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>
                        {item.latitude != null ? '📍 GPS Coletado' : 'Sem GPS'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditModalItem(item);
                            setEditNotes(item.observacoes || '');
                          }}
                          className="text-slate-600 dark:text-slate-300 hover:text-red-600 font-semibold"
                        >
                          Editar Anotação
                        </button>
                        {!isCanc && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalItem(item);
                              setCancelJustificativa('');
                            }}
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: Retificar Observações Técnicas */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-red-600" />
                  Retificar Anotações Técnicas
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ativo {editModalItem.asset_patrimonio} &bull; Laudo #{editModalItem.id?.slice(0, 8)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Observações do Laudo Técnico
              </label>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Insira as observações ou retificações técnicas..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <span className="text-[10px] text-slate-400 block">
                Todas as retificações ficam gravadas no log de auditoria do sistema com identificação do usuário e data/hora.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                {savingEdit ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Salvar Alteração</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cancelar Vistoria com Justificativa */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cancelar Registro de Vistoria
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ativo {cancelModalItem.asset_patrimonio}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-800 dark:text-red-300">
              <b>Atenção:</b> Esta ação manterá o histórico para auditoria legal, mas alterará o parecer da vistoria para &quot;Cancelada&quot;. É obrigatório registrar a justificativa formal.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Justificativa Formal de Cancelamento *
              </label>
              <textarea
                rows={3}
                value={cancelJustificativa}
                onChange={(e) => setCancelJustificativa(e.target.value)}
                placeholder="Exemplo: Inspeção duplicada por engano do técnico; numeração de lacre invertida..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalItem(null)}
                disabled={savingCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={savingCancel || !cancelJustificativa.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                {savingCancel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Nova Vistoria Manual */}
      {newManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-red-600" />
                  Cadastrar Vistoria Manual / Retrospectiva
                </h3>
                <span className="text-[11px] text-slate-500">
                  Lançamento de inspeção de campo física ou importação pontual
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNewManualModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Patrimônio do Extintor *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.asset_patrimonio}
                    onChange={(e) => setManualForm({ ...manualForm, asset_patrimonio: e.target.value.toUpperCase() })}
                    placeholder="Ex: EXT-337"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold uppercase focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status da Vistoria *
                  </label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="Conforme">Conforme (Apto)</option>
                    <option value="Não Conforme">Não Conforme (Manutenção)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Técnico Inspetor *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.tecnico_nome}
                    onChange={(e) => setManualForm({ ...manualForm, tecnico_nome: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data da Vistoria *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={manualForm.data_inspecao}
                    onChange={(e) => setManualForm({ ...manualForm, data_inspecao: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contrato / Site
                </label>
                <select
                  value={manualForm.site}
                  onChange={(e) => setManualForm({ ...manualForm, site: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:ring-2 focus:ring-red-600 focus:outline-none"
                >
                  <option value="SALOBO">SALOBO</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações Técnicas
                </label>
                <textarea
                  rows={2}
                  value={manualForm.observacoes}
                  onChange={(e) => setManualForm({ ...manualForm, observacoes: e.target.value })}
                  placeholder="Parecer técnico ou apontamento de não conformidade..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setNewManualModal(false)}
                  disabled={savingManual}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition disabled:opacity-50"
                >
                  {savingManual ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar Vistoria</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoricoInspecoesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HistoricoInspecoesContent />
    </Suspense>
  );
}
