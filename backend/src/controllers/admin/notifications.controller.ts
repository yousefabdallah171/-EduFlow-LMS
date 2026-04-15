import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { transporter } from "../../utils/email.js";

const updateSchema = z.object({ subject: z.string().min(1), bodyHtml: z.string().min(1) });

export const adminNotificationsController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await prisma.notificationTemplate.findMany({ orderBy: { id: "asc" } });
      res.json({ templates });
    } catch (e) { next(e); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, bodyHtml } = updateSchema.parse(req.body);
      const template = await prisma.notificationTemplate.update({
        where: { id: Number(req.params.id) },
        data: { subject, bodyHtml }
      });
      res.json(template);
    } catch (e) { next(e); }
  },
  async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.body as { templateId?: number };
      const template = templateId
        ? await prisma.notificationTemplate.findUnique({ where: { id: templateId } })
        : null;

      const enrollments = await prisma.enrollment.findMany({
        where: { status: "ACTIVE" },
        include: { user: { select: { email: true, fullName: true } } }
      });

      const subject = template?.subject ?? "Message from EduFlow";
      const html = template?.bodyHtml ?? "<p>Hello from EduFlow!</p>";

      let sent = 0;
      for (const enrollment of enrollments) {
        try {
          await transporter.sendMail({
            to: enrollment.user.email,
            subject,
            html: html.replace("{{name}}", enrollment.user.fullName)
          });
          sent++;
        } catch { /* skip failed */ }
      }

      res.json({ sent, total: enrollments.length });
    } catch (e) { next(e); }
  }
};
