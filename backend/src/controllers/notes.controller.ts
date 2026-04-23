import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { NoteError, noteService } from "../services/note.service.js";

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const noteSchema = z.object({ lessonId: z.string().min(1), content: z.string().min(1) });
const updateSchema = z.object({ content: z.string().min(1) });
const handleNoteError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]))
    });
    return;
  }

  if (error instanceof NoteError) {
    res.status(error.status).json({ error: error.code, message: error.message });
    return;
  }

  next(error);
};

export const notesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await noteService.list(req.user!.userId);
      res.json({ notes });
    } catch (e) { handleNoteError(e, res, next); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId, content } = noteSchema.parse(req.body);
      const note = await noteService.upsert(req.user!.userId, lessonId, content);
      res.status(201).json(note);
    } catch (e) { handleNoteError(e, res, next); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      if (!id) { res.status(400).json({ error: "NOTE_ID_REQUIRED" }); return; }

      const { content } = updateSchema.parse(req.body);
      const note = await noteService.update(id, req.user!.userId, content);
      res.json(note);
    } catch (e) { handleNoteError(e, res, next); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      if (!id) { res.status(400).json({ error: "NOTE_ID_REQUIRED" }); return; }

      await noteService.delete(id, req.user!.userId);
      res.status(204).send();
    } catch (e) { handleNoteError(e, res, next); }
  },
  async export_(req: Request, res: Response, next: NextFunction) {
    try {
      const text = await noteService.exportText(req.user!.userId);
      res.setHeader("Content-Disposition", "attachment; filename=notes.txt");
      res.type("text/plain").send(text);
    } catch (e) { handleNoteError(e, res, next); }
  }
};
