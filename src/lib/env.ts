import { z } from "zod";
import { resolveDatabaseUrl } from "@/lib/databaseUrl";

const resolvedDatabaseUrl = resolveDatabaseUrl();

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL (resolved) must be a valid URL"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_ENFORCE_MIDDLEWARE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AUTH_ENFORCE_GUARDS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse({
  DATABASE_URL: resolvedDatabaseUrl,
  NODE_ENV: process.env.NODE_ENV,
  AUTH_ENFORCE_MIDDLEWARE: process.env.AUTH_ENFORCE_MIDDLEWARE,
  AUTH_ENFORCE_GUARDS: process.env.AUTH_ENFORCE_GUARDS,
});
