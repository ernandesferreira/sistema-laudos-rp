import test from "node:test";
import assert from "node:assert/strict";
import type { Permission } from "@/auth/permissions";
import type { AuthUser } from "@/auth/session";
import {
  canActOnCurrentStep,
  canViewRequest,
  canViewSubmission,
  isUserAuthorizedForStep,
  resolveCurrentWorkflowStep,
} from "@/auth/workflowAccess";

function makeUser(input: {
  id?: string;
  roles: AuthUser["roles"];
  permissions?: Permission[];
}): AuthUser {
  return {
    id: input.id ?? "user-1",
    name: "Test User",
    email: "test@example.com",
    passportNumber: "P-0001",
    oabNumber: null,
    roles: input.roles,
    permissions: input.permissions ?? [],
  };
}

test("isUserAuthorizedForStep respects normalized role matching", () => {
  const result = isUserAuthorizedForStep(["medico"], ["MEDICO", "juiz"]);
  assert.equal(result, true);
});

test("resolveCurrentWorkflowStep resolves by current order first", () => {
  const step = resolveCurrentWorkflowStep(
    [
      { stepOrder: 0, status: "COMPLETED", authorizedRoleKeys: ["operador"] },
      { stepOrder: 1, status: "IN_PROGRESS", authorizedRoleKeys: ["medico"] },
    ],
    1,
  );

  assert.equal(step?.stepOrder, 1);
});

test("canViewRequest allows a user authorized in current step", () => {
  const user = makeUser({ roles: ["medico"], permissions: ["requests.read"] });

  const result = canViewRequest(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [
      { stepOrder: 0, status: "COMPLETED", authorizedRoleKeys: ["operador"] },
      { stepOrder: 1, status: "IN_PROGRESS", authorizedRoleKeys: ["medico"] },
    ],
  });

  assert.equal(result, true);
});

test("canViewRequest denies unrelated user outside current step", () => {
  const user = makeUser({ roles: ["leitor"], permissions: ["requests.read"] });

  const result = canViewRequest(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [
      { stepOrder: 0, status: "COMPLETED", authorizedRoleKeys: ["operador"] },
      { stepOrder: 1, status: "IN_PROGRESS", authorizedRoleKeys: ["medico"] },
    ],
  });

  assert.equal(result, false);
});

test("canViewSubmission allows request creator even without current step role", () => {
  const user = makeUser({ id: "operator-1", roles: ["operador"], permissions: ["submissions.read"] });

  const result = canViewSubmission(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [{ order: 1, status: "IN_PROGRESS", authorizedRoleKeys: ["medico"] }],
  });

  assert.equal(result, true);
});

test("canViewSubmission supports JSON-string authorizedRoleKeys", () => {
  const user = makeUser({ id: "med-1", roles: ["medico"], permissions: ["submissions.read"] });

  const result = canViewSubmission(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [{ order: 1, status: "IN_PROGRESS", authorizedRoleKeys: '["medico"]' }],
  });

  assert.equal(result, true);
});

test("canViewSubmission falls back to open authorized step when current step is inconsistent", () => {
  const user = makeUser({ id: "med-1", roles: ["medico"], permissions: ["submissions.read"] });

  const result = canViewSubmission(user, {
    createdById: "operator-1",
    currentStepOrder: 2,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [
      { order: 0, status: "COMPLETED", authorizedRoleKeys: ["operador"] },
      { order: 1, status: "WAITING", authorizedRoleKeys: ["medico"] },
    ],
  });

  assert.equal(result, true);
});

test("canViewSubmission supports object role payload shape", () => {
  const user = makeUser({ id: "med-1", roles: ["medico"], permissions: ["submissions.read"] });

  const result = canViewSubmission(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [
      {
        order: 1,
        status: "IN_PROGRESS",
        authorizedRoleKeys: {
          roles: ["medico", "juiz"],
        },
      },
    ],
  });

  assert.equal(result, true);
});

test("canViewSubmission falls back to any authorized step when status flags are stale", () => {
  const user = makeUser({ id: "med-1", roles: ["medico"], permissions: ["submissions.read"] });

  const result = canViewSubmission(user, {
    createdById: "operator-1",
    currentStepOrder: 1,
    workflowStatus: "IN_PROGRESS",
    workflowSteps: [
      { order: 0, status: "COMPLETED", authorizedRoleKeys: ["operador"] },
      { order: 1, status: "COMPLETED", authorizedRoleKeys: ["medico"] },
    ],
  });

  assert.equal(result, true);
});

test("canActOnCurrentStep requires profile and permissions for step", () => {
  const user = makeUser({
    roles: ["medico"],
    permissions: ["submissions.workflow.execute", "medical.opinions.record"],
  });

  const result = canActOnCurrentStep(user, {
    order: 1,
    status: "IN_PROGRESS",
    authorizedRoleKeys: ["medico"],
    requiredPermissions: ["medical.opinions.record"],
  });

  assert.equal(result, true);
});

test("canActOnCurrentStep denies when required permission is missing", () => {
  const user = makeUser({
    roles: ["medico"],
    permissions: ["submissions.workflow.execute"],
  });

  const result = canActOnCurrentStep(user, {
    order: 1,
    status: "IN_PROGRESS",
    authorizedRoleKeys: ["medico"],
    requiredPermissions: ["medical.opinions.record"],
  });

  assert.equal(result, false);
});

test("canActOnCurrentStep denies when step is not in progress", () => {
  const user = makeUser({
    roles: ["medico"],
    permissions: ["submissions.workflow.execute", "medical.opinions.record"],
  });

  const result = canActOnCurrentStep(user, {
    order: 1,
    status: "WAITING",
    authorizedRoleKeys: ["medico"],
    requiredPermissions: ["medical.opinions.record"],
  });

  assert.equal(result, false);
});
