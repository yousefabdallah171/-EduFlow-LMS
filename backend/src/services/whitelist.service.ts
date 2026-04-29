import type { PrismaClient, SecurityWhitelist } from "@prisma/client";
import { Redis as IORedis } from "ioredis";

const WHITELIST_TTL_SECONDS = 300;

export class WhitelistService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: IORedis
  ) {}

  private key(ip: string): string {
    return `auth:whitelist:ip:${ip}`;
  }

  async isWhitelisted(ip: string): Promise<boolean> {
    try {
      if ((await this.redis.get(this.key(ip))) === "1") {
        return true;
      }
    } catch {
      // fall through to DB check
    }

    try {
      const row = await this.prisma.securityWhitelist.findUnique({ where: { ipAddress: ip } });
      if (!row) {
        return false;
      }

      await this.redis.set(this.key(ip), "1", "EX", WHITELIST_TTL_SECONDS).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  async add(ip: string, addedById: string, reason?: string): Promise<SecurityWhitelist> {
    const row = await this.prisma.securityWhitelist.upsert({
      where: { ipAddress: ip },
      update: { reason, addedById },
      create: { ipAddress: ip, reason, addedById }
    });

    await this.redis.set(this.key(ip), "1", "EX", WHITELIST_TTL_SECONDS).catch(() => undefined);
    return row;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.securityWhitelist.findUnique({ where: { id } });
    if (!existing) {
      return;
    }

    await this.prisma.securityWhitelist.delete({ where: { id } });
    await this.redis.del(this.key(existing.ipAddress)).catch(() => undefined);
  }

  async list(): Promise<SecurityWhitelist[]> {
    return this.prisma.securityWhitelist.findMany({ orderBy: { createdAt: "desc" } });
  }

  async syncToRedis(): Promise<void> {
    try {
      const rows = await this.prisma.securityWhitelist.findMany({ select: { ipAddress: true } });
      await Promise.all(
        rows.map((row) => this.redis.set(this.key(row.ipAddress), "1", "EX", WHITELIST_TTL_SECONDS).catch(() => undefined))
      );
    } catch {
      // fail-open by design
    }
  }
}
