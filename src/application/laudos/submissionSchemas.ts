import { z } from "zod";

const SUBMISSION_STATUS = ["PENDING", "REVIEWED", "ARCHIVED"] as const;

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export const submissionStatusSchema = z.enum(SUBMISSION_STATUS);

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  protocol: z.preprocess(emptyStringToUndefined, z.string().max(40).optional()),
  name: z.preprocess(emptyStringToUndefined, z.string().max(120).optional()),
  templateId: z.preprocess(emptyStringToUndefined, z.string().cuid().optional()),
  status: z.preprocess(emptyStringToUndefined, submissionStatusSchema.optional()),
  dateFrom: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  dateTo: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
});

export const submissionProtocolParamSchema = z.object({
  protocol: z.string().min(8).max(40),
});

export const createSubmissionPayloadSchema = z.object({
  submittedByName: z.string().min(2).max(120).optional().nullable(),
  submittedByContact: z.string().min(2).max(120).optional().nullable(),
  answers: z.record(z.string(), z.unknown()),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});
