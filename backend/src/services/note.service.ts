import { noteRepository } from "../repositories/note.repository.js";

export const noteService = {
  list(userId: string) {
    return noteRepository.findAllByUser(userId);
  },
  upsert(userId: string, lessonId: string, content: string) {
    return noteRepository.upsert(userId, lessonId, content);
  },
  update(id: string, content: string) {
    return noteRepository.update(id, content);
  },
  delete(id: string) {
    return noteRepository.delete(id);
  },
  async exportText(userId: string): Promise<string> {
    const notes = await noteRepository.findAllByUser(userId);
    return notes
      .map((n) => `Lesson: ${n.lesson.titleEn}\n${n.content}`)
      .join("\n\n---\n\n");
  }
};
