'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Droplet, 
  TriangleAlert, 
  Lightbulb, 
  Cog, 
  Plus, 
  QrCode, 
  Play, 
  Search, 
  MapPin, 
  Check, 
  X, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Edit3, 
  Eye,
  Sun,
  Moon,
  History,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight
} from 'lucide-react';
import { getAssetsList } from '@/lib/supabaseDb';
import { SyncQueue } from '@/lib/syncQueue';
import QrCameraScanner from '@/app/components/QrCameraScanner';
import ReinspecaoJustificativaModal from '@/app/components/ReinspecaoJustificativaModal';
import AssetInspectionHistoryModal from '@/app/components/AssetInspectionHistoryModal';
import AssetSwapModal from '@/app/components/AssetSwapModal';
import { idb } from '@/lib/indexedDb';
import { useSync } from '@/hooks/useSync';
import { extractIdOrHashFromUrl, formatDateBr } from '@/lib/utils';
import { prefetchAndHydrateOfflineData } from '@/lib/dbSync';
import { useSpci } from '@/app/context/SpciContext';

// Mapeamento de categorias de ativos
interface Categoria {
  key: 'extintores' | 'hidrantes' | 'sinalizacoes' | 'iluminacao' | 'bombas';
  label: string;
  subLabel: string;
  gradient: string; // Gradientes premium simulando o visual 3D do mockup
  icon: React.ReactNode;
}

