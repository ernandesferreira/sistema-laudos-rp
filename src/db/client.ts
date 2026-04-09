import {
  Pool,
  neonConfig,
  type QueryResult,
  type QueryResultRow,
} from "@neondatabase/serverless";
import ws from "ws";
import { dbEnv } from "@/db/env";
import type { DbExecutor, SqlValue } from "@/db/types";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

let pool: Pool | null = null;

function getPool() {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: dbEnv.DATABASE_URL,
    max: dbEnv.DATABASE_POOL_MAX,
    ssl: {
      rejectUnauthorized: dbEnv.DATABASE_SSL_REJECT_UNAUTHORIZED,
    },
  });

  return pool;
}

export async function query<T extends QueryResultRow>(
  sqlText: string,
  values: SqlValue[] = [],
): Promise<QueryResult<T>> {
  const activePool = getPool();
  return activePool.query<T>(sqlText, values);
}

export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  const activePool = getPool();
  const client = await activePool.connect();

  try {
    await client.query("BEGIN");

    const txExecutor: DbExecutor = {
      query: <R extends QueryResultRow>(
        sqlText: string,
        values: SqlValue[] = [],
      ) => client.query<R>(sqlText, values),
    };

    const result = await fn(txExecutor);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function healthcheck() {
  const result = await query<{ ok: number; now: string }>(
    "select 1 as ok, now()::text as now",
  );
  return result.rows[0];
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
