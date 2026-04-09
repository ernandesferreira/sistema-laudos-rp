import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

declare global {
  var __prismaClient__: PrismaClient | undefined;
}

export const prisma =
  global.__prismaClient__ ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}
