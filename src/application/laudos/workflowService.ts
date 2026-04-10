import {
  executeSubmissionWorkflowStepSchema,
  rollbackSubmissionWorkflowStepSchema,
  upsertTemplateWorkflowSchema,
} from "@/application/laudos/workflowSchemas";
import { hasAllPermissions } from "@/auth/authorization";
import { normalizePermissions } from "@/auth/permissions";
import {
  assertUserCanExecuteStep,
  assertUserCanFinalizeWorkflow,
  assertUserCanRollbackWorkflow,
} from "@/auth/workflowAuthorization";
import type { AuthUser } from "@/auth/session";
import { AppError } from "@/lib/errors";
import { sendDiscordNotification } from "@/application/discord/discordService";
import { getServiceRequestBySubmissionId } from "@/infra/repositories/requestRepository";
import {
  applyWorkflowStepDecision,
  getSubmissionWorkflowBySubmissionId,
  getTemplateWorkflowByTemplateId,
  listTemplateWorkflows,
  rollbackSubmissionWorkflowToStep,
  upsertTemplateWorkflow,
} from "@/infra/repositories/workflowRepository";
import type { WorkflowDecision } from "@/domain/laudos/workflow";
import { buildDeclarationAptidaoPdf } from "@/lib/declarationAptidaoPdf";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function assertDecisionAllowedForStep(input: {
  decision: string;
  isFinalStage: boolean;
  decisionRequired: boolean;
}) {
  if (!input.decisionRequired) {
    return;
  }

  if (input.isFinalStage) {
    if (!["APROVADO", "REPROVADO", "PENDENTE"].includes(input.decision)) {
      throw new AppError("Etapa final aceita apenas APROVADO, REPROVADO ou PENDENTE", 422);
    }

    return;
  }

  if (!["APTO", "NAO_APTO", "PENDENTE"].includes(input.decision)) {
    throw new AppError("Etapa aceita apenas APTO, NAO_APTO ou PENDENTE", 422);
  }
}

function assertOperatorCanOnlyExecuteFirstStep(user: AuthUser, stepOrder: number) {
  const isOperator = user.roles.includes("operador");
  const isSuperAdmin = user.roles.includes("super_admin");

  if (isOperator && !isSuperAdmin && stepOrder !== 0) {
    throw new AppError("Perfil operador pode aprovar apenas a etapa 1.", 403);
  }
}

async function emitWorkflowDiscordNotifications(
  submissionId: string,
  decision: WorkflowDecision,
  executedById: string,
  executedByName: string,
  observations?: string | null,
) {
  const submission = await getSubmissionWorkflowBySubmissionId(submissionId);

  if (!submission) {
    return;
  }

  const request = await getServiceRequestBySubmissionId(submissionId);
  const latestEvent = submission.workflowEvents[submission.workflowEvents.length - 1] ?? null;

  const protocol = request?.protocol ?? null;
  const basePayload = {
    submissionId,
    requestId: request?.id ?? null,
    protocol,
    workflowStatus: submission.workflowStatus,
    decision,
    observations: observations ?? null,
    executedById,
    executedByName,
    currentStepOrder: submission.currentStepOrder,
  };

  if (latestEvent?.action === "STEP_ADVANCED" || latestEvent?.action === "STEP_COMPLETED") {
    await sendDiscordNotification("workflow.step_completed", {
      ...basePayload,
      stepName: latestEvent.submissionStep?.name ?? "Etapa do workflow",
      action: latestEvent.action,
    });
  }

  if (latestEvent?.action === "WORKFLOW_REJECTED") {
    await sendDiscordNotification("workflow.step_rejected", {
      ...basePayload,
      stepName: latestEvent.submissionStep?.name ?? "Etapa do workflow",
      action: latestEvent.action,
    });

    await sendDiscordNotification("request.rejected", {
      ...basePayload,
      citizenName: request?.citizenName ?? null,
      citizenDocument: request?.citizenDocument ?? null,
    });
  }

  if (latestEvent?.action === "WORKFLOW_APPROVED" && submission.workflowStatus === "FINAL_APPROVED") {
    const declarationData = request
      ? {
          protocol: request.protocol,
          citizenName: request.citizenName,
          passportNumber: request.citizenDocument,
          requestName: request.template.title,
          workflowStatus: submission.workflowStatus,
          steps: submission.workflowSteps.map((step) => ({
            order: step.order,
            name: step.name,
            decision: step.decision,
          })),
        }
      : null;

    const declarationPdfBytes = declarationData
      ? await buildDeclarationAptidaoPdf({
          ...declarationData,
          cityName: "VOID RP",
        })
      : null;

    const declarationFileName = declarationData
      ? `declaracao-aptidao-${declarationData.protocol.toLowerCase()}.pdf`
      : "declaracao-aptidao.pdf";

    await sendDiscordNotification("request.final_approved", {
      ...basePayload,
      citizenName: request?.citizenName ?? null,
      citizenDocument: request?.citizenDocument ?? null,
      declarationUrl: request ? `/api/requests/${request.id}/declaration` : null,
    },
    declarationPdfBytes
      ? {
          attachment: {
            fileName: declarationFileName,
            bytes: declarationPdfBytes,
            mimeType: "application/pdf",
          },
        }
      : undefined,
    );

    await sendDiscordNotification("approval.final", basePayload);

    if (request?.releasedLicense) {
      await sendDiscordNotification("license.released", {
        ...basePayload,
        licenseId: request.releasedLicense.id,
        licenseNumber: request.releasedLicense.licenseNumber,
        protocol: request.releasedLicense.protocol,
        citizenName: request.releasedLicense.citizenName,
        citizenDocument: request.releasedLicense.citizenDocument,
        releasedAt: request.releasedLicense.releasedAt,
        declarationUrl: `/api/licenses/${request.releasedLicense.id}/declaration`,
      },
      declarationPdfBytes
        ? {
            attachment: {
              fileName: declarationFileName,
              bytes: declarationPdfBytes,
              mimeType: "application/pdf",
            },
          }
        : undefined,
      );
    }
  }
}

