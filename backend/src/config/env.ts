import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(3000),
  ENFORCE_SINGLE_SESSION: z.coerce.boolean().default(true),
  STORAGE_PATH: z.string().default("storage"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  REDIS_KEY_PREFIX: z.string().default(""),
  FRONTEND_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  VIDEO_TOKEN_SECRET: z.string().min(32),
  PAYMOB_API_KEY: z.string().min(1),
  PAYMOB_HMAC_SECRET: z.string().min(1),
  PAYMOB_INTEGRATION_ID: z.string().min(1),
  PAYMOB_IFRAME_ID: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1)
});

export const env = envSchema.parse(process.env);
