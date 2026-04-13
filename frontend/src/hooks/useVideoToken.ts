import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { demoLessonPlayback, isDemoMode } from "@/lib/demo";

export type LessonPlayback = {
  id: string;
  title: string;
  descriptionHtml: string;
  durationSeconds: number | null;
  videoToken: string;
  hlsUrl: string;
  watermark: {
    name: string;
    maskedEmail: string;
  };
  progress: {
    lastPositionSeconds: number;
    completedAt: string | null;
  };
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
