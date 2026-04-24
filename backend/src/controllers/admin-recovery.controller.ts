import type { Request, Response } from "express";
import { prisma } from "../config/database.js";
import { paymentRecoveryService } from "../services/payment-recovery.service.js";
import { queueFailedPaymentForRecovery } from "../jobs/failed-payment-recovery.job.js";
import { retryEmailFromDlq } from "../jobs/email-queue.job.js";
import { PaymentError, PaymentErrorCodes } from "../types/payment.types.js";

export const adminRecoveryController = {
  // Get recovery status for a payment
  async getRecoveryStatus(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;

      const status = await paymentRecoveryService.getRecoveryStatus(paymentId);

      if (!status) {
        throw new PaymentError(
          PaymentErrorCodes.PAYMENT_NOT_FOUND,
          `Payment ${paymentId} not found`,
          404
        );
      }

      res.json(status);
    } catch (error) {
      handleError(error, res);
    }
  },

  // Override payment status (manual admin action)
  async overridePaymentStatus(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { newStatus, reason, adminNotes } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new PaymentError(
          "UNAUTHORIZED",
          "Admin ID not found",
          401
        );
      }

      // Validate payment exists
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

      // Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          lastStatusChange: new Date()
        }
      });

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "OVERRIDE_PAYMENT",
          paymentId,
          targetId: newStatus,
          reason,
          metadata: {
            oldStatus: payment.status,
            newStatus,
            adminNotes,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Create event for audit trail
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "PAYMENT_OVERRIDDEN",
          status: newStatus,
          metadata: {
            adminId,
            reason,
            previousStatus: payment.status
          }
        }
      });

      console.log(`[Admin Recovery] Payment ${paymentId} status overridden by ${adminId}: ${payment.status} → ${newStatus}`);

      res.json({
        success: true,
        payment: updatedPayment,
        auditLog: {
          action: "OVERRIDE_PAYMENT",
          timestamp: new Date(),
          admin: adminId,
          reason
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Retry failed payment manually
  async retryPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new PaymentError(
          "UNAUTHORIZED",
          "Admin ID not found",
          401
        );
      }

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

      // Queue for recovery
      await queueFailedPaymentForRecovery(paymentId, "PAYMOB_ERROR", "ADMIN_RETRY");

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "RETRY_PAYMENT",
          paymentId,
          targetId: paymentId,
          reason: reason || "Manual retry by admin",
          metadata: {
            currentStatus: payment.status,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Create event
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "PAYMENT_RETRY_INITIATED",
          status: payment.status,
          metadata: {
            adminId,
            reason
          }
        }
      });

      console.log(`[Admin Recovery] Payment ${paymentId} retry initiated by ${adminId}`);

      res.json({
        success: true,
        message: "Payment queued for retry",
        paymentId,
        auditLog: {
          action: "RETRY_PAYMENT",
          timestamp: new Date(),
          admin: adminId,
          reason
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Cancel payment
  async cancelPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { reason, refundAmount } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new PaymentError(
          "UNAUTHORIZED",
          "Admin ID not found",
          401
        );
      }

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

      // Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "CANCELLED",
          lastStatusChange: new Date(),
          cancelledAt: new Date(),
          cancelledBy: adminId,
          cancelReason: reason
        }
      });

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "CANCEL_PAYMENT",
          paymentId,
          targetId: paymentId,
          reason,
          metadata: {
            previousStatus: payment.status,
            refundAmount: refundAmount || null,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Create event
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "PAYMENT_CANCELLED",
          status: "CANCELLED",
          metadata: {
            adminId,
            reason,
            refundAmount: refundAmount || null
          }
        }
      });

      console.log(`[Admin Recovery] Payment ${paymentId} cancelled by ${adminId}. Reason: ${reason}`);

      res.json({
        success: true,
        payment: updatedPayment,
        auditLog: {
          action: "CANCEL_PAYMENT",
          timestamp: new Date(),
          admin: adminId,
          reason
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Retry failed email from DLQ
  async retryFailedEmail(req: Request, res: Response) {
    try {
      const { emailId } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new PaymentError(
          "UNAUTHORIZED",
          "Admin ID not found",
          401
        );
      }

      // Find email
      const email = await prisma.emailQueue.findUnique({
        where: { id: emailId }
      });

      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      // Retry from DLQ
      const retried = await retryEmailFromDlq(emailId);

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "RETRY_EMAIL",
          paymentId: email.paymentId,
          targetId: emailId,
          reason: "Manual retry from DLQ",
          metadata: {
            recipient: email.recipient,
            emailType: email.emailType,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`[Admin Recovery] Email ${emailId} retried from DLQ by ${adminId}`);

      res.json({
        success: true,
        email: retried,
        auditLog: {
          action: "RETRY_EMAIL",
          timestamp: new Date(),
          admin: adminId
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Get audit log for a payment
  async getAuditLog(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;

      // Get all audit logs for this payment
      const auditLogs = await prisma.adminAuditLog.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" },
        include: {
          admin: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Get payment event timeline
      const events = await prisma.paymentEvent.findMany({
        where: { paymentId },
        orderBy: { createdAt: "desc" }
      });

      res.json({
        paymentId,
        auditLogs,
        paymentEvents: events,
        totalActions: auditLogs.length,
        totalEvents: events.length
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Get admin audit trail (all actions by an admin)
  async getAdminAuditTrail(req: Request, res: Response) {
    try {
      const { adminId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const logs = await prisma.adminAuditLog.findMany({
        where: { adminId },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          payment: {
            select: { id: true, amount: true, status: true }
          }
        }
      });

      const total = await prisma.adminAuditLog.count({
        where: { adminId }
      });

      res.json({
        adminId,
        logs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  // Reconcile payment with Paymob
  async reconcileWithPaymob(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new PaymentError(
          "UNAUTHORIZED",
          "Admin ID not found",
          401
        );
      }

      const reconciled = await paymentRecoveryService.reconcileWithPaymob(paymentId);

      // Log action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "RECONCILE_PAYMENT",
          paymentId,
          targetId: paymentId,
          reason: "Manual reconciliation with Paymob",
          metadata: {
            reconciled,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`[Admin Recovery] Payment ${paymentId} reconciled by ${adminId}. Result: ${reconciled ? "SUCCESS" : "FAILED"}`);

      res.json({
        success: true,
        paymentId,
        reconciled,
        message: reconciled
          ? "Payment status updated from Paymob"
          : "No status change from Paymob",
        auditLog: {
          action: "RECONCILE_PAYMENT",
          timestamp: new Date(),
          admin: adminId
        }
      });
    } catch (error) {
      handleError(error, res);
    }
  }
};

function handleError(error: unknown, res: Response) {
  if (error instanceof PaymentError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
  } else {
    console.error("[Admin Recovery Controller] Error:", error);
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export default adminRecoveryController;
