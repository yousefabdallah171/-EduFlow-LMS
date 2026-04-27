import type { NextFunction, Request, Response } from "express";
import { PaymentStatus, type Prisma } from "@prisma/client";

import { prisma } from "../../config/database.js";
import { auditService } from "../../services/audit.service.js";
import { analyticsService } from "../../services/analytics.service.js";

const firstQueryValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const firstParamValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const adminOrdersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(firstQueryValue(req.query.page) ?? 1);
      const limit = Number(firstQueryValue(req.query.limit) ?? 20);
      const status = firstQueryValue(req.query.status);
      const dateFrom = firstQueryValue(req.query.dateFrom);
      const dateTo = firstQueryValue(req.query.dateTo);
      const where: Prisma.PaymentWhereInput = {};
      if (typeof status === "string" && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        where.status = status as PaymentStatus;
      }
      if (typeof dateFrom === "string" || typeof dateTo === "string") {
        where.createdAt = {
          ...(typeof dateFrom === "string" ? { gte: new Date(dateFrom) } : {}),
          ...(typeof dateTo === "string" ? { lte: new Date(dateTo) } : {})
        };
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: { user: { select: { id: true, fullName: true, email: true } }, coupon: { select: { code: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.payment.count({ where })
      ]);
      res.json({ payments, total, page, limit });
    } catch (e) { next(e); }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = firstParamValue(req.params.id);
      if (!id) { res.status(400).json({ error: "PAYMENT_ID_REQUIRED" }); return; }

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true
              // SECURITY: Do NOT expose: passwordHash, emailVerified, oauthProvider, createdAt, updatedAt
            }
          },
          coupon: true,
          enrollment: true
        }
      });
      if (!payment) { res.status(404).json({ error: "NOT_FOUND" }); return; }
      res.json(payment);
    } catch (e) { next(e); }
  },

  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const id = firstParamValue(req.params.id);
      if (!id) { res.status(400).json({ error: "PAYMENT_ID_REQUIRED", message: "Payment ID is required" }); return; }

      const result = await analyticsService.markPaymentPaid(id);
      res.json({ message: "Payment marked as completed", payment: result.payment, enrollment: result.enrollment });
    } catch (e) {
      if (e instanceof analyticsService.AnalyticsError) {
        res.status(e.status).json({ error: e.code, message: e.message });
        return;
      }
      next(e);
    }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const totalRecords = await prisma.payment.count();
      await auditService.logDataExport(req.user!.userId, "orders_csv", totalRecords);

      // PERFORMANCE: Stream CSV instead of loading all payments into memory
      // Previous: loaded all payments, built entire CSV string → OOM for 100k+ records
      // Now: streams chunks as rows are fetched, constant memory usage
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      res.type("text/csv");

      // Write header
      res.write("id,student,email,amount_egp,status,created_at\n");

      const batchSize = 1000;
      let hasMore = true;
      let lastId: string | null = null;

      while (hasMore) {
        const payments = await prisma.payment.findMany({
          where: lastId ? { id: { gt: lastId } } : {},
          include: { user: { select: { fullName: true, email: true } } },
          orderBy: { id: "asc" },
          take: batchSize
        });

        if (payments.length === 0) {
          hasMore = false;
          break;
        }

        // Write rows as we fetch them
        for (const p of payments) {
          const csv = `${p.id},"${p.user.fullName}","${p.user.email}",${p.amountPiasters / 100},${p.status},${p.createdAt.toISOString()}\n`;
          res.write(csv);
        }

        lastId = payments[payments.length - 1]!.id;
        hasMore = payments.length === batchSize;
      }

      res.end();
    } catch (e) { next(e); }
  }
};
