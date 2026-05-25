/**
 * Google Sheets Database Bridge for SPCI Applet
 */

export interface SheetMapping {
  extintor: {
    headers: string[];
    toRow: (item: any) => any[];
    fromRow: (row: any[], headerMap: Record<string, number>) => any;
  };
  hidrante: {
    headers: string[];
    toRow: (item: any) => any[];
    fromRow: (row: any[], headerMap: Record<string, number>) => any;
  };
  sinalizacao: {
    headers: string[];
    toRow: (item: any) => any[];
    fromRow: (row: any[], headerMap: Record<string, number>) => any;
  };
  iluminacao: {
    headers: string[];
    toRow: (item: any) => any[];
    fromRow: (row: any[], headerMap: Record<string, number>) => any;
  };
  bomba: {
    headers: string[];
    toRow: (item: any) => any[];
    fromRow: (row: any[], headerMap: Record<string, number>) => any;
  };
}

export const SHEETS_MAPPINGS: SheetMapping = {
  extintor: {
    headers: ["ID", "IdAtivo", "Modelo", "Localizacao", "SubLocalizacao", "SeloInmetro", "Chassi", "Peso_KG", "UltimaRecarga", "Frequencia", "ValidadeRecarga", "TesteHidro", "Status", "Latitude", "Longitude"],
    toRow: (x: any) => [
      x.id || '',
      x.idAtivo || '',
      x.model || '',
      x.location || '',
      x.subLocation || '',
      x.seloInmetro || '',
      x.chassi || '',
      String(x.peso || ''),
      x.lastRecarga || '',
      x.recurrenceInterval || '',
      x.validadeRecarga || '',
      x.validadeTesteHidro || '',
      x.status || 'Conforme',
      String(x.geolocation?.lat || ''),
      String(x.geolocation?.lng || '')
    ],
    fromRow: (row: any[], head: Record<string, number>) => {
      const getVal = (col: string, def = '') => {
        const idx = head[col];
        return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : def;
      };
      return {
        id: getVal("ID"),
        idAtivo: getVal("IdAtivo"),
        category: "Extintor",
        model: getVal("Modelo"),
        location: getVal("Localizacao"),
        subLocation: getVal("SubLocalizacao"),
        seloInmetro: getVal("SeloInmetro"),
        chassi: getVal("Chassi"),
        peso: getVal("Peso_KG"),
        lastRecarga: getVal("UltimaRecarga"),
        recurrenceInterval: getVal("Frequencia"),
        validadeRecarga: getVal("ValidadeRecarga"),
        validadeTesteHidro: getVal("TesteHidro"),
        status: getVal("Status") || 'Conforme',
        geolocation: {
          lat: parseFloat(getVal("Latitude")) || -20.1245,
          lng: parseFloat(getVal("Longitude")) || -44.5668
        }
      };
    }
  },
  hidrante: {
    headers: ["ID", "IdAtivo", "Localizacao", "SubLocalizacao", "Componentes", "UltimaInspecao", "ProximaInspecao", "Status", "Latitude", "Longitude"],
    toRow: (x: any) => [
      x.id || '',
      x.idAtivo || '',
      x.location || '',
      x.subLocation || '',
      Array.isArray(x.components) ? x.components.join(', ') : (x.components || ''),
      x.lastInsp || '',
      x.nextInsp || '',
      x.status || 'Conforme',
      String(x.geolocation?.lat || ''),
      String(x.geolocation?.lng || '')
    ],
    fromRow: (row: any[], head: Record<string, number>) => {
      const getVal = (col: string, def = '') => {
        const idx = head[col];
        return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : def;
      };
      const rawComp = getVal("Componentes");
      const components = rawComp ? rawComp.split(',').map(s => s.trim()) : [];
      return {
        id: getVal("ID"),
        idAtivo: getVal("IdAtivo"),
        category: "Hidrante",
        location: getVal("Localizacao"),
        subLocation: getVal("SubLocalizacao"),
        components,
        lastInsp: getVal("UltimaInspecao"),
        nextInsp: getVal("ProximaInspecao"),
        status: getVal("Status") || 'Conforme',
        geolocation: {
          lat: parseFloat(getVal("Latitude")) || -20.1245,
          lng: parseFloat(getVal("Longitude")) || -44.5668
        }
      };
    }
  },
  sinalizacao: {
    headers: ["ID", "IdAtivo", "Localizacao", "SubLocalizacao", "Modelo", "Grupo", "Status", "Latitude", "Longitude"],
    toRow: (x: any) => [
      x.id || '',
      x.idAtivo || '',
      x.location || '',
      x.subLocation || '',
      x.model || '',
      x.group || '',
      x.status || 'Conforme',
      String(x.geolocation?.lat || ''),
      String(x.geolocation?.lng || '')
    ],
    fromRow: (row: any[], head: Record<string, number>) => {
      const getVal = (col: string, def = '') => {
        const idx = head[col];
        return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : def;
      };
      return {
        id: getVal("ID"),
        idAtivo: getVal("IdAtivo"),
        category: "Sinalização",
        location: getVal("Localizacao"),
        subLocation: getVal("SubLocalizacao"),
        model: getVal("Modelo"),
        group: getVal("Grupo"),
        status: getVal("Status") || 'Conforme',
        geolocation: {
          lat: parseFloat(getVal("Latitude")) || -20.1245,
          lng: parseFloat(getVal("Longitude")) || -44.5668
        }
      };
    }
  },
  iluminacao: {
    headers: ["ID", "IdAtivo", "Localizacao", "SubLocalizacao", "TipoSistema", "Modelo", "Quantidade", "Bateria", "Autonomia", "Status", "Latitude", "Longitude"],
    toRow: (x: any) => [
      x.id || '',
      x.idAtivo || '',
      x.location || '',
      x.subLocation || '',
      x.systemType || '',
      x.model || '',
      String(x.qty || ''),
      x.battery || '',
      x.autonomy || '',
      x.status || 'Operacional',
      String(x.geolocation?.lat || ''),
      String(x.geolocation?.lng || '')
    ],
    fromRow: (row: any[], head: Record<string, number>) => {
      const getVal = (col: string, def = '') => {
        const idx = head[col];
        return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : def;
      };
      return {
        id: getVal("ID"),
        idAtivo: getVal("IdAtivo"),
        category: "Iluminação",
        location: getVal("Localizacao"),
        subLocation: getVal("SubLocalizacao"),
        systemType: getVal("TipoSistema"),
        model: getVal("Modelo"),
        qty: parseInt(getVal("Quantidade"), 10) || 1,
        battery: getVal("Bateria"),
        autonomy: getVal("Autonomia"),
        status: getVal("Status") || 'Operacional',
        geolocation: {
          lat: parseFloat(getVal("Latitude")) || -20.1245,
          lng: parseFloat(getVal("Longitude")) || -44.5668
        }
      };
    }
  },
  bomba: {
    headers: ["ID", "Nome", "Codigo", "Tipo", "Power", "Pressao_Range", "Partidas", "Status"],
    toRow: (x: any) => [
      x.id || '',
      x.name || '',
      x.code || '',
      x.type || '',
      x.power || '',
      x.range || '',
      String(x.starts || ''),
      x.status || 'Standby'
    ],
    fromRow: (row: any[], head: Record<string, number>) => {
      const getVal = (col: string, def = '') => {
        const idx = head[col];
        return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : def;
      };
      return {
        id: getVal("ID"),
        name: getVal("Nome"),
        code: getVal("Codigo"),
        type: getVal("Tipo"),
        power: getVal("Power"),
        range: getVal("Pressao_Range"),
        starts: getVal("Partidas"),
        status: getVal("Status") || 'Standby'
      };
    }
  }
};

// The actual action logic has been moved to app/actions/sheets.ts
export { createSpreadsheet, getFirstSheetName, readSpreadsheet, writeSpreadsheet } from '../app/actions/sheets';

/**
 * Utility to extract ID from URL
 */
export function extractSpreadsheetId(url: string): string {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url.trim();
}
