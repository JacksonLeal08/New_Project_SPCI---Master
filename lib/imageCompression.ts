/**
 * Adaptador de compatibilidade para compressão de imagens.
 * Encaminha para o motor unificado em @/lib/imageCompressor.
 */

import { compressImage as unifiedCompressImage, CompressionOptions as UnifiedOptions } from './imageCompressor';

export type CompressionOptions = UnifiedOptions;

export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  if (typeof window === 'undefined') {
    if (typeof input === 'string') return input;
    return '';
  }

  const result = await unifiedCompressImage(input, options);
  return result.base64;
}
