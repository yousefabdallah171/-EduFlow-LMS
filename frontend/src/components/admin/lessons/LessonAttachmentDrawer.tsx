import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

type Attachment = {
  id: string;
  mediaAssetId: string;
  role: "PRIMARY_VIDEO" | "SUPPLEMENTAL";
  isActive: boolean;
  mappingSource: "MANUAL" | "AUTO_MATCH" | "BULK_REVIEWED";
  mediaAsset?: {
    id: string;
    title: string;
    originalFilename: string;
    status: string;
    type: "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT" | "OTHER";
    mimeType: string | null;
  };
};

type MediaAsset = {
  id: string;
  title: string;
  originalFilename: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  type: "VIDEO" | "IMAGE" | "PDF" | "DOCUMENT" | "OTHER";
};

type LessonAttachmentDrawerProps = {
  lessonId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAttached?: () => void;
};

export function LessonAttachmentDrawer({ lessonId, isOpen, onClose, onAttached }: LessonAttachmentDrawerProps) {
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [role, setRole] = useState<"PRIMARY_VIDEO" | "SUPPLEMENTAL">("SUPPLEMENTAL");

  const attachmentQuery = useQuery({
    queryKey: ["lesson-attachments", lessonId],
    queryFn: async () => {
      const response = await api.get<{ lessonId: string; attachments: Attachment[] }>(`/admin/lessons/${lessonId}/media`);
      return response.data.attachments;
    },
    enabled: isOpen && Boolean(lessonId)
  });

  const mediaQuery = useQuery({
    queryKey: ["lesson-attachment-candidates", role],
    queryFn: async () => {
      const response = await api.get<{ items: MediaAsset[] }>("/admin/media-library", {
        params: {
          status: "READY",
          page: 1,
          pageSize: 200,
          ...(role === "PRIMARY_VIDEO" ? { type: "VIDEO" } : {})
        }
      });
      return response.data.items;
    },
    enabled: isOpen
  });

  const attachMutation = useMutation({
    mutationFn: async (nextMediaAssetId: string) => {
      if (!lessonId) {
        throw new Error("LESSON_ID_REQUIRED");
      }
      return api.put(`/admin/lessons/${lessonId}/media/${nextMediaAssetId}`, { role });
    },
    onSuccess: async () => {
      toast.success("Lesson attachment updated");
      await attachmentQuery.refetch();
      onAttached?.();
      setMediaAssetId("");
    },
    onError: () => {
      toast.error("Failed to attach media asset");
    }
  });

  const attachments = useMemo(() => attachmentQuery.data ?? [], [attachmentQuery.data]);

  if (!isOpen || !lessonId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Lesson Attachment</h3>
          <button
            type="button"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Attachment Role
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as "PRIMARY_VIDEO" | "SUPPLEMENTAL";
                setRole(nextRole);
                setMediaAssetId("");
              }}
            >
              <option value="SUPPLEMENTAL">Supplemental attachment (all file types)</option>
              <option value="PRIMARY_VIDEO">Primary lesson video (video only)</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">
            Media Asset
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={mediaAssetId}
              onChange={(event) => setMediaAssetId(event.target.value)}
            >
              <option value="">Select media asset</option>
              {(mediaQuery.data ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title} ({asset.type})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold dark:border-gray-600"
            onClick={() => {
              if (!mediaAssetId.trim()) return;
              void attachMutation.mutateAsync(mediaAssetId.trim());
            }}
            disabled={attachMutation.isPending}
          >
            {attachMutation.isPending ? "Attaching..." : "Attach Media"}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Current Attachments</h4>
          {attachments.length === 0 ? (
            <p className="text-xs text-gray-500">No attachments yet.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="rounded-md border border-gray-200 p-2 text-xs dark:border-gray-700">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {attachment.mediaAsset?.title ?? attachment.mediaAssetId}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {attachment.role} · {attachment.mediaAsset?.type ?? "UNKNOWN"} · {attachment.mappingSource} ·{" "}
                    {attachment.isActive ? "Active" : "Inactive"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
