import { prisma } from "@/lib/prisma";
import { initializeSubmissionWorkflow } from "@/infra/repositories/workflowRepository";
import { findActiveDocumentRestriction } from "@/infra/repositories/licensesRepository";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { validateSubmissionAnswers } from "@/application/laudos/publicSubmissionValidation";
import { canViewRequest, resolveCurrentWorkflowStep } from "@/auth/workflowAccess";
import type { AuthUser } from "@/auth/session";

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

type ListServiceRequestsOptions = {
  authUser?: AuthUser | null;
};

type CreateServiceRequestInput = {
  protocol: string;
  templateId: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  citizenName: string;
  citizenDocument: string;
  citizenContact: string;
  requesterName: string;
  requesterDocument: string;
  requesterOabNumber?: string;
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

const NOT_DELETED_FILTER = { isDeleted: false } as unknown as Prisma.ServiceRequestWhereInput;

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
  const citizenName = input.citizenName;
  const citizenDocument = input.citizenDocument;
  const citizenContact = input.citizenContact;
  const requesterName = input.requesterName;
  const requesterDocument = input.requesterDocument;
  const requesterOabNumber = input.requesterOabNumber ?? null;

  const activeRestriction = await findActiveDocumentRestriction(citizenDocument);

  if (activeRestriction) {
    const expiryLabel = activeRestriction.isPermanent
      ? "de forma definitiva"
      : activeRestriction.endsAt
        ? `ate ${new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(activeRestriction.endsAt)}`
        : "por prazo ativo";

    throw new AppError(
      `Documento impedido de abrir nova solicitacao ${expiryLabel}. Licenca vinculada: ${activeRestriction.releasedLicense.licenseNumber}.`,
      409,
      {
        restrictionId: activeRestriction.id,
        endsAt: activeRestriction.endsAt,
        isPermanent: activeRestriction.isPermanent,
      },
    );
  }

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
        submittedByName: citizenName,
        submittedByContact: citizenContact,
        answers: validation.data as Prisma.InputJsonValue,
        meta: {
          source: "service_request",
          citizenDocument,
          openedBy: {
            userId: input.createdById,
            name: requesterName,
            passportNumber: requesterDocument,
            oabNumber: requesterOabNumber,
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
        requesterName,
        requesterDocument,
        requesterOabNumber,
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

export async function listServiceRequestsPaginated(
  input: ListServiceRequestsInput,
  options: ListServiceRequestsOptions = {},
) {
  const andClauses: Prisma.ServiceRequestWhereInput[] = [];

  andClauses.push(NOT_DELETED_FILTER);

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

  const requestInclude = {
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
            workflowSteps: {
              select: {
                order: true,
                name: true,
                status: true,
                authorizedRoleKeys: true,
                requiredPermissions: true,
              },
            },
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
            authorizedRoleKeys: true,
          },
        },
      },
    },
  } as const;

  const user = options.authUser ?? null;
  const skip = (input.page - 1) * input.pageSize;
  const requiresScopedVisibility = Boolean(user);

  const [requests, total] = requiresScopedVisibility
    ? await (async () => {
        const allRequests = await prisma.serviceRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: requestInclude,
        });

        const mappedAllRequests = allRequests.map((request) => {
          const resolvedCurrentStepOrder =
            request.currentStepOrder ??
            request.submission.currentStepOrder ??
            request.workflowInstance?.currentStepOrder ??
            null;

          const resolvedCurrentStep = resolveCurrentWorkflowStep(
            request.workflowInstance?.steps,
            resolvedCurrentStepOrder,
          );

          const finalized =
            isFinalizedStatus(request.status) ||
            request.submission.workflowStatus === "FINAL_APPROVED" ||
            request.submission.workflowStatus === "FINAL_REJECTED";

          return {
            ...request,
            currentStepOrder: resolvedCurrentStepOrder,
            currentStepName:
              (resolvedCurrentStep as { stepName?: string; name?: string } | null)?.stepName ??
              (resolvedCurrentStep as { stepName?: string; name?: string } | null)?.name ??
              null,
            isFinalized: finalized,
          };
        });

        const visibleRequests = mappedAllRequests.filter((request) =>
          canViewRequest(user, {
            createdById: request.createdById,
            currentStepOrder: request.currentStepOrder,
            workflowStatus: request.submission.workflowStatus,
              workflowSteps:
                request.submission.workflowSteps.length > 0
                  ? request.submission.workflowSteps
                  : request.workflowInstance?.steps,
          }),
        );

        const paginatedRequests = visibleRequests.slice(skip, skip + input.pageSize);
        return [paginatedRequests, visibleRequests.length] as const;
      })()
    : await prisma.$transaction([
        prisma.serviceRequest.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
          include: requestInclude,
        }),
        prisma.serviceRequest.count({ where }),
      ]);

  const mappedRequests = requests.map((request) => {
    const resolvedCurrentStepOrder =
      request.currentStepOrder ??
      request.submission.currentStepOrder ??
      request.workflowInstance?.currentStepOrder ??
      null;

    const resolvedCurrentStep = resolveCurrentWorkflowStep(
      request.submission.workflowSteps.length > 0
        ? request.submission.workflowSteps
        : request.workflowInstance?.steps,
      resolvedCurrentStepOrder,
    );

    const resolvedCurrentStepName =
      (resolvedCurrentStep as { stepName?: string; name?: string } | null)?.stepName ??
      (resolvedCurrentStep as { stepName?: string; name?: string } | null)?.name ??
      null;
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

export async function getOperatorDashboardSummary() {
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
      where: NOT_DELETED_FILTER,
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
    prisma.serviceRequest.count({ where: NOT_DELETED_FILTER }),
    prisma.serviceRequest.count({
      where: {
        AND: [
          NOT_DELETED_FILTER,
          {
        createdAt: {
          gte: sevenDaysAgo,
        },
          },
        ],
      },
    }),
    prisma.serviceRequest.count({ where: { AND: [NOT_DELETED_FILTER, { status: "OPEN" }] } }),
    prisma.serviceRequest.count({ where: { AND: [NOT_DELETED_FILTER, { status: "IN_PROGRESS" }] } }),
    prisma.serviceRequest.count({ where: { AND: [NOT_DELETED_FILTER, { status: "PENDING" }] } }),
    prisma.serviceRequest.count({
      where: {
        AND: [
          NOT_DELETED_FILTER,
          {
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
        ],
      },
    }),
    prisma.serviceRequest.count({
      where: {
        AND: [
          NOT_DELETED_FILTER,
          {
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
        ],
      },
    }),
    prisma.serviceRequest.count({ where: { AND: [NOT_DELETED_FILTER, { status: "CANCELLED" }] } }),
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
        AND: [
          NOT_DELETED_FILTER,
          {
            status: {
              in: openStatuses,
            },
            workflowInstance: {
              isNot: null,
            },
          },
        ],
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
        AND: [
          NOT_DELETED_FILTER,
          {
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
        ],
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
  return prisma.serviceRequest.findFirst({
    where: {
      AND: [
        { id },
        NOT_DELETED_FILTER,
      ],
    },
    select: {
      id: true,
      protocol: true,
      citizenName: true,
      citizenDocument: true,
      citizenContact: true,
      requesterName: true,
      requesterDocument: true,
      requesterOabNumber: true,
      initialNotes: true,
      isActive: true,
      isDeleted: true,
      inactivatedAt: true,
      deletedAt: true,
      status: true,
      currentStepOrder: true,
      submissionId: true,
      createdById: true,
      createdAt: true,
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

export async function getServiceRequestBySubmissionId(submissionId: string) {
  return prisma.serviceRequest.findFirst({
    where: {
      submissionId,
      AND: [NOT_DELETED_FILTER],
    },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      releasedLicense: {
        select: {
          id: true,
          licenseNumber: true,
          protocol: true,
          citizenName: true,
          citizenDocument: true,
          releasedAt: true,
        },
      },
    },
  });
}

export async function inactivateServiceRequest(id: string, changedByUserId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        isActive: true,
        isDeleted: true,
        submissionId: true,
        workflowInstance: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!request) {
      throw new AppError("Solicitacao nao encontrada", 404);
    }

    if (request.isDeleted) {
      throw new AppError("Solicitacao excluida", 409);
    }

    if (!request.isActive || request.status === "CANCELLED") {
      throw new AppError("Solicitacao ja inativada", 409);
    }

    const now = new Date();

    await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        isActive: false,
        inactivatedAt: now,
        inactivatedByUserId: changedByUserId,
        status: "CANCELLED",
        currentStepOrder: null,
      },
    });

    await tx.reportSubmission.update({
      where: { id: request.submissionId },
      data: {
        workflowStatus: "FINAL_REJECTED",
        currentStepOrder: null,
        workflowCompletedAt: now,
      },
    });

    if (request.workflowInstance?.id) {
      await tx.requestWorkflowInstance.update({
        where: { id: request.workflowInstance.id },
        data: {
          status: "CANCELLED",
          currentStepOrder: null,
          completedAt: now,
        },
      });

      await tx.requestWorkflowStep.updateMany({
        where: {
          workflowInstanceId: request.workflowInstance.id,
          status: {
            in: ["WAITING", "IN_PROGRESS"],
          },
        },
        data: {
          status: "BLOCKED",
          observations: "Etapas bloqueadas por inativacao da solicitacao.",
        },
      });
    }

    await tx.requestStatusHistory.create({
      data: {
        serviceRequestId: request.id,
        fromStatus: request.status,
        toStatus: "CANCELLED",
        source: "MANUAL",
        reason: "Solicitacao inativada por super_admin",
        changedByUserId,
        workflowInstanceId: request.workflowInstance?.id ?? null,
      },
    });

    return tx.serviceRequest.findUnique({
      where: { id: request.id },
      select: {
        id: true,
        status: true,
      },
    });
  });
}

export async function deleteServiceRequest(id: string, deletedByUserId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        isDeleted: true,
        workflowInstance: {
          select: {
            id: true,
          },
        },
        submissionId: true,
      },
    });

    if (!request) {
      throw new AppError("Solicitacao nao encontrada", 404);
    }

    if (request.isDeleted) {
      throw new AppError("Solicitacao ja excluida", 409);
    }

    const now = new Date();

    await tx.serviceRequest.update({
      where: {
        id: request.id,
      },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedByUserId,
        isActive: false,
        inactivatedAt: now,
        inactivatedByUserId: deletedByUserId,
        status: "CANCELLED",
        currentStepOrder: null,
      },
    });

    await tx.reportSubmission.update({
      where: { id: request.submissionId },
      data: {
        workflowStatus: "FINAL_REJECTED",
        currentStepOrder: null,
        workflowCompletedAt: now,
      },
    });

    if (request.workflowInstance?.id) {
      await tx.requestWorkflowInstance.update({
        where: { id: request.workflowInstance.id },
        data: {
          status: "CANCELLED",
          currentStepOrder: null,
          completedAt: now,
        },
      });

      await tx.requestWorkflowStep.updateMany({
        where: {
          workflowInstanceId: request.workflowInstance.id,
          status: {
            in: ["WAITING", "IN_PROGRESS"],
          },
        },
        data: {
          status: "BLOCKED",
          observations: "Etapas bloqueadas por exclusao da solicitacao.",
        },
      });
    }

    await tx.requestStatusHistory.create({
      data: {
        serviceRequestId: request.id,
        fromStatus: request.status,
        toStatus: "CANCELLED",
        source: "MANUAL",
        reason: "Solicitacao excluida por super_admin",
        changedByUserId: deletedByUserId,
        workflowInstanceId: request.workflowInstance?.id ?? null,
      },
    });

    return {
      id: request.id,
      deleted: true,
    };
  });
}
