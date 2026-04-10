import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { WorkflowDecision, WorkflowTransitionBehavior } from "@/domain/laudos/workflow";

async function syncServiceRequestState(
  tx: Prisma.TransactionClient,
  submissionId: string,
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "PENDING"
    | "FINAL_APPROVED"
    | "FINAL_REJECTED"
    | "CANCELLED",
  currentStepOrder: number | null,
) {
  const requests = await tx.serviceRequest.findMany({
    where: {
      submissionId,
    },
    select: {
      id: true,
      status: true,
      currentStepOrder: true,
      createdById: true,
      workflowInstance: {
        select: {
          id: true,
        },
      },
    },
  });

  if (requests.length === 0) {
    return;
  }

  for (const request of requests) {
    await tx.serviceRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status,
        currentStepOrder,
      },
    });

    if (request.workflowInstance?.id) {
      await tx.requestWorkflowInstance.update({
        where: {
          id: request.workflowInstance.id,
        },
        data: {
          status: status === "OPEN" ? "NOT_STARTED" : status,
          currentStepOrder,
          completedAt:
            status === "FINAL_APPROVED" || status === "FINAL_REJECTED" || status === "CANCELLED"
              ? new Date()
              : null,
        },
      });
    }

    if (request.status !== status || request.currentStepOrder !== currentStepOrder) {
      await tx.requestStatusHistory.create({
        data: {
          serviceRequestId: request.id,
          fromStatus: request.status,
          toStatus: status,
          source: "WORKFLOW",
          reason: "Sincronizacao automatica por transicao do workflow",
          changedByUserId: request.createdById,
          workflowInstanceId: request.workflowInstance?.id ?? null,
        },
      });
    }
  }
}

function defaultTransitionBehavior(
  decision: WorkflowDecision,
  isFinalStage: boolean,
): WorkflowTransitionBehavior {
  if (isFinalStage) {
    if (decision === "APROVADO") {
      return "FINAL_APPROVE";
    }

    if (decision === "REPROVADO") {
      return "FINAL_REJECT";
    }

    return "HOLD";
  }

  if (decision === "APTO") {
    return "NEXT";
  }

  if (decision === "NAO_APTO") {
    return "FINAL_REJECT";
  }

  return "HOLD";
}

function resolveTransitionBehavior(input: {
  transitionRules: unknown;
  decision: WorkflowDecision;
  isFinalStage: boolean;
}): WorkflowTransitionBehavior {
  const fallback = defaultTransitionBehavior(input.decision, input.isFinalStage);

  if (!input.transitionRules || typeof input.transitionRules !== "object") {
    return fallback;
  }

  const candidate = (input.transitionRules as Record<string, unknown>)[input.decision];

  if (
    candidate === "NEXT" ||
    candidate === "HOLD" ||
    candidate === "FINAL_REJECT" ||
    candidate === "FINAL_APPROVE"
  ) {
    return candidate;
  }

  return fallback;
}

type TemplateWorkflowStepInput = {
  name: string;
  description?: string | null;
  order: number;
  areaKey: string;
  authorizedRoleKeys: string[];
  requiredPermissions: string[];
  instructions?: string | null;
  paymentRequiredCents?: number | null;
  stageFieldKeys?: string[] | null;
  decisionRequired: boolean;
  requiresObservation: boolean;
  isRequired: boolean;
  isFinalStage: boolean;
  transitionRules?: Record<string, string> | null;
};

type UpsertTemplateWorkflowInput = {
  templateId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  steps: TemplateWorkflowStepInput[];
};

export async function listTemplateWorkflows() {
  return prisma.templateWorkflow.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      },
      _count: {
        select: {
          steps: true,
        },
      },
    },
  });
}

export async function getTemplateWorkflowByTemplateId(templateId: string) {
  return prisma.templateWorkflow.findUnique({
    where: { templateId },
    include: {
      steps: {
        orderBy: { order: "asc" },
      },
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          isActive: true,
        },
      },
    },
  });
}