export default function PortalTecnicoPage() {
  const router = useRouter();
  const { userProfile } = useSpci();

  // Estados de Controle Geral e Tema
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Categoria['key']>('extintores');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Controle de Ciclo Mensal e Modais (Opção C)
  const [filterCycleMode, setFilterCycleMode] = useState<'pendentes' | 'todos'>('pendentes');
  const [selectedAssetForReinspecao, setSelectedAssetForReinspecao] = useState<any | null>(null);
  const [isReinspecaoModalOpen, setIsReinspecaoModalOpen] = useState<boolean>(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Controle de Troca & Substituição Direta em Campo
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [selectedAssetForSwap, setSelectedAssetForSwap] = useState<any | null>(null);

  // Hook unificado de sincronia e status de rede
  const { isOnline, pendingCount, syncing, triggerSync } = useSync();

  // Modal Scanner Câmera
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Alerta de Sessão Temporária Compartilhada
  const [isSharedSession] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.cookie.includes('spci_shared_token=');
    }
    return false;
  });
  const [showSharedSessionBanner, setShowSharedSessionBanner] = useState<boolean>(true);
  const [showSharedSessionBottomSheet, setShowSharedSessionBottomSheet] = useState<boolean>(false);


  // Alterna o tema de forma fluida (Telegram Style)
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('spci_portal_theme', nextTheme);
  };

  // Categorias baseadas exatamente nos ícones e cores do mockup
  const categorias: Categoria[] = [
    { 
      key: 'extintores', 
      label: 'EXTINTOR', 
      subLabel: 'COMBATE PRIMÁRIO', 
      gradient: 'from-rose-500 via-red-500 to-red-650', 
      icon: <Flame size={24} className="drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]" /> 
    },
    { 
      key: 'hidrantes', 
      label: 'HIDRANTE', 
      subLabel: 'COMBATE SECUNDÁRIO', 
      gradient: 'from-cyan-400 via-sky-500 to-blue-650', 
      icon: <Droplet size={24} className="drop-shadow-[0_2px_8px_rgba(14,165,233,0.4)]" /> 
    },
    { 
      key: 'sinalizacoes', 
      label: 'SINALIZAÇÃO', 
      subLabel: 'PREVENÇÃO NBR', 
      gradient: 'from-amber-400 via-orange-500 to-red-500', 
      icon: <TriangleAlert size={24} className="drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" /> 
    },
    { 
      key: 'iluminacao', 
      label: 'ILUMINAÇÃO', 
      subLabel: 'EMERGÊNCIA', 
      gradient: 'from-yellow-350 via-yellow-500 to-amber-500', 
      icon: <Lightbulb size={24} className="drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]" /> 
    },
    { 
      key: 'bombas', 
      label: 'CASA DE BOMBAS', 
      subLabel: 'PRESSURIZAÇÃO', 
      gradient: 'from-slate-400 via-zinc-500 to-slate-655', 
      icon: <Cog size={24} className="drop-shadow-[0_2px_8px_rgba(115,115,115,0.4)]" /> 
    },
  ];

  // Sincronia automática gerenciada pelo hook useSync

  const loadCategoryAssets = useCallback(async () => {
    try {
      setLoading(true);
      const userSite = userProfile?.site;
      const list = await getAssetsList(selectedCategory, userSite);
      setAssets(list || []);

      if (list && list.length > 0) {
        await idb.setAll(selectedCategory, list);
      }
    } catch (err) {
      console.warn('Buscando cache offline do IndexedDB...', err);
      try {
        const localList = await idb.getAll(selectedCategory);
        const userSite = userProfile?.site;
        const isGlobal = !userSite || userSite.toUpperCase().startsWith('TODOS');
        const filtered = isGlobal 
          ? localList 
          : (localList || []).filter((item: any) => (item.site || item.contrato || '').toUpperCase() === userSite.toUpperCase());
        setAssets(filtered || []);
      } catch (dbErr) {
        console.error('Erro ao ler cache local do IndexedDB:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, userProfile?.site]);

  // Sincroniza o tema e pré-carrega cache offline do IndexedDB filtrado pelo contrato do usuário
  useEffect(() => {
    const savedTheme = localStorage.getItem('spci_portal_theme') as 'light' | 'dark';
    const timer = setTimeout(() => {
      setMounted(true);
      if (savedTheme) {
        setTheme(savedTheme);
      }
      // Pré-carga em segundo plano para operação offline com segregação de contrato
      prefetchAndHydrateOfflineData(userProfile?.site).catch(err => {
        console.warn('[PortalTecnico] Falha ao pré-carregar dados offline:', err);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [userProfile?.site]);

  // Recarrega lista de ativos ao trocar de categoria ou mudar de contrato
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategoryAssets();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCategoryAssets]);

  // Funções de processamento de fila delegadas ao useSync

  const handleScanSuccess = (decodedCode: string) => {
    setIsScannerOpen(false);
    if (decodedCode) {
      const parsedCode = extractIdOrHashFromUrl(decodedCode);
      router.push(`/inspecao/${parsedCode}`);
    }
  };

  // Verifica se o ativo já foi inspecionado no ciclo do mês/ano atual
  const isAssetInspecionadoNoMes = useCallback((asset: any) => {
    if (asset.status_inspecao_mes === 'INSPECIONADO') return true;
    const dataInsp = asset.data_ultima_inspecao || asset.lastInsp;
    if (!dataInsp) return false;
    try {
      const d = new Date(dataInsp);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } catch {
      return false;
    }
  }, []);

  // Contadores do Ciclo Mensal
  const inspecionadosCount = assets.filter(isAssetInspecionadoNoMes).length;
  const pendentesCount = Math.max(0, assets.length - inspecionadosCount);

  // Filtra ativos conforme busca e ciclo de inspeção (Opção C)
  const filteredAssets = assets.filter(asset => {
    const isAlreadyInspecionado = isAssetInspecionadoNoMes(asset);
    const query = searchQuery.toLowerCase().trim();

    if (query) {
      // Busca ativa: pesquisa em todos os ativos (inclusive já inspecionados)
      const patrimonio = String(asset.idAtivo || asset.id_ativo || asset.numero_patrimonio || '').toLowerCase();
      const modelo = String(asset.model || '').toLowerCase();
      const local = String(asset.location || '').toLowerCase();
      return patrimonio.includes(query) || modelo.includes(query) || local.includes(query);
    }

    // Fila padrão de ronda sem busca: exibe apenas pendentes ou todos conforme toggle
    if (filterCycleMode === 'pendentes') {
      return !isAlreadyInspecionado;
    }
    return true;
  });

  const handleInspecionarClick = (asset: any) => {
    const alreadyDone = isAssetInspecionadoNoMes(asset);
    if (alreadyDone) {
      setSelectedAssetForReinspecao(asset);
      setIsReinspecaoModalOpen(true);
    } else {
      router.push(`/inspecao/${asset.idAtivo || asset.id}`);
    }
  };

  const handleConfirmReinspecao = (justificativa: string) => {
    if (!selectedAssetForReinspecao) return;
    const assetId = selectedAssetForReinspecao.idAtivo || selectedAssetForReinspecao.id;
    setIsReinspecaoModalOpen(false);
    router.push(`/inspecao/${assetId}?reinspecao=true&justificativa=${encodeURIComponent(justificativa)}`);
  };

  const handleOpenHistory = (asset: any) => {
    setSelectedAssetForHistory(asset);
    setIsHistoryModalOpen(true);
  };

  // Definições de Estilos do Tema Claro/Escuro (Alto Contraste WCAG AA)
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950';
  const cardClass = isDark ? 'bg-slate-900/60 border-slate-850 hover:border-slate-800' : 'bg-white border-slate-300 hover:border-slate-400 shadow-sm';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-700 font-semibold';
  const labelMutedClass = isDark ? 'text-slate-400' : 'text-slate-700 font-semibold';
  const borderBottomClass = isDark ? 'border-slate-800' : 'border-slate-300';
  const searchBgClass = isDark ? 'bg-slate-900 border-slate-850 text-slate-100' : 'bg-white border-slate-300 hover:border-slate-400 focus:border-red-600 text-slate-950 font-medium shadow-sm';
  const buttonSecondaryClass = isDark ? 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-350' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900 font-bold shadow-sm';

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono p-4">
        <div className="flex flex-col items-center gap-3 max-w-xs text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent animate-spin rounded-none" />
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-200">SPCI Ronda de Campo</h2>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Sincronizando ambiente seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col justify-between font-mono relative antialiased transition-colors duration-300 selection:bg-red-655 selection:text-white`}>
      
      {/* Fundo elegante, moderno e minimalista (sem estilo xadrez/quadriculado) */}
      <div 
        className={`fixed inset-0 pointer-events-none transition-colors duration-500 ${
          isDark 
            ? 'bg-radial-[at_50%_0%] from-red-950/25 via-slate-950 to-slate-950' 
            : 'bg-radial-[at_50%_0%] from-red-500/5 via-slate-50/60 to-slate-100/90'
        }`} 
      />

      {/* TOP HEADER: Sticky Header Profissional com Banner Institucional do Bombeiro Industrial */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-red-700 via-red-650 to-red-600 text-white shadow-xl border-b border-red-800/40 backdrop-blur-md overflow-hidden">
        {/* Banner Institucional: Bombeiro Industrial com Máscara Gradiente */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/3 pointer-events-none bg-cover bg-right bg-no-repeat opacity-25 dark:opacity-35 mix-blend-luminosity"
          style={{
            backgroundImage: "url('/login-bg.png')",
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0) 100%)'
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-lg mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2">
          {/* Título / Marca Institucional com Logo Transparente e Sem Bordas */}
          <div className="flex items-center gap-2.5 select-none min-w-0">
            <img 
              src="/logo-omg-clean.png" 
              alt="Grupo OMG SPCI Master" 
              className="max-h-9 w-auto object-contain shrink-0 bg-transparent border-0 ring-0 shadow-none filter drop-shadow-sm" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-widest font-sans truncate text-white">
                  SPCI BOMBEIROS
                </h1>
                <span className="hidden xs:inline-block text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-900/60 border border-red-400/30 text-red-100 font-bold">
                  BRIGADA
                </span>
              </div>
              <p className="text-[8px] text-red-100 font-mono tracking-wider truncate">
                GESTOR DE CONFORMIDADE & RONDA
              </p>
            </div>
          </div>

          {/* Ações Rápidas de Cabeçalho: Tema, Sincronia e Rede */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Chaveador de Tema Sol/Lua */}
            <button 
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer shadow-2xs"
              title={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
              aria-label={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
            >
              {isDark ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-yellow-100" />}
            </button>

            {/* Status Online/Offline */}
            <div className={`flex items-center gap-1 text-[8px] font-bold px-2 py-1 rounded-lg select-none ${
              isOnline ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-400/30' : 'bg-amber-950/50 text-amber-300 border border-amber-400/40 animate-pulse'
            }`}>
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              <span className="hidden sm:inline font-mono">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Botão de Sincronia */}
            <button 
              onClick={async () => {
                await triggerSync();
                await loadCategoryAssets();
              }}
              disabled={!isOnline || pendingCount === 0 || syncing}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[9px] font-mono font-bold uppercase transition-all select-none rounded-xl border border-white/25 bg-white/15 hover:bg-white/25 active:scale-[0.98] cursor-pointer ${
                pendingCount > 0 ? 'animate-bounce border-emerald-400 bg-emerald-600 text-white' : 'opacity-90 text-white'
              }`}
              aria-label={`Sincronizar dados pendentes. ${pendingCount} itens na fila.`}
            >
              <RefreshCw size={11} className={`${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Sincronia</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 font-sans font-bold text-[8px]">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-8 z-10 space-y-6">

        {/* ALERTA DE SESSÃO TEMPORÁRIA COMPARTILHADA */}
        <AnimatePresence>
          {isSharedSession && showSharedSessionBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-550 shadow-sm"
            >
              <div className="flex items-center gap-2 flex-grow min-w-0">
                <TriangleAlert size={14} className="shrink-0 animate-pulse text-amber-500" />
                <p className="text-[9px] leading-tight font-sans font-black truncate">
                  ACESSO TEMPORÁRIO (EXPIRA À MEIA-NOITE)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowSharedSessionBottomSheet(true)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-550 border border-amber-500/40 text-[8px] font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Regras
                </button>
                <button
                  onClick={() => setShowSharedSessionBanner(false)}
                  className="p-1 hover:bg-amber-500/25 rounded-lg transition-colors text-amber-550 cursor-pointer border-none bg-transparent flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. SELECIONE A CATEGORIA DO ATIVO (Mockup Grid com Ricos Gradientes 3D) */}
        <section className="space-y-3">
          <h3 className={`text-[10px] ${labelMutedClass} uppercase tracking-widest font-bold font-mono`}>
            Selecione a Categoria do Ativo
          </h3>
          
          {/* Grid de Cards de Categoria */}
          <div className="grid grid-cols-5 gap-2.5" role="radiogroup" aria-label="Categorias de ativo">
            {categorias.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Selecionar categoria ${cat.label}`}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setSearchQuery('');
                  }}
                  className={`flex flex-col items-center justify-between p-2.5 min-h-[98px] transition-all relative overflow-hidden select-none active:scale-[0.96] cursor-pointer rounded-xl border ${
                    isSelected 
                      ? 'border-red-600 bg-red-655/15 shadow-md shadow-red-500/10' 
                      : isDark
                      ? 'border-slate-850 bg-slate-900/60 hover:border-slate-800'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Canto vermelho de check do mockup */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-red-600 flex items-center justify-center shadow">
                      <Check size={7} className="text-white stroke-[4]" />
                    </div>
                  )}

                  {/* Ícone com representação em gradiente imitador do 3D */}
                  <div className={`p-2 rounded-xl mb-1.5 transition-all duration-300 bg-gradient-to-tr ${
                    isSelected 
                      ? `${cat.gradient} text-white shadow-lg` 
                      : isDark
                      ? 'from-slate-800 to-slate-850 text-slate-455 border border-slate-800'
                      : 'from-slate-100 to-slate-200 text-slate-600 border border-slate-100'
                  }`}>
                    {cat.icon}
                  </div>
                  
                  <div className="space-y-0.5 w-full">
                    <span className={`text-[7.5px] font-sans font-black tracking-tight block truncate uppercase leading-none ${
                      isSelected ? 'text-red-500' : isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {cat.label}
                    </span>
                    <span className={`text-[5px] font-sans block leading-none font-bold uppercase truncate ${
                      isSelected ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {cat.subLabel.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. BARRA DE PESQUISA & AÇÕES DE CAMPO (Layout Otimizado 2 Colunas) */}
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {/* Novo Ativo */}
            <button 
              onClick={() => router.push(`/inspecao/novo?category=${selectedCategory}`)}
              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:p-3.5 bg-emerald-600/10 hover:bg-emerald-600/15 border border-emerald-500/30 text-emerald-500 transition-all font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97] min-h-[48px] text-center"
              aria-label={`Cadastrar novo ativo da categoria ${selectedCategory}`}
            >
              <Plus size={16} />
              <span>Novo Ativo</span>
            </button>

            {/* Troca em Campo */}
            <button 
              onClick={() => {
                setSelectedAssetForSwap(null);
                setIsSwapModalOpen(true);
              }}
              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:p-3.5 bg-rose-600/10 hover:bg-rose-600/15 border border-rose-500/30 text-rose-500 transition-all font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97] min-h-[48px] text-center"
              aria-label="Realizar troca ou substituição de extintor em campo"
            >
              <ArrowLeftRight size={16} />
              <span>Troca Campo</span>
            </button>

            {/* QR Code Scanner */}
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex flex-col sm:flex-row items-center justify-center p-2.5 sm:p-3.5 bg-red-655/10 hover:bg-red-655/15 border border-red-500/30 text-red-500 transition-all font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97] min-h-[48px] text-center"
              aria-label="Ler QR Code utilizando a câmera do dispositivo"
            >
              <QrCode size={16} />
              <span>Ler QR Code</span>
            </button>
          </div>

          {/* Barra de Pesquisa */}
          <div className="relative">
            <input 
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar patrimônio, modelo ou local..."
              className={`w-full py-4 pl-11 pr-4 text-xs focus:outline-none focus:border-red-655 transition-colors font-mono rounded-xl border ${searchBgClass}`}
              aria-label="Campo de busca de ativos por patrimônio, modelo ou local"
            />
            <Search size={14} className="text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        {/* 3. LISTAGEM DE ATIVOS & CICLO MENSAL */}
        <section className="space-y-4">
          {/* Barra de Status do Ciclo Mensal */}
          <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            isDark ? 'bg-slate-900/60 border-slate-850' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-red-500">
                Ciclo Mensal:
              </span>
              <span className="text-xs font-extrabold uppercase font-sans">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <button
                onClick={() => setFilterCycleMode('pendentes')}
                className={`px-2.5 py-1 rounded-lg border font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCycleMode === 'pendentes' && !searchQuery
                    ? 'bg-red-600 border-red-500 text-white shadow-xs'
                    : isDark
                      ? 'bg-slate-800/80 border-slate-750 text-slate-350 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Pendentes: {pendentesCount}
              </button>

              <button
                onClick={() => setFilterCycleMode('todos')}
                className={`px-2.5 py-1 rounded-lg border font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterCycleMode === 'todos' || searchQuery
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                    : isDark
                      ? 'bg-slate-800/80 border-slate-750 text-slate-350 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Concluídos: {inspecionadosCount} / {assets.length}
              </button>
            </div>
          </div>

          <div className={`flex items-center justify-between border-b pb-2 ${borderBottomClass}`}>
            <h4 className={`text-[10px] ${labelMutedClass} uppercase tracking-widest font-bold font-mono`}>
              {searchQuery ? `Resultados da busca (${filteredAssets.length})` : filterCycleMode === 'pendentes' ? `Fila de Ronda Pendente (${filteredAssets.length})` : `Todos da Categoria (${filteredAssets.length})`}
            </h4>
            <span className={`text-[8px] ${labelMutedClass} uppercase font-mono`}>
              Filtro: {selectedCategory}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div 
                key="loading-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center space-y-3"
              >
                <RefreshCw className="animate-spin text-red-500 mx-auto" size={24} />
                <p className={`text-[9px] uppercase tracking-wider ${textMutedClass}`}>Acessando base de dados SPCI...</p>
              </motion.div>
            )}

            {!loading && filteredAssets.length === 0 && (
              <motion.div 
                key="empty-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`py-12 text-center border border-dashed rounded-2xl ${
                  isDark ? 'border-slate-880 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}
              >
                <span className="text-2xl block mb-2">🎉</span>
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider">
                  {filterCycleMode === 'pendentes' && !searchQuery
                    ? 'Excelente! Todos os equipamentos desta categoria já foram vistoriados no mês corrente.'
                    : 'Nenhum ativo localizado com os filtros selecionados.'}
                </p>
                {filterCycleMode === 'pendentes' && !searchQuery && (
                  <button
                    onClick={() => setFilterCycleMode('todos')}
                    className="mt-3 px-3 py-1.5 text-[9px] font-mono uppercase font-bold text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg hover:bg-red-950/50 transition-colors"
                  >
                    Ver Todos os Ativos Inspecionados
                  </button>
                )}
              </motion.div>
            )}

            {!loading && filteredAssets.length > 0 && (
              <motion.div 
                key="list-container"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {filteredAssets.map((asset) => {
                  const isAlreadyInspecionado = isAssetInspecionadoNoMes(asset);
                  const dataUltima = asset.data_ultima_inspecao || asset.lastInsp;

                  return (
                    <div 
                      key={asset.id}
                      className={`p-4.5 rounded-2xl border relative overflow-hidden flex flex-col justify-between hover:scale-[1.005] transition-all duration-200 ${cardClass}`}
                    >
                      {/* Faixa lateral de status */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        isAlreadyInspecionado ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />

                      <div className="pl-2 space-y-3.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[8.5px] px-2 py-0.5 rounded font-mono font-bold uppercase select-none tracking-wider ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-900 border border-slate-300 font-extrabold'
                            }`}>
                              Patrimônio: {asset.idAtivo || asset.id_ativo || asset.numero_patrimonio || 'N/A'}
                            </span>
                            <h4 className={`text-sm font-black mt-1.5 uppercase leading-tight font-sans ${
                              isDark ? 'text-slate-100' : 'text-slate-950'
                            }`}>
                              {asset.model || 'PQS ABC - 8KG'}
                            </h4>
                          </div>
                          
                          <span className={`inline-block px-2.5 py-1 text-[8.5px] font-extrabold uppercase border rounded-md select-none ${
                            isAlreadyInspecionado 
                              ? 'text-emerald-500 dark:text-emerald-455 border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-950/20' 
                              : 'text-red-500 dark:text-red-455 border-red-500/50 bg-red-500/10 dark:bg-red-950/20'
                          }`}>
                            {asset.status || (isAlreadyInspecionado ? 'Conforme' : 'Pendente')}
                          </span>
                        </div>

                        {/* Detalhes do Equipamento com Alto Contraste */}
                        <div className={`grid grid-cols-2 gap-y-2 text-[10px] border-t pt-3.5 font-sans ${
                          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800 font-medium'
                        }`}>
                          <p className="col-span-2">
                            <strong className={isDark ? 'text-slate-400 font-bold' : 'text-slate-700 font-bold'}>📍 Setor / Sub-Local:</strong> {asset.location} {asset.subLocation ? ` - ${asset.subLocation}` : ''}
                          </p>
                          <p>
                            <strong className={isDark ? 'text-slate-400 font-bold' : 'text-slate-700 font-bold'}>🔍 Selo:</strong> {asset.seloInmetro || 'NBR'}
                          </p>
                          <p>
                            <strong className={isDark ? 'text-slate-400 font-bold' : 'text-slate-700 font-bold'}>📌 Chassi:</strong> {asset.chassi || 'N/A'}
                          </p>

                          {/* STATUS DO CICLO MENSAL REFINADO */}
                          <div className="col-span-2 flex flex-col gap-1 mt-1 font-mono text-[9px]">
                            <div className="flex items-center gap-1.5">
                              <strong className={isDark ? 'text-slate-400 font-bold' : 'text-slate-700 font-bold'}>VISTORIA MÊS ATUAL:</strong>
                              <span className={`font-black px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wide flex items-center gap-1 border ${
                                isAlreadyInspecionado 
                                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 shadow-xs' 
                                  : 'text-red-400 bg-red-950/40 border-red-800/60'
                              }`}>
                                {isAlreadyInspecionado ? (
                                  <>
                                    <CheckCircle2 size={11} className="text-emerald-400" />
                                    <span>INSPECIONADO EM {dataUltima ? formatDateBr(dataUltima) : 'MÊS ATUAL'}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle size={11} className="text-red-400" />
                                    <span>NÃO INSPECIONADO NO MÊS</span>
                                  </>
                                )}
                              </span>
                            </div>
                            {asset.justificativa_reinspecao && (
                              <p className="text-[8.5px] text-amber-400/90 font-sans italic">
                                Obs: {asset.justificativa_reinspecao}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ações (Editar, Histórico, Trocar e Inspecionar) */}
                        <div className={`grid ${selectedCategory === 'extintores' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2 pt-3 border-t ${
                          isDark ? 'border-slate-850' : 'border-slate-100'
                        }`}>
                          <button 
                            onClick={() => router.push(`/inspecao/novo?id=${asset.idAtivo || asset.id}&category=${selectedCategory}`)}
                            className={`py-2 text-[8.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer rounded-lg border transition-colors ${buttonSecondaryClass}`}
                            aria-label={`Editar ativo ${asset.idAtivo || asset.id}`}
                          >
                            <Edit3 size={11} />
                            <span>Editar</span>
                          </button>

                          <button 
                            onClick={() => handleOpenHistory(asset)}
                            className={`py-2 text-[8.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer rounded-lg border transition-colors ${buttonSecondaryClass}`}
                            aria-label={`Visualizar histórico e laudo do ativo ${asset.idAtivo || asset.id}`}
                          >
                            <History size={11} className="text-cyan-400" />
                            <span>Histórico</span>
                          </button>

                          {selectedCategory === 'extintores' && (
                            <button 
                              onClick={() => {
                                setSelectedAssetForSwap(asset);
                                setIsSwapModalOpen(true);
                              }}
                              className="py-2 text-rose-500 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-[8.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer rounded-lg shadow-2xs transition-colors"
                              aria-label={`Realizar troca em campo do extintor ${asset.idAtivo || asset.id}`}
                            >
                              <ArrowLeftRight size={11} />
                              <span>Trocar</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleInspecionarClick(asset)}
                            className={`py-2 text-white text-[8.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer rounded-lg border shadow-sm transition-colors ${
                              isAlreadyInspecionado
                                ? 'bg-amber-600 hover:bg-amber-500 border-amber-500'
                                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500'
                            }`}
                            aria-label={`Realizar inspeção no ativo ${asset.idAtivo || asset.id}`}
                          >
                            <Eye size={11} />
                            <span>{isAlreadyInspecionado ? 'Re-inspecionar' : 'Inspecionar'}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* FOOTER */}
      <footer className={`w-full text-center py-6 border-t z-15 select-none transition-colors ${
        isDark ? 'border-slate-900 bg-slate-950 text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-500'
      }`}>
        <p className="text-[8px] uppercase tracking-[0.25em]">SISTEMA SPCI • PORTAL DE INSPEÇÕES PÚBLICAS v2.2</p>
        <p className="text-[7px] mt-1 font-sans">Desenvolvido em conformidade com as normas ABNT e NBR da Brigada de Bombeiros.</p>
      </footer>

      {/* MODAL SCANNER CÂMERA */}
      <QrCameraScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Bottom Sheet - Regras de Acesso e Expiração */}
      <AnimatePresence>
        {showSharedSessionBottomSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSharedSessionBottomSheet(false)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
            />
            {/* Sheet Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className={`relative w-full max-w-lg rounded-t-[2rem] border-t border-slate-800 shadow-2xl p-6 space-y-5 z-10 text-left ${
                isDark ? 'bg-slate-900 text-slate-105' : 'bg-white text-slate-900 border-slate-200'
              }`}
            >
              {/* Top Drag Indicator Line */}
              <div className="w-12 h-1 bg-slate-700/50 rounded-full mx-auto" />

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                  <TriangleAlert size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black tracking-tight font-sans">
                    Aviso de Sessão Compartilhada
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-sans">
                    Você está utilizando um link temporário gerado por um administrador.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed font-sans">
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950/50 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}>
                  <p className="font-bold text-amber-500 flex items-center gap-1.5">
                    ⏰ Expiração Diária (Meia-Noite)
                  </p>
                  <p className="text-[10.5px]">
                    Este token expira automaticamente hoje às **23:59:59**. Vistorias em andamento após esse horário serão interrompidas se necessitarem de rede.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950/50 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}>
                  <p className="font-bold text-amber-500 flex items-center gap-1.5">
                    🔌 Logout do Administrador
                  </p>
                  <p className="text-[10.5px]">
                    Se o administrador que gerou este link sair do sistema web, todos os técnicos conectados via link compartilhado serão deslogados imediatamente.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950/50 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                }`}>
                  <p className="font-bold text-amber-500 flex items-center gap-1.5">
                    📥 Inspeções Offline Preservadas
                  </p>
                  <p className="text-[10.5px]">
                    Se você preencher um formulário offline **antes da meia-noite**, o banco de dados aceitará o envio mesmo que ele seja transmitido (sincronizado) após a expiração do token.
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 text-amber-500 space-y-1">
                  <p className="font-bold text-[11px]">💡 Evite Desconexões</p>
                  <p className="text-[10.5px] leading-normal">
                    Se você possui plantão noturno ou realiza inspeções frequentes, solicite ao administrador o **cadastro de um perfil técnico próprio** no sistema. Com seu login pessoal, seu acesso nunca expira à meia-noite.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSharedSessionBottomSheet(false)}
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-xl font-bold active:scale-[0.98] transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Justificativa de Re-inspeção Técnica */}
      <ReinspecaoJustificativaModal
        isOpen={isReinspecaoModalOpen}
        onClose={() => setIsReinspecaoModalOpen(false)}
        asset={selectedAssetForReinspecao}
        onConfirm={handleConfirmReinspecao}
        isDark={isDark}
      />

      {/* Modal de Histórico de Vistorias e Laudos Oficiais (PDF) */}
      <AssetInspectionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        asset={selectedAssetForHistory}
        isDark={isDark}
      />

      {/* Modal de Troca e Substituição de Extintores em Campo */}
      <AssetSwapModal
        isOpen={isSwapModalOpen}
        onClose={() => {
          setIsSwapModalOpen(false);
          setSelectedAssetForSwap(null);
        }}
        currentUserName={userProfile?.displayName || userProfile?.nome || 'Técnico de Campo'}
        currentUserEmail={userProfile?.email || undefined}
        preSelectedAssetId={selectedAssetForSwap?.idAtivo || selectedAssetForSwap?.id || selectedAssetForSwap?.id_ativo}
        onSuccess={async () => {
          await loadCategoryAssets();
        }}
      />

    </div>
  );
}
