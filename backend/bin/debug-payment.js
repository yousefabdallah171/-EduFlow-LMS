#!/usr/bin/env node

/**
 * Debug Payment Timeline CLI Tool
 * Usage: node bin/debug-payment.js <paymentId>
 *
 * Outputs:
 * - Payment status and details
 * - Event timeline (all events in chronological order)
 * - Enrollment details (if created)
 * - Recommendations for fixing issues
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugPayment(paymentId) {
  console.log("\n📋 Payment Debug Timeline\n");
  console.log(`Payment ID: ${paymentId}\n`);

  // 1. Get payment details
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    console.error(`❌ Payment not found: ${paymentId}`);
    process.exit(1);
  }

  // 2. Print payment status
  console.log("🔹 Payment Status:");
  console.log(`   ID: ${payment.id}`);
  console.log(`   User ID: ${payment.userId}`);
  console.log(`   Status: ${payment.status}`);
  console.log(`   Amount: ${(payment.amountPiasters / 100).toFixed(2)} ${payment.currency}`);
  console.log(`   Coupon: ${payment.couponId ? `${payment.couponId}` : "None"}`);
  console.log(`   Created: ${payment.createdAt.toISOString()}`);
  console.log(`   Updated: ${payment.updatedAt.toISOString()}`);

  if (payment.paymobTransactionId) {
    console.log(`   Paymob Transaction: ${payment.paymobTransactionId}`);
  }

  if (payment.webhookReceivedAt) {
    console.log(`   Webhook Received: ${payment.webhookReceivedAt.toISOString()}`);
  }

  if (payment.errorCode) {
    console.log(`   Error Code: ${payment.errorCode}`);
    console.log(`   Error Message: ${payment.errorMessage}`);
  }

  // 3. Get all events
  const events = await prisma.paymentEvent.findMany({
    where: { paymentId },
    orderBy: { createdAt: "asc" }
  });

  console.log(`\n🔹 Event Timeline (${events.length} events):`);
  events.forEach((event, index) => {
    const timestamp = event.createdAt.toISOString();
    const status = event.status || "N/A";
    const message = event.message ? ` - ${event.message}` : "";
    console.log(`   ${index + 1}. [${timestamp}] ${event.eventType} (${status})${message}`);
  });

  // 4. Check enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { paymentId }
  });

  if (enrollment) {
    console.log("\n🔹 Enrollment Status:");
    console.log(`   ID: ${enrollment.id}`);
    console.log(`   Type: ${enrollment.enrollmentType}`);
    console.log(`   Status: ${enrollment.status}`);
    console.log(`   Created: ${enrollment.createdAt.toISOString()}`);
  } else {
    if (payment.status === "COMPLETED") {
      console.log("\n⚠️  Enrollment Status:");
      console.log(`   ❌ NOT CREATED (expected for COMPLETED payment)`);
    } else {
      console.log("\n🔹 Enrollment Status:");
      console.log(`   ⏳ Not yet created (payment not completed)`);
    }
  }

  // 5. Get user details
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { email: true, fullName: true }
  });

  if (user) {
    console.log("\n🔹 User Details:");
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
  }

  // 6. Provide recommendations
  console.log("\n📌 Recommendations:\n");

  if (payment.status === "INITIATED") {
    console.log("   • Payment still in INITIATED state");
    console.log("   • Next step: User should proceed with Paymob payment");
    console.log("   • After payment, webhook should transition to WEBHOOK_PENDING/COMPLETED");
  } else if (payment.status === "AWAITING_PAYMENT") {
    console.log("   • Payment awaiting Paymob response");
    console.log("   • Next step: Wait for Paymob webhook");
  } else if (payment.status === "WEBHOOK_PENDING") {
    console.log("   ⚠️  Payment still WEBHOOK_PENDING (webhook not received)");
    console.log("   • Check Paymob webhook configuration");
    console.log("   • Verify webhook URL in Paymob dashboard");
    console.log("   • In development: Use POST /api/v1/dev/payments/ID/webhook/success to simulate");
    if (events.length === 0) {
      console.log("   • No events found - payment may not have been created properly");
    }
  } else if (payment.status === "COMPLETED") {
    console.log("   ✅ Payment completed successfully");
    if (!enrollment) {
      console.log("   ⚠️  But enrollment not created - check ENROLLMENT_FAILED events");
    } else {
      console.log(`   ✅ Enrollment created (${enrollment.enrollmentType})`);
    }
    const lastEvent = events[events.length - 1];
    if (lastEvent?.eventType === "EMAIL_FAILED") {
      console.log("   ⚠️  Email sending failed - check email configuration");
    } else if (lastEvent?.eventType?.includes("EMAIL")) {
      console.log("   ✅ Emails sent to user");
    }
  } else if (payment.status === "FAILED") {
    console.log("   ❌ Payment failed");
    if (payment.errorCode) {
      console.log(`   • Reason: ${payment.errorCode}`);
      console.log(`   • Details: ${payment.errorMessage}`);
    }
    console.log("   • User should retry payment or contact support");
  }

  // 7. Check for common issues
  console.log("\n🔍 Issue Detection:\n");

  let issueCount = 0;

  if (payment.status === "WEBHOOK_PENDING" && !payment.paymobTransactionId) {
    issueCount++;
    console.log(`   ${issueCount}. ⚠️  Webhook not received (no paymobTransactionId)`);
  }

  if (
    payment.status === "COMPLETED" &&
    !enrollment &&
    events.some((e) => e.eventType === "ENROLLMENT_FAILED")
  ) {
    issueCount++;
    console.log(`   ${issueCount}. ⚠️  Enrollment failed (check ENROLLMENT_FAILED event)`);
  }

  if (events.some((e) => e.eventType === "EMAIL_FAILED")) {
    issueCount++;
    console.log(`   ${issueCount}. ⚠️  Email sending failed (check EMAIL_FAILED event)`);
  }

  if (payment.errorCode) {
    issueCount++;
    console.log(`   ${issueCount}. ⚠️  Error recorded: ${payment.errorCode}`);
  }

  if (issueCount === 0 && payment.status === "COMPLETED") {
    console.log("   ✅ No issues detected - payment processed successfully");
  } else if (issueCount === 0) {
    console.log("   ℹ️  No critical issues detected");
  }

  console.log("\n");
}

// Main execution
const paymentId = process.argv[2];

if (!paymentId) {
  console.error("Usage: node bin/debug-payment.js <paymentId>");
  console.error("Example: node bin/debug-payment.js payment_abc123");
  process.exit(1);
}

debugPayment(paymentId)
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