export async function upsertTemplateWorkflow(input: UpsertTemplateWorkflowInput) {
  const template = await prisma.reportTemplate.findFirst({
    where: {
      id: input.templateId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!template) {
    return null;
  }

  const orderedSteps = [...input.steps].sort((a, b) => a.order - b.order);

  const workflow = await prisma.$transaction(async (tx) => {
    const savedWorkflow = await tx.templateWorkflow.upsert({
      where: { templateId: input.templateId },
      create: {
        templateId: input.templateId,
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive,
      },
      update: {
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive,
      },
      select: {
        id: true,
      },
    });

    await tx.templateWorkflowStep.deleteMany({
      where: { workflowId: savedWorkflow.id },
    });

    if (orderedSteps.length > 0) {
      await tx.templateWorkflowStep.createMany({
        data: orderedSteps.map((step, index) => ({
          workflowId: savedWorkflow.id,
          name: step.name,
          description: step.description ?? null,
          order: index,
          areaKey: step.areaKey,
          authorizedRoleKeys: step.authorizedRoleKeys as Prisma.InputJsonValue,
          requiredPermissions: step.requiredPermissions as Prisma.InputJsonValue,
          instructions: step.instructions ?? null,
          paymentRequiredCents: step.paymentRequiredCents ?? null,
          stageFieldKeys: (step.stageFieldKeys ?? null) as Prisma.InputJsonValue,
          decisionRequired: step.decisionRequired,
          requiresObservation: step.requiresObservation,
          isRequired: step.isRequired,
          isFinalStage: step.isFinalStage,
          transitionRules: (step.transitionRules ?? null) as Prisma.InputJsonValue,
        })),
      });
    }

    return tx.templateWorkflow.findUnique({
      where: { id: savedWorkflow.id },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
        template: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            isActive: true,
          },
        },
      },
    });
  });

  return workflow;
}

