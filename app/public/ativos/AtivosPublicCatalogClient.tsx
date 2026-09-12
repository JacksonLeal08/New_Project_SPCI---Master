'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Droplets,
  Sliders,
  Lightbulb,
  AlertTriangle,
  Search,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Calendar,
  Layers,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles
} from 'lucide-react';
import AppFooter from '@/app/components/AppFooter';

export interface CatalogAssetItem {
  id: string;
  idAtivo: string;
  category: string;
  model: string;
  location: string;
  subLocation?: string;
  status: string;
  statusEstoque?: string;
  validadeRecarga?: string;
  dataVencimentoTeste?: string;
  anoUltimoTesteHidro?: number;
  seloInmetro?: string;
  fotoUrl?: string;
}

interface Props {
  initialAssets: CatalogAssetItem[];
}

type CategoryFilter = 'TODOS' | 'extintores' | 'hidrantes' | 'bombas' | 'iluminacao' | 'sinalizacoes';

export default function AtivosPublicCatalogClient({ initialAssets }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('TODOS');

  const categoriesConfig = [
    {
      id: 'TODOS' as CategoryFilter,
      label: 'Todos os Ativos',
      count: initialAssets.length,
      icon: Layers,
      color: 'text-slate-200',
      activeBorder: 'border-slate-500 bg-slate-800/80',
    },
    {
      id: 'extintores' as CategoryFilter,
      label: 'Extintores',
      count: initialAssets.filter((a) => a.category?.toLowerCase().includes('extintor')).length,
      icon: Flame,
      color: 'text-red-500',
      activeBorder: 'border-red-500 bg-red-950/50',
    },
    {
      id: 'hidrantes' as CategoryFilter,
      label: 'Hidrantes & Abrigos',
      count: initialAssets.filter((a) => a.category?.toLowerCase().includes('hidrante')).length,
      icon: Droplets,
      color: 'text-sky-500',
      activeBorder: 'border-sky-500 bg-sky-950/50',
    },
    {
      id: 'bombas' as CategoryFilter,
      label: 'Casa de Bombas',
      count: initialAssets.filter((a) => a.category?.toLowerCase().includes('bomba')).length,
      icon: Sliders,
      color: 'text-emerald-500',
      activeBorder: 'border-emerald-500 bg-emerald-950/50',
    },
    {
      id: 'iluminacao' as CategoryFilter,
      label: 'Iluminação Emergência',
      count: initialAssets.filter((a) => a.category?.toLowerCase().includes('ilumina')).length,
      icon: Lightbulb,
      color: 'text-amber-500',
      activeBorder: 'border-amber-500 bg-amber-950/50',
    },
    {
      id: 'sinalizacoes' as CategoryFilter,
      label: 'Sinalização Rota',
      count: initialAssets.filter((a) => a.category?.toLowerCase().includes('sinaliza')).length,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      activeBorder: 'border-yellow-500 bg-yellow-950/50',
    },
  ];

  // Helper para verificar status vivo simplificado
  const checkStatusVivo = (asset: CatalogAssetItem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const raw = (asset.status || '').toUpperCase();
    if (raw.includes('NÃO CONFORME') || raw.includes('REPROVADO') || raw.includes('INTERDITADO') || raw.includes('VENCIDO')) {
      return { isVencido: true, label: 'NÃO CONFORME', color: 'text-red-400 bg-red-950/80 border-red-800' };
    }

    if (asset.validadeRecarga) {
      const dt = new Date(asset.validadeRecarga);
      if (dt < today) {
        return { isVencido: true, label: 'VENCIDO!', color: 'text-red-400 bg-red-950/80 border-red-800' };
      }
    }

    return { isVencido: false, label: 'CONFORME', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-700' };
  };

  // Filtragem dos ativos
  const filteredAssets = useMemo(() => {
    return initialAssets.filter((asset) => {
      // Filtro de Categoria
      if (selectedCategory !== 'TODOS') {
        const cat = (asset.category || '').toLowerCase();
        if (selectedCategory === 'extintores' && !cat.includes('extintor')) return false;
        if (selectedCategory === 'hidrantes' && !cat.includes('hidrante')) return false;
        if (selectedCategory === 'bombas' && !cat.includes('bomba')) return false;
        if (selectedCategory === 'iluminacao' && !cat.includes('ilumina')) return false;
        if (selectedCategory === 'sinalizacoes' && !cat.includes('sinaliza')) return false;
      }

      // Filtro de Busca Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const code = (asset.idAtivo || asset.id || '').toLowerCase();
        const model = (asset.model || '').toLowerCase();
        const loc = (asset.location || '').toLowerCase();
        const subLoc = (asset.subLocation || '').toLowerCase();
        const selo = (asset.seloInmetro || '').toLowerCase();
        return (
          code.includes(term) ||
          model.includes(term) ||
          loc.includes(term) ||
          subLoc.includes(term) ||
          selo.includes(term)
        );
      }

      return true;
    });
  }, [initialAssets, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono flex flex-col justify-between selection:bg-red-600 selection:text-white">
      
      {/* HEADER INSTITUCIONAL */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/public/ativos" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-700 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
            SPCI
          </div>
          <div>
            <span className="font-['Hanken_Grotesk'] text-base font-black uppercase tracking-wider text-white block">
              SPCI MASTER
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
              Portal Público de Visibilidade & Auditoria
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            href="/consulta"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all uppercase flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-red-500" />
            <span>Busca Direta</span>
          </Link>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 transition-all uppercase flex items-center gap-1.5"
          >
            <span>Área Técnica</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* HERO INSTITUCIONAL */}
      <section className="px-4 sm:px-8 pt-8 pb-4 max-w-7xl mx-auto w-full space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/60 border border-red-800/70 text-red-400 text-[10px] uppercase font-bold tracking-widest rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Equipamentos Operacionais em Campo (Na Área / Aplicado)
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase text-white font-['Hanken_Grotesk'] tracking-tight">
            Catálogo e Rastreabilidade Pública de Ativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-2xl leading-relaxed">
            Consulte a localização física, selo Inmetro, garantia de recarga e histórico de vistoria de qualquer equipamento de combate a incêndio ativo na planta.
          </p>
        </div>

        {/* BARRA DE PESQUISA RÁPIDA */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquise por Patrimônio (ex: EXT-01), Chassi, Modelo ou Setor..."
            className="w-full pl-12 pr-4 py-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-sm font-mono uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all shadow-xl"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white uppercase font-bold cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {/* SELETOR DE CATEGORIAS (CARDS INTERATIVOS BENTO) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {categoriesConfig.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 sm:p-4 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer backdrop-blur-md ${
                  isSelected
                    ? cat.activeBorder + ' shadow-lg scale-102'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-slate-300">
                    {cat.count}
                  </span>
                </div>
                <span className="text-xs font-black uppercase text-white font-mono tracking-tight line-clamp-1">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* GRID DE RESULTADOS DOS ATIVOS */}
      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full flex-1 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
          <span>
            Exibindo <strong className="text-white font-mono">{filteredAssets.length}</strong> equipamentos
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Atualização em Tempo Real
          </span>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-full bg-slate-900 text-slate-500 mx-auto flex items-center justify-center text-3xl">
              🔍
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-white font-mono">
                Nenhum ativo localizado
              </h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                Não encontramos equipamentos com os critérios de busca informados. Tente buscar por outro patrimônio ou setor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('TODOS');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer font-mono"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const status = checkStatusVivo(asset);
              const isExtintor = (asset.category || '').toLowerCase().includes('extintor');
              const isHidrante = (asset.category || '').toLowerCase().includes('hidrante');

              return (
                <div
                  key={asset.id}
                  className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 shadow-lg hover:shadow-2xl group relative overflow-hidden backdrop-blur-md"
                >
                  {/* Faixa lateral indicativa de status */}
                  <div
                    className={`absolute top-0 left-0 bottom-0 w-1 ${
                      status.isVencido ? 'bg-red-600' : 'bg-emerald-500'
                    }`}
                  />

                  <div className="space-y-3 pl-2">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {isExtintor ? (
                            <Flame className="w-4 h-4 text-red-500" />
                          ) : isHidrante ? (
                            <Droplets className="w-4 h-4 text-sky-500" />
                          ) : (
                            <Sliders className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block font-mono">
                            {asset.category}
                          </span>
                          <h4 className="text-base font-black text-white uppercase font-mono tracking-tight">
                            {asset.idAtivo}
                          </h4>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Modelo */}
                    <p className="text-xs font-bold text-slate-300 font-sans line-clamp-1">
                      {asset.model || 'Equipamento SPCI'}
                    </p>

                    {/* Localização */}
                    <div className="space-y-1 text-xs text-slate-400 font-sans">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="font-bold uppercase font-mono truncate">{asset.location}</span>
                      </div>
                      {asset.subLocation && (
                        <p className="text-[10px] text-slate-400 pl-5 truncate">
                          {asset.subLocation}
                        </p>
                      )}
                    </div>

                    {/* Selo / Validade */}
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block uppercase">Validade Carga</span>
                        <span className="font-bold text-slate-300">
                          {asset.validadeRecarga ? asset.validadeRecarga.substring(0, 10) : 'Conforme NBR'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase">Selo Inmetro</span>
                        <span className="font-bold text-slate-300 truncate block">
                          {asset.seloInmetro || 'NBR/ABNT'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ação: Ver Ficha Técnica */}
                  <Link
                    href={`/public/ativo/${encodeURIComponent(asset.idAtivo || asset.id)}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-red-600 hover:text-white border border-slate-800 hover:border-red-500 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Ver Ficha Técnica Completa</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER PÚBLICO */}
      <AppFooter variant="fixed" />
    </div>
  );
}
