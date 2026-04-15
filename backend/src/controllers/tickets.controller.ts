import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { sendTicketReplyEmail } from "../utils/email.js";

const firstParamValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const createTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

const replySchema = z.object({
  message: z.string().min(1, "Message is required")
});

const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"])
});

const validationError = (error: z.ZodError) => {
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
  return { error: "VALIDATION_ERROR", fields };
};

export const ticketsController = {
  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tickets = await prisma.supportTicket.findMany({
        where: { userId },
        include: { messages: { include: { sender: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" }
      });
      res.json({ tickets });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createTicketSchema.safeParse(req.body);
      if (!result.success) {
        res.status(422).json(validationError(result.error));
        return;
      }

      const { subject, message } = result.data;
      const userId = req.user!.userId;

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          subject,
          messages: {
            create: {
              senderId: userId,
              body: message
            }
          }
        },
        include: { messages: true }
      });

      res.status(201).json(ticket);
    } catch (e) {
      next(e);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const where = status ? { status: status as "OPEN" | "RESOLVED" } : {};

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            messages: { include: { sender: { select: { id: true, fullName: true, role: true } } }, orderBy: { createdAt: "asc" } }
          },
          orderBy: { createdAt: "desc" }
        }),
        prisma.supportTicket.count({ where })
      ]);

      res.json({ tickets, total });
    } catch (e) {
      next(e);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateStatusSchema.safeParse(req.body);
      if (!result.success) {
        res.status(422).json(validationError(result.error));
        return;
      }

      const id = firstParamValue(req.params.id);
      if (!id) {
        res.status(400).json({ error: "TICKET_ID_REQUIRED" });
        return;
      }
      const { status } = result.data;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id }
      });

      if (!ticket) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      const updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: { status },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      });

      res.json(updatedTicket);
    } catch (e) {
      next(e);
    }
  },

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const result = replySchema.safeParse(req.body);
      if (!result.success) {
        res.status(422).json(validationError(result.error));
        return;
      }

      const id = firstParamValue(req.params.id);
      if (!id) {
        res.status(400).json({ error: "TICKET_ID_REQUIRED" });
        return;
      }
      const { message } = result.data;
      const adminId = req.user!.userId;

      const [ticket, admin] = await Promise.all([
        prisma.supportTicket.findUnique({
          where: { id },
          include: { user: true }
        }),
        prisma.user.findUnique({
          where: { id: adminId },
          select: { fullName: true }
        })
      ]);

      if (!ticket) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      const newMessage = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: adminId,
          body: message
        }
      });

      // Send email to ticket creator
      try {
        await sendTicketReplyEmail(
          ticket.user.email,
          ticket.user.fullName,
          admin?.fullName ?? "Support Team",
          message
        );
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error("Failed to send ticket reply email:", emailError);
      }

      res.json(newMessage);
    } catch (e) {
      next(e);
    }
  }
};
