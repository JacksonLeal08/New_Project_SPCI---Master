'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Compass,
  Crosshair,
  Navigation,
  X,
  Camera,
  ExternalLink,
  Route,
  Car,
  Maximize2,
  Minimize2
} from 'lucide-react';
import AssetImageZoomModal from './AssetImageZoomModal';
import { calculateHaversineDistance, formatDistance } from '@/lib/geoUtils';

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
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<'hybrid' | 'streets' | 'dark'>('hybrid');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Estados para Rota Ativa, Modal de Zoom e Tela Cheia (Maximizar/Minimizar)
  const [activeRoute, setActiveRoute] = useState<{ asset: MapAssetItem; distanceMeters: number } | null>(null);
  const [zoomedAsset, setZoomedAsset] = useState<MapAssetItem | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Alternar Modo Tela Cheia Real (Fullscreen API nativo do navegador)
  const toggleMaximize = async () => {
    const el = mapRootRef.current;
    if (!el) return;

    if (!isMaximized) {
      setIsMaximized(true);
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        } else if ((el as any).mozRequestFullScreen) {
          await (el as any).mozRequestFullScreen();
        } else if ((el as any).msRequestFullscreen) {
          await (el as any).msRequestFullscreen();
        }
      } catch (err) {
        console.warn('[OperationalMap] Fullscreen API bloqueada ou não suportada, utilizando fallback de viewport:', err);
      }
    } else {
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('[OperationalMap] Erro ao sair de tela cheia:', err);
      }
      setIsMaximized(false);
    }
  };

  // Sincronizar estado com eventos nativos do navegador (ex: quando o usuário pressiona ESC ou botão voltar no Android)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsMaximized(isCurrentlyFullscreen);
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 200);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Ajustar tamanho dos tiles do mapa ao maximizar ou minimizar
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timeout = setTimeout(() => {
      mapInstanceRef.current.invalidateSize();
    }, 250);
    return () => clearTimeout(timeout);
  }, [isMaximized]);

  // Fechar tela cheia com tecla ESC no fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        toggleMaximize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

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
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.16,
            weight: 1.5,
            dashArray: '3, 4'
          });

          // Marcador pulsante azul ciano
          const userPulseHtml = `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
              <div style="position: absolute; width: 34px; height: 34px; background: rgba(56, 189, 248, 0.45); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 16px; height: 16px; background: #0284c7; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.6); position: relative; z-index: 10;"></div>
            </div>
          `;

          const userIcon = L.divIcon({
            html: userPulseHtml,
            className: 'spci-user-location-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 });
          marker.bindPopup(`
            <div style="font-family: ui-monospace, monospace; padding: 4px; font-size: 11px; text-align: center; color: #0f172a;">
              <span style="font-weight: 800; color: #0284c7; display: block; font-size: 12px;">📍 VOCÊ ESTÁ AQUI</span>
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

  // Traçar rota interna até o ativo no mapa
  const traceRouteToAsset = (asset: MapAssetItem) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const executePlot = (userLat: number, userLng: number) => {
      import('leaflet').then((module) => {
        const L = module.default;
        if (!routeLayerRef.current) {
          routeLayerRef.current = L.layerGroup().addTo(map);
        }
        routeLayerRef.current.clearLayers();

        const dist = calculateHaversineDistance(userLat, userLng, asset.latitude, asset.longitude);
        setActiveRoute({ asset, distanceMeters: dist });

        // Linha externa estilo Glow Neon Ciano
        const glowLine = L.polyline([[userLat, userLng], [asset.latitude, asset.longitude]], {
          color: '#38bdf8',
          weight: 7,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        });

        // Linha interna tracejada com contraste
        const mainLine = L.polyline([[userLat, userLng], [asset.latitude, asset.longitude]], {
          color: '#0284c7',
          weight: 3.5,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round'
        });

        routeLayerRef.current.addLayer(glowLine);
        routeLayerRef.current.addLayer(mainLine);

        const bounds = L.latLngBounds([[userLat, userLng], [asset.latitude, asset.longitude]]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
      });
    };

    if (userCoords) {
      executePlot(userCoords.latitude, userCoords.longitude);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10
          };
          setUserCoords(c);
          executePlot(c.latitude, c.longitude);
        },
        (err) => {
          alert('Ative a localização do seu aparelho para traçar a rota até o ativo: ' + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Geolocalização não suportada neste dispositivo.');
    }
  };

  // Limpar rota desenhada
  const clearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setActiveRoute(null);
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

      // LayerGroups
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      const userLocGroup = L.layerGroup().addTo(map);
      userLocationLayerRef.current = userLocGroup;

      const routeGroup = L.layerGroup().addTo(map);
      routeLayerRef.current = routeGroup;

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
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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

        // Popup HTML formatado no estilo LUXURY DARK com Glassmorphism
        const popupContent = document.createElement('div');
        popupContent.className = 'spci-map-popup font-mono text-slate-100 select-none';
        popupContent.style.cssText = 'min-width: 260px; max-width: 290px; padding: 12px 14px;';

        const assetTitle = asset.idAtivo || asset.patrimonio || asset.id;

        popupContent.innerHTML = `
          <div>
            <!-- Cabeçalho do Card -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(51, 65, 85, 0.6); padding-bottom: 8px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 15px;">${iconChar}</span>
                <span style="font-size: 12px; font-weight: 800; color: #f8fafc; letter-spacing: 0.5px; text-transform: uppercase;">
                  ${assetTitle}
                </span>
              </div>
              <span style="font-size: 9.5px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${color.bg}; color: #ffffff; box-shadow: 0 0 10px ${color.bg}80;">
                ${asset.status || 'Ativo'}
              </span>
            </div>

            <!-- Modelo do Equipamento -->
            <div style="font-size: 12px; font-weight: 800; margin-bottom: 6px; color: #ffffff; line-height: 1.3;">
              ${asset.model || 'Equipamento SPCI'}
            </div>

            <!-- Localização -->
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; line-height: 1.4;">
              📍 <strong style="color: #cbd5e1;">Local:</strong> ${asset.location} ${asset.subLocation ? ` - ${asset.subLocation}` : ''}
            </div>

            <!-- Coordenadas Geográficas e Origem da Captura -->
            <div style="
              background: rgba(15, 23, 42, 0.7);
              border: 1px solid rgba(51, 65, 85, 0.8);
              border-radius: 8px;
              padding: 6px 8px;
              margin-bottom: 8px;
              font-family: ui-monospace, monospace;
              font-size: 9.5px;
            ">
              <div style="display: flex; justify-content: space-between; color: #94a3b8; margin-bottom: 4px;">
                <span>LAT: <strong style="color: #f1f5f9;">${Number(asset.latitude).toFixed(6)}</strong></span>
                <span>LONG: <strong style="color: #f1f5f9;">${Number(asset.longitude).toFixed(6)}</strong></span>
              </div>
              ${(() => {
                const orig = String(asset.origem_localizacao || '').toUpperCase();
                if (orig === 'FOTO_EXIF') {
                  return `
                    <div style="display: flex; align-items: center; gap: 4px; color: #38bdf8; font-weight: 700; border-top: 1px solid rgba(51, 65, 85, 0.6); margin-top: 4px; padding-top: 3px;">
                      <span>📸</span>
                      <span>Origem: Metadados da Imagem (EXIF)</span>
                    </div>
                  `;
                }
                if (orig === 'GPS_DISPOSITIVO' || orig === 'DISPOSITIVO') {
                  return `
                    <div style="display: flex; align-items: center; gap: 4px; color: #34d399; font-weight: 700; border-top: 1px solid rgba(51, 65, 85, 0.6); margin-top: 4px; padding-top: 3px;">
                      <span>🛰️</span>
                      <span>Origem: GPS do Dispositivo (±${asset.precisao_gps || 10}m)</span>
                    </div>
                  `;
                }
                return `
                  <div style="display: flex; align-items: center; gap: 4px; color: #cbd5e1; font-weight: 700; border-top: 1px solid rgba(51, 65, 85, 0.6); margin-top: 4px; padding-top: 3px;">
                    <span>📍</span>
                    <span>Origem: ${asset.origem_localizacao || 'Localização Fixada'}</span>
                  </div>
                `;
              })()}
            </div>

            <!-- Miniatura da Imagem com Chamada para Zoom -->
            ${asset.foto_url ? `
              <div id="btn-photo-${asset.id}" style="
                position: relative;
                margin-bottom: 10px;
                border-radius: 12px;
                overflow: hidden;
                height: 110px;
                border: 1px solid rgba(51, 65, 85, 0.8);
                cursor: pointer;
                background: #020617;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              " title="Clique para abrir em tela cheia com efeito de zoom">
                <img src="${asset.foto_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto do ativo" />
                <div style="
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(to top, rgba(15,23,42,0.92) 0%, transparent 60%);
                  display: flex;
                  align-items: flex-end;
                  justify-content: center;
                  padding-bottom: 6px;
                ">
                  <span style="
                    background: rgba(15,23,42,0.85);
                    backdrop-filter: blur(8px);
                    color: #38bdf8;
                    border: 1px solid rgba(56,189,248,0.4);
                    font-size: 10px;
                    font-weight: 800;
                    padding: 3px 9px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                  ">
                    🔍 Toque para Ampliar com Zoom
                  </span>
                </div>
              </div>
            ` : `
              <div id="btn-photo-${asset.id}" style="
                margin-bottom: 10px;
                border-radius: 12px;
                padding: 10px;
                border: 1px dashed rgba(51, 65, 85, 0.8);
                background: rgba(15, 23, 42, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                color: #64748b;
                font-size: 10px;
                cursor: pointer;
              ">
                📷 Sem foto registrada (Clique para inspecionar)
              </div>
            `}

            <!-- Ações Ergonômicas (Touch Target >= 44px) -->
            <div style="display: flex; flex-direction: column; gap: 7px; margin-top: 6px;">
              <!-- 1. Botão Principal: Traçar Rota no Mapa -->
              <button id="btn-route-${asset.id}" style="
                width: 100%;
                min-height: 44px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                color: #ffffff;
                border: 1px solid #38bdf8;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
              ">
                🧭 Traçar Rota no Mapa
              </button>

              <!-- 2. Atalhos de Navegação Externa (Google Maps e Waze) -->
              <div style="display: flex; gap: 6px;">
                <button id="btn-gmaps-${asset.id}" style="
                  flex: 1;
                  min-height: 38px;
                  padding: 6px 8px;
                  background: #1e293b;
                  color: #f1f5f9;
                  border: 1px solid #475569;
                  border-radius: 8px;
                  font-size: 10px;
                  font-weight: 700;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                  transition: all 0.2s;
                ">
                  📍 Google Maps
                </button>
                <button id="btn-waze-${asset.id}" style="
                  flex: 1;
                  min-height: 38px;
                  padding: 6px 8px;
                  background: #1e293b;
                  color: #f1f5f9;
                  border: 1px solid #475569;
                  border-radius: 8px;
                  font-size: 10px;
                  font-weight: 700;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                  transition: all 0.2s;
                ">
                  🚗 Waze
                </button>
              </div>

              <!-- 3. Botão Fixar Minha Posição Atual -->
              <button id="btn-update-gps-${asset.id}" style="
                width: 100%;
                min-height: 40px;
                padding: 7px 10px;
                background: #2563eb;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
              ">
                🎯 Fixar Minha Posição Neste Ativo
              </button>

              <!-- 4. Botão Histórico de Deslocamento -->
              <button id="btn-history-${asset.id}" style="
                width: 100%;
                min-height: 36px;
                padding: 6px 8px;
                background: rgba(15, 23, 42, 0.85);
                color: #94a3b8;
                border: 1px solid rgba(51, 65, 85, 0.8);
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

        // Event listener para Zoom da Foto
        const photoContainer = popupContent.querySelector(`#btn-photo-${asset.id}`);
        if (photoContainer) {
          photoContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            setZoomedAsset(asset);
          });
        }

        // Event listener para Traçar Rota
        const routeBtn = popupContent.querySelector(`#btn-route-${asset.id}`);
        if (routeBtn) {
          routeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            marker.closePopup();
            traceRouteToAsset(asset);
          });
        }

        // Event listener para Google Maps Externo
        const gmapsBtn = popupContent.querySelector(`#btn-gmaps-${asset.id}`);
        if (gmapsBtn) {
          gmapsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${asset.latitude},${asset.longitude}&travelmode=walking`,
              '_blank'
            );
          });
        }

        // Event listener para Waze Externo
        const wazeBtn = popupContent.querySelector(`#btn-waze-${asset.id}`);
        if (wazeBtn) {
          wazeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(
              `https://waze.com/ul?ll=${asset.latitude},${asset.longitude}&navigate=yes`,
              '_blank'
            );
          });
        }

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

        marker.bindPopup(popupContent, {
          className: 'spci-custom-popup',
          maxWidth: 300,
          minWidth: 260
        });

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
    <div
      ref={mapRootRef}
      style={
        isMaximized
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999,
              backgroundColor: '#020617'
            }
          : undefined
      }
      className={`transition-all duration-300 ${
        isMaximized
          ? 'fixed inset-0 z-[999999] w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-none shadow-none bg-slate-950 flex flex-col'
          : `relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`
      }`}
    >
      {/* Contêiner Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* AVISO DISCRETO NO MODO IMERSIVO (TELA CHEIA) */}
      {isMaximized && (
        <div className="absolute top-4 left-4 z-20 hidden md:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl text-xs font-mono text-slate-200 animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Modo Imersivo (Pressione <strong>ESC</strong> ou clique em Minimizar para sair)</span>
        </div>
      )}

      {/* BANNER FLUTUANTE DE ROTA ATIVA */}
      {activeRoute && (
        <div className="absolute top-16 md:top-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 bg-slate-900/95 backdrop-blur-xl border border-sky-500/60 rounded-2xl p-3.5 shadow-2xl font-mono text-white">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
              <span className="text-xs font-black text-sky-400 uppercase tracking-wider">
                Rota Ativa: {activeRoute.asset.idAtivo}
              </span>
            </div>
            <button
              type="button"
              onClick={clearRoute}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              title="Fechar Rota"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
            <span>Distância estimada:</span>
            <span className="text-sm font-black text-emerald-400">
              {formatDistance(activeRoute.distanceMeters)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeRoute.asset.latitude},${activeRoute.asset.longitude}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>
            <a
              href={`https://waze.com/ul?ll=${activeRoute.asset.latitude},${activeRoute.asset.longitude}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Waze</span>
            </a>
          </div>
        </div>
      )}

      {/* Controles Flutuantes Superiores (Maximizar/Minimizar + Camadas + Botão Minha Localização) */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Botão de Maximizar / Minimizar Tela Cheia */}
        <button
          type="button"
          onClick={toggleMaximize}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700/80 text-xs font-bold font-mono transition-all cursor-pointer active:scale-95"
          title={isMaximized ? "Minimizar Mapa (ESC)" : "Projetar Mapa em Tela Cheia (Modo Imersivo)"}
        >
          {isMaximized ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Minimizar</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Maximizar</span>
            </>
          )}
        </button>

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

      {/* Estilos para renderização dos tiles no modo Noturno e Customização do Popup */}
      <style>{`
        .spci-dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(115%) !important;
        }

        /* Estilização Luxury Glassmorphic do Popup Leaflet */
        .spci-custom-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.96) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(51, 65, 85, 0.8) !important;
          border-radius: 20px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.15) !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .spci-custom-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: normal !important;
        }
        .spci-custom-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.96) !important;
          border: 1px solid rgba(51, 65, 85, 0.8) !important;
        }
        .spci-custom-popup a.leaflet-popup-close-button {
          color: #94a3b8 !important;
          top: 10px !important;
          right: 12px !important;
          padding: 4px !important;
          font-size: 18px !important;
          transition: color 0.2s !important;
        }
        .spci-custom-popup a.leaflet-popup-close-button:hover {
          color: #ffffff !important;
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

      {/* MODAL DE ZOOM DA IMAGEM DO ATIVO */}
      <AssetImageZoomModal
        isOpen={!!zoomedAsset}
        onClose={() => setZoomedAsset(null)}
        imageUrl={zoomedAsset?.foto_url}
        title={zoomedAsset?.idAtivo || zoomedAsset?.patrimonio || 'Ativo SPCI'}
        subtitle={zoomedAsset?.model}
        location={zoomedAsset ? `${zoomedAsset.location}${zoomedAsset.subLocation ? ` - ${zoomedAsset.subLocation}` : ''}` : undefined}
        date={zoomedAsset?.data_ultima_localizacao}
      />
    </div>
  );
}
