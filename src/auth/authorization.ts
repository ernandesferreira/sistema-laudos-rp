import type { Permission } from "@/auth/permissions";
import type { RoleKey } from "@/auth/roles";

type AuthorizationSubject = {
  roles: RoleKey[];
  permissions: Permission[];
};

export function isSuperAdmin(roles: RoleKey[]) {
  return roles.includes("super_admin");
}

export function hasPermission(subject: AuthorizationSubject, permission: Permission) {
  return isSuperAdmin(subject.roles) || subject.permissions.includes(permission);
}

export function hasAnyPermission(subject: AuthorizationSubject, permissions: Permission[]) {
  return permissions.some((permission) => hasPermission(subject, permission));
}

export function hasAllPermissions(subject: AuthorizationSubject, permissions: Permission[]) {
  return permissions.every((permission) => hasPermission(subject, permission));
}

export function hasAnyRole(subject: AuthorizationSubject, roles: RoleKey[]) {
  return roles.some((role) => subject.roles.includes(role));
}
