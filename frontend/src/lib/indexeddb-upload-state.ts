import type { UploadQueueItem } from "@/types/upload-queue";

const DB_NAME = "eduflow-upload-queue";
const DB_VERSION = 1;
const STORE_NAME = "queue_items";

type PersistedUploadQueueItem = UploadQueueItem & {
  fileHandleKey?: string | null;
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });

const runReadWrite = async <T>(work: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    work(store, tx)
      .then((result) => {
        tx.oncomplete = () => resolve(result);
      })
      .catch((error) => reject(error));

    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
  });
};

export const indexedDbUploadState = {
  async upsertItem(item: PersistedUploadQueueItem): Promise<void> {
    await runReadWrite(
      async (store) =>
        await new Promise<void>((resolve, reject) => {
          const request = store.put(item);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error ?? new Error("Failed to persist upload item."));
        })
    );
  },

  async removeItem(localId: string): Promise<void> {
    await runReadWrite(
      async (store) =>
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(localId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error ?? new Error("Failed to delete upload item."));
        })
    );
  },

  async clearAll(): Promise<void> {
    await runReadWrite(
      async (store) =>
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error ?? new Error("Failed to clear persisted queue."));
        })
    );
  },

  async getAllItems(): Promise<PersistedUploadQueueItem[]> {
    const db = await openDb();

    return await new Promise<PersistedUploadQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as PersistedUploadQueueItem[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to read persisted queue."));
    });
  }
};

export type { PersistedUploadQueueItem };
