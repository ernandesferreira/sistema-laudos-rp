import "dotenv/config";
import { closePool, healthcheck } from "../src/db/client";

async function main() {
  const result = await healthcheck();
  console.log("Database connection OK:", result);
}

main()
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
