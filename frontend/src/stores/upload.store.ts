import { create } from "zustand";
import { Upload } from "tus-js-client";

export enum MediaType {
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  PDF = "PDF",
  DOCUMENT = "DOCUMENT",
  OTHER = "OTHER"
}

export type UploadQueueItem = {
  id: string;
  file: File;
  filename: string;
  type: MediaType;
  title?: string;
  folderId?: string;
  status: "queued" | "uploading" | "processing" | "done" | "error" | "paused";
  progress: number; // 0–100
  bytesUploaded: number;
  bytesTotal: number;
  tusUpload?: Upload;
  error?: string;
  mediaFileId?: string;
  createdAt: Date;
};

type UploadQueueState = {
  queue: UploadQueueItem[];
  activeUploadId: string | null;
  isQueueOpen: boolean;

  // Actions
  addFiles: (files: File[], options?: { folderId?: string; title?: string }) => void;
  updateItemProgress: (id: string, progress: number, bytesUploaded: number) => void;
  updateItemStatus: (
    id: string,
    status: UploadQueueItem["status"],
    error?: string
  ) => void;
  setTusUpload: (id: string, tusUpload: Upload) => void;
  setMediaFileId: (id: string, mediaFileId: string) => void;
  removeItem: (id: string) => void;
  clearDone: () => void;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  startNext: () => void;
  toggleQueue: () => void;
  getNextQueuedItem: () => UploadQueueItem | null;
};

const detectMediaType = (file: File): MediaType => {
  const mimeType = String(file.type ?? "").toLowerCase();

  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType.startsWith("image/")) return MediaType.IMAGE;
  if (mimeType === "application/pdf") return MediaType.PDF;
  if (
    mimeType === "application/msword" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("spreadsheetml") ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return MediaType.DOCUMENT;
  }

  return MediaType.OTHER;
};

export const useUploadStore = create<UploadQueueState>((set, get) => ({
  queue: [],
  activeUploadId: null,
  isQueueOpen: false,

  addFiles: (files, options) => {
    const newItems: UploadQueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      filename: file.name,
      type: detectMediaType(file),
      title: options?.title || file.name,
      folderId: options?.folderId,
      status: "queued" as const,
      progress: 0,
      bytesUploaded: 0,
      bytesTotal: file.size,
      createdAt: new Date()
    }));

    set((state) => ({
      queue: [...state.queue, ...newItems],
      isQueueOpen: true
    }));

    // Start first upload if none active
    const state = get();
    if (!state.activeUploadId) {
      get().startNext();
    }
  },

  updateItemProgress: (id, progress, bytesUploaded) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? { ...item, progress: Math.min(progress, 100), bytesUploaded }
          : item
      )
    }));
  },

  updateItemStatus: (id, status, error) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status, error } : item
      )
    }));

    // Auto-start next when one completes
    if (status === "done" || status === "error") {
      const state = get();
      if (state.activeUploadId === id) {
        get().startNext();
      }
    }
  },

  setTusUpload: (id, tusUpload) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, tusUpload } : item
      )
    }));
  },

  setMediaFileId: (id, mediaFileId) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, mediaFileId } : item
      )
    }));
  },

  removeItem: (id) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id)
    }));
  },

  clearDone: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== "done")
    }));
  },

  pauseUpload: (id) => {
    set((state) => {
      const item = state.queue.find((i) => i.id === id);
      if (item?.tusUpload) {
        item.tusUpload.abort();
      }
      return {
        queue: state.queue.map((i) =>
          i.id === id ? { ...i, status: "paused" as const } : i
        )
      };
    });
  },

  resumeUpload: (id) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status: "queued" as const } : item
      )
    }));
    get().startNext();
  },

  cancelUpload: (id) => {
    set((state) => {
      const item = state.queue.find((i) => i.id === id);
      if (item?.tusUpload) {
        item.tusUpload.abort();
      }
      return {
        queue: state.queue.filter((i) => i.id !== id),
        activeUploadId: state.activeUploadId === id ? null : state.activeUploadId
      };
    });
  },

  getNextQueuedItem: () => {
    const state = get();
    return state.queue.find((item) => item.status === "queued") || null;
  },

  startNext: () => {
    const state = get();
    const nextItem = state.getNextQueuedItem();

    if (nextItem) {
      set({ activeUploadId: nextItem.id });
    } else {
      set({ activeUploadId: null });
    }
  },

  toggleQueue: () => {
    set((state) => ({
      isQueueOpen: !state.isQueueOpen
    }));
  }
}));
