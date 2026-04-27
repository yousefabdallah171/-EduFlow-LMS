import { useState } from "react";
import { Trash2, Link2, Move, Edit2, CheckCircle, Clock, AlertCircle } from "lucide-react";

type MediaType = "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT" | "OTHER";
type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR";

interface MediaFile {
  id: string;
  title: string;
  type: MediaType;
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

interface MediaCardProps {
  file: MediaFile & { uploadedBy?: { fullName: string; email: string } };
  onDelete: (id: string) => void;
  onLink: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, folderId: string | null) => void;
}

const mediaTypeIcons: Record<MediaType, string> = {
  VIDEO: "🎬",
  IMAGE: "🖼️",
  PDF: "📄",
  DOCUMENT: "📑",
  OTHER: "📦"
};

const statusColors: Record<MediaStatus, string> = {
  UPLOADING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PROCESSING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  READY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ERROR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

export function MediaCard({ file, onDelete, onLink, onRename, onMove }: MediaCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(file.title);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== file.title) {
      onRename(file.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case "READY":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "PROCESSING":
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case "ERROR":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700">
      {/* Header with type and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mediaTypeIcons[file.type]}</span>
          <div className="flex flex-col gap-1">
            {isRenaming ? (
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                className="text-sm font-medium bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-300 dark:border-blue-600"
              />
            ) : (
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                {file.title}
              </h3>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(Number(file.sizeBytes))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-xs px-2 py-1 rounded ${statusColors[file.status]}`}>
            {file.status}
          </span>
        </div>
      </div>

      {/* File info */}
      {file.durationSeconds && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Duration: {Math.round(file.durationSeconds / 60)}m {file.durationSeconds % 60}s
        </p>
      )}

      {file.errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2 truncate">
          Error: {file.errorMessage}
        </p>
      )}

      {file.uploadedBy && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          by {file.uploadedBy.fullName}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!isRenaming && (
          <>
            <button
              onClick={() => setIsRenaming(true)}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Rename
            </button>
            {file.status === "READY" && (
              <button
                onClick={() => onLink(file.id)}
                className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" /> Link to lesson
              </button>
            )}
            <button
              onClick={() => onDelete(file.id)}
              className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
