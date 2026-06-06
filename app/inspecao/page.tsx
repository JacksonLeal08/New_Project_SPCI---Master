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
  Moon
} from 'lucide-react';
import { getAssetsList } from '@/lib/supabaseDb';
import { SyncQueue } from '@/lib/syncQueue';
import QrCameraScanner from '@/app/components/QrCameraScanner';
import { idb } from '@/lib/indexedDb';
import { useSync } from '@/hooks/useSync';

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

  // Estados de Controle Geral e Tema
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Categoria['key']>('extintores');
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hook unificado de sincronia e status de rede
  const { isOnline, pendingCount, syncing, triggerSync } = useSync();

  // Modal Scanner Câmera e Tutorial
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

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
      const list = await getAssetsList(selectedCategory);
      setAssets(list || []);

      if (list && list.length > 0) {
        await idb.setAll(selectedCategory, list);
      }
    } catch (err) {
      console.warn('Buscando cache offline do IndexedDB...', err);
      try {
        const localList = await idb.getAll(selectedCategory);
        setAssets(localList || []);
      } catch (dbErr) {
        console.error('Erro ao ler cache local do IndexedDB:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Sincroniza o tema preferido do usuário após a hidratação no cliente
  useEffect(() => {
    const savedTheme = localStorage.getItem('spci_portal_theme') as 'light' | 'dark';
    const timer = setTimeout(() => {
      setMounted(true);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Recarrega lista de ativos ao trocar de categoria
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
      router.push(`/inspecao/${decodedCode.trim()}`);
    }
  };

  // Filtra ativos conforme query de pesquisa
  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const patrimonio = String(asset.idAtivo || asset.id_ativo || '').toLowerCase();
    const modelo = String(asset.model || '').toLowerCase();
    const local = String(asset.location || '').toLowerCase();
    return patrimonio.includes(query) || modelo.includes(query) || local.includes(query);
  });

  // Definições de Estilos do Tema Claro/Escuro
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = isDark ? 'bg-slate-900/60 border-slate-850 hover:border-slate-800' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const labelMutedClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderBottomClass = isDark ? 'border-slate-900' : 'border-slate-100';
  const searchBgClass = isDark ? 'bg-slate-900 border-slate-850 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const buttonSecondaryClass = isDark ? 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-350' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm';

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
      
      {/* Grade técnica industrial de fundo */}
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none transition-opacity duration-300 ${
        isDark ? 'opacity-30 bg-slate-950' : 'opacity-10 bg-slate-50'
      }`} />

      {/* TOP HEADER: Curved SPCI Bombeiros Wave */}
      <header className="relative w-full z-20">
        <div className="bg-gradient-to-r from-red-700 to-red-600 text-white pb-8 pt-6 px-4 rounded-b-[40px] shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 text-[120px] font-black pointer-events-none select-none">
            BOMBEIRO
          </div>
          
          <div className="max-w-lg mx-auto flex items-center justify-between">
            {/* Título / Marca */}
            <div className="flex items-center gap-2 select-none">
              <span className="p-1.5 bg-white text-red-700 rounded-none font-sans font-black tracking-tighter text-sm flex items-center justify-center">
                SPCI
              </span>
              <div>
                <h1 className="text-sm font-extrabold uppercase tracking-widest font-sans">SPCI BOMBEIROS</h1>
                <p className="text-[7px] text-red-100 tracking-wider">GESTOR DE CONFORMIDADE E BRIGADA</p>
              </div>
            </div>

            {/* Ações Rápidas de Cabeçalho: Tema, Sincronia e Rede */}
            <div className="flex items-center gap-2">
              {/* Chaveador de Tema Sol/Lua (Telegram Style) */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border-none cursor-pointer"
                title={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
                aria-label={isDark ? 'Ativar Tema Claro' : 'Ativar Tema Escuro'}
              >
                {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-yellow-100" />}
              </button>

              <div className={`flex items-center gap-1 text-[8px] font-bold px-2 py-1 select-none ${
                isOnline ? 'bg-emerald-950/30 text-emerald-350 border border-emerald-500/30' : 'bg-amber-950/40 text-amber-350 border border-amber-500/40 animate-pulse'
              }`}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                <span className="hidden sm:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>

              <button 
                onClick={async () => {
                  await triggerSync();
                  await loadCategoryAssets();
                }}
                disabled={!isOnline || pendingCount === 0 || syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase transition-all select-none border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] ${
                  pendingCount > 0 ? 'animate-bounce border-emerald-400 bg-emerald-600 text-white' : 'opacity-85 text-white'
                }`}
                aria-label={`Sincronizar dados pendentes. ${pendingCount} itens na fila.`}
              >
                <RefreshCw size={11} className={`${syncing ? 'animate-spin' : ''}`} />
                <span>Sincronia</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 font-sans font-bold text-[8px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Curva física na base */}
        <div className="absolute -bottom-1 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[30px] fill-red-700 drop-shadow-md">
            <path d="M0,64L80,69.3C160,75,320,85,480,85.3C640,85,800,75,960,64C1120,53,1280,43,1360,37.3L1440,32L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
          </svg>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-8 z-10 space-y-6">

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

        {/* 2. BARRA DE PESQUISA & AÇÕES DE CAMPO */}
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Novo Ativo */}
            <button 
              onClick={() => router.push(`/inspecao/novo?category=${selectedCategory}`)}
              className="flex flex-col items-center justify-center p-3.5 bg-emerald-600/10 hover:bg-emerald-600/15 border border-emerald-500/30 text-emerald-450 transition-all font-mono text-[9px] uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97]"
              aria-label={`Cadastrar novo ativo da categoria ${selectedCategory}`}
            >
              <Plus size={16} />
              Novo Ativo
            </button>

            {/* QR Code Scanner */}
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex flex-col items-center justify-center p-3.5 bg-red-655/10 hover:bg-red-655/15 border border-red-500/30 text-red-450 transition-all font-mono text-[9px] uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97]"
              aria-label="Ler QR Code utilizando a câmera do dispositivo"
            >
              <QrCode size={16} />
              Ler QR Code
            </button>

            {/* Tutorial */}
            <button 
              onClick={() => setShowTutorial(true)}
              className="flex flex-col items-center justify-center p-3.5 bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/30 text-blue-400 transition-all font-mono text-[9px] uppercase font-bold tracking-wider gap-1.5 cursor-pointer rounded-xl active:scale-[0.97]"
              aria-label="Exibir tutorial de ronda e inspeção"
            >
              <Play size={16} fill="currentColor" />
              Tutorial
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

        {/* 3. LISTAGEM DE ATIVOS */}
        <section className="space-y-4">
          <div className={`flex items-center justify-between border-b pb-2 ${borderBottomClass}`}>
            <h4 className={`text-[10px] ${labelMutedClass} uppercase tracking-widest font-bold font-mono`}>
              Equipamentos SPCI ({filteredAssets.length})
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
                <span className="text-2xl block mb-2">🔍</span>
                <p className="text-[9px] uppercase font-mono tracking-wider">Nenhum ativo localizado nesta categoria.</p>
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
                  const hasInspecionado = asset.status === 'Conforme';
                  return (
                    <div 
                      key={asset.id}
                      className={`p-4.5 rounded-2xl border relative overflow-hidden flex flex-col justify-between hover:scale-[1.005] transition-all duration-200 ${cardClass}`}
                    >
                      {/* Faixa lateral de status */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        hasInspecionado ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />

                      <div className="pl-2 space-y-3.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[8.5px] px-2 py-0.5 rounded font-mono font-bold uppercase select-none tracking-wider ${
                              isDark ? 'bg-slate-800 text-slate-450' : 'bg-slate-100 text-slate-550'
                            }`}>
                              Patrimônio: {asset.idAtivo || asset.id_ativo || 'N/A'}
                            </span>
                            <h4 className={`text-sm font-extrabold mt-1.5 uppercase leading-tight font-sans ${
                              isDark ? 'text-slate-100' : 'text-slate-800'
                            }`}>
                              {asset.model || 'PQS ABC - 8KG'}
                            </h4>
                          </div>
                          
                          <span className={`inline-block px-2.5 py-1 text-[8.5px] font-extrabold uppercase border rounded-md select-none ${
                            hasInspecionado 
                              ? 'text-emerald-455 border-emerald-900 bg-emerald-950/20' 
                              : 'text-red-455 border-red-900 bg-red-950/20'
                          }`}>
                            {asset.status || 'Ativo'}
                          </span>
                        </div>

                        {/* Detalhes do Equipamento */}
                        <div className={`grid grid-cols-2 gap-y-2 text-[10px] border-t pt-3.5 font-sans ${
                          isDark ? 'border-slate-850 text-slate-450' : 'border-slate-100 text-slate-600'
                        }`}>
                          <p className="col-span-2">
                            <strong className={isDark ? 'text-slate-500' : 'text-slate-400'}>📍 Local:</strong> {asset.location} {asset.subLocation ? ` - ${asset.subLocation}` : ''}
                          </p>
                          <p>
                            <strong className={isDark ? 'text-slate-500' : 'text-slate-400'}>🔍 Selo:</strong> {asset.seloInmetro || 'NBR'}
                          </p>
                          <p>
                            <strong className={isDark ? 'text-slate-500' : 'text-slate-400'}>📌 Chassi:</strong> {asset.chassi || 'N/A'}
                          </p>
                          <p className="col-span-2 flex items-center gap-1.5 mt-1 font-mono text-[9px]">
                            <strong className={isDark ? 'text-slate-500' : 'text-slate-400'}>VISTORIA MÊS ATUAL:</strong>
                            <span className={`font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide ${
                              hasInspecionado ? 'text-emerald-455 bg-emerald-950/20' : 'text-red-455 bg-red-950/20'
                            }`}>
                              {hasInspecionado ? 'OK / CONFORME' : 'NÃO INSPECTIONADO'}
                            </span>
                          </p>
                        </div>

                        {/* Botões de Ações */}
                        <div className={`flex gap-2.5 pt-3 border-t ${
                          isDark ? 'border-slate-850' : 'border-slate-100'
                        }`}>
                          <button 
                            onClick={() => router.push(`/inspecao/novo?id=${asset.idAtivo || asset.id}&category=${selectedCategory}`)}
                            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border transition-colors ${buttonSecondaryClass}`}
                            aria-label={`Editar ativo ${asset.idAtivo || asset.id}`}
                          >
                            <Edit3 size={11} />
                            Editar Ativo
                          </button>
                          
                          <button 
                            onClick={() => router.push(`/inspecao/${asset.idAtivo || asset.id}`)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border border-emerald-500 shadow-sm transition-colors"
                            aria-label={`Realizar inspeção no ativo ${asset.idAtivo || asset.id}`}
                          >
                            <Eye size={11} />
                            Inspecionar
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

      {/* TUTORIAL MODAL POPUP */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 space-y-4 text-left font-sans shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-200">
                  Instruções da Ronda
                </h3>
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="text-slate-500 hover:text-slate-250 p-1"
                  aria-label="Fechar tutorial"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-450 leading-relaxed">
                <p>
                  1. **Selecione a Categoria:** Escolha o tipo de equipamento (Extintor, Hidrante, etc.) para visualizar os itens cadastrados.
                </p>
                <p>
                  2. **Leitura Física:** Clique em &quot;Ler QR Code&quot; e aponte a câmera para o selo laminado QR SPCI do equipamento para carregar a vistoria imediatamente.
                </p>
                <p>
                  3. **Novo Equipamento:** Caso o ativo seja novo e não possua QR Code ainda, clique em &quot;Novo Ativo&quot; para imputar as características e salvá-lo na base central.
                </p>
                <p>
                  4. **Fila Offline:** Suas ações de campo são gravadas mesmo sem internet e enviadas automaticamente na aba &quot;Sincronia&quot; quando você voltar à rede.
                </p>
              </div>

              <button 
                onClick={() => setShowTutorial(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold font-mono uppercase tracking-widest cursor-pointer border-none"
                aria-label="Entendido e fechar tutorial"
              >
                FECHAR TUTORIAL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
