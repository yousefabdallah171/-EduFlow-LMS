import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Upload as UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaCard } from "@/components/admin/MediaCard";
import { FolderTree } from "@/components/admin/FolderTree";
import { UploadQueue } from "@/components/admin/UploadQueue";
import { UploadProcessor } from "@/components/admin/UploadProcessor";
import { FileDropZone } from "@/components/shared/FileDropZone";
import { api } from "@/lib/api";
import { useUploadStore } from "@/stores/upload.store";
import { useAuthStore } from "@/stores/auth.store";
import { useTusUpload } from "@/hooks/useTusUpload";
import { resolveLocale } from "@/lib/locale";

type MediaType = "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT" | "OTHER" | "ALL";
type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR" | "ALL";

interface MediaFile {
  id: string;
  title: string;
  type: string;
  status: string;
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

interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: Date;
}

type MediaFileWithUploader = MediaFile & {
  uploadedBy?: { fullName: string; email: string };
};

export const AdminMediaLibrary = () => {
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const qc = useQueryClient();
  const { addFiles } = useUploadStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MediaType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<MediaStatus | "ALL">("ALL");

  // Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ["media-folders"],
    queryFn: () =>
      api.get<{ data: MediaFolder[] }>("/admin/media/folders").then((r) => r.data)
  });

  // Fetch media files with filters
  const { data: filesData, isLoading } = useQuery({
    queryKey: [
      "media-files",
      selectedFolderId,
      filterType,
      filterStatus,
      searchQuery
    ],
    queryFn: () =>
      api
        .get<{
          data: MediaFileWithUploader[];
          total: number;
        }>("/admin/media", {
          params: {
            folderId: selectedFolderId || undefined,
            type: filterType !== "ALL" ? filterType : undefined,
            status: filterStatus !== "ALL" ? filterStatus : undefined,
            search: searchQuery || undefined
          }
        })
        .then((r) => r.data)
  });

  // Mutations
  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/media/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media-files"] });
      toast.success("File deleted");
    },
    onError: () => toast.error("Failed to delete file")
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/admin/media/${id}`, { title }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media-files"] });
      toast.success("File renamed");
    },
    onError: () => toast.error("Failed to rename file")
  });

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      api.post("/admin/media/folders", { name, parentId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media-folders"] });
      toast.success("Folder created");
    },
    onError: () => toast.error("Failed to create folder")
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/media/folders/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media-folders"] });
      toast.success("Folder deleted");
    },
    onError: () => toast.error("Failed to delete folder")
  });

  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      addFiles(files, { folderId: selectedFolderId || undefined });
    },
    [selectedFolderId, addFiles]
  );

  const files = filesData?.data ?? [];
  const folders = foldersData?.data ?? [];

  const stats = {
    ready: files.filter((f) => f.status === "READY").length,
    processing: files.filter((f) => f.status === "PROCESSING").length,
    error: files.filter((f) => f.status === "ERROR").length
  };

  return (
    <AdminShell title={t("admin.media.title")} description={t("admin.media.desc")}>
      <UploadProcessor />
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              {isAr ? "جاهز" : "Ready"}
            </p>
            <p
              className="mt-2 font-display text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {stats.ready}
            </p>
          </div>
          <div className="dashboard-panel p-5">
            <p
              className="text-xs font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {isAr ? "قيد المعالجة" : "Processing"}
            </p>
            <p
              className="mt-2 font-display text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {stats.processing}
            </p>
          </div>
          <div className="dashboard-panel p-5">
            <p
              className="text-xs font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {isAr ? "أخطاء" : "Errors"}
            </p>
            <p
              className="mt-2 font-display text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {stats.error}
            </p>
          </div>
        </div>

        {/* Main content area */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar: Folders */}
          <div className="lg:col-span-1">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={(name, parentId) =>
                createFolderMutation.mutate({ name, parentId })
              }
              onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
            />
          </div>

          {/* Main: Files and upload */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload zone and search */}
            <div className="space-y-4">
              <FileDropZone
                onFilesDrop={handleFilesDrop}
                disabled={false}
                accept="video/*,image/*,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />

              {/* Filters and search */}
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={isAr ? "البحث في المكتبة..." : "Search library..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>

                {/* Type filter */}
                <div className="flex gap-2 flex-wrap">
                  {(["ALL", "VIDEO", "IMAGE", "PDF", "DOCUMENT"] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          filterType === type
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {type === "ALL" ? "All Types" : type}
                      </button>
                    )
                  )}
                </div>

                {/* Status filter */}
                <div className="flex gap-2 flex-wrap">
                  {(["ALL", "READY", "PROCESSING", "ERROR"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          filterStatus === status
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {status === "ALL" ? "All Status" : status}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Files grid */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterType !== "ALL" || filterStatus !== "ALL"
                    ? isAr
                      ? "لا توجد ملفات تطابق المعايير"
                      : "No files match your filters"
                    : isAr
                      ? "لا توجد ملفات بعد. ابدأ بتحميل ملفات جديدة"
                      : "No files yet. Start by uploading some files"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((file: any) => (
                  <MediaCard
                    key={file.id}
                    file={file}
                    onDelete={(id) => deleteFileMutation.mutate(id)}
                    onLink={(id) => {
                      // TODO: Open modal to link to lesson
                      toast.info("Lesson linking coming soon");
                    }}
                    onRename={(id, title) =>
                      renameFileMutation.mutate({ id, title })
                    }
                    onMove={(id, folderId) => {
                      // TODO: Move to folder
                      toast.info("Move coming soon");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload queue panel */}
      <UploadQueue />
    </AdminShell>
  );
};
