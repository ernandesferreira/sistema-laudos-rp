import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export const listReleasedLicensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  protocol: z.preprocess(emptyStringToUndefined, z.string().max(40).optional()),
  licenseNumber: z.preprocess(emptyStringToUndefined, z.string().max(60).optional()),
  citizenName: z.preprocess(emptyStringToUndefined, z.string().max(120).optional()),
  citizenDocument: z.preprocess(emptyStringToUndefined, z.string().max(30).optional()),
  dateFrom: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  dateTo: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
});

export const releasedLicenseIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const licenseRevocationTypeSchema = z.enum(["days", "months", "years", "permanent"]);

export const revokeLicensePayloadSchema = z
  .object({
    type: licenseRevocationTypeSchema,
    value: z.coerce.number().int().min(1).max(1200).optional(),
    reason: z.preprocess(emptyStringToUndefined, z.string().max(400).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.type === "permanent") {
      return;
    }

    if (data.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Informe um prazo numerico para esse tipo de revogacao.",
      });
    }
  });
