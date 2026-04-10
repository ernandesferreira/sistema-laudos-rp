import { hasAnyRole, hasPermission } from "@/auth/authorization";
import type { Permission } from "@/auth/permissions";
import type { AuthUser } from "@/auth/session";

type WorkflowStatusLike =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING"
  | "FINAL_APPROVED"
  | "FINAL_REJECTED"
  | "CANCELLED"
  | string;

type WorkflowStepLike = {
  status?: string | null;
  order?: number | null;
  stepOrder?: number | null;
  authorizedRoleKeys?: unknown;
  requiredPermissions?: unknown;
};

type RequestVisibilityInput = {
  createdById: string;
  currentStepOrder: number | null;
  workflowStatus?: WorkflowStatusLike | null;
  workflowSteps?: WorkflowStepLike[] | null;
};

type SubmissionVisibilityInput = {
  createdById: string | null;
  currentStepOrder: number | null;
  workflowStatus?: WorkflowStatusLike | null;
  workflowSteps?: WorkflowStepLike[] | null;
};

function toNormalizedLowerSet(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0));
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if ("roles" in record) {
      return parseStringArray(record.roles);
    }

    const objectValues = Object.values(record);

    if (objectValues.length > 0 && objectValues.every((item) => typeof item === "string")) {
      return objectValues as string[];
    }

    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        // fallback to comma-separated parsing below
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function parseRequiredPermissions(value: unknown): Permission[] {
  return parseStringArray(value)
    .map((item) => item.trim())
    .filter((item): item is Permission => item.length > 0);
}

function getStepOrder(step: WorkflowStepLike) {
  if (typeof step.stepOrder === "number") {
    return step.stepOrder;
  }

  if (typeof step.order === "number") {
    return step.order;
  }

  return null;
}

function isWorkflowFinalized(status: WorkflowStatusLike | null | undefined) {
  return status === "FINAL_APPROVED" || status === "FINAL_REJECTED" || status === "CANCELLED";
}

function canBypassStepVisibility(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }

  return hasAnyRole(user, ["super_admin", "admin"]);
}

export function isUserAuthorizedForStep(userRoles: string[], stepAuthorizedRoles: unknown) {
  const userRoleSet = toNormalizedLowerSet(userRoles);
  const stepRoleSet = toNormalizedLowerSet(parseStringArray(stepAuthorizedRoles));

  if (stepRoleSet.size === 0 || userRoleSet.size === 0) {
    return false;
  }

  for (const role of stepRoleSet) {
    if (userRoleSet.has(role)) {
      return true;
    }
  }

  return false;
}

export function resolveCurrentWorkflowStep(
  steps: WorkflowStepLike[] | null | undefined,
  currentStepOrder: number | null,
): WorkflowStepLike | null {
  if (!steps || steps.length === 0) {
    return null;
  }

  if (typeof currentStepOrder === "number") {
    const byOrder = steps.find((step) => getStepOrder(step) === currentStepOrder);

    if (byOrder) {
      return byOrder;
    }
  }

  return steps.find((step) => step.status === "IN_PROGRESS") ?? null;
}

export function canActOnCurrentStep(user: AuthUser | null | undefined, currentStep: WorkflowStepLike | null) {
  if (!user || !currentStep) {
    return false;
  }

  if (currentStep.status !== "IN_PROGRESS") {
    return false;
  }

  if (!hasPermission(user, "submissions.workflow.execute")) {
    return false;
  }

  if (!isUserAuthorizedForStep(user.roles, currentStep.authorizedRoleKeys) && !canBypassStepVisibility(user)) {
    return false;
  }

  const requiredPermissions = parseRequiredPermissions(currentStep.requiredPermissions);

  if (requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every((permission) => hasPermission(user, permission));
}

function hasAnyAuthorizedRoleInWorkflow(user: AuthUser, steps: WorkflowStepLike[] | null | undefined) {
  if (!steps || steps.length === 0) {
    return false;
  }

  return steps.some((step) => isUserAuthorizedForStep(user.roles, step.authorizedRoleKeys));
}

function hasAnyAuthorizedRoleInOpenSteps(user: AuthUser, steps: WorkflowStepLike[] | null | undefined) {
  if (!steps || steps.length === 0) {
    return false;
  }

  return steps.some(
    (step) =>
      (step.status === "IN_PROGRESS" || step.status === "WAITING") &&
      isUserAuthorizedForStep(user.roles, step.authorizedRoleKeys),
  );
}

export function canViewRequest(user: AuthUser | null | undefined, request: RequestVisibilityInput) {
  if (!user) {
    return false;
  }

  if (canBypassStepVisibility(user)) {
    return true;
  }

  if (hasAnyRole(user, ["juiz"]) && !isWorkflowFinalized(request.workflowStatus)) {
    return true;
  }

  if (request.createdById === user.id) {
    return true;
  }

  const currentStep = resolveCurrentWorkflowStep(request.workflowSteps, request.currentStepOrder);

  if (isUserAuthorizedForStep(user.roles, currentStep?.authorizedRoleKeys)) {
    return true;
  }

  if (!isWorkflowFinalized(request.workflowStatus) && hasAnyAuthorizedRoleInOpenSteps(user, request.workflowSteps)) {
    return true;
  }

  if (!isWorkflowFinalized(request.workflowStatus) && hasAnyAuthorizedRoleInWorkflow(user, request.workflowSteps)) {
    return true;
  }

  if (isWorkflowFinalized(request.workflowStatus)) {
    return hasAnyAuthorizedRoleInWorkflow(user, request.workflowSteps);
  }

  return false;
}

export function canViewSubmission(user: AuthUser | null | undefined, submission: SubmissionVisibilityInput) {
  if (!user) {
    return false;
  }

  if (canBypassStepVisibility(user)) {
    return true;
  }

  if (submission.createdById && submission.createdById === user.id) {
    return true;
  }

  const currentStep = resolveCurrentWorkflowStep(submission.workflowSteps, submission.currentStepOrder);

  if (isUserAuthorizedForStep(user.roles, currentStep?.authorizedRoleKeys)) {
    return true;
  }

  if (
    !isWorkflowFinalized(submission.workflowStatus) &&
    hasAnyAuthorizedRoleInOpenSteps(user, submission.workflowSteps)
  ) {
    return true;
  }

  if (!isWorkflowFinalized(submission.workflowStatus) && hasAnyAuthorizedRoleInWorkflow(user, submission.workflowSteps)) {
    return true;
  }

  if (isWorkflowFinalized(submission.workflowStatus)) {
    return hasAnyAuthorizedRoleInWorkflow(user, submission.workflowSteps);
  }

  return false;
}
