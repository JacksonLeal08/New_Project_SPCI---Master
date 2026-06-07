import { idb } from '@/lib/indexedDb';
import { supabase } from '@/lib/supabaseClient';

export interface PendingMediaTask {
  id: string;
  assetId: string;
  category: string;
  fileName: string;
  bucketName: string;
  fileData: string; // Base64 contendo a imagem compactada
}

export class MediaQueue {
  private static STORAGE_KEY = 'spci_media_queue';

  /**
   * Converte File/Blob para Base64 para salvar no IndexedDB.
   */
  static fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converte Base64 de volta para Blob para upload.
   */
  static base64ToBlob(base64: string, contentType = 'image/jpeg'): Blob {
    const parts = base64.split(',');
    const byteString = atob(parts[1] || parts[0]);
    const mimeString = parts[0].split(':')[1]?.split(';')[0] || contentType;
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  /**
   * Enfileira um novo upload de mídia.
   */
  static async enqueue(
    assetId: string, 
    category: string, 
    fileName: string, 
    file: File, 
    bucketName = 'fotos_extintores'
  ): Promise<void> {
    try {
      const base64Data = await this.fileToBase64(file);
      const queue = await this.getQueue();
      
      const newTask: PendingMediaTask = {
        id: `media-${assetId}-${Date.now()}`,
        assetId,
        category,
        fileName,
        bucketName,
        fileData: base64Data
      };

      queue.push(newTask);
      await idb.set('config', this.STORAGE_KEY, queue);
      console.log(`[MediaQueue] Imagem enfileirada para ${category}/${assetId}. Fila: ${queue.length}`);
    } catch (e) {
      console.error('[MediaQueue] Erro ao enfileirar mídia:', e);
    }
  }

  /**
   * Retorna a lista de tarefas pendentes de mídia.
   */
  static async getQueue(): Promise<PendingMediaTask[]> {
    try {
      const queue = await idb.get('config', this.STORAGE_KEY);
      return queue || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Processa a fila de mídia e faz upload das imagens ao restabelecer rede.
   */
  static async processQueue(onSuccess?: (task: PendingMediaTask, publicUrl: string) => void): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[MediaQueue] Processando ${queue.length} uploads de mídias offline pendentes...`);
    const succeededIds = new Set<string>();

    for (const task of queue) {
      try {
        const blob = this.base64ToBlob(task.fileData);
        
        // 1. Upload para o Supabase Storage
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(task.bucketName)
          .upload(task.fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        // 2. Obter URL pública do arquivo
        const { data: { publicUrl } } = supabase.storage
          .from(task.bucketName)
          .getPublicUrl(uploadData.path);

        // 3. Atualiza o registro correspondente
        const isExtintor = task.category.toLowerCase().includes('extintor');
        if (isExtintor) {
          await supabase
            .from('ativos_extintores')
            .update({ foto_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', task.assetId);
        } else {
          await supabase
            .from('assets')
            .update({ details: { foto_url: publicUrl }, updated_at: new Date().toISOString() })
            .eq('id', task.assetId);
        }

        console.log(`[MediaQueue] Sucesso no upload offline da imagem do ativo ${task.assetId}. URL: ${publicUrl}`);
        succeededIds.add(task.id);
        
        if (onSuccess) {
          onSuccess(task, publicUrl);
        }
      } catch (err) {
        console.error(`[MediaQueue] Erro ao enviar imagem do ativo ${task.assetId} à nuvem:`, err);
      }
    }

    // Filtra fila final
    const finalQueue = queue.filter(t => !succeededIds.has(t.id));
    await idb.set('config', this.STORAGE_KEY, finalQueue);
  }
}
