/**
 * Utilitário IndexedDB nativo e assíncrono para o cache local do SPCI.
 * Substitui o LocalStorage para contornar o limite de 5MB.
 */

const DB_NAME = 'SPCI_Local_Database';
const DB_VERSION = 1;

export interface IDBHelper {
  init(): Promise<IDBDatabase>;
  get(storeName: string, key: string): Promise<any>;
  set(storeName: string, key: string, value: any): Promise<void>;
  getAll(storeName: string): Promise<any[]>;
  setAll(storeName: string, items: any[]): Promise<void>;
  remove(storeName: string, key: string): Promise<void>;
  clear(storeName: string): Promise<void>;
}

export const getIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB não está disponível no servidor'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      // Cria lojas de objetos para cada recurso
      const stores = [
        'extintores',
        'hidrantes',
        'sinalizacoes',
        'iluminacao',
        'bombas',
        'config', // Para sheetsConfig e templates
        'logs'    // Para logs de console
      ];

      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          // Usamos id como chave ou armazenamos chave/valor genérico
          db.createObjectStore(store);
        }
      });
    };
  });
};

export const idb = {
  async get(storeName: string, key: string): Promise<any> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async set(storeName: string, key: string, value: any): Promise<void> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async getAll(storeName: string): Promise<any[]> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async setAll(storeName: string, items: any[]): Promise<void> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Limpa antes de persistir a lista completa
      store.clear();
      
      items.forEach((item, index) => {
        // Se o item tem id corporativo ou id único, usamos como chave, senão index
        const key = item.id || `item-${index}-${Date.now()}`;
        store.put(item, key);
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  },

  async remove(storeName: string, key: string): Promise<void> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async clear(storeName: string): Promise<void> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
};
