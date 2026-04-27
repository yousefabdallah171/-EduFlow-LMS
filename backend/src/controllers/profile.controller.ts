import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { paymentService } from "../services/payment.service.js";

const profileSchema = z.object({
  fullName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  locale: z.enum(["en", "ar"]).optional(),
  theme: z.enum(["light", "dark"]).optional()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number")
});

const validationError = (error: z.ZodError) => {
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
  return { error: "VALIDATION_ERROR", fields };
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json(validationError(error));
    return;
  }
  next(error);
};

export const profileController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const [user, enrollment, payments] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            locale: true,
            theme: true,
            emailVerified: true,
            oauthProvider: true
          }
        }),
        prisma.enrollment.findUnique({
          where: { userId },
          select: { status: true, enrolledAt: true }
        }),
        paymentService.listPaymentHistory(userId)
      ]);
      if (!user) { res.status(404).json({ error: "NOT_FOUND", message: "User not found" }); return; }

      res.json({
        ...user,
        enrollments: [
          {
            courseId: "primary",
            status: enrollment?.status ?? null,
            startDate: enrollment?.enrolledAt?.toISOString() ?? null
          }
        ],
        certificates: [] as Array<{ courseId: string; issuedDate: string; certificateUrl: string }>,
        paymentHistory: payments.map((payment) => ({
          date: payment.createdAt,
          amount: payment.amountEgp,
          status: payment.status
        }))
      });
    } catch (e) { next(e); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = profileSchema.parse(req.body);
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data,
        select: { id: true, email: true, fullName: true, avatarUrl: true }
      });
      res.json(user);
    } catch (e) {
      handleError(e, res, next);
    }
  },
  async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = passwordSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (user?.oauthProvider === "google") {
        res.status(403).json({
          error: "OAUTH_PASSWORD_LOCKED",
          message: "This account uses Google sign-in. Password changes are disabled."
        });
        return;
      }
      if (!user?.passwordHash) { res.status(400).json({ error: "NO_PASSWORD", message: "No password set for this account" }); return; }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) { res.status(400).json({ error: "INVALID_PASSWORD", message: "Current password is incorrect" }); return; }
      const hash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash: hash } });
      res.json({ message: "Password updated successfully" });
    } catch (e) {
      handleError(e, res, next);
    }
  }
};
