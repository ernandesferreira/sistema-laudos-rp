import { z } from "zod";
import type { FieldType } from "@/domain/laudos/types";

type TemplateField = {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  mask: string | null;
  isActive: boolean;
};

function getOptions(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((item): item is string => typeof item === "string");
}

function baseString(label: string) {
  return z.string().trim().max(1000, `${label} is too long`);
}

function schemaForField(field: TemplateField) {
  if (!field.isActive) {
    return z.any().optional();
  }

  const label = field.label;

  switch (field.type) {
    case "NUMBER":
      return z.coerce.number({ message: `${label} must be a number` });

    case "CHECKBOX":
      return z.coerce.boolean({ message: `${label} must be true or false` });

    case "DATE":
      return z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date`);

    case "TIME":
      return z
        .string()
        .regex(/^\d{2}:\d{2}$/, `${label} must be a valid time`);

    case "DATETIME":
      return z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
          `${label} must be a valid datetime`,
        );

    case "SELECT":
    case "RADIO": {
      const options = getOptions(field.options);
      const schema = z.string().min(1, `${label} is required`);
      return options.length > 0
        ? schema.refine((value) => options.includes(value), `${label} has invalid option`)
        : schema;
    }

    case "MULTISELECT": {
      const options = getOptions(field.options);
      const schema = z.array(z.string().min(1)).max(50);
      return options.length > 0
        ? schema.refine(
            (values) => values.every((value) => options.includes(value)),
            `${label} has invalid option`,
          )
        : schema;
    }

    case "CPF_FAKE":
      return baseString(label).regex(
        /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
        `${label} must match CPF format 000.000.000-00`,
      );

    case "RG_FAKE":
      return baseString(label).regex(
        /^\d{1,2}\.\d{3}\.\d{3}-[\dXx]$/,
        `${label} must match RG format 00.000.000-0`,
      );

    case "PLATE":
      return baseString(label).regex(
        /^[A-Z]{3}-\d[A-Z0-9]\d{2}$/,
        `${label} must match plate format AAA-0A00`,
      );

    default:
      return baseString(label);
  }
}

function withRequired(field: TemplateField, schema: z.ZodTypeAny) {
  if (field.required) {
    return schema;
  }

  if (field.type === "MULTISELECT") {
    return z.array(z.string()).optional();
  }

  if (field.type === "CHECKBOX") {
    return z.coerce.boolean().optional();
  }

  return schema.optional().or(z.literal(""));
}

export function validateSubmissionAnswers(
  fields: TemplateField[],
  answers: Record<string, unknown>,
) {
  const activeFields = fields.filter((field) => field.isActive);

  const shape = Object.fromEntries(
    activeFields.map((field) => {
      const fieldSchema = withRequired(field, schemaForField(field));
      return [field.name, fieldSchema];
    }),
  );

  const schema = z.object(shape).strict();
  const parsed = schema.safeParse(answers);

  if (parsed.success) {
    return { ok: true as const, data: parsed.data };
  }

  const fieldErrors: Record<string, string> = {};

  for (const issue of parsed.error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return {
    ok: false as const,
    fieldErrors,
  };
}
