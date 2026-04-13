import { lessonRepository } from "../repositories/lesson.repository.js";
import { progressRepository } from "../repositories/progress.repository.js";

export class ProgressError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const progressService = {
  async updateProgress(
    userId: string,
    lessonId: string,
    input: {
      watchTimeSeconds: number;
      lastPositionSeconds: number;
      completed?: boolean;
    }
  ) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson?.isPublished) {
      throw new ProgressError("LESSON_NOT_FOUND", 404, "Lesson not found.");
    }

    const existing = await progressRepository.findByUserAndLesson(userId, lessonId);
    const watchTimeSeconds = Math.max(existing?.watchTimeSeconds ?? 0, input.watchTimeSeconds);
    const lastPositionSeconds = Math.max(0, input.lastPositionSeconds);
    const meetsCompletionThreshold =
      typeof lesson.durationSeconds === "number" && lesson.durationSeconds > 0
        ? watchTimeSeconds >= lesson.durationSeconds * 0.9
        : Boolean(input.completed);

    const completedAt = input.completed || meetsCompletionThreshold ? existing?.completedAt ?? new Date() : null;

    const progress = await progressRepository.upsert(userId, lessonId, {
      watchTimeSeconds,
      lastPositionSeconds,
      completedAt
    });

    const completion = await progressRepository.findCourseCompletion(userId);

    return {
      lastPositionSeconds: progress.lastPositionSeconds,
      watchTimeSeconds: progress.watchTimeSeconds,
      completedAt: progress.completedAt,
      courseCompletionPercentage: completion.percentage
    };
  },

  getCourseCompletion(userId: string) {
    return progressRepository.findCourseCompletion(userId);
  }
};
