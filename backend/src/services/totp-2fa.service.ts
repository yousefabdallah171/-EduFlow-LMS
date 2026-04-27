import { randomBytes } from "node:crypto";
import * as speakeasy from "speakeasy";
import * as qrcode from "qrcode";

import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { userRepository } from "../repositories/user.repository.js";

const generateBackupCodes = (count: number = 10): string[] => {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
};

const TOTP_SETUP_CACHE_KEY = (userId: string) => `totp-setup:${userId}`;
const TOTP_SETUP_TTL = 15 * 60; // 15 minutes

export const totp2faService = {
  async generateTotpSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `EduFlow (${email})`,
      issuer: "EduFlow LMS",
      length: 32
    });

    if (!secret.otpauth_url) {
      throw new Error("Failed to generate TOTP secret");
    }

    const qrCode = await qrcode.toDataURL(secret.otpauth_url);
    const backupCodes = generateBackupCodes(10);

    // Store secret and backup codes temporarily in Redis for verification
    const setupData = JSON.stringify({
      secret: secret.base32,
      backupCodes
    });
    await redis.set(TOTP_SETUP_CACHE_KEY(userId), setupData, "EX", TOTP_SETUP_TTL);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  },

  verifyTotp(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1
    });
  },

  async getPendingTotpSetup(userId: string) {
    const data = await redis.get(TOTP_SETUP_CACHE_KEY(userId));
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  },

  async enableTotpForAdmin(userId: string, secret: string, backupCodes: string[]) {
    await userRepository.update(userId, {
      adminTotpSecret: secret,
      adminTotpBackupCodes: backupCodes
    });
    await redis.del(TOTP_SETUP_CACHE_KEY(userId));
  },

  async disableTotpForAdmin(userId: string) {
    await userRepository.update(userId, {
      adminTotpSecret: null,
      adminTotpBackupCodes: []
    });
    await redis.del(TOTP_SETUP_CACHE_KEY(userId));
  },

  async verifyTotpToken(userId: string, token: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user?.adminTotpSecret) {
      return false;
    }

    // Check if token is a TOTP code
    if (this.verifyTotp(token, user.adminTotpSecret)) {
      return true;
    }

    // Check if token is a backup code
    if (user.adminTotpBackupCodes.includes(token)) {
      await userRepository.update(userId, {
        adminTotpBackupCodes: user.adminTotpBackupCodes.filter((code) => code !== token)
      });
      return true;
    }

    return false;
  },

  async hasTotp2faEnabled(userId: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    return !!(user?.adminTotpSecret && user.role === "ADMIN");
  }
};
