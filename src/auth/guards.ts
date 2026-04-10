import { redirect } from "next/navigation";
import {
  hasAnyRole as hasAnyRoleFromSubject,
  hasPermission as hasPermissionFromSubject,
} from "@/auth/authorization";
import type { Permission } from "./permissions";
import {
  getAuthIdentityFromRequest,
  getAuthIdentityFromServerContext,
  getCurrentAuthUser,
  resolveAuthUser,
  type AuthUser,
} from "@/auth/session";
import type { RoleKey } from "./roles";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";

const AUTH_ENFORCE_GUARDS = env.AUTH_ENFORCE_GUARDS;

function hasPermission(user: AuthUser, permission: Permission) {
  return hasPermissionFromSubject(user, permission);
}

function hasAnyRole(user: AuthUser, roles: RoleKey[]) {
  return hasAnyRoleFromSubject(user, roles);
}

export async function requireApiPermission(request: Request, permission: Permission) {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const identity = getAuthIdentityFromRequest(request);
  let user = await resolveAuthUser(identity);

  if (!user) {
    const serverIdentity = await getAuthIdentityFromServerContext();
    user = await resolveAuthUser(serverIdentity);
  }

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!hasPermission(user, permission)) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}

export async function requirePagePermission(permission: Permission) {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/?auth=required");
  }

  if (!hasPermission(user, permission)) {
    redirect("/?auth=forbidden");
  }

  return user;
}

export async function requireActionPermission(permission: Permission) {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const user = await getCurrentAuthUser();

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!hasPermission(user, permission)) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}

export async function requireApiSuperAdmin(request: Request) {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const identity = getAuthIdentityFromRequest(request);
  let user = await resolveAuthUser(identity);

  if (!user) {
    const serverIdentity = await getAuthIdentityFromServerContext();
    user = await resolveAuthUser(serverIdentity);
  }

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!hasAnyRole(user, ["super_admin"])) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}

export async function requirePageSuperAdmin() {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/?auth=required");
  }

  if (!hasAnyRole(user, ["super_admin"])) {
    redirect("/?auth=forbidden");
  }

  return user;
}

export async function requireActionSuperAdmin() {
  if (!AUTH_ENFORCE_GUARDS) {
    return null;
  }

  const user = await getCurrentAuthUser();

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!hasAnyRole(user, ["super_admin"])) {
    throw new AppError("Forbidden", 403);
  }

  return user;
}
