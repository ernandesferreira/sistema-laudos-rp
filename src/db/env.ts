import { z } from "zod";
import { resolveDatabaseUrl } from "@/lib/databaseUrl";

const resolvedDatabaseUrl = resolveDatabaseUrl();

const dbEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const dbEnv = dbEnvSchema.parse({
  DATABASE_URL: resolvedDatabaseUrl,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  DATABASE_SSL_REJECT_UNAUTHORIZED: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
  NODE_ENV: process.env.NODE_ENV,
});
