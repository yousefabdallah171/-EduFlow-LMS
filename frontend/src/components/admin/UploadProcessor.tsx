import { useEffect } from "react";
import { useUploadStore } from "@/stores/upload.store";
import { useTusUpload } from "@/hooks/useTusUpload";

export function UploadProcessor() {
  const { queue, activeUploadId, updateItemProgress, updateItemStatus, startNext } = useUploadStore();

  const activeItem = queue.find((item) => item.id === activeUploadId);

  const { startUpload } = useTusUpload(
    {
      endpoint: "/api/v1/admin/uploads"
    },
    {
      onSuccess: () => {
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
  }, [activeItem, activeUploadId, startUpload, updateItemStatus]);

  return null;
}
