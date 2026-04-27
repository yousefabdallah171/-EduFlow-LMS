import { prisma } from "../config/database.js";
import type { Payment, PaymentStatus, PaymentEvent } from "@prisma/client";

export interface PaymentListFilter {
  status?: PaymentStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentListResponse {
  payments: Array<{
    id: string;
    userId: string;
    amount: number;
    status: PaymentStatus;
    refundStatus: string | null;
    createdAt: Date;
    user: {
      email: string;
      name: string;
    };
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PaymentDetailResponse {
  id: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  refundStatus: string | null;
  refundAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  paymobOrderId: string | null;
  paymobTransactionId: string | null;
  paymobRefundId: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  };
  events: PaymentEvent[];
  enrollment: {
    id: string;
    status: string;
    enrolledAt: Date;
    revokedAt: Date | null;
  } | null;
}

export const adminPaymentService = {
  // List all payments with filters
  async listPayments(filters: PaymentListFilter): Promise<PaymentListResponse> {
    try {
      const {
        status,
        userId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        limit = 50,
        offset = 0
      } = filters;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amountPiasters = {};
        if (minAmount !== undefined) {
          where.amountPiasters.gte = minAmount;
        }
        if (maxAmount !== undefined) {
          where.amountPiasters.lte = maxAmount;
        }
      }

      // Get total count
      const total = await prisma.payment.count({ where });

      // Get paginated payments
      const payments = await prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      });

      console.log(`[Admin Payment Service] Listed ${payments.length} payments (total: ${total})`);

      return {
        payments: payments.map(p => ({
          id: p.id,
          userId: p.userId,
          amount: p.amountPiasters,
          status: p.status,
          refundStatus: p.refundStatus,
          createdAt: p.createdAt,
          user: p.user
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error("[Admin Payment Service] Error listing payments:", error);
      throw error;
    }
  },

  // Get detailed payment information
  async getPaymentDetail(paymentId: string): Promise<PaymentDetailResponse> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          events: {
            orderBy: { createdAt: "asc" }
          },
          enrollment: {
            select: {
              id: true,
              status: true,
              enrolledAt: true,
              revokedAt: true
            }
          }
        }
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      console.log(`[Admin Payment Service] Retrieved detail for payment ${paymentId}`);

      return {
        id: payment.id,
        userId: payment.userId,
        amount: payment.amountPiasters,
        status: payment.status,
        refundStatus: payment.refundStatus,
        refundAmount: payment.refundAmount,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        paymobOrderId: payment.paymobOrderId,
        paymobTransactionId: payment.paymobTransactionId,
        paymobRefundId: payment.paymobRefundId,
        user: payment.user,
        events: payment.events,
        enrollment: payment.enrollment
      };
    } catch (error) {
      console.error(`[Admin Payment Service] Error getting payment detail for ${paymentId}:`, error);
      throw error;
    }
  },

  // Search payments by criteria
  async searchPayments(query: string, limit = 20) {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { userId: { contains: query, mode: "insensitive" } },
            { user: { email: { contains: query, mode: "insensitive" } } },
            { user: { name: { contains: query, mode: "insensitive" } } }
          ]
        },
        include: {
          user: {
            select: { email: true, name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit
      });

      console.log(`[Admin Payment Service] Found ${payments.length} payments matching "${query}"`);

      return payments;
    } catch (error) {
      console.error("[Admin Payment Service] Error searching payments:", error);
      throw error;
    }
  },

  // Get payments by status
  async getPaymentsByStatus(status: PaymentStatus, limit = 50) {
    try {
      const payments = await prisma.payment.findMany({
        where: { status },
        include: {
          user: {
            select: { email: true, name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit
      });

      console.log(`[Admin Payment Service] Retrieved ${payments.length} payments with status ${status}`);

      return payments;
    } catch (error) {
      console.error("[Admin Payment Service] Error getting payments by status:", error);
      throw error;
    }
  },

  // Get payment statistics
  async getPaymentStats(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const stats = await prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { amountPiasters: true }
      });

      const total = await prisma.payment.count({ where });
      const totalAmount = await prisma.payment.aggregate({
        where,
        _sum: { amountPiasters: true }
      });

      console.log("[Admin Payment Service] Retrieved payment statistics");

      return {
        total,
        totalAmount: totalAmount._sum.amountPiasters || 0,
        byStatus: stats.map(s => ({
          status: s.status,
          count: s._count.id,
          amount: s._sum.amountPiasters || 0
        }))
      };
    } catch (error) {
      console.error("[Admin Payment Service] Error getting payment stats:", error);
      throw error;
    }
  }
};

export default adminPaymentService;
