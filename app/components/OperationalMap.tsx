'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, RefreshCw, ZoomIn, ZoomOut, Compass } from 'lucide-react';

export interface MapAssetItem {
  id: string;
  idAtivo: string;
  patrimonio?: string;
  category: string;
  model: string;
  location: string;
  subLocation?: string;
  status: string;
  status_estoque?: string;
  tipo_movimentacao?: string;
  latitude: number;
  longitude: number;
  precisao_gps?: number | null;
  data_ultima_localizacao?: string;
  origem_localizacao?: string;
  foto_url?: string | null;
}

interface OperationalMapProps {
  assets: MapAssetItem[];
  selectedAssetId?: string | null;
  onSelectAssetForHistory: (asset: MapAssetItem) => void;
  className?: string;
}

export default function OperationalMap({
  assets,
  selectedAssetId,
  onSelectAssetForHistory,
  className = 'h-[600px] w-full'
}: OperationalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<'osm' | 'dark' | 'sat'>('dark');

  // Determinar cor do pino baseado no status e tipo de movimentação
  const getMarkerColor = (asset: MapAssetItem) => {
    const status = String(asset.status || '').toLowerCase();
    const tipoMov = String(asset.tipo_movimentacao || '').toLowerCase();

    if (tipoMov === 'estoque_aplicacao' || tipoMov.includes('estoque')) {
      return { bg: '#2563eb', border: '#60a5fa', text: '#ffffff', label: 'Estoque' }; // Azul
    }
    if (status.includes('manuten') || tipoMov === 'em_manutencao') {
      return { bg: '#ea580c', border: '#fb923c', text: '#ffffff', label: 'Manutenção' }; // Laranja
    }
    if (status.includes('vencid') || status.includes('não conforme') || status.includes('nao conforme') || status.includes('falha') || status.includes('condenad')) {
      return { bg: '#dc2626', border: '#f87171', text: '#ffffff', label: 'Vencido/Crítico' }; // Vermelho
    }
    if (status.includes('atenção') || status.includes('atencao') || status.includes('a vencer') || status.includes('ag_manut')) {
      return { bg: '#d97706', border: '#fbbf24', text: '#ffffff', label: 'A Vencer/Atenção' }; // Amarelo/Âmbar
    }
    return { bg: '#059669', border: '#34d399', text: '#ffffff', label: 'Conforme/Operacional' }; // Verde
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'extintores': return '🧯';
      case 'hidrantes': return '💧';
      case 'sinalizacoes': return '⚠️';
      case 'iluminacao': return '💡';
      case 'bombas': return '⚙️';
      default: return '📍';
    }
  };

  // Inicialização do mapa Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Ponto central padrão caso não haja ativos
      const defaultCenter: [number, number] = assets.length > 0 && assets[0].latitude && assets[0].longitude
        ? [assets[0].latitude, assets[0].longitude]
        : [-23.5505, -46.6333];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // Camadas de Tile
      const tileUrls = {
        osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      };

      const tileLayer = L.tileLayer(tileUrls[currentTileLayer], {
        maxZoom: 19
      }).addTo(map);

      // LayerGroup para markers
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Adicionar controle de zoom customizado no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Troca dinâmica de camada do mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const tileUrls = {
      osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    import('leaflet').then((module) => {
      const L = module.default;
      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      L.tileLayer(tileUrls[currentTileLayer], { maxZoom: 19 }).addTo(map);
    });
  }, [currentTileLayer]);

  // Atualização dos marcadores ao mudar a lista de ativos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    import('leaflet').then((module) => {
      const L = module.default;
      const markersGroup = markersLayerRef.current;
      const map = mapInstanceRef.current;

      markersGroup.clearLayers();

      const validAssets = assets.filter(
        a => a.latitude != null && a.longitude != null && !isNaN(a.latitude) && !isNaN(a.longitude)
      );

      if (validAssets.length === 0) return;

      const bounds = L.latLngBounds([]);

      validAssets.forEach((asset) => {
        const coords: [number, number] = [asset.latitude, asset.longitude];
        bounds.extend(coords);

        const color = getMarkerColor(asset);
        const iconChar = getCategoryIcon(asset.category);
        const isSelected = selectedAssetId === asset.id || selectedAssetId === asset.idAtivo;

        // Custom Pin HTML com Tailwind e efeito pulsante no selecionado
        const customHtml = `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -100%);">
            ${isSelected ? '<div class="absolute -inset-2 bg-white/40 rounded-full animate-ping pointer-events-none"></div>' : ''}
            <div style="
              background: ${color.bg};
              border: 2px solid ${color.border};
              color: ${color.text};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px rgba(0,0,0,0.45);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="transform: rotate(45deg); font-size: 15px; user-select: none;">
                ${iconChar}
              </span>
            </div>
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 8px;
              height: 4px;
              background: rgba(0,0,0,0.5);
              border-radius: 50%;
              filter: blur(1px);
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: customHtml,
          className: 'spci-custom-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        const marker = L.marker(coords, { icon: customIcon });

        // Popup HTML formatado no estilo dark corporativo
        const popupContent = document.createElement('div');
        popupContent.className = 'spci-map-popup font-mono text-slate-900 dark:text-slate-100 p-1 select-none';
        popupContent.innerHTML = `
          <div style="min-width: 220px; font-family: ui-monospace, monospace;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
                ${asset.idAtivo || asset.patrimonio || asset.id}
              </span>
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 9999px; font-weight: 700; background: ${color.bg}; color: #ffffff;">
                ${asset.status || 'Ativo'}
              </span>
            </div>

            <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">
              ${asset.model || 'Equipamento SPCI'}
            </div>

            <div style="font-size: 9.5px; color: #64748b; margin-bottom: 6px; line-height: 1.3;">
              📍 <strong>Local:</strong> ${asset.location} ${asset.subLocation ? ` - ${asset.subLocation}` : ''}
            </div>

            ${asset.precisao_gps ? `
              <div style="font-size: 9px; color: #059669; margin-bottom: 6px;">
                🛰️ <strong>Precisão:</strong> ±${asset.precisao_gps}m (${asset.origem_localizacao || 'GPS'})
              </div>
            ` : ''}

            ${asset.foto_url ? `
              <div style="margin-bottom: 8px; border-radius: 6px; overflow: hidden; max-height: 90px; border: 1px solid #cbd5e1;">
                <img src="${asset.foto_url}" style="width: 100%; height: 90px; object-fit: cover;" alt="Foto do ativo" />
              </div>
            ` : ''}

            <button id="btn-history-${asset.id}" style="
              width: 100%;
              padding: 6px 8px;
              background: #0f172a;
              color: #ffffff;
              border: 1px solid #334155;
              border-radius: 8px;
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">
              📜 Ver Histórico de Deslocamento
            </button>
          </div>
        `;

        // Event listener no botão dentro do popup
        const historyBtn = popupContent.querySelector(`#btn-history-${asset.id}`);
        if (historyBtn) {
          historyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectAssetForHistory(asset);
          });
        }

        marker.bindPopup(popupContent, { maxWidth: 280 });
        markersGroup.addLayer(marker);
      });

      // Ajustar visualização para a bounding box dos ativos
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 17
        });
      }
    });
  }, [assets, selectedAssetId, onSelectAssetForHistory]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      {/* Contêiner Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Seletor Flutuante de Camadas (OSM / Satélite / Dark) */}
      <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg text-xs font-mono">
        <button
          type="button"
          onClick={() => setCurrentTileLayer('dark')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            currentTileLayer === 'dark'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Noturno
        </button>
        <button
          type="button"
          onClick={() => setCurrentTileLayer('sat')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            currentTileLayer === 'sat'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Satélite
        </button>
        <button
          type="button"
          onClick={() => setCurrentTileLayer('osm')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            currentTileLayer === 'osm'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Rua (OSM)
        </button>
      </div>

      {/* Legenda Flutuante (SPCI Pins) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-lg text-[10px] font-mono text-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          <span>Conforme</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
          <span>A Vencer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />
          <span>Vencido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
          <span>Estoque</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-500/20" />
          <span>Manutenção</span>
        </div>
      </div>
    </div>
  );
}