export const workflowService = {
  listTemplateWorkflows,

  getTemplateWorkflowByTemplateId,

  async upsertTemplateWorkflow(input: unknown) {
    const parsed = upsertTemplateWorkflowSchema.parse(input);

    const finalStages = parsed.steps.filter((step) => step.isFinalStage);

    if (finalStages.length !== 1) {
      throw new AppError("Workflow deve ter exatamente uma etapa final", 422);
    }

    const hasDuplicates = new Set(parsed.steps.map((step) => step.order)).size !== parsed.steps.length;

    if (hasDuplicates) {
      throw new AppError("Ordem de etapas deve ser unica", 422);
    }

    const saved = await upsertTemplateWorkflow(parsed);

    if (!saved) {
      throw new AppError("Template not found", 404);
    }

    return saved;
  },

  async getSubmissionWorkflowBySubmissionId(submissionId: string) {
    const submission = await getSubmissionWorkflowBySubmissionId(submissionId);

    if (!submission) {
      throw new AppError("Submission not found", 404);
    }

    return submission;
  },

  async executeSubmissionWorkflowStep(input: unknown, user: AuthUser) {
    const parsed = executeSubmissionWorkflowStepSchema.parse(input);

    const submission = await getSubmissionWorkflowBySubmissionId(parsed.submissionId);

    if (!submission) {
      throw new AppError("Submission not found", 404);
    }

    const step = submission.workflowSteps.find((entry) => entry.id === parsed.stepId);

    if (!step) {
      throw new AppError("Workflow step not found", 404);
    }

    if (step.status !== "IN_PROGRESS") {
      throw new AppError("Etapa ainda nao esta pronta para execucao", 409);
    }

    const previousStep = submission.workflowSteps.find((entry) => entry.order === step.order - 1);

    if (step.order > 0) {
      if (!previousStep) {
        throw new AppError("Etapa anterior nao encontrada no workflow", 409);
      }

      if (previousStep.status !== "COMPLETED") {
        throw new AppError("A etapa anterior precisa estar concluida antes da aprovacao", 409);
      }
    }

    assertOperatorCanOnlyExecuteFirstStep(user, step.order);

    const authorizedRoleKeys = parseStringArray(step.authorizedRoleKeys);
    const requiredPermissions = normalizePermissions(parseStringArray(step.requiredPermissions));

    assertUserCanExecuteStep(user, authorizedRoleKeys);

    if (requiredPermissions.length > 0 && !hasAllPermissions(user, requiredPermissions)) {
      throw new AppError("Usuario sem permissoes obrigatorias da etapa", 403);
    }

    if (step.requiresObservation && !parsed.observations?.trim()) {
      throw new AppError("Observacoes obrigatorias para esta etapa", 422);
    }

    assertDecisionAllowedForStep({
      decision: parsed.decision,
      isFinalStage: step.isFinalStage,
      decisionRequired: step.decisionRequired,
    });

    if (step.isFinalStage && parsed.decision !== "PENDENTE") {
      assertUserCanFinalizeWorkflow(user);
    }

    const result = await applyWorkflowStepDecision({
      submissionId: parsed.submissionId,
      stepId: parsed.stepId,
      decision: parsed.decision,
      observations: parsed.observations,
      executedById: user.id,
    });

    if (!result) {
      throw new AppError("Nao foi possivel atualizar workflow", 500);
    }

    try {
      await emitWorkflowDiscordNotifications(
        parsed.submissionId,
        parsed.decision,
        user.id,
        user.name,
        parsed.observations,
      );
    } catch {
      // Falhas de notificacao nao podem impedir a continuidade do workflow.
    }

    return result;
  },

  async rollbackSubmissionWorkflowStep(input: unknown, user: AuthUser) {
    const parsed = rollbackSubmissionWorkflowStepSchema.parse(input);
    assertUserCanRollbackWorkflow(user);

    const submission = await getSubmissionWorkflowBySubmissionId(parsed.submissionId);

    if (!submission) {
      throw new AppError("Submission not found", 404);
    }

    const targetStep = submission.workflowSteps.find((entry) => entry.id === parsed.targetStepId);

    if (!targetStep) {
      throw new AppError("Target step not found", 404);
    }

    const currentStep = submission.workflowSteps.find((entry) => entry.status === "IN_PROGRESS");

    if (!currentStep) {
      throw new AppError("Nao existe etapa em progresso para retorno", 409);
    }

    if (targetStep.order >= currentStep.order) {
      throw new AppError("A etapa de retorno deve ser anterior a etapa atual", 422);
    }

    const result = await rollbackSubmissionWorkflowToStep({
      submissionId: parsed.submissionId,
      targetStepId: parsed.targetStepId,
      reason: parsed.reason,
      performedById: user.id,
    });

    if (!result) {
      throw new AppError("Nao foi possivel executar rollback da etapa", 500);
    }

    return result;
  },
};
