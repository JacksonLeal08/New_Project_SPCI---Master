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
  Minimize2,
  HelpCircle
} from 'lucide-react';
import AssetImageZoomModal from './AssetImageZoomModal';
import RegrasVencimentoModal from './RegrasVencimentoModal';
import { calculateHaversineDistance, formatDistance } from '@/lib/geoUtils';
import { useTheme } from '@/app/context/ThemeContext';

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
  const { theme } = useTheme();

  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<'hybrid' | 'streets' | 'dark'>(() => {
    return theme === 'light' ? 'streets' : 'hybrid';
  });
  const [locatingUser, setLocatingUser] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Sincronizar camada recomendada com alternância de tema global
  useEffect(() => {
    if (theme === 'light') {
      setCurrentTileLayer((prev) => (prev === 'dark' || prev === 'hybrid' ? 'streets' : prev));
    } else {
      setCurrentTileLayer((prev) => (prev === 'streets' ? 'hybrid' : prev));
    }
  }, [theme]);

  // Estados para Rota Ativa, Modal de Zoom, Tela Cheia (Maximizar/Minimizar), Filtro de Status e Regras
  const [activeRoute, setActiveRoute] = useState<{ asset: MapAssetItem; distanceMeters: number } | null>(null);
  const [zoomedAsset, setZoomedAsset] = useState<MapAssetItem | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [isRegrasModalOpen, setIsRegrasModalOpen] = useState<boolean>(false);

  // Contadores dinâmicos para cada status de ativos mapeados com coordenadas válidas
  const statusCounts = React.useMemo(() => {
    const valid = assets.filter(
      (a) => a.latitude != null && a.longitude != null && !isNaN(a.latitude) && !isNaN(a.longitude)
    );
    const counts: Record<string, number> = {
      total: valid.length,
      'Conforme': 0,
      'A Vencer/Atenção': 0,
      'Vencido/Crítico': 0,
      'Estoque': 0,
      'Manutenção': 0
    };
    valid.forEach((asset) => {
      const color = getMarkerColor(asset);
      if (counts[color.label] !== undefined) {
        counts[color.label]++;
      } else {
        counts['Conforme']++;
      }
    });
    return counts;
  }, [assets]);

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

          // Círculo de precisão semitransparente calibrado (NUNCA intercepta cliques nem bloqueia ativos próximos)
          const circle = L.circle([lat, lng], {
            radius: Math.min(Math.max(accuracy, 6), 22),
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '3, 4',
            interactive: false,
            className: 'spci-user-accuracy-circle pointer-events-none'
          });

          // Marcador pulsante azul ciano
          const userPulseHtml = `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
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

          const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 800 });
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

      const allValidAssets = assets.filter(
        a => a.latitude != null && a.longitude != null && !isNaN(a.latitude) && !isNaN(a.longitude)
      );

      const validAssets = activeStatusFilter
        ? allValidAssets.filter((a) => getMarkerColor(a).label === activeStatusFilter)
        : allValidAssets;

      if (validAssets.length === 0) return;

      const bounds = L.latLngBounds([]);

      // 1. Agrupar ativos por proximidade geográfica (detecção de coordenadas coincidentes / sobrepostas)
      interface DispersedAsset extends MapAssetItem {
        displayLat: number;
        displayLng: number;
        isGrouped: boolean;
        groupIndex: number;
        groupTotal: number;
        groupSiblings: string[];
      }

      const groups: MapAssetItem[][] = [];
      const visited = new Set<string>();

      validAssets.forEach((asset, idx) => {
        const idKey = asset.id || asset.idAtivo || `item_${idx}`;
        if (visited.has(idKey)) return;

        const currentGroup: MapAssetItem[] = [asset];
        visited.add(idKey);

        validAssets.forEach((other, otherIdx) => {
          const otherIdKey = other.id || other.idAtivo || `other_${otherIdx}`;
          if (visited.has(otherIdKey)) return;

          const dist = calculateHaversineDistance(
            asset.latitude,
            asset.longitude,
            other.latitude,
            other.longitude
          );

          // Se estiverem no mesmo ponto (delta < 3.5 metros)
          if (dist < 3.5) {
            currentGroup.push(other);
            visited.add(otherIdKey);
          }
        });

        groups.push(currentGroup);
      });

      const processedAssets: DispersedAsset[] = [];

      groups.forEach((group) => {
        const total = group.length;
        if (total === 1) {
          processedAssets.push({
            ...group[0],
            displayLat: group[0].latitude,
            displayLng: group[0].longitude,
            isGrouped: false,
            groupIndex: 1,
            groupTotal: 1,
            groupSiblings: []
          });
        } else {
          const baseLat = group[0].latitude;
          const baseLng = group[0].longitude;

          // Indicador visual no centro físico compartilhado
          const centerMarker = L.circleMarker([baseLat, baseLng], {
            radius: 5,
            color: '#f59e0b',
            fillColor: '#fbbf24',
            fillOpacity: 0.9,
            weight: 2
          });
          centerMarker.bindTooltip(`📍 Ponto Compartilhado (${total} equipamentos)`, {
            direction: 'top',
            offset: [0, -6],
            className: 'spci-shared-tooltip font-mono text-xs'
          });
          markersGroup.addLayer(centerMarker);

          // Dispersão em leque circular (raio de 3.5 metros para visualização clara de cada pino)
          const radiusMeters = 3.5;
          const latOffset = radiusMeters / 111320;
          const lngOffset = radiusMeters / (111320 * Math.cos((baseLat * Math.PI) / 180));
          const allCodes = group.map((g) => g.idAtivo || g.patrimonio || g.id);

          group.forEach((item, itemIdx) => {
            const angle = (2 * Math.PI * itemIdx) / total - Math.PI / 2;
            const displayLat = baseLat + latOffset * Math.sin(angle);
            const displayLng = baseLng + lngOffset * Math.cos(angle);

            // Linha pontilhada de ancoragem
            const linkLine = L.polyline(
              [
                [baseLat, baseLng],
                [displayLat, displayLng]
              ],
              {
                color: '#f59e0b',
                weight: 1.5,
                dashArray: '3, 4',
                opacity: 0.75
              }
            );
            markersGroup.addLayer(linkLine);

            processedAssets.push({
              ...item,
              displayLat,
              displayLng,
              isGrouped: true,
              groupIndex: itemIdx + 1,
              groupTotal: total,
              groupSiblings: allCodes.filter((c) => c !== (item.idAtivo || item.patrimonio || item.id))
            });
          });
        }
      });

      processedAssets.forEach((asset) => {
        const coords: [number, number] = [asset.displayLat, asset.displayLng];
        bounds.extend([asset.latitude, asset.longitude]);

        const color = getMarkerColor(asset);
        const iconChar = getCategoryIcon(asset.category);
        const isSelected = selectedAssetId === asset.id || selectedAssetId === asset.idAtivo;
        const isVencido = color.label === 'Vencido/Crítico';
        const isAVencer = color.label === 'A Vencer/Atenção';

        // Custom Pin HTML com Tailwind e efeito pulsante neon para vencidos/a vencer
        const customHtml = `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -100%);">
            ${isSelected ? '<div class="absolute -inset-2 bg-white/40 rounded-full animate-ping pointer-events-none"></div>' : ''}
            ${isVencido ? `
              <!-- Radar Sonar Fluorescente Vermelho Neon -->
              <div class="spci-radar-ring-red" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                pointer-events: none;
              "></div>
            ` : ''}
            ${isAVencer ? `
              <!-- Radar Sonar Fluorescente Âmbar Neon -->
              <div class="spci-radar-ring-amber" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                pointer-events: none;
              "></div>
            ` : ''}
            ${asset.isGrouped ? `
              <div style="
                position: absolute;
                top: -6px;
                right: -6px;
                background: #f59e0b;
                color: #ffffff;
                font-size: 9px;
                font-weight: 800;
                width: 18px;
                height: 18px;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                z-index: 10;
              " title="Equipamento ${asset.groupIndex} de ${asset.groupTotal} agrupados neste ponto">
                ${asset.groupIndex}
              </div>
            ` : ''}
            <div class="${isVencido ? 'spci-pin-pulse-red' : isAVencer ? 'spci-pin-pulse-amber' : ''}" style="
              background: ${color.bg};
              border: 2px solid ${color.border};
              color: ${color.text};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: ${isVencido ? '0 0 16px rgba(239, 68, 68, 0.9), 0 4px 12px rgba(0,0,0,0.5)' : isAVencer ? '0 0 14px rgba(245, 158, 11, 0.85), 0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.5)'};
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

        // Prioridade de clique: Selecionado > Vencido > A Vencer > Padrão
        const marker = L.marker(coords, {
          icon: customIcon,
          zIndexOffset: isSelected ? 2500 : isVencido ? 2200 : isAVencer ? 1900 : 1500
        });

        // Popup HTML formatado com suporte dinâmico a Tema Claro e Escuro (App-Like UI)
        const popupContent = document.createElement('div');
        popupContent.className = 'spci-map-popup font-mono select-none';
        popupContent.style.cssText = 'min-width: 270px; max-width: 305px; padding: 12px 14px;';

        const assetTitle = asset.idAtivo || asset.patrimonio || asset.id;

        popupContent.innerHTML = `
          <div>
            <!-- Cabeçalho do Card com Proteção Anti-Sobreposição do Botão Fechar -->
            <div class="popup-header" style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(148, 163, 184, 0.3);
              padding-bottom: 8px;
              margin-bottom: 8px;
              padding-right: 36px;
              gap: 8px;
            ">
              <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                <span style="font-size: 15px; flex-shrink: 0;">${iconChar}</span>
                <span class="popup-title" style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${assetTitle}
                </span>
              </div>
              <span style="
                font-size: 9.5px;
                padding: 3px 8px;
                border-radius: 9999px;
                font-weight: 800;
                background: ${color.bg};
                color: #ffffff;
                box-shadow: 0 0 10px ${color.bg}80;
                white-space: nowrap;
                flex-shrink: 0;
              ">
                ${asset.status || 'Ativo'}
              </span>
            </div>

            ${asset.isGrouped ? `
              <!-- Alerta de Ponto Compartilhado com múltiplos ativos próximos -->
              <div style="
                background: rgba(245, 158, 11, 0.15);
                border: 1px solid rgba(245, 158, 11, 0.45);
                border-radius: 8px;
                padding: 6px 9px;
                margin-bottom: 8px;
                font-size: 10px;
                color: #d97706;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 800; margin-bottom: 2px;">
                  <span>📍 Ponto Compartilhado</span>
                  <span style="background: #f59e0b; color: #ffffff; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 900;">
                    Ativo ${asset.groupIndex} de ${asset.groupTotal}
                  </span>
                </div>
                <div style="font-size: 9px; opacity: 0.95; line-height: 1.3;">
                  Outro(s) equipamento(s) no mesmo local: <strong style="color: #b45309;">${asset.groupSiblings.join(', ')}</strong>
                </div>
              </div>
            ` : ''}

            <!-- Modelo do Equipamento -->
            <div class="popup-model" style="font-size: 12px; font-weight: 800; margin-bottom: 6px; line-height: 1.3;">
              ${asset.model || 'Equipamento SPCI'}
            </div>

            <!-- Localização -->
            <div class="popup-location" style="font-size: 10px; margin-bottom: 8px; line-height: 1.4; opacity: 0.85;">
              📍 <strong>Local:</strong> ${asset.location} ${asset.subLocation ? ` - ${asset.subLocation}` : ''}
            </div>

            <!-- Coordenadas Geográficas e Origem da Captura -->
            <div class="popup-geo-box" style="
              border-radius: 8px;
              padding: 6px 8px;
              margin-bottom: 8px;
              font-family: ui-monospace, monospace;
              font-size: 9.5px;
            ">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span class="popup-geo-text">LAT: <strong class="popup-geo-val">${Number(asset.latitude).toFixed(6)}</strong></span>
                <span class="popup-geo-text">LONG: <strong class="popup-geo-val">${Number(asset.longitude).toFixed(6)}</strong></span>
              </div>
              ${(() => {
                const orig = String(asset.origem_localizacao || '').toUpperCase();
                if (orig === 'FOTO_EXIF') {
                  return `
                    <div style="display: flex; align-items: center; gap: 4px; color: #0284c7; font-weight: 700; border-top: 1px solid rgba(148, 163, 184, 0.25); margin-top: 4px; padding-top: 3px;">
                      <span>📸</span>
                      <span>Origem: Metadados da Imagem (EXIF)</span>
                    </div>
                  `;
                }
                if (orig === 'GPS_DISPOSITIVO' || orig === 'DISPOSITIVO') {
                  return `
                    <div style="display: flex; align-items: center; gap: 4px; color: #059669; font-weight: 700; border-top: 1px solid rgba(148, 163, 184, 0.25); margin-top: 4px; padding-top: 3px;">
                      <span>🛰️</span>
                      <span>Origem: GPS do Dispositivo (±${asset.precisao_gps || 10}m)</span>
                    </div>
                  `;
                }
                return `
                  <div style="display: flex; align-items: center; gap: 4px; color: #64748b; font-weight: 700; border-top: 1px solid rgba(148, 163, 184, 0.25); margin-top: 4px; padding-top: 3px;">
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
                border: 1px solid rgba(148, 163, 184, 0.4);
                cursor: pointer;
                background: #020617;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              " title="Clique para abrir em tela cheia com efeito de zoom">
                <img src="${asset.foto_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto do ativo" />
                <div style="
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%);
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
                border: 1px dashed rgba(148, 163, 184, 0.5);
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

            <!-- Ações Ergonômicas (Touch Target >= 44px - Mobile App Shell) -->
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
                <button id="btn-gmaps-${asset.id}" class="popup-btn-outline" style="
                  flex: 1;
                  min-height: 40px;
                  padding: 6px 8px;
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
                <button id="btn-waze-${asset.id}" class="popup-btn-outline" style="
                  flex: 1;
                  min-height: 40px;
                  padding: 6px 8px;
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
                min-height: 44px;
                padding: 7px 10px;
                background: #2563eb;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-size: 10.5px;
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
              <button id="btn-history-${asset.id}" class="popup-btn-outline" style="
                width: 100%;
                min-height: 38px;
                padding: 6px 8px;
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
  }, [assets, selectedAssetId, onSelectAssetForHistory, onUpdateAssetLocation, userCoords, activeStatusFilter]);

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
          : `relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 ${className}`
      }`}
    >
      {/* Contêiner Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* AVISO DISCRETO NO MODO IMERSIVO STANDALONE (PWA) */}
      {isMaximized && (
        <div className="absolute top-4 left-4 z-20 hidden md:flex items-center gap-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl text-xs font-mono text-slate-800 dark:text-slate-200 animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>Modo Imersivo Standalone (Pressione <strong>ESC</strong> ou toque em Minimizar para sair)</span>
        </div>
      )}

      {/* BANNER FLUTUANTE DE ROTA ATIVA */}
      {activeRoute && (
        <div className="absolute top-16 md:top-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-sky-500/60 rounded-2xl p-3.5 shadow-2xl font-mono text-slate-900 dark:text-white">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              <span className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Rota Ativa: {activeRoute.asset.idAtivo}
              </span>
            </div>
            <button
              type="button"
              onClick={clearRoute}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Fechar Rota"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-3">
            <span>Distância estimada:</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatDistance(activeRoute.distanceMeters)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeRoute.asset.latitude},${activeRoute.asset.longitude}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>
            <a
              href={`https://waze.com/ul?ll=${activeRoute.asset.latitude},${activeRoute.asset.longitude}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Waze</span>
            </a>
          </div>
        </div>
      )}

      {/* Controles Flutuantes Superiores (Maximizar/Minimizar + Camadas + Botão Minha Localização - Touch Friendly) */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Botão de Maximizar / Minimizar Tela Cheia (PWA Standalone) */}
        <button
          type="button"
          onClick={toggleMaximize}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/80 text-xs font-bold font-mono transition-all cursor-pointer active:scale-95"
          title={isMaximized ? "Minimizar Mapa (ESC)" : "Projetar Mapa em Tela Cheia (Modo Imersivo Standalone)"}
        >
          {isMaximized ? (
            <>
              <Minimize2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span className="hidden sm:inline">Minimizar</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span className="hidden sm:inline">Maximizar</span>
            </>
          )}
        </button>

        {/* Botão de Centralizar no Usuário */}
        <button
          type="button"
          onClick={() => locateUser(true)}
          disabled={locatingUser}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 text-xs font-bold font-mono transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          title="Centralizar na Minha Localização Atual"
        >
          <Crosshair className={`w-4 h-4 ${locatingUser ? 'animate-spin' : ''}`} />
          <span>{locatingUser ? 'Localizando...' : 'Minha Posição'}</span>
        </button>

        {/* Seletor de Camadas (Google Satélite / Google Ruas / Noturno) */}
        <div className="flex items-center bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-lg text-xs font-mono">
          <button
            type="button"
            onClick={() => setCurrentTileLayer('hybrid')}
            className={`px-3 py-2 min-h-[38px] rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'hybrid'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Google Maps Satélite com nomes de ruas e localidades"
          >
            Satélite
          </button>
          <button
            type="button"
            onClick={() => setCurrentTileLayer('streets')}
            className={`px-3 py-2 min-h-[38px] rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'streets'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Google Maps Ruas"
          >
            Ruas
          </button>
          <button
            type="button"
            onClick={() => setCurrentTileLayer('dark')}
            className={`px-3 py-2 min-h-[38px] rounded-lg font-bold transition-all cursor-pointer ${
              currentTileLayer === 'dark'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Modo Noturno sem marcas d'água"
          >
            Noturno
          </button>
        </div>
      </div>

      {/* Estilos para renderização dos tiles no modo Noturno e Customização do Popup nos Temas Claro e Escuro */}
      <style>{`
        .spci-dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(115%) !important;
        }

        /* Estilização Luxury Glassmorphic do Popup Leaflet no Modo Escuro (Padrão) */
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
          top: 8px !important;
          right: 10px !important;
          width: 26px !important;
          height: 26px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(30, 41, 59, 0.9) !important;
          border: 1px solid rgba(100, 116, 139, 0.45) !important;
          border-radius: 50% !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          padding: 0 !important;
          margin: 0 !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          z-index: 50 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
        }
        .spci-custom-popup a.leaflet-popup-close-button:hover {
          color: #ffffff !important;
          background: rgba(220, 38, 38, 0.95) !important;
          border-color: #ef4444 !important;
          transform: scale(1.1) !important;
        }

        /* Estilização Luxury Glassmorphic do Popup Leaflet no Modo Claro */
        html.light .spci-custom-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 15px rgba(0, 0, 0, 0.05) !important;
          color: #0f172a !important;
        }
        html.light .spci-custom-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
        }
        html.light .spci-custom-popup a.leaflet-popup-close-button {
          background: rgba(241, 245, 249, 0.95) !important;
          border: 1px solid rgba(203, 213, 225, 0.8) !important;
          color: #64748b !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
        }
        html.light .spci-custom-popup a.leaflet-popup-close-button:hover {
          color: #ffffff !important;
          background: rgba(220, 38, 38, 0.95) !important;
          border-color: #ef4444 !important;
        }

        /* Classes Adaptativas nos Elementos do Popup */
        html.light .spci-map-popup {
          color: #0f172a !important;
        }
        html.light .spci-map-popup .popup-header {
          border-bottom-color: rgba(203, 213, 225, 0.8) !important;
        }
        html.light .spci-map-popup .popup-title {
          color: #0f172a !important;
        }
        html.light .spci-map-popup .popup-model {
          color: #1e293b !important;
        }
        html.light .spci-map-popup .popup-location {
          color: #475569 !important;
        }
        html.light .spci-map-popup .popup-geo-box {
          background: rgba(241, 245, 249, 0.95) !important;
          border: 1px solid rgba(203, 213, 225, 0.8) !important;
        }
        html.light .spci-map-popup .popup-geo-text {
          color: #64748b !important;
        }
        html.light .spci-map-popup .popup-geo-val {
          color: #0f172a !important;
        }
        html.light .spci-map-popup .popup-btn-outline {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          color: #334155 !important;
        }
        html.light .spci-map-popup .popup-btn-outline:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }

        html.dark .spci-map-popup {
          color: #f8fafc !important;
        }
        html.dark .spci-map-popup .popup-header {
          border-bottom-color: rgba(51, 65, 85, 0.6) !important;
        }
        html.dark .spci-map-popup .popup-title {
          color: #f8fafc !important;
        }
        html.dark .spci-map-popup .popup-model {
          color: #ffffff !important;
        }
        html.dark .spci-map-popup .popup-location {
          color: #94a3b8 !important;
        }
        html.dark .spci-map-popup .popup-geo-box {
          background: rgba(15, 23, 42, 0.7) !important;
          border: 1px solid rgba(51, 65, 85, 0.8) !important;
        }
        html.dark .spci-map-popup .popup-geo-text {
          color: #94a3b8 !important;
        }
        html.dark .spci-map-popup .popup-geo-val {
          color: #f1f5f9 !important;
        }
        html.dark .spci-map-popup .popup-btn-outline {
          background: #1e293b !important;
          border: 1px solid #475569 !important;
          color: #f1f5f9 !important;
        }
        html.dark .spci-map-popup .popup-btn-outline:hover {
          background: #334155 !important;
          color: #ffffff !important;
        }

        /* Animações de Radar e Efeito Neon Fluorescente nos Pinos de Atenção e Crítico */
        @keyframes spciRadarPulseRed {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.85);
            opacity: 1;
          }
          70% {
            transform: scale(1.85);
            box-shadow: 0 0 0 18px rgba(239, 68, 68, 0);
            opacity: 0;
          }
          100% {
            transform: scale(2);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            opacity: 0;
          }
        }
        @keyframes spciRadarPulseAmber {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.85);
            opacity: 1;
          }
          70% {
            transform: scale(1.75);
            box-shadow: 0 0 0 16px rgba(245, 158, 11, 0);
            opacity: 0;
          }
          100% {
            transform: scale(1.9);
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
            opacity: 0;
          }
        }
        @keyframes spciPinGlowRed {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 14px rgba(220, 38, 38, 0.7));
            transform: rotate(-45deg) scale(1);
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(239, 68, 68, 1)) drop-shadow(0 0 26px rgba(239, 68, 68, 0.95));
            transform: rotate(-45deg) scale(1.08);
          }
        }
        @keyframes spciPinGlowAmber {
          0%, 100% {
            filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 12px rgba(217, 119, 6, 0.6));
            transform: rotate(-45deg) scale(1);
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(245, 158, 11, 1)) drop-shadow(0 0 22px rgba(245, 158, 11, 0.85));
            transform: rotate(-45deg) scale(1.06);
          }
        }
        .spci-radar-ring-red {
          animation: spciRadarPulseRed 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite !important;
        }
        .spci-radar-ring-amber {
          animation: spciRadarPulseAmber 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite !important;
        }
        .spci-pin-pulse-red {
          animation: spciPinGlowRed 1.8s ease-in-out infinite !important;
        }
        .spci-pin-pulse-amber {
          animation: spciPinGlowAmber 2.2s ease-in-out infinite !important;
        }

        .spci-user-accuracy-circle {
          pointer-events: none !important;
        }
      `}</style>

      {/* Dock Interativo de Filtros de Status (Legenda Flutuante Inteligente com Filtro Dinâmico) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-2xl text-[10px] font-mono text-slate-700 dark:text-slate-200 max-w-[calc(100%-2rem)] sm:max-w-none overflow-x-auto">
        {/* Dispositivo do Operador */}
        <button
          type="button"
          onClick={() => locateUser(true)}
          title="Centralizar na sua localização atual"
          className="flex items-center gap-1.5 px-2 py-1 sm:py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer active:scale-95"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/40 animate-pulse" />
          <span className="text-blue-600 dark:text-blue-400 font-bold">Você</span>
        </button>

        <div className="hidden sm:block w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Botão "Ver Todos" exibido quando houver filtro ativo */}
        {activeStatusFilter && (
          <button
            type="button"
            onClick={() => setActiveStatusFilter(null)}
            className="flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Limpar filtro e ver todos os ativos no mapa"
          >
            <X className="w-3 h-3" />
            <span>Ver Todos ({statusCounts.total})</span>
          </button>
        )}

        {/* Pílulas de Status Interativas */}
        {[
          { label: 'Conforme', colorBg: 'bg-emerald-500', ringBg: 'ring-emerald-500/30', activeStyle: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/50' },
          { label: 'A Vencer/Atenção', shortLabel: 'A Vencer', colorBg: 'bg-amber-500', ringBg: 'ring-amber-500/30', activeStyle: 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 ring-2 ring-amber-500/50' },
          { label: 'Vencido/Crítico', shortLabel: 'Vencido', colorBg: 'bg-red-500', ringBg: 'ring-red-500/30', activeStyle: 'border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 ring-2 ring-red-500/50' },
          { label: 'Estoque', colorBg: 'bg-blue-500', ringBg: 'ring-blue-500/30', activeStyle: 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500/50' },
          { label: 'Manutenção', colorBg: 'bg-orange-500', ringBg: 'ring-orange-500/30', activeStyle: 'border-orange-500 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 ring-2 ring-orange-500/50' },
        ].map((item) => {
          const count = statusCounts[item.label] || 0;
          const isActive = activeStatusFilter === item.label;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setActiveStatusFilter(isActive ? null : item.label);
              }}
              title={isActive ? `Filtro ativo: ${item.label}. Clique para remover.` : `Filtrar mapa por ${item.label}`}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? `border ${item.activeStyle} shadow-md font-extrabold scale-105`
                  : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-90 hover:opacity-100'
              }`}
            >
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${item.colorBg} ring-2 ${item.ringBg} ${
                item.label.includes('Vencido') ? 'animate-pulse' : item.label.includes('Vencer') ? 'animate-pulse' : ''
              }`} />
              <span className="font-semibold">{item.shortLabel || item.label}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Botão (?) para abrir as Regras de Vencimento */}
        <button
          type="button"
          onClick={() => setIsRegrasModalOpen(true)}
          title="Ver Regras de Vencimento SPCI"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95 ml-auto sm:ml-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MODAL DE REGRAS DE VENCIMENTO */}
      <RegrasVencimentoModal
        isOpen={isRegrasModalOpen}
        onClose={() => setIsRegrasModalOpen(false)}
      />

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
