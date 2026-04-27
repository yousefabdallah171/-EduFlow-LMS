import type { Job } from "bull";
import { emailQueue } from "./job-queue.js";
import { emailService } from "../utils/email.js";
import { prisma } from "../config/database.js";

interface EmailQueueJobData {
  emailId?: string;
  recipient: string;
  emailType?: string;
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  retryCount?: number;
  prerenderedHtml?: string;
  isBroadcast?: boolean;
}

// Register email queue job processor
export function setupEmailQueueProcessor() {
  emailQueue.process(10, async (job: Job<EmailQueueJobData>) => {
    const { emailId, recipient, subject, template, context, retryCount, prerenderedHtml, isBroadcast } = job.data;

    try {
      if (isBroadcast) {
        console.log(`[Email Queue] Processing broadcast email to ${recipient}, attempt ${job.attemptsMade + 1}`);
      } else {
        console.log(`[Email Queue] Processing email ${emailId} to ${recipient}, attempt ${retryCount ? retryCount + 1 : 1}`);
      }

      let result;

      // Handle broadcast emails (prerendered HTML)
      if (isBroadcast && prerenderedHtml) {
        const { sendBrandedEmail } = await import("../utils/email.js");
        result = await sendBrandedEmail(recipient, subject, subject, prerenderedHtml);
        console.log(`[Email Queue] ✅ Broadcast email sent successfully to ${recipient}`);
      } else {
        // Handle templated emails via emailService
        result = await emailService.sendEmail({
          to: recipient,
          subject,
          template,
          context
        });

        // Mark as sent in database (only for templated emails with database tracking)
        if (emailId) {
          await prisma.emailQueue.update({
            where: { id: emailId },
            data: {
              status: "SENT",
              sentAt: new Date(),
              lastAttempt: new Date(),
              retryCount: (retryCount || 0) + 1
            }
          });
          console.log(`[Email Queue] ✅ Email ${emailId} sent successfully to ${recipient}`);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (isBroadcast) {
        console.error(`[Email Queue] ❌ Broadcast email to ${recipient} failed:`, errorMessage);
        // Bull will automatically retry broadcast emails (configured with 3 attempts)
        throw error; // Let Bull handle retries
      }

      // Handle templated emails with database persistence
      const maxRetries = 5;
      console.error(`[Email Queue] ❌ Email ${emailId} sending failed:`, errorMessage);

      // Check for permanent failure codes (bounce, invalid address, etc.)
      const isPermanentFailure = isPermanentEmailError(errorMessage);

      if (isPermanentFailure) {
        console.error(`[Email Queue] 🔴 Permanent failure detected for email ${emailId}. Moving to DLQ.`);

        await prisma.emailQueue.update({
          where: { id: emailId! },
          data: {
            status: "DLQ",
            movedToDlqAt: new Date(),
            lastError: errorMessage,
            errorCode: "EMAIL_BOUNCE_DETECTED",
            lastAttempt: new Date(),
            retryCount: (retryCount || 0) + 1
          }
        });

        throw new Error(`Email ${emailId} moved to DLQ: ${errorMessage}`);
      }

      // Determine if we should retry (transient failures)
      const attempts = retryCount || 0;
      if (attempts < maxRetries - 1) {
        // Exponential backoff: 30s, 2min, 10min, 30min, 2hr
        const backoffMs = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000][attempts];

        console.log(`[Email Queue] Scheduling retry for email ${emailId} in ${backoffMs / 1000 / 60} minutes`);

        // Update next retry time
        const nextRetryAt = new Date(Date.now() + backoffMs);
        await prisma.emailQueue.update({
          where: { id: emailId! },
          data: {
            status: "PENDING",
            retryCount: attempts + 1,
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
          where: { id: emailId! },
          data: {
            status: "DLQ",
            movedToDlqAt: new Date(),
            lastError: errorMessage,
            errorCode: "EMAIL_FAILED",
            lastAttempt: new Date(),
            retryCount: attempts + 1
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

// Queue broadcast notification email (no template rendering, no database logging)
export async function queueBroadcastEmail(
  recipient: string,
  subject: string,
  prerenderedHtml: string
) {
  try {
    await emailQueue.add(
      {
        recipient,
        subject,
        prerenderedHtml,
        isBroadcast: true
      },
      {
        attempts: 3, // Retry 3 times for broadcasts
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: true, // Clean up after successful send
        jobId: `broadcast-${recipient}-${Date.now()}` // Unique job ID
      }
    );

    return true;
  } catch (error) {
    console.error(`[Email Queue] Failed to queue broadcast email to ${recipient}:`, error);
    throw error;
  }
}

export default {
  setupEmailQueueProcessor,
  queueEmail,
  retryEmailFromDlq,
  queueBroadcastEmail
};
