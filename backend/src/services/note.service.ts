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

export const noteService = {
  list(userId: string) {
    return noteRepository.findAllByUser(userId);
  },
  upsert(userId: string, lessonId: string, content: string) {
    return noteRepository.upsert(userId, lessonId, content);
  },
  async update(id: string, userId: string, content: string) {
    const note = await noteRepository.findByIdForUser(id, userId);
    if (!note) {
      throw new NoteError("NOTE_NOT_FOUND", 404, "Note not found.");
    }

    return noteRepository.updateForUser(id, userId, content);
  },
  async delete(id: string, userId: string) {
    const note = await noteRepository.findByIdForUser(id, userId);
    if (!note) {
      throw new NoteError("NOTE_NOT_FOUND", 404, "Note not found.");
    }

    return noteRepository.deleteForUser(id, userId);
  },
  async exportText(userId: string): Promise<string> {
    const notes = await noteRepository.findAllByUser(userId);
    return notes
      .map((n) => `Lesson: ${n.lesson.titleEn}\n${n.content}`)
      .join("\n\n---\n\n");
  }
};
