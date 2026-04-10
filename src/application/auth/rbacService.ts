import {
  listPermissionsCatalog,
  listRolesWithPermissions,
  replaceRolePermissions,
  syncSystemPermissionsCatalog,
} from "@/infra/repositories/rbacRepository";
import { updateRolePermissionsSchema } from "@/application/auth/rbacSchemas";
import { AppError } from "@/lib/errors";

export async function getRbacMatrix() {
  await syncSystemPermissionsCatalog();

  const [roles, permissions] = await Promise.all([
    listRolesWithPermissions(),
    listPermissionsCatalog(),
  ]);

  return {
    roles,
    permissions,
  };
}

export async function updateRolePermissions(input: unknown) {
  await syncSystemPermissionsCatalog();

  const parsed = updateRolePermissionsSchema.parse(input);

  if (parsed.roleKey === "super_admin") {
    throw new AppError("super_admin permissions are immutable", 400);
  }

  const updatedRole = await replaceRolePermissions(parsed.roleKey, parsed.permissionKeys);

  if (!updatedRole) {
    throw new AppError("Role not found", 404);
  }

  return updatedRole;
}
