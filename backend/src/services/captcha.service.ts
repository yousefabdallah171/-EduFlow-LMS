import { env } from "../config/env.js";
import { Redis as IORedis } from "ioredis";

export type CaptchaIdentifierType = "ip" | "email" | "fp";

const CAPTCHA_TTL_SECONDS = 86400;

export class CaptchaService {
  constructor(private readonly redis: IORedis) {}

  private key(type: CaptchaIdentifierType, identifier: string): string {
    return `auth:captcha:${type}:${identifier.toLowerCase()}`;
  }

  async isRequired(ip: string, email: string | null, fpHash: string | null): Promise<boolean> {
    try {
      const keys = [this.key("ip", ip), ...(email ? [this.key("email", email)] : []), ...(fpHash ? [this.key("fp", fpHash)] : [])];
      if (keys.length === 0) {
        return false;
      }

      const values = await this.redis.mget(...keys);
      return values.some((v) => v === "1");
    } catch {
      return false;
    }
  }

  async setRequired(type: CaptchaIdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.set(this.key(type, identifier), "1", "EX", CAPTCHA_TTL_SECONDS);
    } catch {
      // fail-open by design
    }
  }

  async clearRequired(type: CaptchaIdentifierType, identifier: string): Promise<void> {
    try {
      await this.redis.del(this.key(type, identifier));
    } catch {
      // fail-open by design
    }
  }

  async verify(token: string, ip: string): Promise<boolean> {
    if (!token?.trim()) {
      return false;
    }

    try {
      const body = new URLSearchParams({
        secret: env.HCAPTCHA_SECRET_KEY,
        response: token,
        remoteip: ip
      });

      const response = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  }
}