export async function initializeSubmissionWorkflow(
  tx: Prisma.TransactionClient,
  submissionId: string,
  templateId: string,
) {
  const workflow = await tx.templateWorkflow.findUnique({
    where: { templateId },
    include: {
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!workflow || !workflow.isActive || workflow.steps.length === 0) {
    return null;
  }

  const firstStep = workflow.steps[0];
  const now = new Date();

  await tx.submissionWorkflowStep.createMany({
    data: workflow.steps.map((step) => ({
      submissionId,
      templateWorkflowStepId: step.id,
      order: step.order,
      name: step.name,
      description: step.description,
      areaKey: step.areaKey,
      authorizedRoleKeys: (step.authorizedRoleKeys ?? []) as Prisma.InputJsonValue,
      requiredPermissions: (step.requiredPermissions ?? []) as Prisma.InputJsonValue,
      instructions: step.instructions,
      paymentRequiredCents: step.paymentRequiredCents,
      stageFieldKeys: (step.stageFieldKeys ?? null) as Prisma.InputJsonValue,
      decisionRequired: step.decisionRequired,
      requiresObservation: step.requiresObservation,
      isRequired: step.isRequired,
      isFinalStage: step.isFinalStage,
      transitionRules: (step.transitionRules ?? null) as Prisma.InputJsonValue,
      status: step.id === firstStep.id ? "IN_PROGRESS" : "WAITING",
      startedAt: step.id === firstStep.id ? now : null,
    })),
  });

  await tx.reportSubmission.update({
    where: { id: submissionId },
    data: {
      workflowStatus: "IN_PROGRESS",
      currentStepOrder: firstStep.order,
      workflowStartedAt: now,
    },
  });

  await syncServiceRequestState(tx, submissionId, "IN_PROGRESS", firstStep.order);

  await tx.submissionWorkflowEvent.create({
    data: {
      submissionId,
      action: "WORKFLOW_STARTED",
      metadata: {
        workflowId: workflow.id,
        firstStepOrder: firstStep.order,
      },
    },
  });

  return {
    workflowId: workflow.id,
    firstStepOrder: firstStep.order,
  };
}

export async function getSubmissionWorkflowBySubmissionId(submissionId: string) {
  return prisma.reportSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      workflowSteps: {
        orderBy: { order: "asc" },
      },
      workflowEvents: {
        orderBy: { performedAt: "asc" },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function applyWorkflowStepDecision(input: {
  submissionId: string;
  stepId: string;
  decision: WorkflowDecision;
  observations?: string | null;
  executedById: string;
}) {
  await prisma.$transaction(async (tx) => {
    const submission = await tx.reportSubmission.findUnique({
      where: {
        id: input.submissionId,
      },
      include: {
        workflowSteps: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const step = submission.workflowSteps.find((item) => item.id === input.stepId);

    if (!step) {
      throw new Error("Step not found");
    }

    if (step.status !== "IN_PROGRESS") {
      throw new Error("Only the current in-progress step can be executed");
    }

    const transitionBehavior = resolveTransitionBehavior({
      transitionRules: step.transitionRules,
      decision: input.decision,
      isFinalStage: step.isFinalStage,
    });

    if (transitionBehavior === "HOLD") {
      await tx.submissionWorkflowStep.update({
        where: { id: step.id },
        data: {
          decision: input.decision,
          observations: input.observations ?? null,
          executedById: input.executedById,
          executedAt: new Date(),
        },
      });

      await tx.reportSubmission.update({
        where: { id: submission.id },
        data: {
          workflowStatus: "PENDING",
        },
      });

      await syncServiceRequestState(tx, submission.id, "PENDING", step.order);

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: submission.id,
          submissionStepId: step.id,
          action: "STEP_PENDING",
          decision: input.decision,
          notes: input.observations ?? null,
          performedById: input.executedById,
        },
      });

      return;
    }

    await tx.submissionWorkflowStep.update({
      where: { id: step.id },
      data: {
        status: "COMPLETED",
        decision: input.decision,
        observations: input.observations ?? null,
        executedById: input.executedById,
        executedAt: new Date(),
      },
    });

    await tx.submissionWorkflowEvent.create({
      data: {
        submissionId: submission.id,
        submissionStepId: step.id,
        action: "STEP_COMPLETED",
        decision: input.decision,
        notes: input.observations ?? null,
        performedById: input.executedById,
      },
    });

    if (transitionBehavior === "FINAL_REJECT") {
      await tx.submissionWorkflowStep.updateMany({
        where: {
          submissionId: submission.id,
          status: "WAITING",
        },
        data: {
          status: "BLOCKED",
        },
      });

      await tx.reportSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REVIEWED",
          workflowStatus: "FINAL_REJECTED",
          currentStepOrder: null,
          workflowCompletedAt: new Date(),
        },
      });

      await syncServiceRequestState(tx, submission.id, "FINAL_REJECTED", null);

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: submission.id,
          submissionStepId: step.id,
          action: "WORKFLOW_REJECTED",
          decision: input.decision,
          notes: input.observations ?? null,
          performedById: input.executedById,
        },
      });

      return;
    }

    if (transitionBehavior === "FINAL_APPROVE") {
      await tx.submissionWorkflowStep.updateMany({
        where: {
          submissionId: submission.id,
          status: "WAITING",
        },
        data: {
          status: "BLOCKED",
        },
      });

      await tx.reportSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REVIEWED",
          workflowStatus: "FINAL_APPROVED",
          currentStepOrder: null,
          workflowCompletedAt: new Date(),
        },
      });

      await syncServiceRequestState(tx, submission.id, "FINAL_APPROVED", null);

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: submission.id,
          submissionStepId: step.id,
          action: "WORKFLOW_APPROVED",
          decision: input.decision,
          notes: input.observations ?? null,
          performedById: input.executedById,
        },
      });

      return;
    }

    const nextStep = submission.workflowSteps.find(
      (item) => item.order > step.order && item.status === "WAITING",
    );

    if (!nextStep) {
      await tx.reportSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REVIEWED",
          workflowStatus: "FINAL_APPROVED",
          currentStepOrder: null,
          workflowCompletedAt: new Date(),
        },
      });

      await syncServiceRequestState(tx, submission.id, "FINAL_APPROVED", null);

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: submission.id,
          submissionStepId: step.id,
          action: "WORKFLOW_APPROVED",
          decision: input.decision,
          notes: input.observations ?? null,
          performedById: input.executedById,
        },
      });

      return;
    }

    await tx.submissionWorkflowStep.update({
      where: {
        id: nextStep.id,
      },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    await tx.reportSubmission.update({
      where: { id: submission.id },
      data: {
        workflowStatus: "IN_PROGRESS",
        currentStepOrder: nextStep.order,
      },
    });

    await syncServiceRequestState(tx, submission.id, "IN_PROGRESS", nextStep.order);

    await tx.submissionWorkflowEvent.create({
      data: {
        submissionId: submission.id,
        submissionStepId: nextStep.id,
        action: "STEP_ADVANCED",
        metadata: {
          fromStepOrder: step.order,
          toStepOrder: nextStep.order,
        },
        performedById: input.executedById,
      },
    });
  });

  return getSubmissionWorkflowBySubmissionId(input.submissionId);
}

