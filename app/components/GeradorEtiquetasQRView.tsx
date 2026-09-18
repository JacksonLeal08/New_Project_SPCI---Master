'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSpci } from '@/app/context/SpciContext';
import { SITE_URL } from '@/config/seo';
import {
  Printer,
  QrCode,
  Filter,
  CheckSquare,
  Square,
  ArrowLeft,
  Search,
  Settings2,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Sparkles,
  Layers
} from 'lucide-react';
import { EtiquetaPreviewA4, AssetPrintItem } from './EtiquetaPreviewA4';
import { EtiquetaPreviewTermica } from './EtiquetaPreviewTermica';

type PrintFormat = 'a4_sheet' | 'thermal_50x50' | 'thermal_60x40';
type CategoryFilter = 'todos' | 'extintor' | 'hidrante' | 'bombas' | 'sinalizacao' | 'iluminacao';

export const GeradorEtiquetasQRView: React.FC = () => {
  const { extintores, hidrantes, bombas, sinalizacoes, iluminacoes } = useSpci();

  // Estados principais do Cockpit
  const [printFormat, setPrintFormat] = useState<PrintFormat>('a4_sheet');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Opções Visuais da Etiqueta
  const [showLogo, setShowLogo] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [highDensity, setHighDensity] = useState(false);

  // Estados do Simulador
  const [zoomLevel, setZoomLevel] = useState<number>(75);
  const [currentSheetPage, setCurrentSheetPage] = useState<number>(1);

  // Paginação da Tabela de Seleção
  const [tablePage, setTablePage] = useState<number>(1);
  const ITEMS_PER_TABLE_PAGE = 12;

  // Detecção de Origem do Sistema
  const [currentOrigin, setCurrentOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setCurrentOrigin(window.location.origin);
    }
  }, []);
  const activeOrigin = currentOrigin || SITE_URL || 'https://spci-master.vercel.app';

  // Consolidação universal de ativos de todos os módulos
  const allConsolidatedAssets: AssetPrintItem[] = useMemo(() => {
    const list: AssetPrintItem[] = [];

    // 1. Extintores
    (extintores || []).forEach((e: any) => {
      const code = e.idAtivo || e.patrimonio || e.numero_patrimonio || e.id;
      list.push({
        id: String(e.id || code),
        idAtivo: String(code),
        category: 'Extintor',
        model: e.model || e.modelo || 'Extintor PQS ABC',
        capacidade: e.peso_capacidade || (e.peso ? `${e.peso} KG` : '6 KG'),
        location: e.location || 'Planta Operacional',
        subLocation: e.subLocation || e.sub_location || '',
        seloInmetro: e.seloInmetro || e.selo_inmetro || '',
        chassi: e.chassi || e.numeroSerie || e.numero_serie || '',
        validade: e.validadeCarga || e.validadeTeste || 'Conforme'
      });
    });

    // 2. Hidrantes
    (hidrantes || []).forEach((h: any) => {
      const code = h.idAtivo || h.code || h.id;
      list.push({
        id: String(h.id || code),
        idAtivo: String(code),
        category: 'Hidrante',
        model: h.model || 'Abrigo de Hidrante',
        capacidade: h.capacidade || 'Mangueiras 15m',
        location: h.location || 'Área Operacional',
        subLocation: h.subLocation || h.sub_location || '',
        seloInmetro: 'NBR 13714',
        validade: h.status || 'Conforme'
      });
    });

    // 3. Bombas
    (bombas || []).forEach((b: any) => {
      const code = b.code || b.idAtivo || b.id;
      list.push({
        id: String(b.id || code),
        idAtivo: String(code),
        category: 'Bomba',
        model: b.name || b.modelo || 'Bomba de Incêndio',
        capacidade: b.range || b.power || '125 PSI',
        location: 'Casa de Bombas',
        subLocation: b.type || '',
        seloInmetro: 'NBR 13714',
        validade: b.status || 'Operacional'
      });
    });

    // 4. Sinalizações NBR
    (sinalizacoes || []).forEach((s: any) => {
      const code = s.idAtivo || s.code || s.id;
      list.push({
        id: String(s.id || code),
        idAtivo: String(code),
        category: 'Sinalização',
        model: s.tipo || s.model || 'Placa Fotoluminescente',
        capacidade: s.dimensoes || 'Padrão NBR 13434',
        location: s.location || 'Área Operacional',
        subLocation: s.subLocation || '',
        seloInmetro: 'NBR 13434',
        validade: s.status || 'Conforme'
      });
    });

    // 5. Iluminação de Emergência
    (iluminacoes || []).forEach((l: any) => {
      const code = l.idAtivo || l.code || l.id;
      list.push({
        id: String(l.id || code),
        idAtivo: String(code),
        category: 'Iluminação',
        model: l.model || l.systemType || 'Bloco Autônomo LED',
        capacidade: l.autonomy || '120 min',
        location: l.location || 'Área Operacional',
        subLocation: l.subLocation || '',
        seloInmetro: 'NBR 10898',
        validade: l.status || 'Operacional'
      });
    });

    return list;
  }, [extintores, hidrantes, bombas, sinalizacoes, iluminacoes]);

  // Contadores dinâmicos por categoria
  const categoryCounts = useMemo(() => {
    return {
      todos: allConsolidatedAssets.length,
      extintor: allConsolidatedAssets.filter(a => a.category === 'Extintor').length,
      hidrante: allConsolidatedAssets.filter(a => a.category === 'Hidrante').length,
      bombas: allConsolidatedAssets.filter(a => a.category === 'Bomba').length,
      sinalizacao: allConsolidatedAssets.filter(a => a.category === 'Sinalização').length,
      iluminacao: allConsolidatedAssets.filter(a => a.category === 'Iluminação').length,
    };
  }, [allConsolidatedAssets]);

  // Filtragem dos ativos disponíveis conforme categoria e busca
  const filteredAssets = useMemo(() => {
    return allConsolidatedAssets.filter((item) => {
      // Filtro de Categoria
      if (selectedCategory !== 'todos') {
        if (selectedCategory === 'extintor' && item.category !== 'Extintor') return false;
        if (selectedCategory === 'hidrante' && item.category !== 'Hidrante') return false;
        if (selectedCategory === 'bombas' && item.category !== 'Bomba') return false;
        if (selectedCategory === 'sinalizacao' && item.category !== 'Sinalização') return false;
        if (selectedCategory === 'iluminacao' && item.category !== 'Iluminação') return false;
      }

      // Filtro de Busca Textual
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        const code = (item.idAtivo || '').toLowerCase();
        const model = (item.model || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        const sub = (item.subLocation || '').toLowerCase();
        const chassi = (item.chassi || '').toLowerCase();
        const selo = (item.seloInmetro || '').toLowerCase();
        return code.includes(t) || model.includes(t) || loc.includes(t) || sub.includes(t) || chassi.includes(t) || selo.includes(t);
      }

      return true;
    });
  }, [allConsolidatedAssets, selectedCategory, searchTerm]);

  // Paginação da tabela de seleção
  const totalTablePages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_TABLE_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (tablePage - 1) * ITEMS_PER_TABLE_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_TABLE_PAGE);
  }, [filteredAssets, tablePage]);

  // Lista dos ativos efetivamente selecionados para impressão
  const selectedAssetsToPrint = useMemo(() => {
    const set = new Set(selectedIds);
    return allConsolidatedAssets.filter(a => set.has(a.id));
  }, [allConsolidatedAssets, selectedIds]);

  // Estado de seleção da página visível
  const isAllVisibleSelected = paginatedAssets.length > 0 && paginatedAssets.every(a => selectedIds.includes(a.id));

  const handleToggleSelectPage = () => {
    if (isAllVisibleSelected) {
      const pageIds = new Set(paginatedAssets.map(a => a.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedAssets.map(a => a.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredAssets.map(a => a.id);
    const newIds = new Set([...selectedIds, ...allFilteredIds]);
    setSelectedIds(Array.from(newIds));
  };

  const handleSelectConformes = () => {
    const conformesIds = filteredAssets
      .filter(a => {
        const st = (a.validade || '').toLowerCase();
        return st.includes('conforme') || st.includes('operacional') || st.includes('normal') || st.includes('standby');
      })
      .map(a => a.id);
    const newIds = new Set([...selectedIds, ...conformesIds]);
    setSelectedIds(Array.from(newIds));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleToggleSingleItem = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // Disparo de impressão de alta precisão
  const handlePrint = () => {
    if (selectedAssetsToPrint.length === 0) {
      alert('Selecione pelo menos um equipamento para imprimir as etiquetas.');
      return;
    }
    window.print();
  };

  // Cálculo de folhas A4 (24 etiquetas por folha)
  const totalSheetsA4 = Math.max(1, Math.ceil(selectedAssetsToPrint.length / 24));

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 py-6 font-mono select-none text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* =========================================================================
          ESTILOS DE IMPRESSÃO DE ALTA PRECISÃO (@media print)
      ========================================================================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printFormat === 'a4_sheet' ? 'A4 portrait' : printFormat === 'thermal_50x50' ? '50mm 50mm' : '60mm 40mm'};
            margin: ${printFormat === 'a4_sheet' ? '8mm' : '0mm'};
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Oculta todos os componentes de layout do cockpit */
          nav, aside, header, footer, .no-print, [data-no-print="true"] {
            display: none !important;
          }
          #spci-print-engine {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet-a4 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-thermal-item {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* =========================================================================
          BARRA SUPERIOR DE AÇÕES & BREADCRUMBS
      ========================================================================= */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <Link
            href="/extintores"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Painel de Extintores</span>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Hanken_Grotesk'] uppercase text-slate-900 dark:text-white">
                  Gerador e Emissor de Etiquetas QR Code
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-sans font-black bg-red-600 text-white rounded-full uppercase tracking-wider">
                  v2.4 Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Geração em lote com link universal (<span className="text-red-600 dark:text-red-400 font-mono font-bold">/scan/[ID]</span>) calibrado para folha A4 adesiva e bobina térmica.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Ação Primário no Topo Direito */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono hidden sm:block">
            <span className="text-[10px] uppercase text-slate-400 block font-bold">Total Selecionado</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {selectedAssetsToPrint.length} de {allConsolidatedAssets.length} ativos
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedAssetsToPrint.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-red-600/25 active:scale-95 disabled:cursor-not-allowed flex items-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir {selectedAssetsToPrint.length} Etiqueta(s)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          COCKPIT SUPERIOR DE CONFIGURAÇÕES (BENTO GRID HORIZONTAL)
      ========================================================================= */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-4 my-6">
        
        {/* CARD 1: FORMATO DE IMPRESSÃO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Formato de Impressão</span>
            </label>
            <span className="text-[9px] font-sans font-bold text-slate-400">Dimensão Física</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPrintFormat('a4_sheet')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                printFormat === 'a4_sheet'
                  ? 'bg-red-50 dark:bg-red-950/70 border-red-500 text-red-700 dark:text-white font-bold shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[11px] font-bold">Folha A4</span>
              <span className="text-[8.5px] text-slate-400 dark:text-slate-500">Grade 24un (3x8)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('thermal_50x50')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                printFormat === 'thermal_50x50'
                  ? 'bg-red-50 dark:bg-red-950/70 border-red-500 text-red-700 dark:text-white font-bold shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[11px] font-bold">Térmica</span>
              <span className="text-[8.5px] text-slate-400 dark:text-slate-500">50x50mm</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('thermal_60x40')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                printFormat === 'thermal_60x40'
                  ? 'bg-red-50 dark:bg-red-950/70 border-red-500 text-red-700 dark:text-white font-bold shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="text-[11px] font-bold">Térmica</span>
              <span className="text-[8.5px] text-slate-400 dark:text-slate-500">60x40mm</span>
            </button>
          </div>
        </div>

        {/* CARD 2: FILTRO POR CATEGORIA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Filtro por Categoria</span>
            </label>
            <span className="text-[9px] font-sans font-bold text-slate-400">Ativos no Sistema</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
            {(
              [
                { id: 'todos', label: 'Todos', count: categoryCounts.todos },
                { id: 'extintor', label: 'Extintor', count: categoryCounts.extintor },
                { id: 'hidrante', label: 'Hidrante', count: categoryCounts.hidrante },
                { id: 'bombas', label: 'Bombas', count: categoryCounts.bombas },
                { id: 'sinalizacao', label: 'Sinaliz.', count: categoryCounts.sinalizacao },
                { id: 'iluminacao', label: 'Ilumin.', count: categoryCounts.iluminacao }
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setTablePage(1);
                }}
                className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  selectedCategory === cat.id
                    ? 'bg-red-50 dark:bg-red-950/70 border-red-500 text-red-700 dark:text-white font-bold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] font-bold uppercase truncate">{cat.label}</span>
                <span className="text-[8.5px] opacity-70 font-mono">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* CARD 3: OPÇÕES VISUAIS DA ETIQUETA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Opções Visuais da Etiqueta</span>
            </label>
            <span className="text-[9px] font-sans font-bold text-slate-400">Customização</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="rounded accent-red-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-[10.5px] font-medium leading-none">Logo OMG / SPCI</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
                className="rounded accent-red-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-[10.5px] font-medium leading-none">Borda de Corte</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="rounded accent-red-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-[10.5px] font-medium leading-none">Incluir Chassi / Selo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={highDensity}
                onChange={(e) => setHighDensity(e.target.checked)}
                className="rounded accent-red-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-[10.5px] font-medium leading-none">QR Alta Densidade</span>
            </label>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAINEL DUPLO DE PRODUÇÃO (DUAL-PANE WORKSPACE)
      ========================================================================= */}
      <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* -------------------------------------------------------------
            PAINEL ESQUERDO: SELEÇÃO E FILTRO DE ATIVOS (55% / 7 Colunas)
        ------------------------------------------------------------- */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
          
          {/* Topo do Painel Esquerdo: Busca e Ações em Lote */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setTablePage(1);
                }}
                placeholder="Buscar por patrimônio, chassi, setor ou tipo..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs uppercase font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
              />
            </div>

            {/* Ações Rápidas em Lote */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSelectConformes}
                className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                title="Selecionar todos os ativos conformes/operacionais"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Conformes</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSelectPage}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isAllVisibleSelected ? <CheckSquare className="w-3.5 h-3.5 text-red-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>Página</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Todos ({filteredAssets.length})</span>
              </button>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                  title="Limpar seleção"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabela Responsiva de Ativos com Checkbox */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="max-h-[580px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={handleToggleSelectPage}
                        className="rounded accent-red-600 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Patrimônio / Código</th>
                    <th className="p-3">Tipo & Capacidade</th>
                    <th className="p-3">Setor / Sub-local</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {paginatedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-sans text-xs">
                        Nenhum ativo localizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedAssets.map((asset) => {
                      const isChecked = selectedIds.includes(asset.id);
                      const scanUrl = `${activeOrigin}/scan/${encodeURIComponent(asset.idAtivo)}`;
                      const miniQr = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(scanUrl)}`;

                      return (
                        <tr
                          key={asset.id}
                          onClick={() => handleToggleSingleItem(asset.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-red-50/70 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSingleItem(asset.id)}
                              className="rounded accent-red-600 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <strong className="text-slate-900 dark:text-white font-mono uppercase block text-xs">
                              {asset.idAtivo}
                            </strong>
                            <span className="text-[9.5px] text-slate-400 font-sans">
                              {asset.category}
                            </span>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                              {asset.model}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              {asset.capacidade}
                            </div>
                          </td>
                          <td className="p-3 max-w-[180px]">
                            <span className="block text-slate-800 dark:text-slate-200 uppercase font-semibold text-[10.5px] truncate">
                              {asset.location}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate block">
                              {asset.subLocation || 'Geral'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {asset.validade || 'Conforme'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="w-7 h-7 mx-auto bg-white p-0.5 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
                              <img
                                src={miniQr}
                                alt="QR"
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação da Tabela */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-sans">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Exibindo <strong>{paginatedAssets.length}</strong> de <strong>{filteredAssets.length}</strong> ativos
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="text-xs font-mono font-bold px-2">
                  {tablePage} / {totalTablePages}
                </span>
                <button
                  type="button"
                  disabled={tablePage >= totalTablePages}
                  onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Dica Operacional */}
          <div className="p-3 bg-sky-50 dark:bg-slate-950/70 border border-sky-100 dark:border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-700 dark:text-slate-400 font-sans">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <p className="text-[11px]">
              <strong>Dica de Impressão:</strong> Na caixa de diálogo do navegador (<kbd className="font-mono bg-white dark:bg-slate-900 px-1 border rounded">Ctrl + P</kbd>), desmarque <em>&quot;Cabeçalhos e rodapés&quot;</em> e selecione margem <em>&quot;Nenhuma&quot;</em>.
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------------
            PAINEL DIREITO: SIMULADOR EM TEMPO REAL DA FOLHA / ROLO (45% / 5 Colunas)
        ------------------------------------------------------------- */}
        <div className="xl:col-span-5 bg-slate-200/70 dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl border border-slate-300 dark:border-zinc-800 shadow-inner flex flex-col items-center overflow-y-auto max-h-[820px] space-y-4">
          
          {/* Barra de Controle do Simulador */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-300/80 dark:border-zinc-800 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-red-600" />
                <span>Simulador Realístico</span>
              </span>
              {printFormat === 'a4_sheet' && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-full font-bold">
                  {selectedAssetsToPrint.length} / 24 na folha
                </span>
              )}
            </div>

            {/* Controles de Zoom & Paginação de Folhas */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel(z => Math.max(50, z - 15))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
                <span className="px-1.5 text-[10px] font-mono font-bold">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(z => Math.min(110, z + 15))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              {printFormat === 'a4_sheet' && totalSheetsA4 > 1 && (
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg p-0.5">
                  <button
                    type="button"
                    disabled={currentSheetPage <= 1}
                    onClick={() => setCurrentSheetPage(p => Math.max(1, p - 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1">
                    {currentSheetPage}/{totalSheetsA4}
                  </span>
                  <button
                    type="button"
                    disabled={currentSheetPage >= totalSheetsA4}
                    onClick={() => setCurrentSheetPage(p => Math.min(totalSheetsA4, p + 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Renderização do Modelo de Impressão Ativo */}
          <div className="w-full flex justify-center py-2 overflow-x-auto">
            {printFormat === 'a4_sheet' ? (
              <EtiquetaPreviewA4
                assets={selectedAssetsToPrint}
                showLogo={showLogo}
                showBorder={showBorder}
                includeDetails={includeDetails}
                highDensity={highDensity}
                originUrl={activeOrigin}
                currentPage={currentSheetPage}
                zoom={zoomLevel}
              />
            ) : (
              <EtiquetaPreviewTermica
                assets={selectedAssetsToPrint}
                format={printFormat}
                showLogo={showLogo}
                showBorder={showBorder}
                includeDetails={includeDetails}
                highDensity={highDensity}
                originUrl={activeOrigin}
                zoom={zoomLevel}
              />
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTÊINER DE IMPRESSÃO GLOBAL (RENDERIZADO EXCLUSIVAMENTE NO @media print)
      ========================================================================= */}
      <div id="spci-print-engine" className="hidden print:block">
        {printFormat === 'a4_sheet' ? (
          <EtiquetaPreviewA4
            assets={selectedAssetsToPrint}
            showLogo={showLogo}
            showBorder={showBorder}
            includeDetails={includeDetails}
            highDensity={highDensity}
            originUrl={activeOrigin}
            currentPage={1}
            zoom={100}
          />
        ) : (
          <EtiquetaPreviewTermica
            assets={selectedAssetsToPrint}
            format={printFormat}
            showLogo={showLogo}
            showBorder={showBorder}
            includeDetails={includeDetails}
            highDensity={highDensity}
            originUrl={activeOrigin}
            zoom={100}
          />
        )}
      </div>
    </div>
  );
};
