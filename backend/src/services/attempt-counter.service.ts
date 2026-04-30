import { Redis as IORedis } from "ioredis";

export type IdentifierType = "ip" | "email" | "fp";

const COUNTER_TTL_SECONDS = 86400;

export class AttemptCounterService {
  constructor(private readonly redis: IORedis) {}

  private key(type: IdentifierType, identifier: string): string {
    return `auth:fail:${type}:${identifier.toLowerCase()}`;
  }

  private captchaKey(type: IdentifierType, identifier: string): string {
    return `auth:captcha:${type}:${identifier.toLowerCase()}`;
  }

  private emailIpsKey(email: string): string {
    return `auth:email:ips:${email.toLowerCase()}`;
  }

  async getCount(type: IdentifierType, identifier: string): Promise<number> {
    try {
      const val = await this.redis.get(this.key(type, identifier));
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async increment(type: IdentifierType, identifier: string): Promise<number> {
    try {
      const key = this.key(type, identifier);
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, COUNTER_TTL_SECONDS);
      }
      return count;
    } catch {
      return 0;
    }
  }

  async reset(type: IdentifierType, identifier: string, toValue = 0): Promise<void> {
    try {
      const key = this.key(type, identifier);
      if (toValue === 0) {
        await this.redis.del(key);
      } else {
        await this.redis.set(key, toValue.toString(), "EX", COUNTER_TTL_SECONDS);
      }
    } catch {
      // fail-open by design
    }
  }

  async setCaptchaRequired(type: IdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.set(this.captchaKey(type, identifier), "1", "EX", COUNTER_TTL_SECONDS);
    } catch {
      // fail-open by design
    }
  }

  async isCaptchaRequired(type: IdentifierType, identifier: string): Promise<boolean> {
    try {
      return (await this.redis.get(this.captchaKey(type, identifier))) === "1";
    } catch {
      return false;
    }
  }

  async clearCaptchaRequired(type: IdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.del(this.captchaKey(type, identifier));
    } catch {
      // fail-open by design
    }
  }

  async trackEmailIp(email: string, ip: string): Promise<number> {
    try {
      const key = this.emailIpsKey(email);
      await this.redis.sadd(key, ip);
      await this.redis.expire(key, COUNTER_TTL_SECONDS);
      return await this.redis.scard(key);
    } catch {
      return 1;
    }
  }

  async getRegistrationCount(type: "ip" | "fp", identifier: string): Promise<number> {
    try {
      const key = `reg:count:${type}:${identifier.toLowerCase()}`;
      const val = await this.redis.get(key);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async incrementRegistrationCount(type: "ip" | "fp", identifier: string): Promise<number> {
    try {
      const key = `reg:count:${type}:${identifier.toLowerCase()}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, COUNTER_TTL_SECONDS);
      }
      return count;
    } catch {
      return 0;
    }
  }
}
