import { hasPermission, isSuperAdmin } from "@/auth/authorization";
import type { AuthUser } from "@/auth/session";
import { isUserAuthorizedForStep } from "@/auth/workflowAccess";
import { AppError } from "@/lib/errors";

export function assertUserCanExecuteStep(user: AuthUser, authorizedRoleKeys: string[]) {
  if (isSuperAdmin(user.roles)) {
    return;
  }

  if (!hasPermission(user, "submissions.workflow.execute")) {
    throw new AppError("Forbidden", 403);
  }

  const hasRole = isUserAuthorizedForStep(user.roles, authorizedRoleKeys);

  if (!hasRole) {
    throw new AppError("Usuario sem perfil autorizado para esta etapa", 403);
  }
}

export function assertUserCanFinalizeWorkflow(user: AuthUser) {
  if (isSuperAdmin(user.roles)) {
    return;
  }

  if (user.roles.includes("juiz") || user.roles.includes("perito_rp")) {
    return;
  }

  if (!hasPermission(user, "submissions.workflow.finalize")) {
    throw new AppError("Aprovacao final exige permissao especifica", 403);
  }
}

export function assertUserCanRollbackWorkflow(user: AuthUser) {
  if (isSuperAdmin(user.roles)) {
    return;
  }

  if (!hasPermission(user, "submissions.workflow.rollback")) {
    throw new AppError("Rollback de etapa exige permissao especifica", 403);
  }
}
