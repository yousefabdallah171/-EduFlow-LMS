import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

type Lesson = {
  id: string;
  titleEn: string;
  titleAr: string;
};

type MediaAsset = {
  id: string;
  title: string;
  originalFilename: string;
};

type AutoMapResponse = {
  matches: Array<{
    lessonId: string;
    mediaAssetId: string;
    confidence: number;
    reason: string;
  }>;
  unmatchedLessonIds: string[];
  unmatchedMediaAssetIds: string[];
};

export function BulkLessonMapper({ onApplied }: { onApplied?: () => void }) {
  const [mapping, setMapping] = useState<AutoMapResponse | null>(null);

  const lessonsQuery = useQuery({
    queryKey: ["bulk-map-lessons"],
    queryFn: async () => {
      const response = await api.get<{ lessons: Lesson[] }>("/admin/lessons");
      return response.data.lessons;
    }
  });

  const mediaQuery = useQuery({
    queryKey: ["bulk-map-media"],
    queryFn: async () => {
      const response = await api.get<{ items: MediaAsset[]; pagination: { total: number } }>("/admin/media-library", {
        params: {
          status: "READY",
          page: 1,
          pageSize: 200
        }
      });
      return response.data.items;
    }
  });

  const autoMapMutation = useMutation({
    mutationFn: async () => {
      const lessonIds = (lessonsQuery.data ?? []).map((lesson) => lesson.id);
      const mediaAssetIds = (mediaQuery.data ?? []).map((asset) => asset.id);
      const response = await api.post<AutoMapResponse>("/admin/lessons/media/auto-map", {
        lessonIds,
        mediaAssetIds,
        strategy: "FILENAME_NORMALIZED"
      });
      return response.data;
    },
    onSuccess: (result) => {
      setMapping(result);
      toast.success(`Auto-map completed: ${result.matches.length} matches`);
    },
    onError: () => {
      toast.error("Auto-map failed");
    }
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const matches = mapping?.matches ?? [];
      const response = await api.post("/admin/lessons/media/bulk-attach", {
        attachments: matches.map((match) => ({
          lessonId: match.lessonId,
          mediaAssetId: match.mediaAssetId,
          mappingSource: "BULK_REVIEWED"
        })),
        replaceExistingPrimaryVideo: true
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Bulk attachment applied");
      onApplied?.();
    },
    onError: () => {
      toast.error("Bulk attachment failed");
    }
  });

  const matches = useMemo(() => mapping?.matches ?? [], [mapping]);

  return (
    <section className="dashboard-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            Bulk Lesson Mapper
          </p>
          <h4 className="mt-1 text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            Auto-map READY media to lessons
          </h4>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-600"
            onClick={() => void autoMapMutation.mutateAsync()}
            disabled={autoMapMutation.isPending}
          >
            {autoMapMutation.isPending ? "Mapping..." : "Run Auto-Map"}
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-600"
            onClick={() => void applyMutation.mutateAsync()}
            disabled={applyMutation.isPending || matches.length === 0}
          >
            {applyMutation.isPending ? "Applying..." : "Apply Bulk Attach"}
          </button>
        </div>
      </div>

      {mapping ? (
        <div className="space-y-2 text-xs">
          <p style={{ color: "var(--color-text-secondary)" }}>
            Matches: {mapping.matches.length} · Unmatched Lessons: {mapping.unmatchedLessonIds.length} · Unmatched Media:{" "}
            {mapping.unmatchedMediaAssetIds.length}
          </p>
          <ul className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
            {mapping.matches.map((match) => (
              <li key={`${match.lessonId}-${match.mediaAssetId}`} className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-800">
                {match.lessonId} ← {match.mediaAssetId} ({Math.round(match.confidence * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Run auto-map to preview suggested lesson-media pairs.
        </p>
      )}
    </section>
  );
}
