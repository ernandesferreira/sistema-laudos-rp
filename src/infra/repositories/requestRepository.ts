import { prisma } from "@/lib/prisma";
import { initializeSubmissionWorkflow } from "@/infra/repositories/workflowRepository";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { validateSubmissionAnswers } from "@/application/laudos/publicSubmissionValidation";

function normalizeDocument(document: string) {
  return document.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function mapServiceRequestStatusToWorkflowInstanceStatus(
  status: "OPEN" | "IN_PROGRESS" | "PENDING" | "FINAL_APPROVED" | "FINAL_REJECTED" | "CANCELLED",
): "NOT_STARTED" | "IN_PROGRESS" | "PENDING" | "FINAL_APPROVED" | "FINAL_REJECTED" | "CANCELLED" {
  if (status === "OPEN") {
    return "NOT_STARTED";
  }

  return status;
}

type ListServiceRequestsInput = {
  page: number;
  pageSize: number;
  protocol?: string;
  citizenName?: string;
  citizenDocument?: string;
  templateId?: string;
  status?:
    | "OPEN"
    | "IN_PROGRESS"
    | "PENDING"
    | "FINAL_APPROVED"
    | "FINAL_REJECTED"
    | "CANCELLED";
  dateFrom?: string;
  dateTo?: string;
  judgeQueue?: boolean;
};

type CreateServiceRequestInput = {
  protocol: string;
  templateId: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  createdByPassportNumber: string;
  answers: Record<string, unknown>;
};

type ServiceRequestStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING"
  | "FINAL_APPROVED"
  | "FINAL_REJECTED"
  | "CANCELLED";

function isFinalizedStatus(status: ServiceRequestStatus) {
  return status === "FINAL_APPROVED" || status === "FINAL_REJECTED" || status === "CANCELLED";
}

function parseRoleKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function listServiceRequestTemplateOptions() {
  return prisma.reportTemplate.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      status: "PUBLISHED",
      workflow: {
        is: {
          isActive: true,
          steps: {
            some: {},
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

export async function createServiceRequest(input: CreateServiceRequestInput) {
  const citizenName = input.createdByName;
  const citizenDocument = input.createdByPassportNumber;
  const citizenContact = input.createdByEmail || `Passaporte ${input.createdByPassportNumber}`;

  const template = await prisma.reportTemplate.findFirst({
    where: {
      id: input.templateId,
      deletedAt: null,
      isActive: true,
      status: "PUBLISHED",
    },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          fields: {
            where: {
              isActive: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },
      workflow: {
        include: {
          steps: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!template) {
    throw new AppError("Template indisponivel para abertura de solicitacao", 422);
  }

  if (!template.workflow || !template.workflow.isActive || template.workflow.steps.length === 0) {
    throw new AppError("Template sem workflow ativo configurado", 422);
  }

  const templateWorkflow = template.workflow;
  const fields = template.sections.flatMap((section) => section.fields);
  const validation = validateSubmissionAnswers(fields, input.answers);

  if (!validation.ok) {
    throw new AppError("Validation failed", 422, {
      fieldErrors: validation.fieldErrors,
    });
  }

  const fieldByName = new Map(fields.map((field) => [field.name, field]));

  return prisma.$transaction(async (tx) => {
    const documentNumberNormalized = normalizeDocument(citizenDocument);

    const citizen = await tx.citizen.upsert({
      where: {
        documentNumberNormalized,
      },
      update: {
        fullName: citizenName,
        documentNumber: citizenDocument,
        phone: citizenContact,
        deletedAt: null,
      },
      create: {
        fullName: citizenName,
        documentType: "CPF",
        documentNumber: citizenDocument,
        documentNumberNormalized,
        phone: citizenContact,
      },
      select: {
        id: true,
      },
    });

    const submission = await tx.reportSubmission.create({
      data: {
        templateId: template.id,
        protocol: input.protocol,
        submittedByName: input.createdByName,
        submittedByContact: `Passaporte ${input.createdByPassportNumber}`,
        answers: validation.data as Prisma.InputJsonValue,
        meta: {
          source: "service_request",
          citizenDocument,
          openedBy: {
            userId: input.createdById,
            name: input.createdByName,
            passportNumber: input.createdByPassportNumber,
          },
        } as Prisma.InputJsonValue,
      },
    });

    const answerRows = Object.entries(validation.data)
      .map(([fieldName, value]) => {
        const field = fieldByName.get(fieldName);

        if (!field) {
          return null;
        }

        return {
          submissionId: submission.id,
          fieldId: field.id,
          labelSnapshot: field.label,
          typeSnapshot: field.type,
          value: value as Prisma.InputJsonValue,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (answerRows.length > 0) {
      await tx.submissionFieldAnswer.createMany({
        data: answerRows,
      });
    }

    const initializedWorkflow = await initializeSubmissionWorkflow(tx, submission.id, template.id);

    if (!initializedWorkflow) {
      throw new AppError("Nao foi possivel inicializar workflow da solicitacao", 500);
    }

    const serviceRequest = await tx.serviceRequest.create({
      data: {
        protocol: input.protocol,
        citizenId: citizen.id,
        templateId: template.id,
        createdById: input.createdById,
        submissionId: submission.id,
        citizenName,
        citizenDocument,
        citizenContact,
        initialNotes: null,
        status: "IN_PROGRESS",
        currentStepOrder: initializedWorkflow.firstStepOrder,
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            documentNumber: true,
            phone: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        submission: {
          select: {
            id: true,
            workflowStatus: true,
            currentStepOrder: true,
            createdAt: true,
          },
        },
      },
    });

    const workflowInstance = await tx.requestWorkflowInstance.create({
      data: {
        serviceRequestId: serviceRequest.id,
        templateWorkflowId: templateWorkflow.id,
        status: mapServiceRequestStatusToWorkflowInstanceStatus(serviceRequest.status),
        currentStepOrder: initializedWorkflow.firstStepOrder,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.requestWorkflowStep.createMany({
      data: templateWorkflow.steps.map((step) => ({
        workflowInstanceId: workflowInstance.id,
        templateWorkflowStepId: step.id,
        stepOrder: step.order,
        stepName: step.name,
        areaKey: step.areaKey,
        authorizedRoleKeys: (step.authorizedRoleKeys ?? []) as Prisma.InputJsonValue,
        requiredPermissions: (step.requiredPermissions ?? []) as Prisma.InputJsonValue,
        decisionRequired: step.decisionRequired,
        requiresObservation: step.requiresObservation,
        isRequired: step.isRequired,
        isFinalStage: step.isFinalStage,
        status: step.order === initializedWorkflow.firstStepOrder ? "IN_PROGRESS" : "WAITING",
        startedAt: step.order === initializedWorkflow.firstStepOrder ? new Date() : null,
      })),
    });

    await tx.requestStatusHistory.create({
      data: {
        serviceRequestId: serviceRequest.id,
        fromStatus: null,
        toStatus: serviceRequest.status,
        source: "SYSTEM",
        reason: "Solicitacao aberta com workflow inicializado",
        changedByUserId: input.createdById,
        workflowInstanceId: workflowInstance.id,
      },
    });

    return serviceRequest;
  });
}

export async function listServiceRequestsPaginated(input: ListServiceRequestsInput) {
  const andClauses: Prisma.ServiceRequestWhereInput[] = [];

  if (input.protocol) {
    andClauses.push({
      protocol: {
        contains: input.protocol,
        mode: "insensitive",
      },
    });
  }

  if (input.citizenName) {
    andClauses.push({
      OR: [
        {
          citizenName: {
            contains: input.citizenName,
            mode: "insensitive",
          },
        },
        {
          citizen: {
            is: {
              fullName: {
                contains: input.citizenName,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  if (input.citizenDocument) {
    andClauses.push({
      OR: [
        {
          citizenDocument: {
            contains: input.citizenDocument,
            mode: "insensitive",
          },
        },
        {
          citizen: {
            is: {
              documentNumber: {
                contains: input.citizenDocument,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  if (input.templateId) {
    andClauses.push({
      templateId: input.templateId,
    });
  }

  if (input.status) {
    andClauses.push({
      status: input.status,
    });
  }

  if (input.judgeQueue) {
    andClauses.push({
      status: {
        in: ["FINAL_APPROVED", "FINAL_REJECTED"],
      },
    });
    andClauses.push({
      submission: {
        is: {
          workflowCompletedAt: {
            not: null,
          },
        },
      },
    });
  }

  if (input.dateFrom || input.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (input.dateFrom) {
      createdAt.gte = new Date(`${input.dateFrom}T00:00:00.000`);
    }

    if (input.dateTo) {
      createdAt.lte = new Date(`${input.dateTo}T23:59:59.999`);
    }

    andClauses.push({ createdAt });
  }

  const where: Prisma.ServiceRequestWhereInput =
    andClauses.length > 0 ? { AND: andClauses } : {};

  const skip = (input.page - 1) * input.pageSize;

  const [requests, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            documentNumber: true,
            phone: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        submission: {
          select: {
            id: true,
            workflowStatus: true,
            currentStepOrder: true,
          },
        },
        workflowInstance: {
          select: {
            id: true,
            status: true,
            currentStepOrder: true,
            steps: {
              select: {
                stepOrder: true,
                stepName: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  const mappedRequests = requests.map((request) => {
    const inProgressStep = request.workflowInstance?.steps.find((step) => step.status === "IN_PROGRESS") ?? null;

    const resolvedCurrentStepOrder =
      request.currentStepOrder ??
      request.submission.currentStepOrder ??
      request.workflowInstance?.currentStepOrder ??
      inProgressStep?.stepOrder ??
      null;

    const resolvedCurrentStepName = inProgressStep?.stepName ?? null;
    const finalized =
      isFinalizedStatus(request.status) ||
      request.submission.workflowStatus === "FINAL_APPROVED" ||
      request.submission.workflowStatus === "FINAL_REJECTED";

    return {
      ...request,
      currentStepOrder: resolvedCurrentStepOrder,
      currentStepName: resolvedCurrentStepName,
      isFinalized: finalized,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    requests: mappedRequests,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages,
      hasPreviousPage: input.page > 1,
      hasNextPage: input.page < totalPages,
    },
  };
}

export async function getOperatorDashboardSummary(createdById: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const [
    recentRequests,
    totalRequests,
    requestsLast7Days,
    openCount,
    inProgressCount,
    pendingCount,
    finalApprovedCount,
    finalRejectedCount,
    cancelledCount,
  ] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where: { createdById },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        citizen: {
          select: {
            fullName: true,
            documentNumber: true,
          },
        },
        template: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.serviceRequest.count({
      where: { createdById },
    }),
    prisma.serviceRequest.count({
      where: {
        createdById,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    prisma.serviceRequest.count({ where: { createdById, status: "OPEN" } }),
    prisma.serviceRequest.count({ where: { createdById, status: "IN_PROGRESS" } }),
    prisma.serviceRequest.count({ where: { createdById, status: "PENDING" } }),
    prisma.serviceRequest.count({
      where: {
        createdById,
        OR: [
          { status: "FINAL_APPROVED" },
          {
            submission: {
              is: {
                workflowStatus: "FINAL_APPROVED",
              },
            },
          },
        ],
      },
    }),
    prisma.serviceRequest.count({
      where: {
        createdById,
        OR: [
          { status: "FINAL_REJECTED" },
          {
            submission: {
              is: {
                workflowStatus: "FINAL_REJECTED",
              },
            },
          },
        ],
      },
    }),
    prisma.serviceRequest.count({ where: { createdById, status: "CANCELLED" } }),
  ]);

  const countsByStatus: Record<ServiceRequestStatus, number> = {
    OPEN: openCount,
    IN_PROGRESS: inProgressCount,
    PENDING: pendingCount,
    FINAL_APPROVED: finalApprovedCount,
    FINAL_REJECTED: finalRejectedCount,
    CANCELLED: cancelledCount,
  };

  return {
    recentRequests,
    totalRequests,
    requestsLast7Days,
    countsByStatus,
  };
}

export async function getRoleOpenPipelineDashboardSummary(roleKey: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const openStatuses: ServiceRequestStatus[] = ["OPEN", "IN_PROGRESS", "PENDING"];
  const finalizedStatuses: ServiceRequestStatus[] = ["FINAL_APPROVED", "FINAL_REJECTED", "CANCELLED"];

  const [requests, finalizedRequests] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where: {
        status: {
          in: openStatuses,
        },
        workflowInstance: {
          isNot: null,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        citizen: {
          select: {
            fullName: true,
            documentNumber: true,
          },
        },
        template: {
          select: {
            title: true,
          },
        },
        workflowInstance: {
          select: {
            currentStepOrder: true,
            steps: {
              select: {
                status: true,
                stepOrder: true,
                authorizedRoleKeys: true,
              },
            },
          },
        },
      },
    }),
    prisma.serviceRequest.findMany({
      where: {
        OR: [
          {
            status: {
              in: finalizedStatuses,
            },
          },
          {
            submission: {
              is: {
                workflowStatus: {
                  in: ["FINAL_APPROVED", "FINAL_REJECTED"],
                },
              },
            },
          },
        ],
        workflowInstance: {
          isNot: null,
        },
      },
      select: {
        status: true,
        submission: {
          select: {
            workflowStatus: true,
          },
        },
        workflowInstance: {
          select: {
            steps: {
              select: {
                authorizedRoleKeys: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const roleRequests = requests
    .map((request) => {
      const currentStepOrder = request.workflowInstance?.currentStepOrder ?? null;

      const hasRoleInOpenStep = request.workflowInstance?.steps.some((step) => {
        if (step.status !== "WAITING" && step.status !== "IN_PROGRESS") {
          return false;
        }

        const roleKeys = parseRoleKeys(step.authorizedRoleKeys);
        return roleKeys.includes(roleKey);
      });

      const isCurrentRoleStep = request.workflowInstance?.steps.some((step) => {
        if (step.status !== "IN_PROGRESS") {
          return false;
        }

        const roleKeys = parseRoleKeys(step.authorizedRoleKeys);
        return roleKeys.includes(roleKey);
      });

      return {
        ...request,
        currentStepOrder,
        isCurrentRoleStep: Boolean(isCurrentRoleStep),
        hasRoleInOpenStep: Boolean(hasRoleInOpenStep),
      };
    })
    .filter((request) => request.hasRoleInOpenStep)
    .sort((a, b) => {
      if (a.isCurrentRoleStep && !b.isCurrentRoleStep) {
        return -1;
      }

      if (!a.isCurrentRoleStep && b.isCurrentRoleStep) {
        return 1;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const currentRoleStepCount = roleRequests.filter((request) => request.isCurrentRoleStep).length;

  const finalizedRoleRequests = finalizedRequests.filter((request) => {
    const hasRoleInWorkflow = request.workflowInstance?.steps.some((step) => {
      const roleKeys = parseRoleKeys(step.authorizedRoleKeys);
      return roleKeys.includes(roleKey);
    });

    return Boolean(hasRoleInWorkflow);
  });

  const finalApprovedCount = finalizedRoleRequests.filter(
    (request) => request.status === "FINAL_APPROVED" || request.submission.workflowStatus === "FINAL_APPROVED",
  ).length;

  const finalRejectedCount = finalizedRoleRequests.filter(
    (request) => request.status === "FINAL_REJECTED" || request.submission.workflowStatus === "FINAL_REJECTED",
  ).length;

  const cancelledCount = finalizedRoleRequests.filter((request) => request.status === "CANCELLED").length;

  const countsByStatus: Record<ServiceRequestStatus, number> = {
    OPEN: roleRequests.filter((request) => request.status === "OPEN").length,
    IN_PROGRESS: roleRequests.filter((request) => request.status === "IN_PROGRESS").length,
    PENDING: roleRequests.filter((request) => request.status === "PENDING").length,
    FINAL_APPROVED: finalApprovedCount,
    FINAL_REJECTED: finalRejectedCount,
    CANCELLED: cancelledCount,
  };

  return {
    recentRequests: roleRequests.slice(0, 8),
    totalRequests: roleRequests.length,
    requestsLast7Days: roleRequests.filter((request) => request.createdAt >= sevenDaysAgo).length,
    currentRoleStepCount,
    countsByStatus,
  };
}

export async function getServiceRequestById(id: string) {
  return prisma.serviceRequest.findUnique({
    where: {
      id,
    },
    include: {
      citizen: {
        select: {
          id: true,
          fullName: true,
          documentType: true,
          documentNumber: true,
          phone: true,
          email: true,
        },
      },
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflowInstance: {
        include: {
          steps: {
            orderBy: {
              stepOrder: "asc",
            },
          },
        },
      },
      statusHistory: {
        orderBy: {
          changedAt: "desc",
        },
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      submission: {
        include: {
          workflowSteps: {
            orderBy: {
              order: "asc",
            },
          },
          workflowEvents: {
            orderBy: {
              performedAt: "asc",
            },
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
      },
    },
  });
}
