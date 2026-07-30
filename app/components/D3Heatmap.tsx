'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Filter, Activity } from 'lucide-react';

export interface SectorBreakdown {
  extintores: number;
  hidrantes: number;
  sinalizacoes: number;
  iluminacoes: number;
  bombas: number;
}

export interface SectorData {
  sector: string;
  nonConformingCount: number;
  conformingCount: number;
  totalCount: number;
  inspectedCount: number;
  inspectedPercent: number;
  breakdown: SectorBreakdown;
}

export interface D3SectorHeatmapProps {
  data: SectorData[];
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
}

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'Todos os Ativos', icon: '⚡' },
  { id: 'Extintor', label: 'Extintores', icon: '🧯' },
  { id: 'Hidrante', label: 'Hidrantes', icon: '🚰' },
  { id: 'Sinalização', label: 'Sinalização', icon: '⚠️' },
  { id: 'Iluminação', label: 'Iluminação', icon: '💡' },
  { id: 'Bomba', label: 'Bombas', icon: '⚙️' }
];

export const D3SectorHeatmap = ({ data, selectedCategory = 'ALL', onSelectCategory }: D3SectorHeatmapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!entries || entries.length === 0 || !svgRef.current) return;
      const { width } = entries[0].contentRect;
      const height = Math.max(380, data.length * 38);
      const margin = { top: 15, right: 30, bottom: 45, left: 160 };

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      if (innerWidth <= 0 || innerHeight <= 0) return;

      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const maxFalhas = d3.max(data, d => d.nonConformingCount) || 1;

      const xScale = d3.scaleLinear()
        .domain([0, Math.max(maxFalhas, 3)])
        .range([0, innerWidth]);

      const yScale = d3.scaleBand()
        .domain(data.map(d => d.sector))
        .range([0, innerHeight])
        .padding(0.25);

      // Paleta Cinematic Dark para mapa de calor
      const colorScale = d3.scaleLinear<string>()
        .domain([0, 1, 3])
        .range(['#064E3B', '#78350F', '#881337']);

      // Desenha as linhas do mapa térmico
      g.selectAll('.heatmap-bg-row')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-bg-row')
        .attr('x', 0)
        .attr('y', d => yScale(d.sector) || 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', d => colorScale(d.nonConformingCount))
        .attr('opacity', 0.85)
        .attr('stroke', '#334155')
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 1)
            .attr('stroke', '#F43F5E')
            .attr('stroke-width', 1.8);
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.85)
            .attr('stroke', '#334155')
            .attr('stroke-width', 0.8);
        });

      // Indicadores internos (níveis de falha com brilho)
      g.selectAll('.heatmap-progress-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-progress-bar')
        .attr('x', 0)
        .attr('y', d => (yScale(d.sector) || 0) + yScale.bandwidth() / 3)
        .attr('width', 0)
        .attr('height', yScale.bandwidth() / 3)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d => d.nonConformingCount > 0 ? '#F43F5E' : '#10B981')
        .attr('opacity', 0.95)
        .transition()
        .duration(700)
        .attr('width', d => xScale(d.nonConformingCount));

      // Rótulos do eixo Y (Nome do Setor)
      g.selectAll('.sector-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'font-mono font-black text-[10.5px] fill-slate-200 uppercase')
        .attr('x', -12)
        .attr('y', d => (yScale(d.sector) || 0) + yScale.bandwidth() / 2 + 3.5)
        .style('text-anchor', 'end')
        .text(d => d.sector);

      // Quantidade e Status de falhas / % Inspecionado
      g.selectAll('.status-text-val')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'font-mono font-extrabold text-[9.5px]')
        .attr('x', d => Math.max(xScale(d.nonConformingCount) + 12, 15))
        .attr('y', d => (yScale(d.sector) || 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('fill', d => d.nonConformingCount > 0 ? '#FDA4AF' : '#6EE7B7')
        .text(d => {
          const statusText = d.nonConformingCount > 0 ? `🛑 ${d.nonConformingCount} Falhas` : '🟢 100% OK';
          const inspec = `${d.inspectedCount}/${d.totalCount} Inspecionados (${d.inspectedPercent}%)`;
          return `${statusText} • ${inspec}`;
        });

      const xAxis = d3.axisBottom(xScale)
        .ticks(Math.max(maxFalhas, 3))
        .tickFormat(d3.format('d'));

      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .attr('class', 'font-mono text-[9px] fill-slate-400')
        .call(xAxis)
        .selectAll('.domain')
        .attr('stroke', '#475569');
    };

    let timeoutId: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.requestAnimationFrame(() => {
          handleResize(entries);
        });
      }, 120);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [data]);

  return (
    <div className="bg-slate-950/90 dark:bg-slate-950/95 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-2xl shadow-slate-950/80 space-y-6 text-slate-100 relative overflow-hidden">
      
      {/* Glow de Iluminação Superior (Cinematic Accent) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-650 via-rose-500 to-amber-500 rounded-t-3xl opacity-80" />

      {/* Cabeçalho com Filtros por Tipo de Ativo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800/80 gap-4 relative z-10">
        <div>
          <span className="text-[9.5px] bg-red-950/60 text-rose-400 font-extrabold uppercase font-mono px-3 py-1 rounded-lg border border-red-800/50 shadow-inner inline-flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> MAPEAMENTO TÉRMICO DE ZONAS DE RISCO
          </span>
          <h3 className="font-['Hanken_Grotesk'] font-black text-xl text-slate-100 mt-2 flex items-center gap-2 tracking-tight">
            🗺️ Mapa de Calor de Não Conformidade SPCI
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Grau de criticidade, inventário por tipo e cobertura de vistorias por setor da planta.
          </p>
        </div>

        {/* Chave de Legenda Glassmorphism */}
        <div className="flex items-center gap-3 text-[10px] font-sans font-bold text-slate-300 bg-slate-900/80 border border-slate-800/80 backdrop-blur-md px-3.5 py-2 rounded-xl self-start lg:self-auto shadow-inner">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-400 inline-block shadow-xs" aria-hidden="true"></span> Conforme
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-400 inline-block shadow-xs" aria-hidden="true"></span> 1 Falha
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-400 inline-block shadow-xs" aria-hidden="true"></span> Crítico
          </span>
        </div>
      </div>

      {/* BARRA DE FILTROS INTERATIVOS POR TIPO DE ATIVO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5 text-rose-500" /> Filtrar Tipo:
        </span>
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-[10.5px] font-bold tracking-wider font-sans transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-gradient-to-r from-red-650 to-rose-600 text-white border-red-500/60 shadow-lg shadow-red-950/50 ring-2 ring-red-500/30 font-black'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 border border-slate-800/80 backdrop-blur-xs font-bold'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* LISTA COMPLEMENTAR DE RESUMO POR SETOR (BENTO CARDS DE INVENTÁRIO & INSPEÇÕES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {data.map((item) => (
          <div key={item.sector} className="p-3.5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-md rounded-2xl space-y-2.5 transition-all shadow-inner">
            <div className="flex justify-between items-center">
              <span className="font-['Hanken_Grotesk'] font-black text-xs text-slate-100 uppercase tracking-wider truncate">
                📍 {item.sector}
              </span>
              <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">
                {item.totalCount} ativos
              </span>
            </div>

            {/* Badges de Contagem por Categoria */}
            <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-bold font-mono">
              <span className="bg-red-950/60 text-red-300 border border-red-900/50 px-1.5 py-0.5 rounded" title="Extintores">
                🧯 {item.breakdown.extintores}
              </span>
              <span className="bg-blue-950/60 text-blue-300 border border-blue-900/50 px-1.5 py-0.5 rounded" title="Hidrantes">
                𚰰 {item.breakdown.hidrantes}
              </span>
              <span className="bg-amber-950/60 text-amber-300 border border-amber-900/50 px-1.5 py-0.5 rounded" title="Sinalização">
                ⚠️ {item.breakdown.sinalizacoes}
              </span>
              <span className="bg-amber-950/60 text-amber-200 border border-amber-900/50 px-1.5 py-0.5 rounded" title="Iluminação">
                💡 {item.breakdown.iluminacoes}
              </span>
              <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-900/50 px-1.5 py-0.5 rounded" title="Bombas">
                ⚙️ {item.breakdown.bombas}
              </span>
            </div>

            {/* Barra de Progresso de Inspeções Realizadas no Mês */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold">
                <span className="text-slate-400 font-sans">Cobertura Vistorias Mês</span>
                <span className={item.inspectedPercent === 100 ? 'text-emerald-400 font-mono' : 'text-slate-300 font-mono'}>
                  {item.inspectedCount}/{item.totalCount} ({item.inspectedPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    item.inspectedPercent === 100 
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                      : item.inspectedPercent >= 50 
                        ? 'bg-blue-500 shadow-sm shadow-blue-500/50' 
                        : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                  }`}
                  style={{ width: `${item.inspectedPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Container D3 SVG */}
      <div ref={containerRef} className="w-full relative overflow-hidden pt-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-2">
        <svg ref={svgRef} className="mx-auto block overflow-visible" />
      </div>
    </div>
  );
};
