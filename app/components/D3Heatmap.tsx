'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SectorData {
  sector: string;
  nonConformingCount: number;
  conformingCount: number;
  totalCount: number;
}

interface D3SectorHeatmapProps {
  data: SectorData[];
}

export const D3SectorHeatmap = ({ data }: D3SectorHeatmapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    // Limpa desenhos antigos
    d3.select(svgRef.current).selectAll('*').remove();

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!entries || entries.length === 0 || !svgRef.current) return;
      const { width } = entries[0].contentRect;
      const height = 360;
      const margin = { top: 15, right: 30, bottom: 45, left: 140 };

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
        .padding(0.2);

      const colorScale = d3.scaleLinear<string>()
        .domain([0, 1, 3])
        .range(['#E8F5E9', '#FFE082', '#FFCDD2']);

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
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.95)
            .attr('stroke', '#af101a')
            .attr('stroke-width', 1.5);
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.8)
            .attr('stroke', 'none');
        });

      // Indicadores internos (níveis de falha)
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
        .attr('fill', d => d.nonConformingCount > 0 ? '#b71c1c' : '#2e7d32')
        .attr('opacity', 0.85)
        .transition()
        .duration(800)
        .attr('width', d => xScale(d.nonConformingCount));

      // Rótulos do eixo Y
      g.selectAll('.sector-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'font-sans font-black text-[10px] fill-slate-700')
        .attr('x', -12)
        .attr('y', d => (yScale(d.sector) || 0) + yScale.bandwidth() / 2 + 3.5)
        .style('text-anchor', 'end')
        .text(d => d.sector);

      // Quantidade e Status de falhas
      g.selectAll('.status-text-val')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'font-mono font-bold text-[10px]')
        .attr('x', d => Math.max(xScale(d.nonConformingCount) + 10, 15))
        .attr('y', d => (yScale(d.sector) || 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('fill', d => d.nonConformingCount > 0 ? '#c62828' : '#2e7d32')
        .text(d => d.nonConformingCount > 0 ? `🛑 ${d.nonConformingCount} Falhas` : '🟢 100% OK');

      const xAxis = d3.axisBottom(xScale)
        .ticks(Math.max(maxFalhas, 3))
        .tickFormat(d3.format('d'));

      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .attr('class', 'font-mono text-[9px] text-slate-400')
        .call(xAxis)
        .selectAll('.domain')
        .attr('stroke', '#E2E8F0');
    };

    // ResizeObserver debocado (evita travar thread principal em dispositivos móveis)
    let timeoutId: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.requestAnimationFrame(() => {
          handleResize(entries);
        });
      }, 150);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [data]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-2 mb-4">
        <div>
          <span className="text-[10px] bg-red-100 hover:bg-red-200 text-rose-800 font-extrabold uppercase font-mono px-2 py-0.5 rounded border border-red-200">
            Mapeamento Térmico de Zonas de Risco
          </span>
          <h3 className="font-['Hanken_Grotesk'] font-black text-lg text-slate-800 mt-1">
            🗺️ Mapa de Calor de Não Conformidade SPCI
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Grau de criticidade e falha periódica indexados em tempo real por setor da planta.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-sans font-bold text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8F5E9] inline-block border" aria-hidden="true"></span> OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFE082] inline-block border" aria-hidden="true"></span> 1 Falha
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFCDD2] inline-block border" aria-hidden="true"></span> Crítico
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative overflow-hidden">
        <svg ref={svgRef} className="mx-auto block overflow-visible" />
      </div>
    </div>
  );
};
