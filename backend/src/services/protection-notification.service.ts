import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import type { PrismaClient } from "@prisma/client";
import { sendBrandedEmail } from "../utils/email.js";

type AcknowledgeType = "was-me" | "was-not-me";

interface AcknowledgeTokenPayload {
  email: string;
  type: AcknowledgeType;
}

export class ProtectionNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  generateAcknowledgeToken(email: string, type: AcknowledgeType): string {
    return jwt.sign({ email: email.toLowerCase(), type }, env.JWT_ACCESS_SECRET, { expiresIn: "48h" });
  }

  verifyAcknowledgeToken(token: string): AcknowledgeTokenPayload | null {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as Partial<AcknowledgeTokenPayload>;
      if (!payload.email || (payload.type !== "was-me" && payload.type !== "was-not-me")) {
        return null;
      }
      return { email: payload.email.toLowerCase(), type: payload.type };
    } catch {
      return null;
    }
  }

  async notifyStudentSuspiciousActivity(userId: string, email: string, ipAddress: string): Promise<void> {
    const wasMe = this.generateAcknowledgeToken(email, "was-me");
    const wasNotMe = this.generateAcknowledgeToken(email, "was-not-me");

    const ackBase = `${env.FRONTEND_URL}/security/acknowledge`;
    const wasMeUrl = `${ackBase}?token=${encodeURIComponent(wasMe)}`;
    const wasNotMeUrl = `${ackBase}?token=${encodeURIComponent(wasNotMe)}`;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    const fullName = user?.fullName ?? "Student";

    const body = `
      <p>Hello ${fullName},</p>
      <p>We detected suspicious login attempts on your account from IP <strong>${ipAddress}</strong>.</p>
      <p>If this was you, confirm below:</p>
      <p><a href="${wasMeUrl}">This was me</a></p>
      <p>If this was not you, secure your account:</p>
      <p><a href="${wasNotMeUrl}">This was not me - Secure my account</a></p>
    `;

    await sendBrandedEmail(email, "Unusual login activity on your EduFlow account", "Security Alert", body, {
      preheader: "We detected unusual sign-in activity."
    });
  }

  async notifyAdminPermanentBan(ip: string, email: string | null, fpHash: string | null, attemptCount: number): Promise<void> {
    const adminEmail = env.SECURITY_ADMIN_EMAIL;

    const body = `
      <p>A permanent ban was triggered.</p>
      <ul>
        <li><strong>IP:</strong> ${ip}</li>
        <li><strong>Email:</strong> ${email ?? "N/A"}</li>
        <li><strong>Fingerprint:</strong> ${fpHash ?? "N/A"}</li>
        <li><strong>Attempt Count:</strong> ${attemptCount}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
      <p>Review details in admin security dashboard.</p>
    `;

    await sendBrandedEmail(adminEmail, `EduFlow Security: Permanent ban triggered - ${ip}`, "Permanent Ban Alert", body);
  }
}
