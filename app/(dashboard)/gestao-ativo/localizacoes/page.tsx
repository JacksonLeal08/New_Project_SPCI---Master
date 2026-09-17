'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Layers, 
  Upload, 
  Download, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  ArrowLeft,
  FileSpreadsheet, 
  RefreshCw,
  Building2,
  FolderTree,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { LocalizacoesService, LocalizacaoOperacional } from '@/lib/localizacoesService';
import { LocalizacaoImportCockpit } from '@/app/components/LocalizacaoImportCockpit';
import BulkDeleteLocationModal from '@/app/components/BulkDeleteLocationModal';
import { useSpci } from '@/app/context/SpciContext';

export default function LocalizacoesOperacionaisPage() {
  const router = useRouter();
  const { 
    activeSite, 
    triggerSuccessNotification, 
    userProfile,
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas
  } = useSpci();

  // Consolidação de ativos operacionais em memória para checagem dupla defensiva
  const memoryAssets = useMemo(() => [
    ...(extintores || []),
    ...(hidrantes || []),
    ...(sinalizacoes || []),
    ...(iluminacoes || []),
    ...(bombas || [])
  ], [extintores, hidrantes, sinalizacoes, iluminacoes, bombas]);

  const [localizacoes, setLocalizacoes] = useState<LocalizacaoOperacional[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSetorFilter, setSelectedSetorFilter] = useState<string>('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');

  // Estados de Seleção Múltipla para Edição em Massa
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState<boolean>(false);
  const [bulkActionType, setBulkActionType] = useState<'gerencia' | 'diretoria' | 'prancha' | null>(null);
  const [bulkInputValue, setBulkInputValue] = useState<string>('');
  const [isExecutingBulk, setIsExecutingBulk] = useState<boolean>(false);

  // Estados do Modal de Exclusão em Massa Segura
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkDeleteTargetIds, setBulkDeleteTargetIds] = useState<string[]>([]);

  // Estados dos Modais
  const [isImportCockpitOpen, setIsImportCockpitOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LocalizacaoOperacional | null>(null);

  // Formulário Manual (Novo / Edição)
  const [formData, setFormData] = useState({
    setor_planta: '',
    sub_local: '',
    prancha_projeto: '',
    area_operacional: '',
    codigo_instalacao_vale: '',
    gerencia_responsavel: '',
    diretoria_responsavel: ''
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const data = await LocalizacoesService.listarTodas(activeSite);
      setLocalizacoes(data);
    } catch (err: any) {
      console.error('Erro ao carregar localizações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    const handleUpdated = () => carregarDados();
    window.addEventListener('spci_locations_updated', handleUpdated);
    return () => window.removeEventListener('spci_locations_updated', handleUpdated);
  }, [activeSite]);

  // Estatísticas de Topo
  const stats = useMemo(() => {
    const setores = new Set<string>();
    const areas = new Set<string>();
    const gerencias = new Set<string>();

    localizacoes.forEach(loc => {
      if (loc.setor_planta) setores.add(loc.setor_planta);
      if (loc.area_operacional) areas.add(loc.area_operacional);
      if (loc.gerencia_responsavel) gerencias.add(loc.gerencia_responsavel);
    });

    return {
      totalLocais: localizacoes.length,
      totalSetores: setores.size,
      totalAreas: areas.size,
      totalGerencias: gerencias.size,
      listaSetores: Array.from(setores).sort(),
      listaAreas: Array.from(areas).sort()
    };
  }, [localizacoes]);

  // Filtragem Dinâmica
  const filteredData = useMemo(() => {
    return localizacoes.filter(item => {
      const matchSearch = !searchTerm.trim() || (() => {
        const term = searchTerm.toLowerCase();
        return (
          item.setor_planta.toLowerCase().includes(term) ||
          item.sub_local.toLowerCase().includes(term) ||
          (item.area_operacional || '').toLowerCase().includes(term) ||
          (item.gerencia_responsavel || '').toLowerCase().includes(term) ||
          (item.prancha_projeto || '').toLowerCase().includes(term) ||
          (item.codigo_instalacao_vale || '').toLowerCase().includes(term)
        );
      })();

      const matchSetor = selectedSetorFilter === 'ALL' || item.setor_planta === selectedSetorFilter;
      const matchArea = selectedAreaFilter === 'ALL' || item.area_operacional === selectedAreaFilter;

      return matchSearch && matchSetor && matchArea;
    });
  }, [localizacoes, searchTerm, selectedSetorFilter, selectedAreaFilter]);

  // Seleção Múltipla
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredData.map(d => d.id).filter(Boolean) as string[];
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Execução de Ações em Massa
  const handleExecuteBulkAction = async () => {
    if (!bulkActionType || selectedIds.length === 0) return;
    setIsExecutingBulk(true);
    try {
      const res = await LocalizacoesService.executarAcoesEmMassa(
        selectedIds,
        bulkActionType,
        bulkInputValue.trim().toUpperCase()
      );

      if (res.sucesso) {
        triggerSuccessNotification(
          'Ação em Massa Concluída!',
          `${res.afetados} registros foram atualizados com sucesso.`
        );
        setIsBulkActionModalOpen(false);
        setSelectedIds([]);
        setBulkInputValue('');
        carregarDados();
      } else {
        alert('Erro ao executar ação: ' + res.erro);
      }
    } catch (e: any) {
      alert('Falha: ' + e.message);
    } finally {
      setIsExecutingBulk(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteTargetIds(selectedIds);
    setIsBulkDeleteModalOpen(true);
  };

  const handleDeleteSingle = (id: string) => {
    setBulkDeleteTargetIds([id]);
    setIsBulkDeleteModalOpen(true);
  };

  const handleDeleteEntireSector = (setorNome: string) => {
    const idsDoSetor = localizacoes
      .filter(l => l.setor_planta.trim().toUpperCase() === setorNome.trim().toUpperCase())
      .map(l => l.id!)
      .filter(Boolean);

    if (idsDoSetor.length === 0) {
      alert('Nenhum registro encontrado para este setor.');
      return;
    }
    setBulkDeleteTargetIds(idsDoSetor);
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkDeleteSuccess = (excluidosCount: number) => {
    triggerSuccessNotification(
      'Exclusão Concluída! 🗑️',
      `${excluidosCount} localizações operacionais foram removidas com integridade garantida.`
    );
    setSelectedIds([]);
    carregarDados();
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.setor_planta || !formData.sub_local) {
      alert('Setor da Planta e Sub-Local são obrigatórios.');
      return;
    }

    try {
      const contrato = activeSite || 'ONÇA PUMA';
      const payload: LocalizacaoOperacional = {
        contrato_id: contrato,
        projeto_site: contrato,
        setor_planta: formData.setor_planta.trim().toUpperCase(),
        sub_local: formData.sub_local.trim().toUpperCase(),
        prancha_projeto: formData.prancha_projeto.trim().toUpperCase() || null,
        area_operacional: formData.area_operacional.trim().toUpperCase() || null,
        codigo_instalacao_vale: formData.codigo_instalacao_vale.trim().toUpperCase() || null,
        gerencia_responsavel: formData.gerencia_responsavel.trim().toUpperCase() || null,
        diretoria_responsavel: formData.diretoria_responsavel.trim().toUpperCase() || null,
        is_ativo: true
      };

      if (editingItem?.id) {
        payload.id = editingItem.id;
      }

      await LocalizacoesService.salvarEmLote([payload]);
      triggerSuccessNotification(
        editingItem ? 'Local Atualizado!' : 'Novo Local Cadastrado!',
        `${payload.setor_planta} - ${payload.sub_local} homologado com sucesso.`
      );

      setIsCreateModalOpen(false);
      setEditingItem(null);
      setFormData({
        setor_planta: '',
        sub_local: '',
        prancha_projeto: '',
        area_operacional: '',
        codigo_instalacao_vale: '',
        gerencia_responsavel: '',
        diretoria_responsavel: ''
      });
      carregarDados();
    } catch (err: any) {
      alert('Erro ao salvar local: ' + err.message);
    }
  };

  const handleEditItem = (item: LocalizacaoOperacional) => {
    setEditingItem(item);
    setFormData({
      setor_planta: item.setor_planta || '',
      sub_local: item.sub_local || '',
      prancha_projeto: item.prancha_projeto || '',
      area_operacional: item.area_operacional || '',
      codigo_instalacao_vale: item.codigo_instalacao_vale || '',
      gerencia_responsavel: item.gerencia_responsavel || '',
      diretoria_responsavel: item.diretoria_responsavel || ''
    });
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 font-mono select-none">
      
      {/* =================================================================== */}
      {/* 1. HEADER EXECUTIVO & BENTO GRID DE AÇÕES                           */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/gestao-ativo')}
              className="p-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-600 dark:text-slate-300"
              title="Voltar para Gestão de Ativos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Localizações Operacionais da Planta
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  SSOT Corporativo
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Fonte Única da Verdade para Setores, Sub-locais e Metadados Industriais da Vale ({activeSite}).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => LocalizacoesService.baixarPlanilhaModelo('xlsx')}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Modelo Excel
            </button>

            <button
              onClick={() => setIsImportCockpitOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer border-none"
            >
              <Upload className="w-4 h-4" /> Cockpit Carga XLSX
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  setor_planta: '',
                  sub_local: '',
                  prancha_projeto: '',
                  area_operacional: '',
                  codigo_instalacao_vale: '',
                  gerencia_responsavel: '',
                  diretoria_responsavel: ''
                });
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
            >
              <Plus className="w-4 h-4" /> Novo Local
            </button>
          </div>
        </div>

        {/* Bento Grid de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl">
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">Total de Posições (Sub-locais)</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
              {stats.totalLocais}
            </span>
          </div>

          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
            <span className="text-[9px] font-bold uppercase text-blue-600 tracking-wider block">Setores Homologados</span>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 block">
              {stats.totalSetores}
            </span>
          </div>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl">
            <span className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider block">Áreas Industriais</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
              {stats.totalAreas}
            </span>
          </div>

          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl">
            <span className="text-[9px] font-bold uppercase text-amber-600 tracking-wider block">Gerências Mapeadas</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
              {stats.totalGerencias}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BARRA DE BUSCA E FILTROS EM CASCATA                              */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Setor, Sub-local, Gerência, Prancha ou Área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Filtro por Setor */}
          <select
            value={selectedSetorFilter}
            onChange={(e) => setSelectedSetorFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todos os Setores ({stats.totalSetores})</option>
            {stats.listaSetores.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>

          {/* Excluir Setor Inteiro (se selecionado) */}
          {selectedSetorFilter !== 'ALL' && (
            <button
              onClick={() => handleDeleteEntireSector(selectedSetorFilter)}
              className="px-3 py-2 bg-red-600/15 hover:bg-red-600/25 text-red-700 dark:text-red-400 border border-red-500/30 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              title={`Auditar e excluir todos os sub-locais do setor "${selectedSetorFilter}"`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Excluir Setor Inteiro
            </button>
          )}

          {/* Filtro por Área */}
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todas as Áreas ({stats.totalAreas})</option>
            {stats.listaAreas.map((a, idx) => (
              <option key={idx} value={a}>{a}</option>
            ))}
          </select>

          <button
            onClick={carregarDados}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TABELA DE ALTA DENSIDADE COM SELEÇÃO MÚLTIPLA                     */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-black tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="p-3">Setor da Planta</th>
                <th className="p-3">Sub-Local (Posição Física)</th>
                <th className="p-3">Área</th>
                <th className="p-3">Prancha</th>
                <th className="p-3">Gerência</th>
                <th className="p-3">Diretoria</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Carregando localizações operacionais...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhuma localização encontrada. Utilize o <strong>Cockpit de Carga XLSX</strong> para importar a planilha oficial da Vale.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isChecked = selectedIds.includes(item.id || '');
                  return (
                    <tr 
                      key={item.id || idx} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => item.id && handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {item.setor_planta}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.sub_local}
                      </td>
                      <td className="p-3 text-slate-500">
                        {item.area_operacional ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                            {item.area_operacional}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px]">
                        {item.prancha_projeto || '—'}
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px]">
                        {item.gerencia_responsavel || '—'}
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px]">
                        {item.diretoria_responsavel || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer border-none bg-transparent"
                            title="Editar local"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => item.id && handleDeleteSingle(item.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg transition-colors text-slate-400 hover:text-red-500 cursor-pointer border-none bg-transparent"
                            title="Excluir este local (com auditoria de ativos)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* =================================================================== */}
      {/* 4. BARRA FLUTUANTE DE EDIÇÃO EM MASSA (BULK ACTIONS HUD)            */}
      {/* =================================================================== */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 text-xs select-none"
          >
            <span className="font-bold text-blue-400">
              {selectedIds.length} {selectedIds.length === 1 ? 'local selecionado' : 'locais selecionados'}
            </span>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBulkActionType('gerencia');
                  setBulkInputValue('');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer border-none text-slate-200"
              >
                Reatribuir Gerência
              </button>

              <button
                onClick={() => {
                  setBulkActionType('diretoria');
                  setBulkInputValue('');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer border-none text-slate-200"
              >
                Reatribuir Diretoria
              </button>

              <button
                onClick={() => {
                  setBulkActionType('prancha');
                  setBulkInputValue('');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer border-none text-slate-200"
              >
                Alterar Prancha
              </button>

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer border-none bg-transparent ml-2"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* 5. MODAL DE EDIÇÃO EM MASSA (INPUT RÁPIDO)                          */}
      {/* =================================================================== */}
      {isBulkActionModalOpen && bulkActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {bulkActionType === 'gerencia' && 'Reatribuir Gerência em Massa'}
              {bulkActionType === 'diretoria' && 'Reatribuir Diretoria em Massa'}
              {bulkActionType === 'prancha' && 'Atualizar Prancha de Projeto em Massa'}
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Esta alteração será aplicada simultaneamente a <strong>{selectedIds.length}</strong> locais selecionados.
            </p>

            <input
              type="text"
              placeholder={
                bulkActionType === 'gerencia' ? 'Ex: GERÊNCIA DE MANUTENÇÃO' :
                bulkActionType === 'diretoria' ? 'Ex: DIRETORIA DE OPERAÇÕES' :
                'Ex: DE-120-04-SPCI'
              }
              value={bulkInputValue}
              onChange={(e) => setBulkInputValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkActionModalOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-500 cursor-pointer border-none bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteBulkAction}
                disabled={isExecutingBulk || !bulkInputValue.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm"
              >
                {isExecutingBulk ? 'Atualizando...' : 'Confirmar Atualização'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. MODAL DE CADASTRO / EDIÇÃO MANUAL INDIVIDUAL                     */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {editingItem ? 'Editar Localização Operacional' : 'Novo Local Operacional'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Setor da Planta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: USINA DE BENEFICIAMENTO"
                  value={formData.setor_planta}
                  onChange={(e) => setFormData({ ...formData, setor_planta: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Sub-Local (Posição Física) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PAINEL ELÉTRICO CCM-01"
                  value={formData.sub_local}
                  onChange={(e) => setFormData({ ...formData, sub_local: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Área Operacional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ÁREA 100"
                    value={formData.area_operacional}
                    onChange={(e) => setFormData({ ...formData, area_operacional: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Prancha / Desenho
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: DE-120-04-SPCI"
                    value={formData.prancha_projeto}
                    onChange={(e) => setFormData({ ...formData, prancha_projeto: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Gerência Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: GERÊNCIA DE MANUTENÇÃO"
                    value={formData.gerencia_responsavel}
                    onChange={(e) => setFormData({ ...formData, gerencia_responsavel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    Diretoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: DIRETORIA DE OPERAÇÕES"
                    value={formData.diretoria_responsavel}
                    onChange={(e) => setFormData({ ...formData, diretoria_responsavel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-slate-500 cursor-pointer border-none bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md border-none"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. COCKPIT DE CARGA XLSX (MODAL EM 4 ETAPAS)                        */}
      {/* =================================================================== */}
      <LocalizacaoImportCockpit
        isOpen={isImportCockpitOpen}
        onClose={() => setIsImportCockpitOpen(false)}
        onSuccess={() => carregarDados()}
      />

      {/* =================================================================== */}
      {/* 8. COCKPIT DE EXCLUSÃO EM MASSA SEGURA (MODAL EM 3 ETAPAS)          */}
      {/* =================================================================== */}
      <BulkDeleteLocationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedIds={bulkDeleteTargetIds}
        contratoId={activeSite}
        memoryAssets={memoryAssets}
        usuarioId={userProfile?.id || (userProfile as any)?.uid}
        usuarioNome={userProfile?.name}
        onSuccess={handleBulkDeleteSuccess}
      />
    </div>
  );
}
