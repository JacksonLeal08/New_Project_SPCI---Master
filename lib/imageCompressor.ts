/**
 * Utilitário para compactar imagens no navegador utilizando a API Canvas do HTML5.
 * Reduz a resolução e a qualidade para economizar espaço no IndexedDB e tráfego de rede.
 */
export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
}

/**
 * Compacta uma imagem selecionada pelo usuário.
 * @param file O arquivo File original do input.
 * @param maxWidth Largura máxima permitida (default: 1280px).
 * @param maxHeight Altura máxima permitida (default: 720px).
 * @param quality Qualidade do JPEG resultante de 0.0 a 1.0 (default: 0.7).
 */
export function compressImage(
  file: File, 
  maxWidth = 1280, 
  maxHeight = 720, 
  quality = 0.7
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo fornecido não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Mantém a proporção da imagem ao redimensionar
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

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao obter o contexto 2D do Canvas.'));
          return;
        }

        // Desenha a imagem redimensionada no Canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Exporta como JPEG compactado
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao gerar o Blob da imagem compactada.'));
              return;
            }

            // Cria um novo arquivo File a partir do Blob
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            const originalSizeKb = file.size / 1024;
            const compressedSizeKb = compressedFile.size / 1024;
            const reductionPercentage = Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100);
            const previewUrl = URL.createObjectURL(compressedFile);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSizeKb,
              compressedSizeKb,
              reductionPercentage: Math.max(0, reductionPercentage)
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
