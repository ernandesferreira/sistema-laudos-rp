import { z } from "zod";
import { resolveDatabaseUrl } from "@/lib/databaseUrl";

const resolvedDatabaseUrl = resolveDatabaseUrl();

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL (resolved) must be a valid URL"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: resolvedDatabaseUrl,
  NODE_ENV: process.env.NODE_ENV,
});
