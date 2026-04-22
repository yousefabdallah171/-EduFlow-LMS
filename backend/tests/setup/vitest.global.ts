import crypto from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const withSchema = (databaseUrl: string, schema: string) => {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
};

const ensureSchemaExists = async (databaseUrl: string, schema: string) => {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", "public");

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url.toString()
      }
    }
  });

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await prisma.$disconnect();
};

const dropSchema = async (databaseUrl: string, schema: string) => {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", "public");

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url.toString()
      }
    }
  });

  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await prisma.$disconnect();
};

export default async () => {
  process.env.NODE_ENV = "test";

  const argv = process.argv.join(" ");
  const isUnitOnlyRun = argv.includes("tests/unit") || argv.includes("tests\\unit") || argv.includes("--unit");

  if (isUnitOnlyRun) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for backend integration tests.");
  }

  const schema = `vitest_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await ensureSchemaExists(process.env.DATABASE_URL, schema);

  process.env.DATABASE_URL = withSchema(process.env.DATABASE_URL, schema);
  process.env.REDIS_KEY_PREFIX = `${schema}:`;
  process.env.STORAGE_PATH = path.join(".vitest-storage", schema);

  execSync("pnpm exec prisma migrate deploy --schema prisma/schema.prisma", {
    stdio: "inherit",
    env: process.env
  });

  return async () => {
    if (process.env.DATABASE_URL) {
      await dropSchema(process.env.DATABASE_URL, schema);
    }

    if (process.env.STORAGE_PATH) {
      await fs.rm(path.resolve(process.cwd(), process.env.STORAGE_PATH), { recursive: true, force: true }).catch(() => undefined);
    }
  };
};
