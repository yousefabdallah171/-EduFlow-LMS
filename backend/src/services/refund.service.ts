import { prisma } from "../config/database.js";
import { enrollmentService } from "./enrollment.service.js";
import { errorLoggingService } from "./error-logging.service.js";
import { queueRefundForProcessing } from "../jobs/refund-processing.job.js";
import { PaymentError, PaymentErrorCodes } from "../types/payment.types.js";
import type { InitiateRefundRequest, RefundResponse, RefundStatusResponse } from "../types/payment.types.js";

interface PaymobRefundResponse {
  id: number;
  amount_cents: number;
  reason?: string;
  success: boolean;
  created_at: string;
}

export const refundService = {
  // Initiate a refund (full or partial)
  async initiateRefund(request: InitiateRefundRequest, adminId?: string): Promise<RefundResponse> {
    const { paymentId, amount, reason } = request;

    try {
      // Get payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          `Payment ${paymentId} not found`,
          404
        );
      }

      // Validate payment can be refunded
      if (!["COMPLETED", "WEBHOOK_PENDING"].includes(payment.status)) {
        throw new PaymentError(
          PaymentErrorCodes.REFUND_FAILED,
          `Cannot refund payment in status: ${payment.status}`,
          400
        );
      }

      // Determine refund type and amount
      const isFullRefund = !amount || amount === payment.amountPiasters;
      const refundAmount = amount || payment.amountPiasters;

      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > payment.amountPiasters) {
        throw new PaymentError(
          PaymentErrorCodes.REFUND_INVALID_AMOUNT,
          `Refund amount must be between 1 and ${payment.amountPiasters}`,
          400
        );
      }

      // Check if already refunded
      if (payment.refundStatus && ["COMPLETED", "PROCESSING"].includes(payment.refundStatus)) {
        throw new PaymentError(
          PaymentErrorCodes.REFUND_ALREADY_PROCESSED,
          `Payment already has a pending or completed refund`,
          409
        );
      }

      // Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUND_REQUESTED",
          refundAmount,
          refundStatus: "REQUESTED",
          refundInitiatedAt: new Date(),
          refundInitiatedBy: adminId
        }
      });

      // Create refund queue entry
      const refundQueue = await queueRefundForProcessing(
        paymentId,
        isFullRefund ? "FULL" : "PARTIAL",
        refundAmount,
        reason
      );

      // Log refund initiation
      await errorLoggingService.logPaymentError(
        paymentId,
        "REFUND_INITIATED",
        `Refund initiated: ${refundAmount} piasters (${isFullRefund ? "FULL" : "PARTIAL"})`,
        {
          adminId,
          endpoint: "POST /api/v1/refunds/initiate",
          duration: 0
        }
      );

      // Create event
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "REFUND_INITIATED",
          status: "REFUND_REQUESTED",
          metadata: {
            adminId,
            amount: refundAmount,
            refundType: isFullRefund ? "FULL" : "PARTIAL",
            reason,
            fullEnrollmentRevocation: isFullRefund
          }
        }
      });

      console.log(`[Refund Service] Refund initiated for payment ${paymentId}: ${refundAmount} piasters`);

      return {
        paymentId,
        refundId: refundQueue.id,
        status: "REQUESTED",
        amount: refundAmount,
        refundType: isFullRefund ? "FULL" : "PARTIAL",
        initiatedAt: updatedPayment.refundInitiatedAt!,
        enrollmentRevoked: isFullRefund
      };
    } catch (error) {
      console.error(`[Refund Service] Error initiating refund for ${paymentId}:`, error);
      throw error;
    }
  },

  // Get refund status
  async getRefundStatus(paymentId: string): Promise<RefundStatusResponse | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return null;
      }

      if (!payment.refundStatus) {
        return null;
      }

      const refundQueue = await prisma.refundQueue.findUnique({
        where: { paymentId }
      });

      return {
        paymentId,
        refundId: refundQueue?.id || "",
        status: payment.refundStatus,
        amount: payment.refundAmount || 0,
        paymobRefundId: payment.paymobRefundId || undefined,
        initiatedAt: payment.refundInitiatedAt!,
        completedAt: payment.refundCompletedAt || undefined,
        reason: refundQueue?.reason || undefined
      };
    } catch (error) {
      console.error(`[Refund Service] Error getting refund status for ${paymentId}:`, error);
      return null;
    }
  },

  // Cancel a pending refund
  async cancelRefund(paymentId: string, reason: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          `Payment ${paymentId} not found`,
          404
        );
      }

      // Only cancel if not yet completed
      if (payment.refundStatus === "COMPLETED") {
        throw new PaymentError(
          PaymentErrorCodes.REFUND_FAILED,
          `Cannot cancel already completed refund`,
          400
        );
      }

      // Update payment
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          refundStatus: "CANCELLED"
        }
      });

      // Update refund queue
      await prisma.refundQueue.update({
        where: { paymentId },
        data: {
          resolution: "CANCELLED",
          resolvedAt: new Date()
        }
      });

      // Log cancellation
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "REFUND_CANCELLED",
          status: "REFUND_REQUESTED",
          metadata: { reason }
        }
      });

      console.log(`[Refund Service] Refund cancelled for payment ${paymentId}`);
      return true;
    } catch (error) {
      console.error(`[Refund Service] Error cancelling refund for ${paymentId}:`, error);
      throw error;
    }
  },

  // Process refund with Paymob
  async processPaymobRefund(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          `Payment ${paymentId} not found`,
          404
        );
      }

      const refundQueue = await prisma.refundQueue.findUnique({
        where: { paymentId }
      });

      if (!refundQueue) {
        throw new Error(`Refund queue entry not found for ${paymentId}`);
      }

      // Call Paymob refund API
      console.log(`[Refund Service] Calling Paymob refund API for payment ${paymentId}`);
      const paymobRefund = await callPaymobRefundAPI(
        payment.paymobTransactionId!,
        refundQueue.refundAmount
      );

      // Update payment with refund result
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          paymobRefundId: paymobRefund.id.toString(),
          refundStatus: "PROCESSING",
          refundLastRetryAt: new Date()
        }
      });

      // Create event
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "REFUND_API_CALL",
          status: "REFUND_REQUESTED",
          metadata: {
            paymobRefundId: paymobRefund.id,
            amount: refundQueue.refundAmount
          }
        }
      });

      return true;
    } catch (error) {
      console.error(`[Refund Service] Error processing Paymob refund for ${paymentId}:`, error);
      throw error;
    }
  },

  // Handle successful refund (from webhook)
  async completeRefund(paymentId: string, paymobRefundId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          `Payment ${paymentId} not found`,
          404
        );
      }

      const refundQueue = await prisma.refundQueue.findUnique({
        where: { paymentId }
      });

      // Update payment
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUNDED",
          refundStatus: "COMPLETED",
          refundCompletedAt: new Date(),
          paymobRefundId
        }
      });

      // Update refund queue
      if (refundQueue) {
        await prisma.refundQueue.update({
          where: { paymentId },
          data: {
            resolution: "COMPLETED",
            resolvedAt: new Date()
          }
        });
      }

      // If full refund, revoke enrollment
      const isFullRefund = payment.refundAmount === payment.amountPiasters;
      if (isFullRefund && payment.enrollment) {
        try {
          await enrollmentService.revokeEnrollment(payment.userId, payment.packageId!);
          console.log(`[Refund Service] Enrollment revoked for user ${payment.userId} after full refund`);
        } catch (error) {
          console.error(`[Refund Service] Error revoking enrollment for ${paymentId}:`, error);
          throw new PaymentError(
            PaymentErrorCodes.REFUND_ENROLLMENT_REVOCATION_FAILED,
            `Refund completed but enrollment revocation failed`,
            500
          );
        }
      }

      // Log completion
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "REFUND_SUCCEEDED",
          status: "REFUNDED",
          metadata: {
            paymobRefundId,
            amount: payment.refundAmount,
            enrollmentRevoked: isFullRefund
          }
        }
      });

      console.log(`[Refund Service] Refund completed for payment ${paymentId}`);
      return true;
    } catch (error) {
      console.error(`[Refund Service] Error completing refund for ${paymentId}:`, error);
      throw error;
    }
  },

  // Handle failed refund
  async failRefund(paymentId: string, errorMessage: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        return false;
      }

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          refundStatus: "FAILED",
          refundLastRetryAt: new Date()
        }
      });

      // Log failure
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "REFUND_FAILED",
          status: "REFUND_FAILED",
          metadata: { errorMessage }
        }
      });

      console.log(`[Refund Service] Refund failed for payment ${paymentId}: ${errorMessage}`);
      return true;
    } catch (error) {
      console.error(`[Refund Service] Error failing refund for ${paymentId}:`, error);
      return false;
    }
  },

  // Get refund history for a payment
  async getRefundHistory(paymentId: string) {
    try {
      const refunds = await prisma.refundQueue.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" }
      });

      return refunds.map(r => ({
        refundId: r.id,
        paymentId,
        amount: r.refundAmount,
        status: r.resolution || "PROCESSING",
        refundType: r.refundType as "FULL" | "PARTIAL",
        initiatedAt: r.firstAttempt,
        completedAt: r.resolvedAt,
        reason: r.reason
      }));
    } catch (error) {
      console.error(`[Refund Service] Error getting refund history for ${paymentId}:`, error);
      return [];
    }
  }
};

// Helper function to call Paymob refund API
async function callPaymobRefundAPI(transactionId: string, amountCents: number): Promise<PaymobRefundResponse> {
  // TODO: Implement Paymob API call
  // This would call: POST https://accept.paymob.com/api/acceptance/refunds
  // With transaction_id and amount_cents

  try {
    // Placeholder - would call actual Paymob API
    console.log(`[Paymob API] Calling refund API for transaction ${transactionId}, amount ${amountCents}`);

    // Simulate Paymob response
    return {
      id: Math.floor(Math.random() * 1000000),
      amount_cents: amountCents,
      success: true,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error("[Paymob API] Refund API error:", error);
    throw new PaymentError(
      PaymentErrorCodes.REFUND_PAYMOB_ERROR,
      "Failed to call Paymob refund API",
      500
    );
  }
}

export default refundService;
