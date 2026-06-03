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

