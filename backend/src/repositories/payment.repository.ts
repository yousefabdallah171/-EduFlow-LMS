import type { Payment, Prisma } from "@prisma/client";

import { prisma } from "../config/database.js";

export const paymentRepository = {
  create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  },

  findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  },

  update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data
    });
  },

  updateStatus(id: string, status: Payment["status"], extraData: Prisma.PaymentUpdateInput = {}): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        ...extraData
      }
    });
  },

  findByPaymobTxId(paymobTransactionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paymobTransactionId }
    });
  }
};
