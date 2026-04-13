import { useState } from "react";
import { Upload } from "tus-js-client";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth.store";

type UploadOptions = {
  lessonId?: string | null;
  endpoint?: string;
};

export const useTusUpload = ({ lessonId, endpoint = "/api/v1/admin/uploads" }: UploadOptions = {}) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null);

  const startUpload = (file: File) => {
    const nextUpload = new Upload(file, {
      endpoint,
      metadata: {
        filename: file.name,
        lessonId: lessonId ?? "",
        contentType: file.type || "application/octet-stream"
      },
      chunkSize: 1024 * 256,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      onError: (error) => {
        setIsUploading(false);
        toast.error(error.message);
      },
      onProgress: (uploaded, total) => {
        setBytesUploaded(uploaded);
        setBytesTotal(total);
        setProgress(total > 0 ? Math.round((uploaded / total) * 100) : 0);
      },
      onSuccess: () => {
        setIsUploading(false);
        toast.success("Video uploaded successfully. Processing...");
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
    startUpload,
    cancelUpload
  };
};
