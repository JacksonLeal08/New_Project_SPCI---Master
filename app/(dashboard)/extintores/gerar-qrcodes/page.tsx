'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSpci } from '@/app/context/SpciContext';
import {
  Printer,
  QrCode,
  Filter,
  CheckSquare,
  Square,
  ArrowLeft,
  Flame,
  Droplets,
  Sliders,
  Layers,
  Search,
  Settings2,
  FileSpreadsheet,
  Download,
  Info
} from 'lucide-react';
import { SITE_URL } from '@/config/seo';

type LabelLayout = 'a4_sheet' | 'thermal_50x50' | 'thermal_60x40';

export default function GerarQrcodesPage() {
  const { extintores, hidrantes, bombas, userProfile } = useSpci();

  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'extintores' | 'hidrantes' | 'bombas'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [labelLayout, setLabelLayout] = useState<LabelLayout>('a4_sheet');
  const [showLogo, setShowLogo] = useState(true);
  const [showBorder, setShowBorder] = useState(true);

  // Consolidação dos ativos para emissão de etiquetas
  const allAssets = useMemo(() => {
    const list: any[] = [];

    (extintores || []).forEach((e: any) => {
      list.push({
        id: e.id,
        idAtivo: e.idAtivo || e.patrimonio || e.id,
        category: 'Extintor',
        model: e.model || 'Extintor PQS ABC',
        capacidade: e.peso_capacidade || (e.peso ? `${e.peso} KG` : 'Padrão'),
        location: e.location || 'Planta Operacional',
        subLocation: e.subLocation || e.sub_location || '',
        seloInmetro: e.seloInmetro || e.selo_inmetro || '',
      });
    });

    (hidrantes || []).forEach((h: any) => {
      list.push({
        id: h.id,
        idAtivo: h.idAtivo || h.id,
        category: 'Hidrante',
        model: 'Abrigo de Hidrante',
        capacidade: 'Mangueiras 15m / Esguicho',
        location: h.location || 'Área Operacional',
        subLocation: h.subLocation || '',
        seloInmetro: 'NBR 13714',
      });
    });

    (bombas || []).forEach((b: any) => {
      list.push({
        id: b.id,
        idAtivo: b.code || b.id,
        category: 'Bomba',
        model: b.name || 'Casa de Bombas',
        capacidade: b.range || b.power || '120 PSI',
        location: 'Casa de Bombas',
        subLocation: b.type || '',
        seloInmetro: 'NBR 13714',
      });
    });

    return list;
  }, [extintores, hidrantes, bombas]);

  // Filtragem dos ativos disponíveis
  const filteredAssets = useMemo(() => {
    return allAssets.filter((item) => {
      if (selectedCategory !== 'todos') {
        if (selectedCategory === 'extintores' && item.category !== 'Extintor') return false;
        if (selectedCategory === 'hidrantes' && item.category !== 'Hidrante') return false;
        if (selectedCategory === 'bombas' && item.category !== 'Bomba') return false;
      }

      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        const code = (item.idAtivo || '').toLowerCase();
        const model = (item.model || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        const sub = (item.subLocation || '').toLowerCase();
        return code.includes(t) || model.includes(t) || loc.includes(t) || sub.includes(t);
      }

      return true;
    });
  }, [allAssets, selectedCategory, searchTerm]);

  // Seleção de todos os visíveis
  const isAllSelected = filteredAssets.length > 0 && filteredAssets.every((a) => selectedIds.includes(a.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAssets.map((a) => a.id));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Ativos selecionados para emissão
  const assetsToPrint = useMemo(() => {
    if (selectedIds.length === 0) return [];
    return allAssets.filter((a) => selectedIds.includes(a.id));
  }, [allAssets, selectedIds]);

  const handlePrint = () => {
    if (assetsToPrint.length === 0) {
      alert('Selecione pelo menos um equipamento para imprimir as etiquetas.');
      return;
    }
    window.print();
  };

  const [currentOrigin, setCurrentOrigin] = useState('');
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const activeOrigin = currentOrigin || SITE_URL || 'https://spci-master.vercel.app';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono transition-colors duration-200">
      
      {/* -------------------------------------------------------------
          PAINEL DE CONTROLES (OCULTO NA IMPRESSÃO)
      ------------------------------------------------------------- */}
      <div className="no-print print:hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Link
              href="/extintores"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Extintores</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white font-['Hanken_Grotesk'] tracking-tight flex items-center gap-3">
              <QrCode className="w-7 h-7 text-red-600 dark:text-red-500" />
              <span>Gerador e Emissor de Etiquetas QR Code</span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans max-w-xl">
              Gere etiquetas com QR Code Universal (<strong className="text-red-600 dark:text-slate-200 font-mono">/scan/[ID]</strong>) prontas para impressão direta em folha A4 adesiva ou bobina térmica.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              disabled={assetsToPrint.length === 0}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {assetsToPrint.length} Etiqueta(s)</span>
            </button>
          </div>
        </div>

        {/* Barra de Opções e Configuração da Etiqueta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Seletor de Formato */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none space-y-2.5 transition-colors">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span>Formato de Impressão</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLabelLayout('a4_sheet')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  labelLayout === 'a4_sheet'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/70 dark:border-red-600 dark:text-white font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="block text-[11px] font-bold">Folha A4</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Grade 24un</span>
              </button>

              <button
                type="button"
                onClick={() => setLabelLayout('thermal_50x50')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  labelLayout === 'thermal_50x50'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/70 dark:border-red-600 dark:text-white font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="block text-[11px] font-bold">Térmica</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">50x50mm</span>
              </button>

              <button
                type="button"
                onClick={() => setLabelLayout('thermal_60x40')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  labelLayout === 'thermal_60x40'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/70 dark:border-red-600 dark:text-white font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="block text-[11px] font-bold">Térmica</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">60x40mm</span>
              </button>
            </div>
          </div>

          {/* Filtro por Categoria */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none space-y-2.5 transition-colors">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-500" />
              <span>Filtrar por Categoria</span>
            </label>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'extintores', label: 'Extintor' },
                { id: 'hidrantes', label: 'Hidrante' },
                { id: 'bombas', label: 'Bombas' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id as any)}
                  className={`py-2 px-1 rounded-xl border text-center text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${
                    selectedCategory === c.id
                      ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/70 dark:border-red-600 dark:text-white font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ajustes Visuais da Etiqueta */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none space-y-2.5 flex flex-col justify-between transition-colors">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              <span>Opções Visuais da Etiqueta</span>
            </label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="rounded accent-red-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Exibir Logo SPCI</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                  className="rounded accent-red-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-medium">Borda de Corte</span>
              </label>
            </div>
          </div>
        </div>

        {/* Barra de Busca e Seleção Rápida */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm dark:shadow-none transition-colors">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, setor ou modelo..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs uppercase font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:bg-white dark:focus:bg-slate-950 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-red-600 dark:text-red-500" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{isAllSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedIds.length}</strong> de {filteredAssets.length} selecionados
            </span>
          </div>
        </div>

        {/* Tabela de Seleção Individual */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors">
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAssets.map((asset) => {
              const isChecked = selectedIds.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => handleToggleItem(asset.id)}
                  className={`p-3 sm:px-4 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    isChecked ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded accent-red-600 w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-white font-mono uppercase">{asset.idAtivo}</strong>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {asset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate">{asset.model}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="block text-slate-800 dark:text-slate-200 uppercase font-semibold">{asset.location}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{asset.subLocation || 'GERAL'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dica de Impressão */}
        <div className="p-4 bg-sky-50 dark:bg-slate-900/60 border border-sky-100 dark:border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-700 dark:text-slate-400 font-sans transition-colors">
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <p>
            <strong>Dica de Impressão:</strong> Na caixa de diálogo de impressão do navegador, desmarque a opção <em>&quot;Cabeçalhos e rodapés&quot;</em> e configure as margens como <em>&quot;Nenhuma&quot;</em> para obter o alinhamento perfeito.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------
          ÁREA IMPRESSA / PREVIEW DE ETIQUETAS (PRINT ENGINE)
      ------------------------------------------------------------- */}
      <div className="p-4 sm:p-8 bg-slate-200/70 dark:bg-slate-950 print:bg-white print:p-0 print:m-0 text-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
        
        {/* LAYOUT 1: FOLHA A4 (Grade de 3 Colunas x 8 Linhas) */}
        {labelLayout === 'a4_sheet' && (
          <div className="max-w-[210mm] mx-auto bg-white p-[8mm] shadow-xl border border-slate-200 dark:border-none rounded-none print:shadow-none print:p-0 print:max-w-none print:w-full print:border-none">
            <div className="grid grid-cols-3 gap-x-[3mm] gap-y-[3mm]">
              {assetsToPrint.map((asset, index) => {
                const scanUrl = `${activeOrigin}/scan/${encodeURIComponent(asset.idAtivo)}`;
                const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(scanUrl)}`;

                return (
                  <div
                    key={`${asset.id}-${index}`}
                    className={`h-[33.9mm] p-2 flex items-center justify-between gap-2 overflow-hidden bg-white text-black font-mono ${
                      showBorder ? 'border border-dashed border-slate-300 print:border-slate-400' : 'border-0'
                    }`}
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    {/* QR Code */}
                    <div className="w-[28mm] h-[28mm] shrink-0 flex items-center justify-center">
                      <img
                        src={qrImgSrc}
                        alt={`QR ${asset.idAtivo}`}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Informações da Etiqueta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 leading-tight">
                      {showLogo && (
                        <div className="flex items-center justify-between border-b border-black pb-0.5">
                          <span className="text-[7.5px] font-black uppercase tracking-wider">SPCI MASTER</span>
                          <span className="text-[6.5px] font-bold uppercase text-slate-600">AUDITORIA NBR</span>
                        </div>
                      )}

                      <div className="my-auto space-y-0.5">
                        <span className="text-[12px] font-black uppercase tracking-tight block truncate font-mono">
                          {asset.idAtivo}
                        </span>
                        <p className="text-[8px] font-bold uppercase text-slate-800 line-clamp-1">
                          {asset.model}
                        </p>
                        <p className="text-[7.5px] text-slate-600 uppercase truncate">
                          {asset.location}
                        </p>
                      </div>

                      <div className="text-[6px] uppercase font-bold text-slate-500 border-t border-slate-200 pt-0.5 flex justify-between">
                        <span>ESCANEIE P/ VISTORIA</span>
                        <span>{asset.capacidade}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LAYOUT 2: BOBINA TÉRMICA 50x50mm */}
        {labelLayout === 'thermal_50x50' && (
          <div className="max-w-[50mm] mx-auto space-y-4 print:space-y-0 print:max-w-none print:w-full">
            {assetsToPrint.map((asset, index) => {
              const scanUrl = `${activeOrigin}/scan/${encodeURIComponent(asset.idAtivo)}`;
              const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanUrl)}`;

              return (
                <div
                  key={`${asset.id}-${index}`}
                  className={`w-[50mm] h-[50mm] p-2 bg-white text-black font-mono flex flex-col justify-between items-center text-center mx-auto ${
                    showBorder ? 'border border-slate-400' : 'border-0'
                  }`}
                  style={{ pageBreakAfter: 'always' }}
                >
                  {showLogo && (
                    <div className="w-full flex items-center justify-between border-b border-black pb-0.5">
                      <span className="text-[8px] font-black uppercase">SPCI MASTER</span>
                      <span className="text-[7px] font-bold uppercase">NBR 12962</span>
                    </div>
                  )}

                  <div className="w-[26mm] h-[26mm] my-auto">
                    <img
                      src={qrImgSrc}
                      alt={`QR ${asset.idAtivo}`}
                      className="w-full h-full object-contain mx-auto"
                    />
                  </div>

                  <div className="w-full space-y-0.5 leading-none">
                    <span className="text-[13px] font-black uppercase tracking-tight block">
                      {asset.idAtivo}
                    </span>
                    <p className="text-[8px] font-bold uppercase text-slate-800 truncate">
                      {asset.model} - {asset.capacidade}
                    </p>
                    <p className="text-[7.5px] text-slate-600 uppercase truncate">
                      {asset.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LAYOUT 3: BOBINA TÉRMICA 60x40mm */}
        {labelLayout === 'thermal_60x40' && (
          <div className="max-w-[60mm] mx-auto space-y-4 print:space-y-0 print:max-w-none print:w-full">
            {assetsToPrint.map((asset, index) => {
              const scanUrl = `${activeOrigin}/scan/${encodeURIComponent(asset.idAtivo)}`;
              const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;

              return (
                <div
                  key={`${asset.id}-${index}`}
                  className={`w-[60mm] h-[40mm] p-2 bg-white text-black font-mono flex items-center justify-between gap-2 mx-auto ${
                    showBorder ? 'border border-slate-400' : 'border-0'
                  }`}
                  style={{ pageBreakAfter: 'always' }}
                >
                  <div className="w-[28mm] h-[28mm] shrink-0">
                    <img
                      src={qrImgSrc}
                      alt={`QR ${asset.idAtivo}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 leading-tight">
                    {showLogo && (
                      <div className="flex items-center justify-between border-b border-black pb-0.5">
                        <span className="text-[8px] font-black uppercase">SPCI MASTER</span>
                        <span className="text-[7px] font-bold uppercase">NBR 12962</span>
                      </div>
                    )}

                    <div className="my-auto space-y-0.5">
                      <span className="text-[12px] font-black uppercase tracking-tight block truncate">
                        {asset.idAtivo}
                      </span>
                      <p className="text-[8px] font-bold uppercase text-slate-800 truncate">
                        {asset.model}
                      </p>
                      <p className="text-[7.5px] text-slate-600 uppercase truncate">
                        {asset.location}
                      </p>
                    </div>

                    <div className="text-[6.5px] uppercase font-bold text-slate-500 border-t border-slate-200 pt-0.5 flex justify-between">
                      <span>ESCANEIE</span>
                      <span>{asset.capacidade}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
