export function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const local = process.env.DATABASE_URL_LOCAL?.trim();
  const production = process.env.DATABASE_URL_PROD?.trim();

  const isVercelProduction =
    process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

  if (isVercelProduction || process.env.NODE_ENV === "production") {
    return production ?? local ?? "";
  }

  return local ?? production ?? "";
}
