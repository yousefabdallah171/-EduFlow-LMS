import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { noteService } from "../services/note.service.js";

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const noteSchema = z.object({ lessonId: z.string().min(1), content: z.string().min(1) });
const updateSchema = z.object({ content: z.string().min(1) });

export const notesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await noteService.list(req.user!.userId);
      res.json({ notes });
    } catch (e) { next(e); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId, content } = noteSchema.parse(req.body);
      const note = await noteService.upsert(req.user!.userId, lessonId, content);
      res.status(201).json(note);
    } catch (e) { next(e); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      if (!id) { res.status(400).json({ error: "NOTE_ID_REQUIRED" }); return; }

      const { content } = updateSchema.parse(req.body);
      const note = await noteService.update(id, content);
      res.json(note);
    } catch (e) { next(e); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      if (!id) { res.status(400).json({ error: "NOTE_ID_REQUIRED" }); return; }

      await noteService.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
  async export_(req: Request, res: Response, next: NextFunction) {
    try {
      const text = await noteService.exportText(req.user!.userId);
      res.setHeader("Content-Disposition", "attachment; filename=notes.txt");
      res.type("text/plain").send(text);
    } catch (e) { next(e); }
  }
};
