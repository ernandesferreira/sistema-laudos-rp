import { z } from "zod";
import { PERMISSIONS } from "@/auth/permissions";
import { ROLE_KEYS } from "@/auth/roles";

export const roleKeySchema = z.enum(ROLE_KEYS);

export const updateRolePermissionsSchema = z.object({
  roleKey: roleKeySchema,
  permissionKeys: z.array(z.enum(PERMISSIONS)).min(1),
});
