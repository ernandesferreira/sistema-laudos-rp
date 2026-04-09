import { z } from "zod";
import { FIELD_TYPES } from "@/domain/laudos/types";

const TEMPLATE_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const templateStatusSchema = z.enum(TEMPLATE_STATUS);

export const createTemplateSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().nullable(),
  status: templateStatusSchema.default("DRAFT"),
  version: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const listTemplatesQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: templateStatusSchema.optional(),
  active: z.enum(["true", "false"]).optional(),
});

export const createSectionSchema = z.object({
  templateId: z.string().cuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  order: z.number().int().min(0).default(0),
});

export const updateSectionSchema = createSectionSchema
  .omit({ templateId: true })
  .partial();

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().cuid()).min(1),
});

export const createFieldSchema = z.object({
  sectionId: z.string().cuid(),
  label: z.string().min(2).max(120),
  name: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(FIELD_TYPES),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(250).optional().nullable(),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
  mask: z.string().max(80).optional().nullable(),
  isActive: z.boolean().default(true),
  options: z.array(z.string().min(1)).optional().nullable(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      regex: z.string().optional(),
    })
    .partial()
    .optional()
    .nullable(),
});

export const updateFieldSchema = createFieldSchema
  .omit({ sectionId: true })
  .partial();

export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().cuid()).min(1),
});

export const submissionPayloadSchema = z.object({
  submittedByName: z.string().min(2).max(120).optional().nullable(),
  submittedByContact: z.string().min(2).max(120).optional().nullable(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});
