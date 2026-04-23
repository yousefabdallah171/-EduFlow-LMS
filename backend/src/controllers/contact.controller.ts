import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

const validationError = (error: z.ZodError) => {
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
  return { error: "VALIDATION_ERROR", fields };
};

async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(validationError(result.error));
      return;
    }

    const { name, email, message } = result.data;

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: name,
          passwordHash: "", // Contact form users don't have passwords initially
          role: "STUDENT",
          emailVerified: false
        }
      });
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: message.substring(0, 100), // First 100 chars as subject
        messages: {
          create: {
            senderId: user.id,
            body: message
          }
        }
      },
      include: { messages: true }
    });

    res.json({ ok: true, ticketId: ticket.id });
  } catch (error) {
    next(error);
  }
}

export const contactController = { submit };
