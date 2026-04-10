import {
  createServiceRequestPayloadSchema,
  listServiceRequestsQuerySchema,
  serviceRequestIdParamSchema,
} from "@/application/requests/requestSchemas";
import type { AuthUser } from "@/auth/session";
import { AppError } from "@/lib/errors";
import { generateServiceRequestProtocol } from "@/lib/protocol";
import {
  createServiceRequest,
  getRoleOpenPipelineDashboardSummary,
  getOperatorDashboardSummary,
  getServiceRequestById,
  listServiceRequestTemplateOptions,
  listServiceRequestsPaginated,
} from "@/infra/repositories/requestRepository";

function isUniqueProtocolError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: string }).code;
  return maybeCode === "P2002";
}

async function generateUniqueProtocol(createAttempt: (protocol: string) => Promise<unknown>) {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const protocol = generateServiceRequestProtocol();

    try {
      await createAttempt(protocol);
      return protocol;
    } catch (error) {
      if (!isUniqueProtocolError(error)) {
        throw error;
      }
    }
  }

  throw new AppError("Nao foi possivel gerar protocolo unico", 500);
}

export const requestService = {
  listServiceRequestTemplateOptions,

  async getOperatorDashboardSummary(userId: string) {
    return getOperatorDashboardSummary(userId);
  },

  async getMedicoDashboardSummary() {
    return getRoleOpenPipelineDashboardSummary("medico");
  },

  async getPeritoDashboardSummary() {
    return getRoleOpenPipelineDashboardSummary("perito_rp");
  },

  async listServiceRequests(rawInput: unknown) {
    const parsed = listServiceRequestsQuerySchema.parse(rawInput);
    return listServiceRequestsPaginated(parsed);
  },

  async getServiceRequestById(idRaw: string) {
    const { id } = serviceRequestIdParamSchema.parse({ id: idRaw });
    return getServiceRequestById(id);
  },

  async getDeclarationData(idRaw: string) {
    const { id } = serviceRequestIdParamSchema.parse({ id: idRaw });
    const serviceRequest = await getServiceRequestById(id);

    if (!serviceRequest) {
      throw new AppError("Solicitacao nao encontrada", 404);
    }

    const isFinishedWorkflow =
      serviceRequest.submission.workflowStatus === "FINAL_APPROVED" ||
      serviceRequest.submission.workflowStatus === "FINAL_REJECTED";

    if (!isFinishedWorkflow) {
      throw new AppError("Declaracao disponivel apenas apos concluir todas as etapas", 409);
    }

    return {
      requestId: serviceRequest.id,
      protocol: serviceRequest.protocol,
      citizenName: serviceRequest.citizen.fullName,
      passportNumber: serviceRequest.citizen.documentNumber,
      requestName: serviceRequest.template.title,
      workflowStatus: serviceRequest.submission.workflowStatus,
      steps: serviceRequest.submission.workflowSteps.map((step) => ({
        order: step.order,
        name: step.name,
        decision: step.decision,
      })),
    };
  },

  async createServiceRequest(rawPayload: unknown, user: AuthUser) {
    const payload = createServiceRequestPayloadSchema.parse(rawPayload);

    let createdRequest: Awaited<ReturnType<typeof createServiceRequest>> | null = null;

    await generateUniqueProtocol(async (protocol) => {
      createdRequest = await createServiceRequest({
        protocol,
        templateId: payload.templateId,
        createdById: user.id,
        createdByName: user.name,
        createdByEmail: user.email,
        createdByPassportNumber: user.passportNumber,
        answers: payload.answers,
      });
    });

    if (!createdRequest) {
      throw new AppError("Falha ao criar solicitacao", 500);
    }

    return createdRequest;
  },
};
