import { cookies, headers } from "next/headers";
import {
  AUTH_COOKIE_ROLES,
  AUTH_COOKIE_USER_ID,
  AUTH_HEADER_ROLES,
  AUTH_HEADER_USER_ID,
} from "@/auth/constants";
import { isSuperAdmin } from "@/auth/authorization";
import {
  getDefaultPermissionsForRoles,
  normalizePermissions,
  PERMISSIONS,
  type Permission,
} from "@/auth/permissions";
import { normalizeRoleKeys, type RoleKey } from "@/auth/roles";
import { findUserAuthProfileById } from "@/infra/repositories/authRepository";

export type AuthIdentity = {
  userId: string | null;
  roles: RoleKey[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passportNumber: string;
  roles: RoleKey[];
  permissions: Permission[];
};

function parseRoles(raw: string | null | undefined): RoleKey[] {
  if (!raw) {
    return [];
  }

  return normalizeRoleKeys(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function parseCookieHeader(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }

  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return acc;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (!key) {
        return acc;
      }

      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

export function getAuthIdentityFromRequest(request: Request): AuthIdentity {
  const cookieMap = parseCookieHeader(request.headers.get("cookie"));

  const userId =
    request.headers.get(AUTH_HEADER_USER_ID) ??
    cookieMap[AUTH_COOKIE_USER_ID] ??
    null;

  const roles = parseRoles(
    request.headers.get(AUTH_HEADER_ROLES) ?? cookieMap[AUTH_COOKIE_ROLES] ?? null,
  );

  return {
    userId,
    roles,
  };
}

export async function getAuthIdentityFromServerContext(): Promise<AuthIdentity> {
  const requestHeaders = await headers();
  const requestCookies = await cookies();

  const userId =
    requestHeaders.get(AUTH_HEADER_USER_ID) ?? requestCookies.get(AUTH_COOKIE_USER_ID)?.value ?? null;

  const rolesRaw =
    requestHeaders.get(AUTH_HEADER_ROLES) ?? requestCookies.get(AUTH_COOKIE_ROLES)?.value ?? null;

  return {
    userId,
    roles: parseRoles(rolesRaw),
  };
}

export async function resolveAuthUser(identity: AuthIdentity): Promise<AuthUser | null> {
  if (!identity.userId) {
    return null;
  }

  const profile = await findUserAuthProfileById(identity.userId);

  if (!profile) {
    return null;
  }

  const dbRoles = normalizeRoleKeys(profile.roles.map((entry) => entry.role.key));
  const roles = dbRoles.length > 0 ? dbRoles : identity.roles;

  const dbPermissions = normalizePermissions(
    profile.roles.flatMap((entry) =>
      entry.role.rolePermissions.map((assignment) => assignment.permission.key),
    ),
  );

  const fallbackPermissions = getDefaultPermissionsForRoles(roles);
  const mergedPermissions = dbPermissions.length > 0 ? dbPermissions : fallbackPermissions;
  const permissions = isSuperAdmin(roles)
    ? [...PERMISSIONS]
    : Array.from(new Set<Permission>(mergedPermissions));

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    passportNumber: profile.passportNumber,
    roles,
    permissions,
  };
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const identity = await getAuthIdentityFromServerContext();
  return resolveAuthUser(identity);
}
