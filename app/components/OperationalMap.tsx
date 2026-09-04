'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, RefreshCw, ZoomIn, ZoomOut, Compass, Crosshair, Navigation } from 'lucide-react';

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
  onUpdateAssetLocation?: (asset: MapAssetItem, coords: { latitude: number; longitude: number; accuracy: number }) => Promise<void> | void;
  className?: string;
}

export default function OperationalMap({
  assets,
  selectedAssetId,
  onSelectAssetForHistory,
  onUpdateAssetLocation,
  className = 'h-[600px] w-full'
}: OperationalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<'hybrid' | 'streets' | 'dark'>('hybrid');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

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
    return { bg: '#10b981', border: '#34d399', text: '#ffffff', label: 'Conforme' }; // Verde Padrão
  };

  // Ícones por categoria
  const getCategoryIcon = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('extintor')) return '🧯';
    if (c.includes('hidrante')) return '💧';
    if (c.includes('sinaliza')) return '⚠️';
    if (c.includes('ilumina')) return '💡';
    if (c.includes('bomba')) return '🔧';
    return '🛡️';
  };

  // Localizar dispositivo do usuário
  const locateUser = (centerMap = true) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn('Geolocalização não suportada no navegador');
      return;
    }

    setLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 10;
        setUserCoords({ latitude: lat, longitude: lng, accuracy });

        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        import('leaflet').then((module) => {
          const L = module.default;
          if (userLocationLayerRef.current) {
            userLocationLayerRef.current.clearLayers();
          } else {
            userLocationLayerRef.current = L.layerGroup().addTo(map);
          }

          // Círculo de precisão semitransparente
          const circle = L.circle([lat, lng], {
            radius: Math.max(accuracy, 12),
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.18,
            weight: 1.5,
            dashArray: '3, 4'
          });

          // Marcador pulsante azul
          const userPulseHtml = `
            <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
              <div style="position: absolute; width: 32px; height: 32px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 16px; height: 16px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5); position: relative; z-index: 10;"></div>
            </div>
          `;

          const userIcon = L.divIcon({
            html: userPulseHtml,
            className: 'spci-user-location-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 });
          marker.bindPopup(`
            <div style="font-family: ui-monospace, monospace; padding: 4px; font-size: 11px; text-align: center; color: #0f172a;">
              <span style="font-weight: 800; color: #2563eb; display: block; font-size: 12px;">📍 VOCÊ ESTÁ AQUI</span>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">
                Precisão do Dispositivo: ±${Math.round(accuracy)}m
              </div>
            </div>
          `);

          userLocationLayerRef.current.addLayer(circle);
          userLocationLayerRef.current.addLayer(marker);

          if (centerMap) {
            map.flyTo([lat, lng], 17, { duration: 1.2 });
          }
        });
      },
      (err) => {
        console.warn('Erro ao obter geolocalização do operador:', err.message);
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 20000 }
    );
  };

  // Inicialização do Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      const validAssets = assets.filter(
        a => a.latitude != null && a.longitude != null && !isNaN(a.latitude) && !isNaN(a.longitude)
      );

      const defaultCenter: [number, number] = validAssets.length > 0
        ? [validAssets[0].latitude, validAssets[0].longitude]
        : [-23.5505, -46.6333];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // Camadas de Tile Google Maps e Noturno
      const tileConfigs: Record<'hybrid' | 'streets' | 'dark', { url: string; subdomains: string[]; maxZoom: number; className?: string }> = {
        hybrid: {
          url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          maxZoom: 20,
          className: ''
        },
        streets: {
          url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          maxZoom: 20,
          className: ''
        },
        dark: {
          url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          maxZoom: 20,
          className: 'spci-dark-tiles'
        }
      };

      const initialConfig = tileConfigs[currentTileLayer];
      L.tileLayer(initialConfig.url, {
        subdomains: initialConfig.subdomains,
        maxZoom: initialConfig.maxZoom,
        className: initialConfig.className || ''
      }).addTo(map);

      // LayerGroup para markers e para user location
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      const userLocGroup = L.layerGroup().addTo(map);
      userLocationLayerRef.current = userLocGroup;

      mapInstanceRef.current = map;

      // Adicionar controle de zoom customizado no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      setMapReady(true);

      // Auto-localização suave do usuário
      locateUser(validAssets.length === 0);
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

    const tileConfigs: Record<'hybrid' | 'streets' | 'dark', { url: string; subdomains: string[]; maxZoom: number; className?: string }> = {
      hybrid: {
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        className: ''
      },
      streets: {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        className: ''
      },
      dark: {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        className: 'spci-dark-tiles'
      }
    };

    import('leaflet').then((module) => {
      const L = module.default;
      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      const activeConfig = tileConfigs[currentTileLayer];
      L.tileLayer(activeConfig.url, {
        subdomains: activeConfig.subdomains,
        maxZoom: activeConfig.maxZoom,
        className: activeConfig.className || ''
      }).addTo(map);
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
          <div style="min-width: 230px; font-family: ui-monospace, monospace; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
                ${asset.idAtivo || asset.patrimonio || asset.id}
              </span>
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 9999px; font-weight: 700; background: ${color.bg}; color: #ffffff;">
                ${asset.status || 'Ativo'}
              </span>
            </div>

            <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
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

            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
              <button id="btn-update-gps-${asset.id}" style="
                width: 100%;
                padding: 7px 8px;
                background: #2563eb;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
              ">
                🎯 Fixar Minha Posição Neste Ativo
              </button>

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
          </div>
        `;

        // Event listener no botão de Histórico
        const historyBtn = popupContent.querySelector(`#btn-history-${asset.id}`);
        if (historyBtn) {
          historyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectAssetForHistory(asset);
          });
        }

        // Event listener no botão de Fixar Posição GPS Atual
        const updateGpsBtn = popupContent.querySelector(`#btn-update-gps-${asset.id}`) as HTMLButtonElement | null;
        if (updateGpsBtn && onUpdateAssetLocation) {
          updateGpsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            updateGpsBtn.disabled = true;
            updateGpsBtn.innerHTML = '🛰️ Obtendo Coordenadas...';

            const proceedWithCoords = async (coords: { latitude: number; longitude: number; accuracy: number }) => {
              try {
                updateGpsBtn.innerHTML = '💾 Gravando no Sistema...';
                await onUpdateAssetLocation(asset, coords);
                updateGpsBtn.innerHTML = '✅ Posição Atualizada!';
                updateGpsBtn.style.background = '#16a34a';
                setTimeout(() => {
                  marker.closePopup();
                }, 1200);
              } catch (err) {
                console.error(err);
                updateGpsBtn.disabled = false;
                updateGpsBtn.innerHTML = '❌ Erro ao Gravar';
                updateGpsBtn.style.background = '#dc2626';
              }
            };

            if (userCoords) {
              await proceedWithCoords(userCoords);
            } else if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  const c = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy || 10
                  };
                  setUserCoords(c);
                  await proceedWithCoords(c);
                },
                (err) => {
                  alert('Não foi possível capturar o GPS do aparelho: ' + err.message);
                  updateGpsBtn.disabled = false;
                  updateGpsBtn.innerHTML = '🎯 Tentar Novamente';
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            } else {
              alert('Geolocalização não suportada neste dispositivo.');
              updateGpsBtn.disabled = false;
              updateGpsBtn.innerHTML = '🎯 Fixar Minha Posição';
            }
          });
        }

        marker.bindPopup(popupContent, { maxWidth: 290 });
        markersGroup.addLayer(marker);
      });

      // Se o usuário ainda não pediu para recentralizar e temos ativos válidos, enquadra
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 17
        });
      }
    });
  }, [assets, selectedAssetId, onSelectAssetForHistory, onUpdateAssetLocation, userCoords]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      {/* Contêiner Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Controles Flutuantes Superiores (Camadas + Botão Minha Localização) */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Botão de Centralizar no Usuário */}
        <button
          type="button"
          onClick={() => locateUser(true)}
          disabled={locatingUser}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 text-xs font-bold font-mono transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          title="Centralizar na Minha Localização Atual"
        >
          <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
          <span>{locatingUser ? 'Localizando...' : 'Minha Posição'}</span>
        </button>

        {/* Seletor de Camadas (Google Satélite / Google Ruas / Noturno) */}
        <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg text-xs font-mono">
          <button
            type="button"
            onClick={() => setCurrentTileLayer('hybrid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'hybrid'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Google Maps Satélite com nomes de ruas e localidades"
          >
            Satélite (Google)
          </button>
          <button
            type="button"
            onClick={() => setCurrentTileLayer('streets')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'streets'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Google Maps Ruas"
          >
            Google Ruas
          </button>
          <button
            type="button"
            onClick={() => setCurrentTileLayer('dark')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'dark'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Modo Noturno sem marcas d'água"
          >
            Noturno
          </button>
        </div>
      </div>

      {/* Estilos para renderização dos tiles no modo Noturno */}
      <style>{`
        .spci-dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(115%) !important;
        }
      `}</style>

      {/* Legenda Flutuante (SPCI Pins + Usuário) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-lg text-[10px] font-mono text-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/40 animate-pulse" />
          <span className="text-blue-400 font-bold">Você</span>
        </div>
        <div className="w-px h-3 bg-slate-700" />
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
