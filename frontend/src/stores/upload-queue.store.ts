import { create } from "zustand";

import { indexedDbUploadState } from "@/lib/indexeddb-upload-state";
import { uploadConfig } from "@/lib/upload-config";
import type { UploadQueueItem, UploadQueueState, UploadQueueItemStatus } from "@/types/upload-queue";

type UploadQueueStore = UploadQueueState & {
  initialized: boolean;
  initialize: () => Promise<void>;
  enqueue: (items: UploadQueueItem[]) => void;
  updateItem: (localId: string, patch: Partial<UploadQueueItem>) => void;
  removeItem: (localId: string) => void;
  setOnline: (online: boolean) => void;
  setActiveCount: (activeCount: number) => void;
  retryItem: (localId: string) => void;
  retryAllFailed: () => void;
};

const persistItem = async (item: UploadQueueItem) => {
  await indexedDbUploadState.upsertItem(item);
};

const deleteItem = async (localId: string) => {
  await indexedDbUploadState.removeItem(localId);
};

const isRetryableStatus = (status: UploadQueueItemStatus) => status === "failed" || status === "offline";

export const useUploadQueueStore = create<UploadQueueStore>((set, get) => ({
  items: [],
  online: typeof window === "undefined" ? true : window.navigator.onLine,
  activeCount: 0,
  maxConcurrency: uploadConfig.maxConcurrency,
  initialized: false,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    const persistedItems = await indexedDbUploadState.getAllItems();
    set({
      items: persistedItems.map((item) => ({
        ...item,
        status: item.status === "uploading" ? "queued" : item.status
      })),
      initialized: true
    });
  },

  enqueue: (items) => {
    set((state) => {
      const nextItems = [...state.items, ...items];
      void Promise.all(items.map((item) => persistItem(item)));
      return {
        items: nextItems
      };
    });
  },

  updateItem: (localId, patch) => {
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        const nextItem: UploadQueueItem = {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString()
        };
        void persistItem(nextItem);
        return nextItem;
      });

      return { items: nextItems };
    });
  },

  removeItem: (localId) => {
    set((state) => ({
      items: state.items.filter((item) => item.localId !== localId)
    }));
    void deleteItem(localId);
  },

  setOnline: (online) => {
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (online && item.status === "offline") {
          const resumedItem = { ...item, status: "queued" as const, updatedAt: new Date().toISOString() };
          void persistItem(resumedItem);
          return resumedItem;
        }

        if (!online && item.status === "uploading") {
          const pausedItem = { ...item, status: "offline" as const, updatedAt: new Date().toISOString() };
          void persistItem(pausedItem);
          return pausedItem;
        }

        return item;
      });

      return { online, items: nextItems };
    });
  },

  setActiveCount: (activeCount) => {
    set({ activeCount });
  },

  retryItem: (localId) => {
    const item = get().items.find((entry) => entry.localId === localId);
    if (!item || !isRetryableStatus(item.status)) {
      return;
    }

    get().updateItem(localId, {
      status: "queued",
      retryAttempt: 0,
      errorCode: null,
      errorMessage: null
    });
  },

  retryAllFailed: () => {
    const failedIds = get().items.filter((item) => isRetryableStatus(item.status)).map((item) => item.localId);
    for (const localId of failedIds) {
      get().retryItem(localId);
    }
  }
}));
