import { Redis as IORedis } from "ioredis";

export type LockoutLevel = 1 | 2 | 3;
export type LockoutIdentifierType = "ip" | "email" | "fp" | "reg_ip" | "reg_fp";

export interface LockoutState {
  expiresAt: Date;
  level: LockoutLevel;
  retryAfterSeconds: number;
}

export const LOCKOUT_RESET_VALUES: Record<LockoutLevel, number> = {
  1: 11,
  2: 16,
  3: 21
};

export const LOCKOUT_DURATIONS: Record<LockoutLevel, number> = {
  1: parseInt(process.env.AUTH_LOCKOUT_L1_SECONDS ?? "300", 10),
  2: parseInt(process.env.AUTH_LOCKOUT_L2_SECONDS ?? "1800", 10),
  3: parseInt(process.env.AUTH_LOCKOUT_L3_SECONDS ?? "3600", 10)
};

export class LockoutService {
  constructor(private readonly redis: IORedis) {}

  private key(type: LockoutIdentifierType, identifier: string): string {
    return `auth:lockout:${type}:${identifier.toLowerCase()}`;
  }

  async check(type: LockoutIdentifierType, identifier: string): Promise<LockoutState | null> {
    try {
      const raw = await this.redis.get(this.key(type, identifier));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { expiresAt: string; level: LockoutLevel };
      const expiresAt = new Date(parsed.expiresAt);
      if (expiresAt <= new Date()) {
        await this.redis.del(this.key(type, identifier));
        return null;
      }

      const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      return {
        expiresAt,
        level: parsed.level,
        retryAfterSeconds
      };
    } catch {
      return null;
    }
  }

  async apply(type: LockoutIdentifierType, identifier: string, level: LockoutLevel): Promise<void> {
    try {
      const durationSeconds = LOCKOUT_DURATIONS[level];
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);
      await this.redis.set(
        this.key(type, identifier),
        JSON.stringify({ expiresAt: expiresAt.toISOString(), level }),
        "EX",
        durationSeconds
      );
    } catch {
      // fail-open by design
    }
  }

  async clear(type: LockoutIdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.del(this.key(type, identifier));
    } catch {
      // fail-open by design
    }
  }

  getRetryAfterSeconds(lockout: LockoutState): number {
    return Math.max(1, Math.ceil((lockout.expiresAt.getTime() - Date.now()) / 1000));
  }
}
