import type { BrowserFingerprint, PrismaClient } from "@prisma/client";
import type { Request } from "express";

const FINGERPRINT_HEADER = "x-device-fingerprint";
const VALID_HASH_REGEX = /^[a-f0-9]{64}$/;

export class FingerprintService {
  constructor(private readonly prisma: PrismaClient) {}

  extractFromRequest(req: Request): string | null {
    const raw = req.headers[FINGERPRINT_HEADER];
    if (typeof raw !== "string") {
      return null;
    }

    return VALID_HASH_REGEX.test(raw) ? raw : null;
  }

  async upsertFingerprint(hash: string, userId?: string): Promise<BrowserFingerprint> {
    return this.prisma.browserFingerprint.upsert({
      where: { hash },
      update: {
        seenCount: { increment: 1 },
        lastSeenAt: new Date(),
        ...(userId ? { userId } : {})
      },
      create: {
        hash,
        seenCount: 1,
        ...(userId ? { userId } : {})
      }
    });
  }

  async getByHash(hash: string): Promise<BrowserFingerprint | null> {
    return this.prisma.browserFingerprint.findUnique({ where: { hash } });
  }
}
