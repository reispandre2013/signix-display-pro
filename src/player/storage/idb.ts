const DB_NAME = "signix-player-db";
const DB_VERSION = 1;

const STORE_MEDIA = "media";
const STORE_KV = "kv";
const STORE_LOGS = "logs";

type StoreName = typeof STORE_MEDIA | typeof STORE_KV | typeof STORE_LOGS;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA);
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export const idbStore = {
  async getKv<T>(key: string): Promise<T | undefined> {
    const value = await withStore<unknown>(STORE_KV, "readonly", (store) => store.get(key));
    return value as T | undefined;
  },
  async setKv<T>(key: string, value: T): Promise<void> {
    await withStore(STORE_KV, "readwrite", (store) => store.put(value, key));
  },
  async deleteKv(key: string): Promise<void> {
    await withStore(STORE_KV, "readwrite", (store) => store.delete(key));
  },
  async getMedia(key: string): Promise<Blob | undefined> {
    const value = await withStore<unknown>(STORE_MEDIA, "readonly", (store) => store.get(key));
    return value as Blob | undefined;
  },
  async setMedia(key: string, blob: Blob): Promise<void> {
    await withStore(STORE_MEDIA, "readwrite", (store) => store.put(blob, key));
  },
  async deleteMedia(key: string): Promise<void> {
    await withStore(STORE_MEDIA, "readwrite", (store) => store.delete(key));
  },
  async clearMedia(): Promise<void> {
    await withStore(STORE_MEDIA, "readwrite", (store) => store.clear());
  },
  async listMediaKeys(): Promise<string[]> {
    const keys = await withStore<unknown[]>(STORE_MEDIA, "readonly", (store) => store.getAllKeys());
    return (keys ?? []).map((k) => String(k));
  },
  async setLog<T extends { id: string }>(log: T): Promise<void> {
    await withStore(STORE_LOGS, "readwrite", (store) => store.put(log));
  },
  async deleteLog(id: string): Promise<void> {
    await withStore(STORE_LOGS, "readwrite", (store) => store.delete(id));
  },
  async getAllLogs<T extends { id: string }>(): Promise<T[]> {
    const rows = await withStore<unknown[]>(STORE_LOGS, "readonly", (store) => store.getAll());
    return rows as T[];
  },
  async clearAll(): Promise<void> {
    await withStore(STORE_MEDIA, "readwrite", (store) => store.clear());
    await withStore(STORE_KV, "readwrite", (store) => store.clear());
    await withStore(STORE_LOGS, "readwrite", (store) => store.clear());
  },
};
