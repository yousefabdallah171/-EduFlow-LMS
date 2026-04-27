import { useState } from "react";
import { Upload } from "tus-js-client";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth.store";

type UploadOptions = {
  lessonId?: string | null;
  folderId?: string;
  title?: string;
  mediaType?: string;
  endpoint?: string;
};

type UploadCallbacks = {
  onSuccess?: (uploadId: string) => void;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onError?: (error: Error) => void;
};

export const useTusUpload = (
  { lessonId, folderId, title, mediaType, endpoint = "/api/v1/admin/uploads" }: UploadOptions = {},
  callbacks: UploadCallbacks = {}
) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null);

  const startUpload = (file: File, options?: { folderId?: string; title?: string; mediaType?: string }) => {
    const nextUpload = new Upload(file, {
      endpoint,
      metadata: {
        filename: file.name,
        lessonId: lessonId ?? "",
        contentType: file.type || "application/octet-stream",
        folderId: options?.folderId ?? folderId ?? "",
        title: options?.title ?? title ?? file.name,
        mediaType: options?.mediaType ?? mediaType ?? ""
      },
      chunkSize: 1024 * 256,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      onError: (error) => {
        setIsUploading(false);
        const err = new Error(error.message);
        callbacks.onError?.(err);
        toast.error(error.message);
      },
      onProgress: (uploaded, total) => {
        setBytesUploaded(uploaded);
        setBytesTotal(total);
        setProgress(total > 0 ? Math.round((uploaded / total) * 100) : 0);
        callbacks.onProgress?.(uploaded, total);
      },
      onSuccess: () => {
        setIsUploading(false);
        const uploadId = (nextUpload as any).uploadUrl || file.name || "upload";
        callbacks.onSuccess?.(uploadId);
        toast.success("File uploaded successfully. Processing...");
      }
    });

    setUpload(nextUpload);
    setProgress(0);
    setBytesUploaded(0);
    setBytesTotal(file.size);
    setIsUploading(true);
    nextUpload.start();
  };

  const cancelUpload = async () => {
    if (!upload) {
      return;
    }

    try {
      await upload.abort(true);
      toast.info("Upload cancelled.");
    } finally {
      setIsUploading(false);
      setUpload(null);
      setProgress(0);
    }
  };

  return {
    progress,
    bytesUploaded,
    bytesTotal,
    isUploading,
    upload,
    startUpload,
    cancelUpload
  };
};
