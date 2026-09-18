'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  LayoutGrid, 
  ListFilter, 
  RefreshCw, 
  ShieldCheck, 
  MapPin, 
  PhoneCall, 
  Users, 
  Pencil, 
  Trash2, 
  PowerOff,
  Flame,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ContratoSite, 
  fetchContractsOverviewAction, 
  deleteOrDeactivateContractAction 
} from '@/app/actions/contractActions';
import ContractFormModal from './ContractFormModal';
import { useSpci } from '@/app/context/SpciContext';

interface ContractsManagementBentoProps {
  theme?: 'dark' | 'light';
}

export default function ContractsManagementBento({ theme = 'light' }: ContractsManagementBentoProps) {
  const { userProfile, triggerSuccessNotification, showAlertModal, showConfirmModal } = useSpci();

  const [contratos, setContratos] = useState<ContratoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'bento' | 'table'>('bento');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'EM IMPLANTAÇÃO' | 'ENCERRADO'>('TODOS');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalContratos: 0,
    totalAtivos: 0,
    totalCidadesUf: 0
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<ContratoSite | null>(null);

  const isDev = userProfile?.role === 'Desenvolvedor';

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchContractsOverviewAction();
      if (res.success) {
        setContratos(res.contratos);
        setMetrics(res.metrics);
      } else {
        console.warn('Erro carregando contratos:', res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setContractToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contrato: ContratoSite) => {
    setContractToEdit(contrato);
    setIsModalOpen(true);
  };

  const handleDeleteOrDeactivate = (contrato: ContratoSite) => {
    const isProtected = contrato.nome === 'SALOBO' || contrato.nome === 'ONÇA PUMA' || contrato.nome === 'ONCA PUMA';

    if (isProtected) {
      showAlertModal(
        'Contrato Estrutural Protegido 🔒',
        `O contrato "${contrato.nome}" é a base do sistema SPCI e não pode ser removido ou desativado.`,
        'warning'
      );
      return;
    }

    const hasAssets = (contrato.total_ativos || 0) > 0;

    showConfirmModal({
      title: hasAssets ? 'Desativar Contrato (Guardrail) 🛡️' : 'Excluir Contrato 🗑️',
      message: hasAssets
        ? `O contrato "${contrato.nome}" possui ${contrato.total_ativos} ativos cadastrados. Para preservar o histórico operacional de vistorias, o contrato será ENCERRADO e ocultado das rotinas ativas.`
        : `Deseja realmente excluir o contrato "${contrato.nome}" do sistema? Esta ação é definitiva pois não existem ativos vinculados.`,
      type: hasAssets ? 'warning' : 'error',
      confirmText: hasAssets ? 'DESATIVAR CONTRATO' : 'EXCLUIR DEFINITIVAMENTE',
      cancelText: 'CANCELAR',
      onConfirm: async () => {
        try {
          const res = await deleteOrDeactivateContractAction(contrato.id, contrato.nome, userProfile?.role);
          if (res.success) {
            triggerSuccessNotification(
              res.softDeleted ? 'Contrato Encerrado!' : 'Contrato Excluído!',
              res.message || 'Operação realizada com sucesso.'
            );
            loadData();
          } else {
            showAlertModal('Atenção', res.error || 'Falha ao processar solicitação.', 'error');
          }
        } catch (err: any) {
          showAlertModal('Erro', err.message || 'Erro inesperado.', 'error');
        }
      }
    });
  };

  // Filtragem
  const filteredContratos = contratos.filter(c => {
    const matchSearch = 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo_slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cidade_uf?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'TODOS' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 select-none font-mono">
      {/* 1. CARDS DE MÉTRICAS AGREGADAS (BENTO HEADER) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total de Contratos */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-rose-500 border border-red-500/20 flex items-center justify-center text-xl shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Contratos Ativos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{metrics.totalContratos}</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">● Operação Normal</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total de Ativos sob Gestão */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Ativos Protegidos (SPCI)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{metrics.totalAtivos.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">equipamentos</span>
            </div>
          </div>
        </div>

        {/* Card 3: Regiões Atendidas */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex items-center gap-4 ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
              Cidades & Polos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{metrics.totalCidadesUf}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">unidades federativas</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE, BUSCA E AÇÕES */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do site, slug, cliente ou cidade..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30 border ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                : 'bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Filtros e Alternador de Visão */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border focus:outline-none ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <option value="TODOS">Status: Todos</option>
            <option value="ATIVO">🟢 Ativos</option>
            <option value="EM IMPLANTAÇÃO">🟡 Implantação</option>
            <option value="ENCERRADO">🔴 Encerrados</option>
          </select>

          {/* Toggle Bento / Tabela */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('bento')}
              title="Visualização Bento Grid"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'bento'
                  ? 'bg-white dark:bg-zinc-800 text-red-600 dark:text-rose-500 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Visualização em Tabela Executiva"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-red-600 dark:text-rose-500 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <FileSpreadsheet size={16} />
            </button>
          </div>

          {/* Botão Recarregar */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Recarregar contratos"
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-red-600' : ''} />
          </button>

          {/* Botão + Novo Contrato */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-md shadow-red-600/30 flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={16} />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL: MODO BENTO GRID OU TABELA EXECUTIVA */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent animate-spin rounded-full mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Sincronizando contratos operacionais...
          </p>
        </div>
      ) : filteredContratos.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <Building2 size={36} className="mx-auto text-slate-400 mb-2" />
          <p className="font-bold text-sm">Nenhum contrato encontrado para os filtros selecionados.</p>
        </div>
      ) : viewMode === 'bento' ? (
        /* MODO BENTO GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContratos.map((c) => {
            const isProtected = c.nome === 'SALOBO' || c.nome === 'ONÇA PUMA' || c.nome === 'ONCA PUMA';

            return (
              <div
                key={c.id || c.codigo_slug}
                className={`rounded-2xl border p-5 relative flex flex-col justify-between transition-all duration-200 group hover:shadow-xl ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-950 shadow-xs'
                }`}
              >
                {/* Indicador de topo */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
                    c.status === 'ATIVO'
                      ? 'bg-emerald-500'
                      : c.status === 'EM IMPLANTAÇÃO'
                      ? 'bg-amber-500'
                      : 'bg-zinc-500'
                  }`}
                />

                {/* Bloco Superior: Logo, Nome, Slug e Badges */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border flex items-center justify-center p-1.5 bg-white shrink-0 overflow-hidden shadow-xs">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.nome} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">🏭</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5 text-slate-950 dark:text-zinc-100">
                          {c.nome}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-mono">
                          CODE: <span className="text-red-600 dark:text-rose-400 font-black">{c.codigo_slug}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                        c.status === 'ATIVO'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : c.status === 'EM IMPLANTAÇÃO'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {/* Razão Social & Localidade */}
                  <div className="space-y-1 text-xs font-sans text-slate-700 dark:text-zinc-300">
                    <p className="font-bold truncate" title={c.razao_social}>
                      {c.razao_social || 'Cliente Corporativo SPCI'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="shrink-0 text-red-600" />
                      <span>{c.cidade_uf || 'Localidade não informada'}</span>
                    </p>
                    {c.telefone_emergencia && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate font-mono">
                        <PhoneCall size={12} className="shrink-0 text-red-600" />
                        <span>CECOM: {c.telefone_emergencia}</span>
                      </p>
                    )}
                  </div>

                  {/* Estatísticas do Contrato (Ativos, Brigadistas, Conformidade) */}
                  <div
                    className={`p-3 rounded-xl border grid grid-cols-3 gap-2 text-center ${
                      theme === 'dark'
                        ? 'bg-zinc-950/60 border-zinc-800/80'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 block uppercase">Ativos</span>
                      <span className="font-black text-sm text-slate-900 dark:text-zinc-100">{c.total_ativos || 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 block uppercase">Brigada</span>
                      <span className="font-black text-sm text-slate-900 dark:text-zinc-100">{c.total_usuarios || 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 block uppercase">Conformidade</span>
                      <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {c.indice_conformidade ?? 100}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloco Inferior: Ações */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <div className="text-[9px] font-mono text-slate-500 dark:text-zinc-500">
                    {isProtected && <span className="font-bold text-amber-600 dark:text-amber-400">🔒 Contrato Base</span>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      title="Editar contrato"
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                      }`}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrDeactivate(c)}
                      title={isProtected ? 'Contrato protegido' : 'Desativar ou excluir contrato'}
                      disabled={isProtected}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isProtected
                          ? 'opacity-30 cursor-not-allowed border-transparent'
                          : 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      {(c.total_ativos || 0) > 0 ? <PowerOff size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABELA EXECUTIVA */
        <div
          className={`rounded-2xl border overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b text-[9px] font-black uppercase tracking-wider ${
                    theme === 'dark'
                      ? 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <th className="p-4">Site / Contrato</th>
                  <th className="p-4">Código (Slug)</th>
                  <th className="p-4">Razão Social & Localidade</th>
                  <th className="p-4 text-center">Ativos</th>
                  <th className="p-4 text-center">Conformidade</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
                {filteredContratos.map((c) => {
                  const isProtected = c.nome === 'SALOBO' || c.nome === 'ONÇA PUMA' || c.nome === 'ONCA PUMA';

                  return (
                    <tr
                      key={c.id || c.codigo_slug}
                      className={`transition-colors ${
                        theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-4 font-mono font-black text-slate-950 dark:text-zinc-100 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg border flex items-center justify-center p-0.5 bg-white shrink-0 overflow-hidden shadow-xs">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.nome} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs">🏭</span>
                          )}
                        </div>
                        <span>{c.nome}</span>
                      </td>

                      <td className="p-4 font-mono font-bold text-red-600 dark:text-rose-400 text-xs">
                        {c.codigo_slug}
                      </td>

                      <td className="p-4 text-slate-700 dark:text-zinc-300">
                        <p className="font-bold truncate max-w-[220px]">{c.razao_social || 'N/A'}</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">{c.cidade_uf || 'N/A'}</p>
                      </td>

                      <td className="p-4 text-center font-black font-mono text-slate-950 dark:text-zinc-100">
                        {c.total_ativos || 0}
                      </td>

                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {c.indice_conformidade ?? 100}%
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border inline-block ${
                            c.status === 'ATIVO'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : c.status === 'EM IMPLANTAÇÃO'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Editar contrato"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              theme === 'dark'
                                ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                            }`}
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrDeactivate(c)}
                            disabled={isProtected}
                            title={isProtected ? 'Contrato protegido' : 'Desativar / Excluir'}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isProtected
                                ? 'opacity-20 cursor-not-allowed border-transparent'
                                : 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white'
                            }`}
                          >
                            {(c.total_ativos || 0) > 0 ? <PowerOff size={13} /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL EXECUTIVO DE CRIAÇÃO / EDIÇÃO */}
      <ContractFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(details) => {
          loadData();
          setIsModalOpen(false);

          const userName = userProfile?.name || userProfile?.userName || 'Operador SPCI';
          const isEdit = details?.isEdit ?? Boolean(contractToEdit);
          const contractName = details?.contractNome || contractToEdit?.nome || 'Contrato';
          const hasLogo = details?.hasLogo;

          const actionTitle = isEdit 
            ? 'Alterações Salvas com Sucesso! 🟢' 
            : 'Contrato Cadastrado com Sucesso! 🟢';

          const actionDesc = isEdit
            ? `Atualização cadastral do contrato "${contractName}" homologada`
            : `Implantação do novo contrato "${contractName}" concluída`;

          const logoDesc = hasLogo 
            ? '\n• Logotipo Corporativo: Vinculado e otimizado com sucesso.' 
            : '';

          const fullMessage = `👤 Usuário: ${userName}\n⚙️ Ação: ${actionDesc}.${logoDesc}\n🕒 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\nAs diretrizes e parametrizações deste contrato foram sincronizadas em todo o ecossistema SPCI.`;

          // 1. Popup Modal Executivo de Confirmação com usuário e ação
          showAlertModal(
            actionTitle,
            fullMessage,
            'success'
          );

          // 2. Toast de Notificação
          triggerSuccessNotification(
            isEdit ? 'Contrato Atualizado!' : 'Contrato Cadastrado!',
            `${contractName}: Operação registrada com sucesso por ${userName}.`
          );
        }}
        contractToEdit={contractToEdit}
        theme={theme}
      />
    </div>
  );
}
