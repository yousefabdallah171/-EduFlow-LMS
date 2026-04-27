import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR";

interface MediaFile {
  id: string;
  title: string;
  type: string;
  status: MediaStatus;
  originalFilename: string;
  storagePath: string | null;
  hlsPath: string | null;
  durationSeconds: number | null;
  mimeType: string | null;
  sizeBytes: bigint;
  errorMessage: string | null;
  folderId: string | null;
  uploadedById: string;
  tusUploadId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaFile: MediaFile) => void;
  mediaType?: "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT";
}

type MediaFileWithUploader = MediaFile & {
  uploadedBy?: { fullName: string; email: string };
};

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  mediaType = "VIDEO"
}: MediaPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const mediaTypeLabel = String(mediaType ?? "VIDEO").toLowerCase();

  const { data: filesData, isLoading } = useQuery({
    queryKey: ["media-picker", mediaType, searchQuery],
    queryFn: () =>
      api
        .get<{ data: MediaFileWithUploader[] }>("/admin/media", {
          params: {
            type: mediaType,
            status: "READY",
            search: searchQuery || undefined
          }
        })
        .then((r) => r.data),
    enabled: isOpen
  });

  if (!isOpen) return null;

  const files = filesData?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pick a {mediaTypeLabel} file
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Files list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No {mediaTypeLabel} files available</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelect(file);
                    onClose();
                    toast.success("File selected");
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {file.uploadedBy?.fullName} •{" "}
                      {formatBytes(Number(file.sizeBytes))}
                    </p>
                    {file.durationSeconds && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Duration: {Math.round(file.durationSeconds / 60)}m{" "}
                        {file.durationSeconds % 60}s
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      READY
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
