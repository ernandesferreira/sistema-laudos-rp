export const WORKFLOW_DECISIONS = [
  "APTO",
  "NAO_APTO",
  "PENDENTE",
  "APROVADO",
  "REPROVADO",
] as const;

export type WorkflowDecision = (typeof WORKFLOW_DECISIONS)[number];

export const WORKFLOW_STEP_STATUSES = ["WAITING", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const;

export type WorkflowStepStatus = (typeof WORKFLOW_STEP_STATUSES)[number];

export const SUBMISSION_WORKFLOW_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PENDING",
  "FINAL_APPROVED",
  "FINAL_REJECTED",
] as const;

export type SubmissionWorkflowStatus = (typeof SUBMISSION_WORKFLOW_STATUSES)[number];

export const WORKFLOW_TRANSITION_BEHAVIORS = ["NEXT", "HOLD", "FINAL_REJECT", "FINAL_APPROVE"] as const;

export type WorkflowTransitionBehavior = (typeof WORKFLOW_TRANSITION_BEHAVIORS)[number];

export type WorkflowTransitionRules = {
  APTO?: WorkflowTransitionBehavior;
  NAO_APTO?: WorkflowTransitionBehavior;
  PENDENTE?: WorkflowTransitionBehavior;
  APROVADO?: WorkflowTransitionBehavior;
  REPROVADO?: WorkflowTransitionBehavior;
};
