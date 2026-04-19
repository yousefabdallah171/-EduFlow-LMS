import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import { api, queryClient } from "@/lib/api";

type LessonResource = {
  id: string;
  lessonId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  createdAt: string;
};

type AttachmentManagerProps = {
  lessonId?: string | null;
};

export const AttachmentManager = ({ lessonId }: AttachmentManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resourcesQuery = useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const response = await api.get<{ resources: LessonResource[] }>(
        `/admin/lessons/${lessonId}/resources`
      );
      return response.data.resources;
    },
    enabled: !!lessonId
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return api.post<LessonResource>(
        `/admin/lessons/${lessonId}/resources`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentComplete = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setUploadProgress(percentComplete);
            }
          }
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
      setUploading(false);
      setUploadProgress(0);
    },
    onError: () => {
      setUploading(false);
      setUploadProgress(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (resourceId: string) =>
      api.delete(`/admin/lessons/${lessonId}/resources/${resourceId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lessonId) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(apiError.response?.data?.message ?? "Failed to upload file.");
    }
    e.target.value = "";
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm("Delete this attachment?")) return;
    try {
      await deleteMutation.mutateAsync(resourceId);
    } catch (error) {
      const apiError = error as AxiosError<{ message?: string }>;
      toast.error(apiError.response?.data?.message ?? "Failed to delete attachment.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!lessonId) {
    return (
      <div
        className="rounded-[28px] border p-4 shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Select a lesson to manage attachments
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[28px] border p-4 shadow-card"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
        Attachments
      </h3>

      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
            Upload file
          </label>
          <input
            accept="*/*"
            className="block w-full rounded-lg border px-4 py-3 text-sm transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white"
            style={{
              borderColor: "var(--color-border-strong)",
              color: "var(--color-text-primary)",
              backgroundColor: "var(--color-surface-2)"
            }}
            disabled={uploading}
            type="file"
            onChange={(e) => void handleFileSelect(e)}
          />
        </div>

        {uploading ? (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Uploading...
              </span>
              <span className="tabular-nums text-sm font-bold text-brand-600">{uploadProgress}%</span>
            </div>
            <Progress className="h-2" value={uploadProgress} />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
          Files ({resourcesQuery.data?.length || 0})
        </h4>

        {resourcesQuery.data && resourcesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {resourcesQuery.data.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {resource.filename}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {formatBytes(resource.fileSize)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a
                    className="rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    href={resource.downloadUrl}
                    download={resource.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                  <button
                    className="rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(185,28,28)" }}
                    onClick={() => void handleDelete(resource.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No attachments yet. Upload files to get started.
          </p>
        )}
      </div>
    </div>
  );
};
