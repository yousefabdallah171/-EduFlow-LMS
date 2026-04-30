import type { BanReason, BanType, PrismaClient, SecurityBan } from "@prisma/client";
import { Redis as IORedis } from "ioredis";

export interface CreateBanInput {
  banType: BanType;
  reason: BanReason;
  notes?: string;
  ipAddress?: string;
  email?: string;
  fingerprintId?: string;
  attemptCount?: number;
  isPermanent?: boolean;
  expiresAt?: Date;
  createdById?: string;
}

export interface BanFilters {
  isActive?: boolean;
  banType?: BanType;
  limit?: number;
  offset?: number;
}

export interface SecurityStats {
  activeBans: number;
  bansToday: number;
  attemptsBlockedToday: number;
}

export class BanService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: IORedis
  ) {}

  private redisBanKey(type: "ip" | "email" | "fp", identifier: string): string {
    return `auth:ban:${type}:${identifier.toLowerCase()}`;
  }

  private getTtlSeconds(isPermanent?: boolean, expiresAt?: Date): number {
    if (isPermanent) {
      return 365 * 24 * 60 * 60;
    }
    if (!expiresAt) {
      return 60 * 60;
    }
    return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  async checkActiveBan(ip: string, email: string | null, fpHash: string | null): Promise<SecurityBan | null> {
    try {
      const ipBanned = await this.redis.get(this.redisBanKey("ip", ip));
      if (ipBanned === "1") {
        return await this.prisma.securityBan.findFirst({ where: { ipAddress: ip, isActive: true } });
      }

      const emailNormalized = email ? email.toLowerCase() : null;
      const candidates = await this.prisma.securityBan.findMany({
        where: {
          isActive: true,
          OR: [
            { ipAddress: ip },
            ...(emailNormalized ? [{ email: emailNormalized }] : []),
            ...(fpHash
              ? [
                  {
                    fingerprint: {
                      hash: fpHash
                    }
                  }
                ]
              : [])
          ]
        },
        include: {
          fingerprint: true
        },
        orderBy: { createdAt: "desc" },
        take: 10
      });

      for (const ban of candidates) {
        if (ban.expiresAt && ban.expiresAt <= new Date()) {
          await this.prisma.securityBan.update({ where: { id: ban.id }, data: { isActive: false } });
          continue;
        }

        return ban;
      }

      return null;
    } catch {
      return null;
    }
  }

  async createBan(data: CreateBanInput): Promise<SecurityBan> {
    const ban = await this.prisma.securityBan.create({
      data: {
        banType: data.banType,
        reason: data.reason,
        notes: data.notes,
        ipAddress: data.ipAddress,
        email: data.email?.toLowerCase(),
        fingerprintId: data.fingerprintId,
        attemptCount: data.attemptCount,
        isPermanent: data.isPermanent ?? false,
        expiresAt: data.expiresAt,
        createdById: data.createdById
      }
    });

    await Promise.all([
      ban.ipAddress
        ? this.redis
            .set(this.redisBanKey("ip", ban.ipAddress), "1", "EX", this.getTtlSeconds(ban.isPermanent, ban.expiresAt ?? undefined))
            .catch(() => undefined)
        : Promise.resolve(),
      ban.email
        ? this.redis
            .set(this.redisBanKey("email", ban.email), "1", "EX", this.getTtlSeconds(ban.isPermanent, ban.expiresAt ?? undefined))
            .catch(() => undefined)
        : Promise.resolve()
    ]);

    return ban;
  }

  async liftBan(banId: string, adminId: string, liftReason: string): Promise<SecurityBan & { fingerprint: { hash: string } | null }> {
    const ban = await this.prisma.securityBan.update({
      where: { id: banId },
      data: {
        isActive: false,
        liftedAt: new Date(),
        liftedById: adminId,
        liftReason
      },
      include: { fingerprint: { select: { hash: true } } }
    });

    await Promise.all([
      ban.ipAddress ? this.redis.del(this.redisBanKey("ip", ban.ipAddress)).catch(() => undefined) : Promise.resolve(),
      ban.email ? this.redis.del(this.redisBanKey("email", ban.email)).catch(() => undefined) : Promise.resolve()
    ]);

    return ban;
  }

  async extendBan(banId: string, newExpiresAt: Date): Promise<SecurityBan> {
    const ban = await this.prisma.securityBan.update({
      where: { id: banId },
      data: {
        expiresAt: newExpiresAt,
        isPermanent: false,
        isActive: true
      }
    });

    await Promise.all([
      ban.ipAddress
        ? this.redis
            .set(this.redisBanKey("ip", ban.ipAddress), "1", "EX", this.getTtlSeconds(false, newExpiresAt))
            .catch(() => undefined)
        : Promise.resolve(),
      ban.email
        ? this.redis
            .set(this.redisBanKey("email", ban.email), "1", "EX", this.getTtlSeconds(false, newExpiresAt))
            .catch(() => undefined)
        : Promise.resolve()
    ]);

    return ban;
  }

  async listBans(filters: BanFilters = {}): Promise<{ data: SecurityBan[]; total: number }> {
    const where = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.banType ? { banType: filters.banType } : {})
    };

    const take = filters.limit ?? 20;
    const skip = filters.offset ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.securityBan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip
      }),
      this.prisma.securityBan.count({ where })
    ]);

    return { data, total };
  }

  async getStats(): Promise<SecurityStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeBans, bansToday, attemptsBlockedToday] = await Promise.all([
      this.prisma.securityBan.count({ where: { isActive: true } }),
      this.prisma.securityBan.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.authAttemptLog.count({
        where: {
          createdAt: { gte: startOfDay },
          result: { in: ["BLOCKED_BAN", "LOCKED_OUT", "RATE_LIMITED", "FLOOD_LIMIT"] }
        }
      })
    ]);

    return {
      activeBans,
      bansToday,
      attemptsBlockedToday
    };
  }
}
