'use client';

import { useState, useCallback } from 'react';
import { GeoCoordinates } from '@/lib/geoUtils';

interface UseGeoCaptureOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeoCapture() {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [geoCoordinates, setGeoCoordinates] = useState<GeoCoordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const capturePosition = useCallback(async (
    customOptions?: UseGeoCaptureOptions
  ): Promise<GeoCoordinates | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Geolocalização não é suportada neste navegador ou dispositivo.';
      setGeoError(msg);
      return null;
    }

    setIsCapturing(true);
    setGeoError(null);

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true, // Máxima precisão GPS requerida
      timeout: 12000,           // 12 segundos para resposta de satélite
      maximumAge: 0,            // Posição fresca, sem cache
      ...customOptions
    };

    return new Promise<GeoCoordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeoCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy * 10) / 10 : null,
            altitude: position.coords.altitude,
            timestamp: position.timestamp
          };
          setGeoCoordinates(coords);
          setIsCapturing(false);
          setGeoError(null);
          resolve(coords);
        },
        async (error) => {
          // Tentativa de fallback com precisão padrão caso dê timeout em ambientes fechados
          if (error.code === error.TIMEOUT && defaultOptions.enableHighAccuracy) {
            console.warn('[useGeoCapture] Timeout em modo de alta precisão. Tentando fallback padrão...');
            try {
              const fallbackPos = await new Promise<GeolocationPosition>((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, {
                  enableHighAccuracy: false,
                  timeout: 6000,
                  maximumAge: 30000
                });
              });

              const coords: GeoCoordinates = {
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
                accuracy: fallbackPos.coords.accuracy ? Math.round(fallbackPos.coords.accuracy * 10) / 10 : null,
                timestamp: fallbackPos.timestamp
              };
              setGeoCoordinates(coords);
              setIsCapturing(false);
              setGeoError(null);
              resolve(coords);
              return;
            } catch (fallbackErr) {
              console.warn('[useGeoCapture] Fallback padrão também falhou:', fallbackErr);
            }
          }

          let errorMsg = 'Não foi possível obter a localização GPS.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Permissão de localização negada pelo usuário ou navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Sinal de GPS indisponível no momento.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Tempo limite esgotado ao buscar sinal de satélite/GPS.';
              break;
          }

          console.warn('[useGeoCapture] Aviso:', errorMsg, error);
          setGeoError(errorMsg);
          setIsCapturing(false);
          resolve(null);
        },
        defaultOptions
      );
    });
  }, []);

  return {
    isCapturing,
    geoCoordinates,
    geoError,
    capturePosition,
    clearCoordinates: () => setGeoCoordinates(null)
  };
}
