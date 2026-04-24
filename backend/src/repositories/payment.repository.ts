import type { Payment, PaymentEvent, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const paymentRepository = {
  // Create operations
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  },

  // Read operations - single payment
  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  },

  async findByIdWithEvents(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        reconciliations: true
      }
    });
  },

  async findByPaymobTxId(paymobTransactionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobTransactionId },
      include: { events: true }
    });
  },

  async findByPaymobOrderId(paymobOrderId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { paymobOrderId },
      include: { events: true }
    });
  },

  async findByPaymobIdempotencyKey(key: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobIdempotencyKey: key }
    });
  },

  // Read operations - multiple payments
  async findByUserId(userId: string, limit = 10) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { events: true, reconciliations: true }
    });
  },

  async findPendingByUserId(userId: string) {
    return prisma.payment.findMany({
      where: {
        userId,
        status: { in: ["INITIATED", "AWAITING_PAYMENT", "WEBHOOK_PENDING"] }
      },
      orderBy: { createdAt: "desc" },
      include: { events: true }
    });
  },

  async findByStatus(status: Payment["status"], limit = 50) {
    return prisma.payment.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  },

  async findRefundablePayments(limit = 50) {
    return prisma.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  },

  async getRecentPayments(days = 7, limit = 50) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.payment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { events: true }
    });
  },

  // Update operations
  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
      include: { events: true }
    });
  },

  async updateStatus(
    id: string,
    status: Payment["status"],
    extraData: Prisma.PaymentUpdateInput = {}
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        ...extraData
      },
      include: { events: true }
    });
  },

  async updateWithEvent(
    id: string,
    data: Prisma.PaymentUpdateInput,
    eventData: Prisma.PaymentEventCreateInput
  ) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data,
        include: { events: true }
      });

      await tx.paymentEvent.create({
        data: {
          payment: { connect: { id } },
          ...eventData
        }
      });

      return payment;
    });
  },

  // Event operations
  async addEvent(
    paymentId: string,
    data: Prisma.PaymentEventCreateInput
  ): Promise<PaymentEvent> {
    return prisma.paymentEvent.create({
      data: {
        payment: { connect: { id: paymentId } },
        ...data
      }
    });
  },

  async getPaymentTimeline(paymentId: string) {
    return prisma.paymentEvent.findMany({
      where: { paymentId },
      orderBy: { createdAt: "asc" }
    });
  },

  async getDetailWithEvents(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        reconciliations: true
      }
    });
  },

  // Reconciliation operations
  async createReconciliation(data: Prisma.PaymentReconciliationCreateInput) {
    return prisma.paymentReconciliation.create({ data });
  },

  async findReconciliation(paymentId: string) {
    return prisma.paymentReconciliation.findFirst({
      where: { paymentId },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateReconciliation(id: string, data: Prisma.PaymentReconciliationUpdateInput) {
    return prisma.paymentReconciliation.update({
      where: { id },
      data
    });
  },

  // List/Count operations
  async listByStatus(statuses: Payment["status"][], limit = 50) {
    return prisma.payment.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { events: true }
    });
  },

  async countByStatus(status: Payment["status"]) {
    return prisma.payment.count({
      where: { status }
    });
  },

  async countPendingByUser(userId: string) {
    return prisma.payment.count({
      where: {
        userId,
        status: { in: ["INITIATED", "AWAITING_PAYMENT", "WEBHOOK_PENDING"] }
      }
    });
  }
};
