import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { demoLessonPlayback, isDemoMode } from "@/lib/demo";

export type LessonPlayback = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  section?: {
    id: string;
    titleEn: string;
    titleAr: string;
  } | null;
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

type LessonPlaybackApiResponse = Partial<LessonPlayback> & {
  lesson?: Partial<LessonPlayback>;
};

const normalizeLessonPlayback = (payload: LessonPlaybackApiResponse): LessonPlayback => {
  const lesson: Partial<LessonPlayback> = payload.lesson ?? payload;

  if (!lesson.id || !lesson.hlsUrl || !lesson.watermark) {
    throw new Error("Lesson playback data is incomplete.");
  }

  return {
    id: lesson.id,
    title: lesson.title ?? lesson.titleEn ?? "Lesson",
    titleEn: lesson.titleEn,
    titleAr: lesson.titleAr ?? null,
    section: lesson.section ?? null,
    descriptionHtml: lesson.descriptionHtml ?? "",
    descriptionHtmlEn: lesson.descriptionHtmlEn ?? lesson.descriptionHtml ?? "",
    descriptionHtmlAr: lesson.descriptionHtmlAr ?? "",
    durationSeconds: lesson.durationSeconds ?? null,
    videoToken: lesson.videoToken ?? "",
    hlsUrl: lesson.hlsUrl,
    expiresAt: lesson.expiresAt,
    watermark: lesson.watermark,
    progress: {
      lastPositionSeconds: lesson.progress?.lastPositionSeconds ?? 0,
      completedAt: lesson.progress?.completedAt ?? null
    },
    resources: lesson.resources ?? []
  };
};

type RefreshTokenResponse = {
  videoToken: string;
  hlsUrl: string;
  expiresAt: string;
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
      const response = await api.get<LessonPlaybackApiResponse>(`/lessons/${lessonId}/detail`);
      return normalizeLessonPlayback(response.data);
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error("Lesson ID is required");
      if (demo) return demoLessonPlayback(lessonId);
      const response = await api.post<RefreshTokenResponse>(`/lessons/${lessonId}/refresh-token`);
      return response.data;
    },
    onSuccess: (data) => {
      if (!lessonQuery.data) return;
      lessonQuery.setQueryData(
        ["lesson-playback", lessonId],
        {
          ...lessonQuery.data,
          videoToken: data.videoToken,
          hlsUrl: data.hlsUrl,
          expiresAt: data.expiresAt
        }
      );
    }
  });

  return {
    lessonQuery,
    renewToken: () => {
      if (demo) {
        return lessonQuery.refetch();
      }
      return refreshMutation.mutateAsync();
    }
  };
};
