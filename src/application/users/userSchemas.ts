import { z } from "zod";
import { ROLE_KEYS } from "@/auth/roles";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export const listUsersQuerySchema = z.object({
  search: z.preprocess(emptyStringToUndefined, z.string().max(120).optional()),
});

export const userIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createUserPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  passportNumber: z.string().trim().min(3).max(40),
  oabNumber: z.preprocess(emptyStringToUndefined, z.string().trim().min(3).max(40).optional()),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128).optional().nullable(),
  roleKeys: z.array(z.enum(ROLE_KEYS)).min(1),
  isActive: z.boolean().optional().default(true),
});

export const updateUserPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  passportNumber: z.string().trim().min(3).max(40).optional(),
  oabNumber: z.preprocess(emptyStringToUndefined, z.string().trim().min(3).max(40).optional()),
  email: z.string().trim().email().max(160).optional(),
  password: z.string().min(8).max(128).optional().nullable(),
  roleKeys: z.array(z.enum(ROLE_KEYS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserStatusPayloadSchema = z.object({
  isActive: z.boolean(),
});
