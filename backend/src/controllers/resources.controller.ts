import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";

const createSchema = z.object({
  title: z.string().min(1),
  fileUrl: z.string().url(),
  fileSizeBytes: z.number().int().min(0).optional()
});

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const serializeResource = (resource: {
  id: string;
  lessonId: string;
  title: string;
  fileUrl: string;
  fileSizeBytes: bigint | number;
  createdAt: Date;
}) => ({
  ...resource,
  fileSizeBytes: Number(resource.fileSizeBytes),
  createdAt: resource.createdAt.toISOString()
});

export const resourcesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getParam(req.params.id);
      if (!lessonId) { res.status(400).json({ error: "LESSON_ID_REQUIRED" }); return; }

      const resources = await prisma.lessonResource.findMany({
        where: { lessonId },
        orderBy: { createdAt: "asc" }
      });
      res.json({ resources: resources.map(serializeResource) });
    } catch (e) { next(e); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = getParam(req.params.id);
      if (!lessonId) { res.status(400).json({ error: "LESSON_ID_REQUIRED" }); return; }

      const data = createSchema.parse(req.body);
      const resource = await prisma.lessonResource.create({
        data: { lessonId, ...data }
      });
      res.status(201).json(serializeResource(resource));
    } catch (e) { next(e); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const resourceId = getParam(req.params.resourceId);
      if (!resourceId) { res.status(400).json({ error: "RESOURCE_ID_REQUIRED" }); return; }

      await prisma.lessonResource.delete({ where: { id: resourceId } });
      res.status(204).send();
    } catch (e) { next(e); }
  }
};
