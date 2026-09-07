/**
 * Utilitário de compressão e otimização de imagens no navegador (Client-side).
 * Reduz fotos de alta resolução (câmera de 12-48MP) para formato compacto JPEG (~80KB),
 * viabilizando armazenamento seguro no IndexedDB e sincronização rápida em conexões 3G/4G.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0
}

/**
 * Converte um File, Blob ou string Base64 em imagem compactada (dataURL Base64 JPEG).
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.75 } = options;

  if (typeof window === 'undefined') {
    // Fallback caso executado em ambiente sem DOM
    if (typeof input === 'string') return input;
    return '';
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Mantém a proporção respeitando os limites máximos
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do Canvas para compressão.'));
          return;
        }

        // Configura renderização suave
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como JPEG otimizado
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Falha ao carregar imagem para compressão: ${String(err)}`));
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Falha ao ler arquivo de imagem.'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(input);
    }
  });
}
