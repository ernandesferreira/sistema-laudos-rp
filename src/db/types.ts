import type { QueryResult, QueryResultRow } from "@neondatabase/serverless";

export type SqlValue = string | number | boolean | null | Date;

export interface DbExecutor {
  query<T extends QueryResultRow>(
    sqlText: string,
    values?: SqlValue[],
  ): Promise<QueryResult<T>>;
}
