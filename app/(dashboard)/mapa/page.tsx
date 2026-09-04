'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSpci } from '@/app/context/SpciContext';
import { getOperationalMapAssetsAction, processAssetLocationUpdateAction } from '@/app/actions/geoTrackingActions';
import AssetMovementHistoryModal from '@/app/components/AssetMovementHistoryModal';
import type { MapAssetItem } from '@/app/components/OperationalMap';
import { 
  MapPin, 
  RefreshCw, 
  Search, 
  Filter, 
  Layers, 
  Flame, 
  Droplet, 
  AlertTriangle, 
  Lightbulb, 
  Sliders, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  Radio, 
  History,
  ShieldCheck,
  Compass,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Importação dinâmica do mapa Leaflet sem SSR para compatibilidade plena com Next.js
const OperationalMap = dynamic(() => import('@/app/components/OperationalMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400 animate-pulse">
      <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/50 shadow-inner flex items-center justify-center">
        <Compass className="w-10 h-10 text-red-500 animate-spin" />
      </div>
      <p className="text-sm font-semibold tracking-wide text-slate-300">Carregando Mapa Operacional SPCI...</p>
      <span className="text-xs text-slate-500">Inicializando motor geoespacial Leaflet</span>
    </div>
  )
});

export default function MapaOperacionalPage() {
  const { userProfile } = useSpci();

  const [assets, setAssets] = useState<MapAssetItem[]>([]);
  const [totalInspectionsWithGps, setTotalInspectionsWithGps] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<MapAssetItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const loadMapData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getOperationalMapAssetsAction();
      if (res.success && res.assets) {
        setAssets(res.assets);
        setTotalInspectionsWithGps(res.totalInspecoesComGps || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar dados geoespaciais do mapa:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  // Filtragem reativa
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      // Busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery = 
          (item.idAtivo && item.idAtivo.toLowerCase().includes(query)) ||
          (item.patrimonio && item.patrimonio.toLowerCase().includes(query)) ||
          (item.model && item.model.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.subLocation && item.subLocation.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Categoria
      if (selectedCategory !== 'todos') {
        const cat = (item.category || '').toLowerCase();
        if (selectedCategory === 'extintores' && !cat.includes('extintor')) return false;
        if (selectedCategory === 'hidrantes' && !cat.includes('hidrante')) return false;
        if (selectedCategory === 'sinalizacao' && !cat.includes('sinaliza')) return false;
        if (selectedCategory === 'iluminacao' && !cat.includes('ilumina')) return false;
        if (selectedCategory === 'bombas' && !cat.includes('bomba')) return false;
      }

      // Status
      if (selectedStatus !== 'todos') {
        const status = (item.status || '').toLowerCase();
        const tipoMov = (item.tipo_movimentacao || '').toLowerCase();

        if (selectedStatus === 'estoque' && !(tipoMov === 'estoque_aplicacao' || tipoMov.includes('estoque'))) return false;
        if (selectedStatus === 'manutencao' && !(status.includes('manuten') || tipoMov === 'em_manutencao')) return false;
        if (selectedStatus === 'critico' && !(status.includes('vencid') || status.includes('não conforme') || status.includes('nao conforme') || status.includes('falha'))) return false;
        if (selectedStatus === 'atencao' && !(status.includes('atenção') || status.includes('atencao') || status.includes('a vencer'))) return false;
        if (selectedStatus === 'conforme' && !(status.includes('conforme') || status.includes('ok') || status.includes('operacional'))) return false;
      }

      return true;
    });
  }, [assets, searchTerm, selectedCategory, selectedStatus]);

  // KPIs
  const stats = useMemo(() => {
    const total = assets.length;
    const extintores = assets.filter(a => (a.category || '').toLowerCase().includes('extintor')).length;
    const hidrantes = assets.filter(a => (a.category || '').toLowerCase().includes('hidrante')).length;
    const estoque = assets.filter(a => (a.tipo_movimentacao || '').toLowerCase().includes('estoque')).length;
    const criticos = assets.filter(a => {
      const s = (a.status || '').toLowerCase();
      return s.includes('vencid') || s.includes('não conforme') || s.includes('nao conforme');
    }).length;

    return {
      total,
      extintores,
      hidrantes,
      estoque,
      criticos
    };
  }, [assets]);

  const handleOpenHistory = (asset: MapAssetItem) => {
    setSelectedAssetForHistory(asset);
    setIsHistoryModalOpen(true);
  };

  const handleUpdateAssetLocation = async (
    asset: MapAssetItem,
    coords: { latitude: number; longitude: number; accuracy: number }
  ) => {
    try {
      const assetId = asset.idAtivo || asset.patrimonio || asset.id;
      const res = await processAssetLocationUpdateAction({
        assetId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        tipoEvento: 'EDICAO_MANUAL',
        usuario: {
          nome: userProfile?.name || 'Operador'
        }
      });

      if (res.success) {
        setAssets((prev) =>
          prev.map((item) => {
            if (item.id === asset.id || item.idAtivo === asset.idAtivo) {
              return {
                ...item,
                latitude: coords.latitude,
                longitude: coords.longitude,
                precisao_gps: coords.accuracy,
                origem_localizacao: 'EDICAO_MANUAL',
                data_ultima_localizacao: new Date().toISOString()
              };
            }
            return item;
          })
        );
      } else {
        alert('Erro ao atualizar posição do ativo: ' + (res.error || 'Erro desconhecido'));
      }
    } catch (e: any) {
      console.error('Erro ao atualizar localização do ativo:', e);
      alert('Erro inesperado: ' + (e.message || String(e)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header com Título e Status de Conexão GPS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/10 border border-red-500/20 rounded-xl text-red-500 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Mapa Operacional de Ativos
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Tempo Real
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Visualização geoespacial automática e auditoria de deslocamento de equipamentos contra incêndio.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Atualização */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => loadMapData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            title="Recarregar coordenadas"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin text-red-500' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {/* Bento Grid de Métricas Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total com GPS */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Ativos Mapeados</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.total}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Com coordenadas ativas</p>
          </div>
        </div>

        {/* Extintores */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Extintores</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.extintores}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Plotados no mapa</p>
          </div>
        </div>

        {/* Hidrantes */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Hidrantes / Abrigos</span>
            <Droplet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.hidrantes}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Pontos de hidrante</p>
          </div>
        </div>

        {/* Estoque / Almoxarifado */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Em Estoque</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.estoque}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Depósito / Aplicação</p>
          </div>
        </div>

        {/* Rondas & Inspeções GPS */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Inspeções GPS</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {totalInspectionsWithGps}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Check-ins auditados</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, modelo, setor ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 cursor-pointer w-full md:w-auto"
            >
              <option value="todos">Todos os Status</option>
              <option value="conforme">Conformes</option>
              <option value="atencao">A Vencer / Atenção</option>
              <option value="critico">Vencidos / Críticos</option>
              <option value="estoque">Estoque (Aplicação)</option>
              <option value="manutencao">Em Manutenção</option>
            </select>
          </div>
        </div>

        {/* Pílulas de Categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'todos'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({assets.length})
          </button>
          <button
            onClick={() => setSelectedCategory('extintores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'extintores'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Extintores ({stats.extintores})
          </button>
          <button
            onClick={() => setSelectedCategory('hidrantes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'hidrantes'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Hidrantes ({stats.hidrantes})
          </button>
          <button
            onClick={() => setSelectedCategory('sinalizacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'sinalizacao'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Sinalização
          </button>
          <button
            onClick={() => setSelectedCategory('iluminacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'iluminacao'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Iluminação
          </button>
          <button
            onClick={() => setSelectedCategory('bombas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'bombas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Bombas
          </button>
        </div>
      </div>

      {/* Painel do Mapa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-4 shadow-xl relative overflow-hidden">
        {/* Legenda dos Marcadores */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 px-2 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Exibindo <strong>{filteredAssets.length}</strong> de {assets.length} ativos com coordenadas</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Conforme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> A Vencer / Atenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" /> Vencido / Crítico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" /> Estoque (Aplicação)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Manutenção
            </span>
          </div>
        </div>

        {/* Instância do Mapa Leaflet */}
        <div className="mt-3">
          <OperationalMap
            assets={filteredAssets}
            onSelectAssetForHistory={handleOpenHistory}
            onUpdateAssetLocation={handleUpdateAssetLocation}
            className="h-[620px] w-full rounded-xl overflow-hidden shadow-inner"
          />
        </div>
      </div>

      {/* Modal de Histórico de Deslocamento */}
      <AssetMovementHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedAssetForHistory(null);
        }}
        asset={selectedAssetForHistory}
      />
    </div>
  );
}
