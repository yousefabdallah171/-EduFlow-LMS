import type { AttemptResult, AttemptType, AuthAttemptLog, PrismaClient } from "@prisma/client";

export interface AttemptLogInput {
  type: AttemptType;
  result: AttemptResult;
  ipAddress: string;
  emailAttempted?: string | null;
  fingerprintId?: string | null;
  userId?: string | null;
  attemptNumber?: number;
  lockoutApplied?: boolean;
  banApplied?: boolean;
  captchaRequired?: boolean;
  captchaPassed?: boolean | null;
  delayApplied?: number;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LogFilters {
  type?: AttemptType;
  result?: AttemptResult;
  ipAddress?: string;
  email?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export class AttemptLogService {
  constructor(private readonly prisma: PrismaClient) {}

  log(data: AttemptLogInput): void {
    void this.prisma.authAttemptLog
      .create({
        data: {
          type: data.type,
          result: data.result,
          ipAddress: data.ipAddress,
          emailAttempted: data.emailAttempted?.toLowerCase() ?? null,
          fingerprintId: data.fingerprintId ?? null,
          userId: data.userId ?? null,
          attemptNumber: data.attemptNumber ?? 1,
          lockoutApplied: data.lockoutApplied ?? false,
          banApplied: data.banApplied ?? false,
          captchaRequired: data.captchaRequired ?? false,
          captchaPassed: data.captchaPassed ?? null,
          delayApplied: data.delayApplied ?? 0,
          userAgent: data.userAgent ?? null,
          metadata: data.metadata
        }
      })
      .catch(() => undefined);
  }

  async listLogs(filters: LogFilters = {}): Promise<{ data: AuthAttemptLog[]; total: number }> {
    const where = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.result ? { result: filters.result } : {}),
      ...(filters.ipAddress ? { ipAddress: filters.ipAddress } : {}),
      ...(filters.email ? { emailAttempted: filters.email.toLowerCase() } : {}),
      ...((filters.from || filters.to)
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    };

    const take = filters.limit ?? 50;
    const skip = filters.offset ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.authAttemptLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { fingerprint: { select: { hash: true } } }
      }),
      this.prisma.authAttemptLog.count({ where })
    ]);

    return { data, total };
  }

  async getAttemptCountFromDB(identifier: string, type: "ip" | "email" | "fp", since: Date): Promise<number> {
    if (type === "ip") {
      return this.prisma.authAttemptLog.count({
        where: {
          ipAddress: identifier,
          createdAt: { gte: since },
          result: { in: ["FAIL_CREDENTIALS", "CAPTCHA_FAIL", "LOCKED_OUT", "BLOCKED_BAN", "RATE_LIMITED", "FLOOD_LIMIT"] }
        }
      });
    }

    if (type === "email") {
      return this.prisma.authAttemptLog.count({
        where: {
          emailAttempted: identifier.toLowerCase(),
          createdAt: { gte: since },
          result: { in: ["FAIL_CREDENTIALS", "CAPTCHA_FAIL", "LOCKED_OUT", "BLOCKED_BAN", "RATE_LIMITED", "FLOOD_LIMIT"] }
        }
      });
    }

    return this.prisma.authAttemptLog.count({
      where: {
        fingerprint: { hash: identifier.toLowerCase() },
        createdAt: { gte: since },
        result: { in: ["FAIL_CREDENTIALS", "CAPTCHA_FAIL", "LOCKED_OUT", "BLOCKED_BAN", "RATE_LIMITED", "FLOOD_LIMIT"] }
      }
    });
  }
}
