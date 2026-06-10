import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeInputText(str: string): string {
  if (!str) return "";
  // Converte para caixa alta, normaliza Unicode e remove acentuações/cedilha
  const normalized = str
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Mantém letras, números, espaços, hífen, pontos, barras e sublinhados
  return normalized.replace(/[^A-Z0-9\s\-._/]/g, "");
}

export function parseInmetroCode(scannedText: string): string {
  if (!scannedText) return "";
  
  const text = scannedText.trim();
  
  // Se for uma URL ou contiver domínio inmetro
  if (text.startsWith("http://") || text.startsWith("https://") || text.includes("inmetro.gov.br") || text.includes("selo.inmetro")) {
    try {
      // Adiciona protocolo se não tiver para o construtor URL
      const urlString = text.startsWith("http") ? text : `https://${text}`;
      const url = new URL(urlString);
      
      // Padrão 1: query parameter 'n' ou similar (ex: ?n=12345678)
      const nParam = url.searchParams.get("n") || url.searchParams.get("serie") || url.searchParams.get("num") || url.searchParams.get("codigo");
      if (nParam) {
        return nParam.trim();
      }
      
      // Padrão 2: último segmento da URL (ex: https://selo.inmetro.gov.br/123456789)
      const pathSegments = url.pathname.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (/^\d+$/.test(lastSegment) || /^[A-Z0-9-]+$/i.test(lastSegment)) {
          return lastSegment.trim();
        }
      }
    } catch (e) {
      console.warn("Falha ao parsear URL do selo, usando fallback de regex", e);
    }
    
    // Fallback regex para extrair números/dígitos consecutivos longos (selo do INMETRO costuma ter de 5 a 10 dígitos)
    const match = text.match(/(\d{6,10})/);
    if (match) {
      return match[1];
    }
  }

  // Retorna texto limpo (apenas alfanumérico e hífens se for código puro)
  return text.replace(/[^a-zA-Z0-9-]/g, '').trim();
}

/**
 * Extrai o ID ou Hash correspondente a partir de uma URL completa de acesso ou consulta.
 * Caso o texto não seja uma URL, retorna o próprio texto original limpo.
 */
export function extractIdOrHashFromUrl(code: string): string {
  if (!code) return "";
  const trimmed = code.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const pathname = url.pathname;
      
      // Caso 1: /qr/[hash]
      if (pathname.includes('/qr/')) {
        const parts = pathname.split('/qr/');
        if (parts[1]) {
          return parts[1].split('?')[0].split('/')[0];
        }
      }
      
      // Caso 2: /inspecao/[id]
      if (pathname.includes('/inspecao/')) {
        const parts = pathname.split('/inspecao/');
        if (parts[1]) {
          const val = parts[1].split('?')[0].split('/')[0];
          if (val && val !== 'novo') {
            return val;
          }
        }
      }

      // Caso 3: /public/extintores/[hash]
      if (pathname.includes('/public/extintores/')) {
        const parts = pathname.split('/public/extintores/');
        if (parts[1]) {
          return parts[1].split('?')[0].split('/')[0];
        }
      }
    } catch (e) {
      console.warn('[QR Scanner] Erro ao analisar URL:', e);
    }
  }
  return trimmed;
}



