/**
 * Utilitários Geoespaciais do Ecossistema SPCI Master
 * Cálculo de distância geodésica (Haversine), filtros de oscilação GPS e formatação.
 */

export const GEO_DRIFT_TOLERANCE_METERS = 5.0; // Limiar de tolerância contra ruído/drift de sinal GPS

export type LocationSource = 'CADASTRO_ESTOQUE' | 'RONDA_CAMPO' | 'INSPECAO';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  timestamp?: number;
}

export interface LocationHistoryEntry {
  id?: string;
  ativo_id: string;
  categoria?: string;
  latitude: number;
  longitude: number;
  precisao?: number | null;
  distancia_deslocada_metros: number;
  foto_evidencia_url?: string | null;
  usuario_id?: string | null;
  usuario_nome?: string | null;
  tipo_evento: LocationSource;
  created_at?: string;
}

/**
 * Calcula a distância ortodrômica entre duas coordenadas geográficas em metros
 * utilizando a Fórmula de Haversine.
 * 
 * @param lat1 Latitude do ponto de origem
 * @param lon1 Longitude do ponto de origem
 * @param lat2 Latitude do ponto de destino
 * @param lon2 Longitude do ponto de destino
 * @returns Distância física em metros com precisão de 2 casas decimais.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371e3; // Raio médio da Terra em metros
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Avalia se um deslocamento é significativo ou se constitui ruído normal de sinal (drift).
 */
export function isSignificantDisplacement(
  latAtual: number | null | undefined,
  lngAtual: number | null | undefined,
  latNova: number,
  lngNova: number,
  toleranceMeters: number = GEO_DRIFT_TOLERANCE_METERS
): { shouldUpdate: boolean; distanceMeters: number; reason: string } {
  // Se o ativo não possui coordenadas anteriores, trata-se da primeira fixação
  if (latAtual == null || lngAtual == null || isNaN(latAtual) || isNaN(lngAtual)) {
    return {
      shouldUpdate: true,
      distanceMeters: 0,
      reason: 'Primeiro georreferenciamento cadastrado para este ativo.'
    };
  }

  const distance = calculateHaversineDistance(latAtual, lngAtual, latNova, lngNova);

  if (distance >= toleranceMeters) {
    return {
      shouldUpdate: true,
      distanceMeters: distance,
      reason: `Deslocamento físico detectado: ${distance.toFixed(1)}m (≥ ${toleranceMeters}m).`
    };
  }

  return {
    shouldUpdate: false,
    distanceMeters: distance,
    reason: `Oscilação de antena desprezível: ${distance.toFixed(1)}m (< ${toleranceMeters}m). Posição principal preservada.`
  };
}

/**
 * Formata a distância em metros para exibição amigável ao usuário.
 */
export function formatDistance(meters: number): string {
  if (meters == null || isNaN(meters)) return '0 m';
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
