import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { courseService } from "../../services/course.service.js";

const courseSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleAr: z.string().min(1).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional()
});

const mask = (val: string | undefined) => val ? `${val.slice(0, 3)}***` : "";

export const adminSettingsController = {
  async getCourse(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.courseSettings.findUnique({ where: { id: 1 } });
      res.json(settings ?? {});
    } catch (e) { next(e); }
  },
  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = courseSchema.parse(req.body);
      const settings = await prisma.courseSettings.upsert({
        where: { id: 1 },
        update: data,
        create: {
          id: 1,
          titleEn: data.titleEn ?? "AI Workflow: From Idea to Production",
          titleAr: data.titleAr ?? "AI Workflow: من الفكرة إلى الـ Production",
          pricePiasters: 0,
          ...data
        }
      });
      await courseService.invalidatePublicCourseCache();
      res.json(settings);
    } catch (e) { next(e); }
  },
  async getSystem(_req: Request, res: Response) {
    res.json({
      smtpHost: mask(process.env.SMTP_HOST),
      smtpUser: mask(process.env.SMTP_USER),
      smtpPass: mask(process.env.SMTP_PASS),
      paymobKey: mask(process.env.PAYMOB_API_KEY)
    });
  },
  async updateSystem(req: Request, res: Response) {
    const { smtpHost, smtpUser, smtpPass, paymobKey } = req.body as Record<string, string>;
    if (smtpHost) process.env.SMTP_HOST = smtpHost;
    if (smtpUser) process.env.SMTP_USER = smtpUser;
    if (smtpPass) process.env.SMTP_PASS = smtpPass;
    if (paymobKey) process.env.PAYMOB_API_KEY = paymobKey;
    res.json({ ok: true });
  }
};
