/**
 * Utilitário de Extração de Metadados EXIF e Coordenadas GPS de Imagens
 * Compatível com JPEG/TIFF no navegador sem dependências externas.
 */

export interface ExifGpsResult {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  dateTime?: string | null;
  hasGps: boolean;
}

/**
 * Lê os primeiros 128KB de um arquivo de imagem e extrai as coordenadas GPS do cabeçalho EXIF APP1.
 * Retorna null com segurança se o arquivo não possuir metadados GPS válidos.
 */
export async function extractExifGpsFromImage(file: File | Blob): Promise<ExifGpsResult | null> {
  try {
    if (!file || !(file instanceof Blob)) return null;

    // Apenas os primeiros 128KB são necessários para ler o cabeçalho EXIF
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    // Verificar assinatura JPEG: 0xFFD8
    if (view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xff) {
        return null;
      }

      const marker = view.getUint8(offset + 1);

      // APP1 Marker: 0xFFE1 (onde residem os metadados EXIF)
      if (marker === 0xe1) {
        const segmentLength = view.getUint16(offset + 2, false);
        const exifStart = offset + 4;

        // Verificar assinatura "Exif\0\0" (0x45786966 0x0000)
        if (
          view.getUint32(exifStart, false) === 0x45786966 &&
          view.getUint16(exifStart + 4, false) === 0x0000
        ) {
          const tiffStart = exifStart + 6;
          return parseTiffGps(view, tiffStart, segmentLength);
        }

        offset += 2 + segmentLength;
      } else if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) {
        // Outros segmentos de aplicação (APP0, APP2.. ou Comentários)
        const segmentLength = view.getUint16(offset + 2, false);
        offset += 2 + segmentLength;
      } else if (marker === 0xda) {
        // SOS (Start of Scan) - início dos dados compactados da imagem, parar busca
        break;
      } else {
        offset += 2;
      }
    }

    return null;
  } catch (err) {
    console.warn('[extractExifGpsFromImage] Erro silencioso ao analisar EXIF:', err);
    return null;
  }
}

/**
 * Faz a decodificação dos blocos TIFF e localiza o sub-IFD do GPS (Tag 0x8825).
 */
function parseTiffGps(view: DataView, tiffStart: number, maxSegmentLength: number): ExifGpsResult | null {
  try {
    // Ordem dos bytes: II (0x4949) = Little-Endian, MM (0x4D4D) = Big-Endian
    const byteOrderMarker = view.getUint16(tiffStart, false);
    let littleEndian = true;

    if (byteOrderMarker === 0x4949) {
      littleEndian = true;
    } else if (byteOrderMarker === 0x4d4d) {
      littleEndian = false;
    } else {
      return null;
    }

    // Assinatura TIFF fixa: 42 (0x002A)
    if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
      return null;
    }

    // Offset para o IFD0 (relativo ao tiffStart)
    const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (firstIfdOffset < 8 || firstIfdOffset > maxSegmentLength) {
      return null;
    }

    const ifd0Start = tiffStart + firstIfdOffset;
    const ifd0EntryCount = view.getUint16(ifd0Start, littleEndian);

    let gpsIfdOffset: number | null = null;
    let dateTime: string | null = null;

    for (let i = 0; i < ifd0EntryCount; i++) {
      const entryOffset = ifd0Start + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);

      // Tag 0x8825 = GPSInfo IFD Pointer
      if (tag === 0x8825) {
        gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
      }
      // Tag 0x0132 = DateTime
      if (tag === 0x0132) {
        const dtOffset = view.getUint32(entryOffset + 8, littleEndian);
        dateTime = readAsciiString(view, tiffStart + dtOffset, 20);
      }
    }

    if (gpsIfdOffset == null || gpsIfdOffset > maxSegmentLength) {
      return null;
    }

    const gpsStart = tiffStart + gpsIfdOffset;
    if (gpsStart + 2 > view.byteLength) return null;

    const gpsEntryCount = view.getUint16(gpsStart, littleEndian);

    let latRef = 'N';
    let lonRef = 'E';
    let latParts: number[] | null = null;
    let lonParts: number[] | null = null;
    let altitude: number | null = null;

    for (let j = 0; j < gpsEntryCount; j++) {
      const entryOffset = gpsStart + 2 + j * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);

      // 0x0001: GPSLatitudeRef
      if (tag === 0x0001) {
        latRef = String.fromCharCode(view.getUint8(entryOffset + 8)).toUpperCase();
      }
      // 0x0002: GPSLatitude
      else if (tag === 0x0002) {
        const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        latParts = readRationalArray(view, valOffset, 3, littleEndian);
      }
      // 0x0003: GPSLongitudeRef
      else if (tag === 0x0003) {
        lonRef = String.fromCharCode(view.getUint8(entryOffset + 8)).toUpperCase();
      }
      // 0x0004: GPSLongitude
      else if (tag === 0x0004) {
        const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        lonParts = readRationalArray(view, valOffset, 3, littleEndian);
      }
      // 0x0006: GPSAltitude
      else if (tag === 0x0006) {
        const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        const alt = readRational(view, valOffset, littleEndian);
        if (alt != null) altitude = alt;
      }
    }

    if (!latParts || !lonParts || latParts.length < 3 || lonParts.length < 3) {
      return null;
    }

    // Conversão de Graus, Minutos e Segundos para Graus Decimais
    const degLat = latParts[0] + latParts[1] / 60 + latParts[2] / 3600;
    const degLon = lonParts[0] + lonParts[1] / 60 + lonParts[2] / 3600;

    let latitude = Math.round(degLat * 1000000) / 1000000;
    let longitude = Math.round(degLon * 1000000) / 1000000;

    if (latRef === 'S') latitude = -latitude;
    if (lonRef === 'W') longitude = -longitude;

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return {
      latitude,
      longitude,
      altitude,
      dateTime,
      hasGps: true
    };
  } catch {
    return null;
  }
}

/**
 * Lê um número racional (numerador / denominador) de 8 bytes.
 */
function readRational(view: DataView, offset: number, littleEndian: boolean): number | null {
  if (offset + 8 > view.byteLength) return null;
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  if (den === 0) return 0;
  return num / den;
}

/**
 * Lê um array de racionais contíguos.
 */
function readRationalArray(view: DataView, offset: number, count: number, littleEndian: boolean): number[] | null {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = readRational(view, offset + i * 8, littleEndian);
    if (val == null) return null;
    result.push(val);
  }
  return result;
}

/**
 * Lê uma string ASCII com tamanho fixo.
 */
function readAsciiString(view: DataView, offset: number, maxLength: number): string {
  let str = '';
  for (let i = 0; i < maxLength; i++) {
    if (offset + i >= view.byteLength) break;
    const charCode = view.getUint8(offset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}
