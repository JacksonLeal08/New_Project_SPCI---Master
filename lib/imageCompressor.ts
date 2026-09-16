/**
 * SPCI Master - Engine de Compressão Inteligente de Imagens (Client-Side)
 * Otimizado para Mobile e Web conforme padrões 'mobile-design' e 'web-design-master'.
 * Reduz fotos de 5-15MB para ~180-350KB preservando nitidez de lacres, manômetros e QR Codes.
 */

export interface CompressionResult {
  file: File;
  base64: string;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Converte qualquer entrada (File, Blob ou Base64) em imagem compactada de alta performance.
 */
export async function compressImage(
  input: File | Blob | string,
  maxWidthOrOptions: number | CompressionOptions = 1280,
  maxHeight = 1280,
  quality = 0.78
): Promise<CompressionResult> {
  // Tratamento polimórfico de parâmetros (suporta legado e novo objeto de opções)
  let maxWidth = 1280;
  if (typeof maxWidthOrOptions === 'object' && maxWidthOrOptions !== null) {
    maxWidth = maxWidthOrOptions.maxWidth ?? 1280;
    maxHeight = maxWidthOrOptions.maxHeight ?? 1280;
    quality = maxWidthOrOptions.quality ?? 0.78;
  } else if (typeof maxWidthOrOptions === 'number') {
    maxWidth = maxWidthOrOptions;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('A compressão de imagens só pode ser executada no navegador (client-side).'));
      return;
    }

    let originalSizeKb = 0;
    let fileName = `foto_spci_${Date.now()}.jpg`;

    if (input instanceof File) {
      originalSizeKb = input.size / 1024;
      fileName = input.name.replace(/\.[^/.]+$/, '') + '.jpg';
    } else if (input instanceof Blob) {
      originalSizeKb = input.size / 1024;
    } else if (typeof input === 'string') {
      // Estima o tamanho original a partir do Base64
      originalSizeKb = (input.length * 0.75) / 1024;
    }

    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;

        // Mantém a proporção exata respeitando a resolução máxima para inspeção técnica
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          throw new Error('Falha ao instanciar contexto 2D do Canvas.');
        }

        // Renderização suave de alta fidelidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Preenche fundo branco para evitar artefatos pretos em PNGs transparentes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Gera Base64 em JPEG com a qualidade definida
        const base64 = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback se toBlob falhar
              const byteCharacters = atob(base64.split(',')[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const fallbackBlob = new Blob([byteArray], { type: 'image/jpeg' });
              const file = new File([fallbackBlob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
              const compressedSizeKb = file.size / 1024;
              const reduction = Math.max(0, Math.round(((originalSizeKb - compressedSizeKb) / (originalSizeKb || 1)) * 100));

              resolve({
                file,
                base64,
                previewUrl: URL.createObjectURL(file),
                originalSizeKb: Math.round(originalSizeKb),
                compressedSizeKb: Math.round(compressedSizeKb),
                reductionPercentage: reduction,
                width,
                height,
              });
              return;
            }

            const file = new File([blob], fileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const compressedSizeKb = file.size / 1024;
            const reduction = Math.max(
              0,
              Math.round(((originalSizeKb - compressedSizeKb) / (originalSizeKb || compressedSizeKb || 1)) * 100)
            );
            const previewUrl = URL.createObjectURL(file);

            resolve({
              file,
              base64,
              previewUrl,
              originalSizeKb: Math.round(originalSizeKb),
              compressedSizeKb: Math.round(compressedSizeKb),
              reductionPercentage: reduction,
              width,
              height,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Erro ao processar imagem para compressão: ${String(err)}`));
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Falha ao decodificar arquivo binário.'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Formata bytes/KB em texto legível para o usuário (ex: 5.2 MB ou 280 KB).
 */
export function formatFileSize(kb: number): string {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kb)} KB`;
}
