import type { LessonPlayback } from "@/hooks/useVideoToken";

export const isDemoMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("demo") === "1";
};

export const demoEnrollment = {
  enrolled: true,
  status: "ACTIVE" as const,
  enrollmentType: "PAID" as const,
  enrolledAt: "2026-04-12T10:00:00.000Z"
};

export const demoLessons = [
  {
    id: "demo-lesson-1",
    title: "Introduction to EduFlow",
    durationSeconds: 480,
    sortOrder: 1,
    isUnlocked: true,
    unlocksAt: null,
    completedAt: "2026-04-12T11:00:00.000Z",
    lastPositionSeconds: 0
  },
  {
    id: "demo-lesson-2",
    title: "Protected Playback Walkthrough",
    durationSeconds: 900,
    sortOrder: 2,
    isUnlocked: true,
    unlocksAt: null,
    completedAt: null,
    lastPositionSeconds: 312
  }
];

export const demoLessonPlayback = (lessonId: string): LessonPlayback => ({
  id: lessonId,
  title: lessonId === "demo-lesson-2" ? "Protected Playback Walkthrough" : "Introduction to EduFlow",
  descriptionHtml: "Demo playback fixture used for local validation and performance auditing.",
  durationSeconds: lessonId === "demo-lesson-2" ? 900 : 480,
  videoToken: "demo-video-token",
  hlsUrl: "/demo-video.m3u8",
  watermark: {
    name: "Demo Student",
    maskedEmail: "d***@example.com"
  },
  progress: {
    lastPositionSeconds: lessonId === "demo-lesson-2" ? 312 : 0,
    completedAt: lessonId === "demo-lesson-1" ? "2026-04-12T11:00:00.000Z" : null
  }
});
