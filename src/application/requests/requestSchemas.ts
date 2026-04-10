import { z } from "zod";

const SERVICE_REQUEST_STATUS = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
  "FINAL_APPROVED",
  "FINAL_REJECTED",
  "CANCELLED",
] as const;

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseBooleanInput(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "1" || normalized === "true") {
      return true;
    }

    if (normalized === "0" || normalized === "false") {
      return false;
    }
  }

  return undefined;
}

export const serviceRequestStatusSchema = z.enum(SERVICE_REQUEST_STATUS);

export const listServiceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  protocol: z.preprocess(emptyStringToUndefined, z.string().max(40).optional()),
  citizenName: z.preprocess(emptyStringToUndefined, z.string().max(120).optional()),
  citizenDocument: z.preprocess(emptyStringToUndefined, z.string().max(30).optional()),
  templateId: z.preprocess(emptyStringToUndefined, z.string().cuid().optional()),
  status: z.preprocess(emptyStringToUndefined, serviceRequestStatusSchema.optional()),
  dateFrom: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  dateTo: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  judgeQueue: z.preprocess(parseBooleanInput, z.boolean().optional()),
});

export const createServiceRequestPayloadSchema = z.object({
  templateId: z.string().cuid(),
  citizenName: z.string().trim().min(3).max(120),
  citizenDocument: z.string().trim().min(3).max(40),
  citizenContact: z.string().trim().min(3).max(80),
  requesterName: z.string().trim().min(3).max(120),
  requesterDocument: z.string().trim().min(3).max(40),
  requesterOabNumber: z.string().trim().min(3).max(40).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

export const serviceRequestIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const manageServiceRequestPayloadSchema = z.object({
  action: z.enum(["inactivate"]),
});