export async function rollbackSubmissionWorkflowToStep(input: {
  submissionId: string;
  targetStepId: string;
  reason?: string | null;
  performedById: string;
}) {
  await prisma.$transaction(async (tx) => {
    const submission = await tx.reportSubmission.findUnique({
      where: {
        id: input.submissionId,
      },
      include: {
        workflowSteps: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const currentStep = submission.workflowSteps.find((entry) => entry.status === "IN_PROGRESS");

    if (!currentStep) {
      throw new Error("No in-progress step found");
    }

    const targetStep = submission.workflowSteps.find((entry) => entry.id === input.targetStepId);

    if (!targetStep) {
      throw new Error("Target step not found");
    }

    if (targetStep.order >= currentStep.order) {
      throw new Error("Target step must be before current step");
    }

    await tx.submissionWorkflowStep.update({
      where: {
        id: currentStep.id,
      },
      data: {
        status: "WAITING",
        decision: null,
        observations: null,
        executedById: null,
        executedAt: null,
        startedAt: null,
      },
    });

    await tx.submissionWorkflowStep.updateMany({
      where: {
        submissionId: submission.id,
        order: {
          gt: targetStep.order,
        },
      },
      data: {
        status: "WAITING",
        decision: null,
        observations: null,
        executedById: null,
        executedAt: null,
        startedAt: null,
      },
    });

    await tx.submissionWorkflowStep.update({
      where: {
        id: targetStep.id,
      },
      data: {
        status: "IN_PROGRESS",
        decision: null,
        observations: null,
        executedById: null,
        executedAt: null,
        startedAt: new Date(),
      },
    });

    await tx.reportSubmission.update({
      where: { id: submission.id },
      data: {
        status: "PENDING",
        workflowStatus: "IN_PROGRESS",
        currentStepOrder: targetStep.order,
        workflowCompletedAt: null,
      },
    });

    await syncServiceRequestState(tx, submission.id, "IN_PROGRESS", targetStep.order);

    await tx.submissionWorkflowEvent.create({
      data: {
        submissionId: submission.id,
        submissionStepId: targetStep.id,
        action: "WORKFLOW_ROLLBACK",
        notes: input.reason ?? null,
        metadata: {
          fromStepOrder: currentStep.order,
          toStepOrder: targetStep.order,
        },
        performedById: input.performedById,
      },
    });
  });

  return getSubmissionWorkflowBySubmissionId(input.submissionId);
}
