import { z } from "zod";
import { PERMISSIONS } from "@/auth/permissions";
import { ROLE_KEYS } from "@/auth/roles";
import {
  WORKFLOW_DECISIONS,
  WORKFLOW_TRANSITION_BEHAVIORS,
} from "@/domain/laudos/workflow";

const workflowTransitionRulesSchema = z
  .object({
    APTO: z.enum(WORKFLOW_TRANSITION_BEHAVIORS).optional(),
    NAO_APTO: z.enum(WORKFLOW_TRANSITION_BEHAVIORS).optional(),
    PENDENTE: z.enum(WORKFLOW_TRANSITION_BEHAVIORS).optional(),
    APROVADO: z.enum(WORKFLOW_TRANSITION_BEHAVIORS).optional(),
    REPROVADO: z.enum(WORKFLOW_TRANSITION_BEHAVIORS).optional(),
  })
  .partial();

export const upsertTemplateWorkflowStepSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  order: z.number().int().min(0),
  areaKey: z.string().min(2).max(80),
  authorizedRoleKeys: z.array(z.enum(ROLE_KEYS)).min(1),
  requiredPermissions: z.array(z.enum(PERMISSIONS)).optional().default([]),
  instructions: z.string().max(2000).optional().nullable(),
  paymentRequiredCents: z.number().int().min(0).optional().nullable(),
  stageFieldKeys: z.array(z.string().min(1).max(120)).optional().nullable(),
  decisionRequired: z.boolean().default(true),
  requiresObservation: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  isFinalStage: z.boolean().default(false),
  transitionRules: workflowTransitionRulesSchema.optional().nullable(),
});

export const upsertTemplateWorkflowSchema = z.object({
  templateId: z.string().cuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
  steps: z.array(upsertTemplateWorkflowStepSchema).min(1),
});

export const workflowStepDecisionSchema = z.enum(WORKFLOW_DECISIONS);

export const executeSubmissionWorkflowStepSchema = z.object({
  submissionId: z.string().cuid(),
  stepId: z.string().cuid(),
  decision: workflowStepDecisionSchema,
  observations: z.string().max(3000).optional().nullable(),
});

export const rollbackSubmissionWorkflowStepSchema = z.object({
  submissionId: z.string().cuid(),
  targetStepId: z.string().cuid(),
  reason: z.string().max(1200).optional().nullable(),
});

export const workflowTemplateParamSchema = z.object({
  id: z.string().cuid(),
});

export const workflowRoleInputSchema = z.enum(ROLE_KEYS);
