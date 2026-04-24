import type { Job } from "bull";
import { emailQueue } from "./job-queue.js";
import { emailService } from "../services/email.service.js";
import { prisma } from "../config/database.js";

interface EmailQueueJobData {
  emailId: string;
  recipient: string;
  emailType: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  retryCount: number;
}

// Register email queue job processor
export function setupEmailQueueProcessor() {
  emailQueue.process(10, async (job: Job<EmailQueueJobData>) => {
    const { emailId, recipient, subject, template, context, retryCount } = job.data;

    try {
      console.log(`[Email Queue] Processing email ${emailId} to ${recipient}, attempt ${retryCount + 1}`);

      // Attempt to send email
      const result = await emailService.sendEmail({
        to: recipient,
        subject,
        template,
        context
      });

      // Mark as sent in database
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastAttempt: new Date(),
          retryCount: retryCount + 1
        }
      });

      console.log(`[Email Queue] ✅ Email ${emailId} sent successfully to ${recipient}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const maxRetries = 5;

      console.error(`[Email Queue] ❌ Email ${emailId} sending failed:`, errorMessage);

      // Check for permanent failure codes (bounce, invalid address, etc.)
      const isPermanentFailure = isPermanentEmailError(errorMessage, error);

      if (isPermanentFailure) {
        console.error(`[Email Queue] 🔴 Permanent failure detected for email ${emailId}. Moving to DLQ.`);

        await prisma.emailQueue.update({
          where: { id: emailId },
          data: {
            status: "DLQ",
            movedToDlqAt: new Date(),
            lastError: errorMessage,
            errorCode: "EMAIL_BOUNCE_DETECTED",
            lastAttempt: new Date(),
            retryCount: retryCount + 1
          }
        });

        throw new Error(`Email ${emailId} moved to DLQ: ${errorMessage}`);
      }

      // Determine if we should retry (transient failures)
      if (retryCount < maxRetries - 1) {
        // Exponential backoff: 30s, 2min, 10min, 30min, 2hr
        const backoffMs = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000][retryCount];

        console.log(`[Email Queue] Scheduling retry for email ${emailId} in ${backoffMs / 1000 / 60} minutes`);

        // Update next retry time
        const nextRetryAt = new Date(Date.now() + backoffMs);
        await prisma.emailQueue.update({
          where: { id: emailId },
          data: {
            status: "PENDING",
            retryCount: retryCount + 1,
            nextRetry: nextRetryAt,
            lastAttempt: new Date(),
            lastError: errorMessage,
            errorCode: "EMAIL_FAILED"
          }
        });

        // Re-queue for later
        throw new Error(`Email retry will be rescheduled. Next attempt in ${backoffMs / 1000 / 60} minutes`);
      } else {
        // Max retries exceeded - move to DLQ
        console.error(`[Email Queue] 🔴 Max retries exceeded for email ${emailId}. Moving to DLQ.`);

        await prisma.emailQueue.update({
          where: { id: emailId },
          data: {
            status: "DLQ",
            movedToDlqAt: new Date(),
            lastError: errorMessage,
            errorCode: "EMAIL_FAILED",
            lastAttempt: new Date(),
            retryCount: retryCount + 1
          }
        });

        throw new Error(`Email retry max retries exceeded for email ${emailId}`);
      }
    }
  });

  emailQueue.on("completed", (job) => {
    console.log(`[Email Queue Job] Job ${job.id} completed successfully`);
  });

  emailQueue.on("failed", (job, err) => {
    console.error(`[Email Queue Job] Job ${job.id} failed:`, err.message);
  });
}

// Detect permanent email failures (bounce, invalid address, etc.)
function isPermanentEmailError(errorMessage: string): boolean {
  const permanentErrorPatterns = [
    /invalid.*email/i,
    /malformed.*email/i,
    /bounce/i,
    /550\s/i, // SMTP 550 - Mailbox not found
    /551\s/i, // SMTP 551 - User not local
    /552\s/i, // SMTP 552 - Mailbox full
    /553\s/i, // SMTP 553 - Invalid mailbox name
    /554\s/i, // SMTP 554 - Transaction failed (often permanent)
    /user.*unknown/i,
    /address.*rejected/i,
    /does.*not.*exist/i,
    /permanently.*rejected/i
  ];

  return permanentErrorPatterns.some(pattern => pattern.test(errorMessage));
}

// Queue an email for sending
export async function queueEmail(
  recipient: string,
  emailType: string,
  subject: string,
  template: string,
  context: Record<string, unknown>,
  paymentId?: string
) {
  try {
    // Create queue entry in database
    const queueEntry = await prisma.emailQueue.create({
      data: {
        recipient,
        emailType,
        subject,
        template,
        context,
        status: "PENDING",
        retryCount: 0,
        maxRetries: 5,
        nextRetry: new Date(Date.now() + 30 * 1000), // First retry in 30 seconds
        paymentId: paymentId || null
      }
    });

    // Add to Bull queue with delay
    await emailQueue.add(
      {
        emailId: queueEntry.id,
        recipient,
        emailType,
        subject,
        template,
        context,
        retryCount: 0
      },
      {
        delay: 30 * 1000, // 30 second delay before first attempt
        attempts: 1, // Bull will handle retries via our logic
        backoff: {
          type: "fixed",
          delay: 1000
        },
        jobId: `email-${queueEntry.id}` // Unique job ID for idempotency
      }
    );

    console.log(`[Email Queue] Queued email ${queueEntry.id} for ${recipient}`);
    return queueEntry;
  } catch (error) {
    console.error(`[Email Queue] Failed to queue email:`, error);
    throw error;
  }
}

// Retry email from DLQ (admin operation)
export async function retryEmailFromDlq(emailId: string) {
  try {
    const email = await prisma.emailQueue.findUnique({
      where: { id: emailId }
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Reset for retry
    const updatedEmail = await prisma.emailQueue.update({
      where: { id: emailId },
      data: {
        status: "PENDING",
        retryCount: 0,
        movedToDlqAt: null,
        nextRetry: new Date()
      }
    });

    // Re-queue immediately
    await emailQueue.add(
      {
        emailId,
        recipient: email.recipient,
        emailType: email.emailType,
        subject: email.subject,
        template: email.template,
        context: email.context as Record<string, unknown>,
        retryCount: 0
      },
      {
        delay: 0, // Send immediately
        attempts: 1,
        jobId: `email-${emailId}-retry` // New job ID
      }
    );

    console.log(`[Email Queue] Email ${emailId} retried from DLQ`);
    return updatedEmail;
  } catch (error) {
    console.error(`[Email Queue] Failed to retry email from DLQ:`, error);
    throw error;
  }
}

export default {
  setupEmailQueueProcessor,
  queueEmail,
  retryEmailFromDlq
};
