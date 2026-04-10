import type { Permission } from "./permissions";
import type { RoleKey } from "./roles";

export type RoutePolicy = {
  pathPrefix: string;
  requiredRoles?: RoleKey[];
  requiredPermissions?: Permission[];
};

export const ROUTE_POLICIES: RoutePolicy[] = [
  {
    pathPrefix: "/settings/permissions",
    requiredRoles: ["super_admin"],
  },
  {
    pathPrefix: "/settings/branding",
    requiredRoles: ["super_admin"],
  },
  {
    pathPrefix: "/dashboard",
    requiredPermissions: ["dashboard.read"],
  },
  {
    pathPrefix: "/templates",
    requiredPermissions: ["templates.read"],
  },
  {
    pathPrefix: "/workflows",
    requiredPermissions: ["workflows.read"],
  },
  {
    pathPrefix: "/submissions",
    requiredPermissions: ["submissions.read"],
  },
  {
    pathPrefix: "/requests",
    requiredPermissions: ["requests.read"],
  },
  {
    pathPrefix: "/settings/users",
    requiredPermissions: ["users.read"],
  },
  {
    pathPrefix: "/settings",
    requiredPermissions: ["dashboard.read"],
  },
  {
    pathPrefix: "/api/templates",
    requiredPermissions: ["templates.read"],
  },
  {
    pathPrefix: "/api/sections",
    requiredPermissions: ["sections.manage"],
  },
  {
    pathPrefix: "/api/fields",
    requiredPermissions: ["fields.manage"],
  },
  {
    pathPrefix: "/api/submissions",
    requiredPermissions: ["submissions.details.read"],
  },
  {
    pathPrefix: "/api/requests",
    requiredPermissions: ["requests.read"],
  },
  {
    pathPrefix: "/api/workflows",
    requiredPermissions: ["workflows.read"],
  },
  {
    pathPrefix: "/api/rbac",
    requiredRoles: ["super_admin"],
  },
  {
    pathPrefix: "/api/users",
    requiredPermissions: ["users.read"],
  },
];

export function resolveRoutePolicy(pathname: string): RoutePolicy | null {
  for (const policy of ROUTE_POLICIES) {
    if (pathname === policy.pathPrefix || pathname.startsWith(`${policy.pathPrefix}/`)) {
      return policy;
    }
  }

  return null;
}
