'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink, Compass, Layers } from 'lucide-react';

interface InspectionMiniMapProps {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  assetPatrimonio?: string;
  tecnicoNome?: string;
  dataHora?: string;
  status?: string;
  className?: string;
}

export default function InspectionMiniMap({
  latitude,
  longitude,
  accuracy,
  assetPatrimonio = 'Ativo',
  tecnicoNome = 'Inspetor',
  dataHora,
  status = 'Conforme',
  className = 'h-64 sm:h-72 w-full'
}: InspectionMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [hasValidCoords, setHasValidCoords] = useState(false);

  const isValid = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);

  useEffect(() => {
    setHasValidCoords(isValid);
    if (!isValid || !mapContainerRef.current) return;

    let isMounted = true;

    import('leaflet').then((module) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = module.default;

      // Se já existe instância, limpa
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
        dragging: !L.Browser.mobile,
        touchZoom: true,
        scrollWheelZoom: false
      });

      mapInstanceRef.current = map;

      // Adiciona controles discretos
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile Layer inicial
      const tileUrl =
        mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

      // Cor do marcador
      const isConforme = status?.toLowerCase().includes('conforme') && !status?.toLowerCase().includes('não') && !status?.toLowerCase().includes('nao');
      const isCancelada = status?.toLowerCase().includes('cancel');
      const markerColor = isCancelada ? '#64748b' : (isConforme ? '#10b981' : '#ef4444');
      const pulseColor = isCancelada ? 'rgba(100,116,139,0.3)' : (isConforme ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)');

      // Raio de precisão GPS
      const radiusMeters = accuracy && accuracy > 0 ? Math.min(accuracy, 100) : 10;
      L.circle([latitude, longitude], {
        radius: radiusMeters,
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '3, 4',
        interactive: false
      }).addTo(map);

      // Marcador Customizado
      const pinHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
          <div style="position: absolute; width: 44px; height: 44px; background: ${pulseColor}; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; background: ${markerColor}; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'spci-inspection-pin',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; color: #0f172a; padding: 4px; line-height: 1.4;">
          <div style="font-weight: 800; color: #0284c7; font-size: 12px; margin-bottom: 2px;">📍 ${assetPatrimonio}</div>
          <div><b>Inspetor:</b> ${tecnicoNome}</div>
          <div><b>Status:</b> ${status}</div>
          ${accuracy ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Precisão GPS: ±${Math.round(accuracy)}m</div>` : ''}
        </div>
      `);

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isValid, latitude, longitude, accuracy, status, assetPatrimonio, tecnicoNome, mapType]);

  // Alternar camada do mapa
  const toggleMapType = () => {
    const nextType = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(nextType);
  };

  if (!isValid) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Geolocalização não registrada
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">
          Esta vistoria foi concluída sem captura automática de telemetria GPS ou foi registrada em modo retrospectivo/manual.
        </p>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Barra de controle sobreposta no topo */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-[400] pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[10.5px] font-mono shadow-md backdrop-blur-sm border border-slate-700/60 pointer-events-auto">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
          </span>
          {accuracy != null && (
            <span className="text-slate-400 text-[9.5px]">±{Math.round(accuracy)}m</span>
          )}
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={toggleMapType}
            title={mapType === 'streets' ? 'Mudar para Satélite' : 'Mudar para Mapa Vetorial'}
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-md backdrop-blur-sm text-xs transition"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Google Maps externo"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-md backdrop-blur-sm text-[10.5px] font-medium transition"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
