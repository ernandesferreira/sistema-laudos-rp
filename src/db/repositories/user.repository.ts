import type { DbExecutor } from "@/db/types";
import { query } from "@/db/client";

export type UserRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
};

function executorOrDefault(executor?: DbExecutor): Pick<DbExecutor, "query"> {
  if (executor) {
    return executor;
  }

  return { query };
}

export class UserRepository {
  static async findByEmail(email: string, executor?: DbExecutor): Promise<UserRow | null> {
    const db = executorOrDefault(executor);

    const result = await db.query<UserRow>(
      `select id, email, username, display_name, is_active, created_at::text, updated_at::text
       from users
       where email = $1
       limit 1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  static async create(input: CreateUserInput, executor?: DbExecutor): Promise<UserRow> {
    const db = executorOrDefault(executor);

    const result = await db.query<UserRow>(
      `insert into users (email, username, password_hash, display_name)
       values ($1, $2, $3, $4)
       returning id, email, username, display_name, is_active, created_at::text, updated_at::text`,
      [input.email, input.username, input.passwordHash, input.displayName],
    );

    return result.rows[0];
  }
}
