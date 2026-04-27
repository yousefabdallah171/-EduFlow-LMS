import type { Payment, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { PaymentListFilters, PaymentListResponse } from "@/types/payment.types";

export const paymentRepository = {
  // Basic CRUD
  create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  },

  findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  },

  update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
    });
  },

  updateStatus(
    id: string,
    status: Payment["status"],
    extraData: Prisma.PaymentUpdateInput = {}
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        ...extraData,
      },
    });
  },

  findByPaymobTxId(paymobTransactionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobTransactionId },
    });
  },

  // Lookup queries
  findByPaymobOrderId(paymobOrderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobOrderId },
    });
  },

  findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobIdempotencyKey: idempotencyKey },
    });
  },

  findByRefundId(paymobRefundId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobRefundId },
    });
  },

  // Status queries
  findByStatus(status: Payment["status"]): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  },

  findPendingByUserId(userId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: {
        userId,
        status: {
          in: ["INITIATED", "AWAITING_PAYMENT", "WEBHOOK_PENDING"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  // List with pagination and filters
  async findByFilters(
    filters: PaymentListFilters
  ): Promise<PaymentListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.errorCodeFilter) where.errorCode = filters.errorCodeFilter;

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom)
        (where.createdAt as any).gte = filters.createdFrom;
      if (filters.createdTo) (where.createdAt as any).lte = filters.createdTo;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments: payments as any[],
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    };
  },

  // Reconciliation
  findRefundablePayments(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        refundInitiatedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  createReconciliation(
    paymentId: string,
    data: Prisma.PaymentReconciliationCreateInput
  ) {
    return prisma.paymentReconciliation.create({
      data: {
        ...data,
        paymentId,
      },
    });
  },

  findReconciliation(paymentId: string) {
    return prisma.paymentReconciliation.findUnique({
      where: { paymentId },
    });
  },

  updateReconciliation(
    paymentId: string,
    data: Prisma.PaymentReconciliationUpdateInput
  ) {
    return prisma.paymentReconciliation.update({
      where: { paymentId },
      data,
    });
  },

  // Events with history
  async findByIdWithEvents(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  // Batch operations
  findExpiredWebhookPending(timeoutMinutes: number = 10): Promise<Payment[]> {
    const cutoffTime = new Date(
      Date.now() - timeoutMinutes * 60 * 1000
    );
    return prisma.payment.findMany({
      where: {
        status: "WEBHOOK_PENDING",
        createdAt: {
          lte: cutoffTime,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findFailedEnrollments(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status: "ENROLLMENT_FAILED" },
      orderBy: { createdAt: "desc" },
    });
  },

  findFailedEmails(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status: "EMAIL_FAILED" },
      orderBy: { createdAt: "desc" },
    });
  },

  // Atomic transaction helper
  async updateWithEvent(
    id: string,
    paymentData: Prisma.PaymentUpdateInput,
    eventData: Prisma.PaymentEventCreateInput
  ): Promise<{ payment: Payment }> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: paymentData,
      });

      await tx.paymentEvent.create({
        data: eventData,
      });

      return { payment };
    });
  },
};
