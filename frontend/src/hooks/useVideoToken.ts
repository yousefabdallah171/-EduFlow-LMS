import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { demoLessonPlayback, isDemoMode } from "@/lib/demo";

export type LessonPlayback = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  descriptionHtml: string;
  descriptionHtmlEn?: string;
  descriptionHtmlAr?: string;
  durationSeconds: number | null;
  videoToken: string;
  hlsUrl: string;
  expiresAt?: string;
  watermark: {
    name: string;
    maskedEmail: string;
  };
  progress: {
    lastPositionSeconds: number;
    completedAt: string | null;
  };
  resources?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileSizeBytes: number | bigint;
    createdAt: string;
  }>;
};

export const useVideoToken = (lessonId: string | undefined, enabled = true) => {
  const demo = isDemoMode();
  const lessonQuery = useQuery({
    queryKey: ["lesson-playback", lessonId],
    enabled: Boolean(lessonId) && enabled,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (demo && lessonId) {
        return demoLessonPlayback(lessonId);
      }
      const response = await api.get<LessonPlayback>(`/lessons/${lessonId}`);
      return response.data;
    }
  });

  return {
    lessonQuery,
    renewToken: () => lessonQuery.refetch()
  };
};
