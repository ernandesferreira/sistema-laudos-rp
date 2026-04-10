import {
  manageServiceRequestPayloadSchema,
  createServiceRequestPayloadSchema,
  listServiceRequestsQuerySchema,
  serviceRequestIdParamSchema,
} from "@/application/requests/requestSchemas";
import type { AuthUser } from "@/auth/session";
import { AppError } from "@/lib/errors";
import { generateServiceRequestProtocol } from "@/lib/protocol";
import { sendDiscordNotification } from "@/application/discord/discordService";
import {
  createServiceRequest as createServiceRequestRecord,
  deleteServiceRequest as deleteServiceRequestRecord,
  getRoleOpenPipelineDashboardSummary,
  getOperatorDashboardSummary,
  getServiceRequestById,
  inactivateServiceRequest,
  listServiceRequestTemplateOptions,
  listServiceRequestsPaginated,
} from "@/infra/repositories/requestRepository";
import { canViewRequest } from "@/auth/workflowAccess";

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

  async getOperatorDashboardSummary() {
    return getOperatorDashboardSummary();
  },

  async getMedicoDashboardSummary() {
    return getRoleOpenPipelineDashboardSummary("medico");
  },

  async getPeritoDashboardSummary() {
    return getRoleOpenPipelineDashboardSummary("perito_rp");
  },

  async listServiceRequests(rawInput: unknown, user?: AuthUser) {
    const parsed = listServiceRequestsQuerySchema.parse(rawInput);
    return listServiceRequestsPaginated(parsed, {
      authUser: user ?? null,
    });
  },

  async getServiceRequestById(idRaw: string, user?: AuthUser) {
    const { id } = serviceRequestIdParamSchema.parse({ id: idRaw });
    const serviceRequest = await getServiceRequestById(id);

    if (!serviceRequest) {
      return null;
    }

    if (!user) {
      return serviceRequest;
    }

    const canView = canViewRequest(user, {
      createdById: serviceRequest.createdById,
      currentStepOrder: serviceRequest.currentStepOrder,
      workflowStatus: serviceRequest.submission.workflowStatus,
      workflowSteps:
        serviceRequest.submission.workflowSteps.length > 0
          ? serviceRequest.submission.workflowSteps
          : serviceRequest.workflowInstance?.steps,
    });

    if (!canView) {
      throw new AppError("Usuario sem acesso a esta solicitacao", 403);
    }

    return serviceRequest;
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
      citizenName: serviceRequest.citizenName,
      passportNumber: serviceRequest.citizenDocument,
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

    let createdRequestId: string | null = null;

    await generateUniqueProtocol(async (protocol) => {
      const createdRequest = await createServiceRequestRecord({
        protocol,
        templateId: payload.templateId,
        createdById: user.id,
        createdByName: user.name,
        createdByEmail: user.email,
        citizenName: payload.citizenName,
        citizenDocument: payload.citizenDocument,
        citizenContact: payload.citizenContact,
        requesterName: payload.requesterName,
        requesterDocument: payload.requesterDocument,
        requesterOabNumber: payload.requesterOabNumber,
        answers: payload.answers,
      });

      createdRequestId = createdRequest.id;
    });

    if (!createdRequestId) {
      throw new AppError("Falha ao criar solicitacao", 500);
    }

    const persistedRequest = await getServiceRequestById(createdRequestId);

    if (!persistedRequest) {
      throw new AppError("Falha ao carregar solicitacao apos criacao", 500);
    }

    try {
      await sendDiscordNotification("request.created", {
        requestId: persistedRequest.id,
        protocol: persistedRequest.protocol,
        citizenName: persistedRequest.citizenName,
        citizenDocument: persistedRequest.citizenDocument,
        citizenContact: persistedRequest.citizenContact,
        requesterName: payload.requesterName,
        requesterDocument: payload.requesterDocument,
        requesterOabNumber: payload.requesterOabNumber ?? null,
        workflowStatus: persistedRequest.submission.workflowStatus,
      });
    } catch {
      // Falha de notificacao nao pode interromper a abertura da solicitacao.
    }

    return persistedRequest;
  },

  async manageServiceRequest(idRaw: string, rawPayload: unknown, user: AuthUser) {
    const { id } = serviceRequestIdParamSchema.parse({ id: idRaw });

    if (!user.roles.includes("super_admin")) {
      throw new AppError("Apenas super_admin pode gerenciar esta acao", 403);
    }

    const payload = manageServiceRequestPayloadSchema.parse(rawPayload);

    if (payload.action === "inactivate") {
      return inactivateServiceRequest(id, user.id);
    }

    throw new AppError("Acao de gerenciamento invalida", 400);
  },

  async deleteServiceRequest(idRaw: string, user: AuthUser) {
    const { id } = serviceRequestIdParamSchema.parse({ id: idRaw });

    if (!user.roles.includes("super_admin")) {
      throw new AppError("Apenas super_admin pode excluir solicitacao", 403);
    }

    return deleteServiceRequestRecord(id, user.id);
  },
};
