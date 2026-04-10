import type { ReactNode } from "react";
import { hasPermission } from "@/auth/authorization";
import type { Permission } from "@/auth/permissions";
import { getCurrentAuthUser } from "@/auth/session";

type PermissionGateProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export async function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return <>{fallback}</>;
  }

  if (!hasPermission(user, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
