import type { Permission } from "@/auth/permissions";
import type { RoleKey } from "@/auth/roles";

export type PermissionCategory =
  | "dashboard"
  | "templates"
  | "sections"
  | "fields"
  | "requests"
  | "workflows"
  | "submissions"
  | "audit"
  | "users"
  | "permissions"
  | "reports";

export type PermissionItem = {
  key: Permission;
  name: string;
  resource: string;
  description: string | null;
};

export type RolePermissionsView = {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
  permissions: PermissionItem[];
};

export const PERMISSION_CATEGORY_ORDER: PermissionCategory[] = [
  "dashboard",
  "templates",
  "sections",
  "fields",
  "requests",
  "workflows",
  "submissions",
  "audit",
  "users",
  "permissions",
  "reports",
];

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  dashboard: "Dashboard",
  templates: "Modelos",
  sections: "Secoes",
  fields: "Campos",
  requests: "Solicitacoes",
  workflows: "Aprovacoes",
  submissions: "Submissoes",
  audit: "Auditoria",
  users: "Usuarios",
  permissions: "Permissoes",
  reports: "Reports",
};

export function toPermissionCategory(resource: string): PermissionCategory {
  if (
    resource === "dashboard" ||
    resource === "templates" ||
    resource === "sections" ||
    resource === "fields" ||
    resource === "requests" ||
    resource === "workflows" ||
    resource === "submissions" ||
    resource === "audit" ||
    resource === "users" ||
    resource === "permissions"
  ) {
    return resource;
  }

  if (resource === "judicial" || resource === "medical" || resource === "reports") {
    return "reports";
  }

  return "reports";
}
