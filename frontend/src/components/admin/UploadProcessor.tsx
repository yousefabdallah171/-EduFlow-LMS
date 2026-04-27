import { useEffect } from "react";
import { useUploadStore } from "@/stores/upload.store";
import { useTusUpload } from "@/hooks/useTusUpload";
import { toast } from "sonner";

export function UploadProcessor() {
  const { queue, activeUploadId, updateItemProgress, updateItemStatus, setTusUpload, startNext } = useUploadStore();

  const activeItem = queue.find((item) => item.id === activeUploadId);

  const { startUpload } = useTusUpload(
    {
      endpoint: "/api/v1/admin/uploads"
    },
    {
      onSuccess: (uploadId) => {
        if (activeUploadId) {
          updateItemStatus(activeUploadId, "processing");
          setTimeout(() => {
            startNext();
          }, 1000);
        }
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (activeUploadId) {
          const progress = Math.round((bytesUploaded / bytesTotal) * 100);
          updateItemProgress(activeUploadId, progress, bytesUploaded);
        }
      },
      onError: (error) => {
        if (activeUploadId) {
          updateItemStatus(activeUploadId, "error", error.message);
          setTimeout(() => {
            startNext();
          }, 1000);
        }
      }
    }
  );

  useEffect(() => {
    if (activeItem && activeItem.status === "queued") {
      updateItemStatus(activeItem.id, "uploading");

      startUpload(activeItem.file, {
        folderId: activeItem.folderId,
        title: activeItem.title,
        mediaType: activeItem.type.toString()
      });
    }
  }, [activeUploadId, activeItem]);

  return null;
}
