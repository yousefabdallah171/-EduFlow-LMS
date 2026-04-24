import { prisma } from "../config/database.js";
import { enrollmentService } from "./enrollment.service.js";
import { errorLoggingService } from "./error-logging.service.js";
import { sendEnrollmentActivatedEmail } from "../utils/email.js";
import type { PaymentStatus } from "@prisma/client";

export interface ManualPaymentRequest {
  userId: string;
  packageId: string;
  amount: number;
  reason: string;
  adminNotes?: string;
}

export interface PaymentStatusOverrideRequest {
  paymentId: string;
  newStatus: PaymentStatus;
  reason: string;
  adminNotes?: string;
}

export const adminPaymentManagementService = {
  // Create a manual payment (admin marks payment as complete)
  async createManualPayment(request: ManualPaymentRequest, adminId: string) {
    try {
      const { userId, packageId, amount, reason, adminNotes } = request;

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Validate package exists
      const pkg = await prisma.coursePackage.findUnique({
        where: { id: packageId }
      });

      if (!pkg) {
        throw new Error(`Package ${packageId} not found`);
      }

      // Check if already enrolled
      const existing = await prisma.enrollment.findUnique({
        where: { userId }
      });

      if (existing && existing.status === "ACTIVE") {
        throw new Error(`User ${userId} already enrolled`);
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          packageId,
          amountPiasters: amount,
          amountEgp: amount / 100, // Assuming 100 piasters = 1 EGP
          currency: "EGP",
          status: "COMPLETED",
          refundStatus: null,
          paymentMethod: "MANUAL",
          createdAt: new Date()
        }
      });

      // Create payment event
      await prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "PAYMENT_COMPLETED",
          status: "COMPLETED",
          metadata: {
            adminId,
            reason,
            adminNotes,
            manualCreation: true
          }
        }
      });

      // Trigger enrollment
      await enrollmentService.enroll(userId, "LIFETIME", payment.id);

      // Send confirmation email
      try {
        await sendEnrollmentActivatedEmail(user.email, user.name || "Student");
      } catch (error) {
        console.error("[Admin Payment Management] Error sending enrollment email:", error);
        // Don't fail the whole operation if email fails
      }

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "CREATE_MANUAL_PAYMENT",
          paymentId: payment.id,
          targetId: userId,
          reason: reason || "Manual payment creation",
          metadata: {
            userId,
            packageId,
            amount,
            adminNotes,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Log to error logging service
      await errorLoggingService.logPaymentError(
        payment.id,
        "MANUAL_PAYMENT_CREATED",
        `Manual payment created by admin ${adminId}: ${amount} piasters`,
        {
          adminId,
          userId,
          packageId,
          endpoint: "POST /api/v1/admin/payments/manual",
          duration: 0
        }
      );

      console.log(`[Admin Payment Management] Manual payment created for user ${userId} by admin ${adminId}`);

      return payment;
    } catch (error) {
      console.error("[Admin Payment Management] Error creating manual payment:", error);
      throw error;
    }
  },

  // Override payment status (for recovery scenarios)
  async overridePaymentStatus(request: PaymentStatusOverrideRequest, adminId: string) {
    try {
      const { paymentId, newStatus, reason, adminNotes } = request;

      // Get existing payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      const oldStatus = payment.status;

      // Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus
        }
      });

      // Create payment event for status change
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType: "STATUS_OVERRIDE",
          status: newStatus,
          metadata: {
            adminId,
            oldStatus,
            newStatus,
            reason,
            adminNotes,
            timestamp: new Date().toISOString()
          }
        }
      });

      // If changing to COMPLETED, trigger enrollment if not exists
      if (newStatus === "COMPLETED" && oldStatus !== "COMPLETED") {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId: payment.userId }
        });

        if (!enrollment || enrollment.status !== "ACTIVE") {
          await enrollmentService.enroll(payment.userId, "LIFETIME", paymentId);

          const user = await prisma.user.findUnique({
            where: { id: payment.userId }
          });

          if (user) {
            try {
              await sendEnrollmentActivatedEmail(user.email, user.name || "Student");
            } catch (error) {
              console.error("[Admin Payment Management] Error sending email:", error);
            }
          }
        }
      }

      // If changing from COMPLETED to something else, revoke enrollment
      if (oldStatus === "COMPLETED" && newStatus !== "COMPLETED") {
        await enrollmentService.revoke(payment.userId, adminId);
      }

      // Log admin action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "OVERRIDE_PAYMENT_STATUS",
          paymentId,
          targetId: payment.userId,
          reason: reason || "Status override",
          metadata: {
            oldStatus,
            newStatus,
            adminNotes,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Log to error logging service
      await errorLoggingService.logPaymentError(
        paymentId,
        "PAYMENT_STATUS_OVERRIDE",
        `Payment status overridden by admin ${adminId}: ${oldStatus} → ${newStatus}`,
        {
          adminId,
          oldStatus,
          newStatus,
          endpoint: "POST /api/v1/admin/payments/:paymentId/override",
          duration: 0
        }
      );

      console.log(`[Admin Payment Management] Payment ${paymentId} status overridden: ${oldStatus} → ${newStatus} by admin ${adminId}`);

      return updatedPayment;
    } catch (error) {
      console.error("[Admin Payment Management] Error overriding payment status:", error);
      throw error;
    }
  },

  // Revoke payment (mark as refunded)
  async revokePayment(paymentId: string, reason: string, adminId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      // Mark as refunded
      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUNDED",
          refundStatus: "COMPLETED"
        }
      });

      // Revoke enrollment
      await enrollmentService.revoke(payment.userId, adminId);

      // Log action
      await prisma.adminAuditLog.create({
        data: {
          adminId,
          action: "REVOKE_PAYMENT",
          paymentId,
          targetId: payment.userId,
          reason,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`[Admin Payment Management] Payment ${paymentId} revoked by admin ${adminId}`);

      return updated;
    } catch (error) {
      console.error("[Admin Payment Management] Error revoking payment:", error);
      throw error;
    }
  }
};

export default adminPaymentManagementService;
