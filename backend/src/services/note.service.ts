import { redis } from "../config/redis.js";
import { prometheus } from "../observability/prometheus.js";
import { noteRepository } from "../repositories/note.repository.js";

export class NoteError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const NOTES_CACHE_TTL_SECONDS = 10 * 60;
const notesCacheKey = (userId: string) => `student:notes:${userId}`;

export const noteService = {
  async invalidateNotesCache(userId: string) {
    try {
      await redis.del(notesCacheKey(userId));
    } catch {
      // ignore redis failures
    }
  },

  async list(userId: string) {
    const key = notesCacheKey(userId);
    try {
      const cached = await redis.get(key);
      if (cached) {
        try {
          prometheus.recordCacheHit("student_notes");
          return JSON.parse(cached) as Awaited<ReturnType<typeof noteRepository.findAllByUser>>;
        } catch {
          // Fall through to DB.
        }
      }
      prometheus.recordCacheMiss("student_notes");
    } catch {
      // ignore redis failures
    }

    const notes = await noteRepository.findAllByUser(userId);
    try {
      await redis.set(key, JSON.stringify(notes), "EX", NOTES_CACHE_TTL_SECONDS);
    } catch {
      // ignore redis failures
    }
    return notes;
  },
  async upsert(userId: string, lessonId: string, content: string) {
    const note = await noteRepository.upsert(userId, lessonId, content);
    await noteService.invalidateNotesCache(userId);
    return note;
  },
  async update(id: string, userId: string, content: string) {
    const note = await noteRepository.findByIdForUser(id, userId);
    if (!note) {
      throw new NoteError("NOTE_NOT_FOUND", 404, "Note not found.");
    }

    const updated = await noteRepository.updateForUser(id, userId, content);
    await noteService.invalidateNotesCache(userId);
    return updated;
  },
  async delete(id: string, userId: string) {
    const note = await noteRepository.findByIdForUser(id, userId);
    if (!note) {
      throw new NoteError("NOTE_NOT_FOUND", 404, "Note not found.");
    }

    const deleted = await noteRepository.deleteForUser(id, userId);
    await noteService.invalidateNotesCache(userId);
    return deleted;
  },
  async exportText(userId: string): Promise<string> {
    const notes = await noteService.list(userId);
    return notes
      .map((n) => `Lesson: ${n.lesson.titleEn}\n${n.content}`)
      .join("\n\n---\n\n");
  }
};
