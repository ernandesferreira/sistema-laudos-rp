import type { DbExecutor } from "@/db/types";
import { query } from "@/db/client";

export type FormTemplateListItem = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  current_published_version_id: string | null;
};

export type CreateTemplateInput = {
  slug: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
};

function executorOrDefault(executor?: DbExecutor): Pick<DbExecutor, "query"> {
  if (executor) {
    return executor;
  }

  return { query };
}

export class FormTemplateRepository {
  static async list(executor?: DbExecutor): Promise<FormTemplateListItem[]> {
    const db = executorOrDefault(executor);

    const result = await db.query<FormTemplateListItem>(
      `select id, slug, name, is_active, created_at::text, current_published_version_id
       from form_templates
       order by created_at desc`,
    );

    return result.rows;
  }

  static async create(input: CreateTemplateInput, executor?: DbExecutor): Promise<FormTemplateListItem> {
    const db = executorOrDefault(executor);

    const result = await db.query<FormTemplateListItem>(
      `insert into form_templates (slug, name, description, created_by)
       values ($1, $2, $3, $4)
       returning id, slug, name, is_active, created_at::text, current_published_version_id`,
      [input.slug, input.name, input.description ?? null, input.createdBy ?? null],
    );

    return result.rows[0];
  }
}
