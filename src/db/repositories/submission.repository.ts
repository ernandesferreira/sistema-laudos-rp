import { withTransaction } from "@/db/client";
import type { DbExecutor } from "@/db/types";

export type CreateSubmissionInput = {
  templateVersionId: string;
  submittedByUserId?: string | null;
  submitterName?: string | null;
  submitterContact?: string | null;
  values: Array<{
    fieldId: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueDate?: string | null;
    valueDatetime?: string | null;
    valueJsonb?: unknown;
    selectedOptionIds?: string[];
  }>;
};

export type SubmissionRow = {
  id: string;
  template_version_id: string;
  submitted_by_user_id: string | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  status: string;
  submitted_at: string;
};

async function insertSubmissionRow(input: CreateSubmissionInput, tx: DbExecutor) {
  const submissionResult = await tx.query<SubmissionRow>(
    `insert into form_submissions (
      template_version_id,
      submitted_by_user_id,
      submitter_name,
      submitter_contact
    )
    values ($1, $2, $3, $4)
    returning id, template_version_id, submitted_by_user_id, submitter_name, submitter_contact, status::text, submitted_at::text`,
    [
      input.templateVersionId,
      input.submittedByUserId ?? null,
      input.submitterName ?? null,
      input.submitterContact ?? null,
    ],
  );

  return submissionResult.rows[0];
}

export class SubmissionRepository {
  static async create(input: CreateSubmissionInput): Promise<SubmissionRow> {
    return withTransaction(async (tx) => {
      const submission = await insertSubmissionRow(input, tx);

      for (const value of input.values) {
        const valueResult = await tx.query<{ id: string }>(
          `insert into submission_values (
            submission_id,
            field_id,
            value_text,
            value_number,
            value_boolean,
            value_date,
            value_datetime,
            value_jsonb
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          returning id`,
          [
            submission.id,
            value.fieldId,
            value.valueText ?? null,
            value.valueNumber ?? null,
            value.valueBoolean ?? null,
            value.valueDate ?? null,
            value.valueDatetime ?? null,
            value.valueJsonb ? JSON.stringify(value.valueJsonb) : null,
          ],
        );

        const submissionValueId = valueResult.rows[0].id;

        for (const optionId of value.selectedOptionIds ?? []) {
          await tx.query(
            `insert into submission_value_options (submission_value_id, field_option_id)
             values ($1, $2)`,
            [submissionValueId, optionId],
          );
        }
      }

      return submission;
    });
  }
}
