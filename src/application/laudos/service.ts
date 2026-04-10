import {
  createField,
  createSection,
  createSubmission,
  createTemplate,
  deleteField,
  deleteSection,
  deleteTemplate,
  getSubmissionById,
  getSubmissionByProtocol,
  getTemplateById,
  getTemplateBySlug,
  listFieldsBySectionId,
  listSubmissionTemplateOptions,
  listSectionsByTemplateId,
  listSubmissions,
  listSubmissionsPaginated,
  listTemplates,
  reorderFields,
  reorderSections,
  updateField,
  updateSection,
  updateTemplate,
} from "@/infra/repositories/laudosRepository";
import type { AuthUser } from "@/auth/session";
import { canViewSubmission } from "@/auth/workflowAccess";
import { AppError } from "@/lib/errors";

export const laudosService = {
  listTemplates,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createSection,
  listSectionsByTemplateId,
  updateSection,
  deleteSection,
  reorderSections,
  createField,
  listFieldsBySectionId,
  updateField,
  deleteField,
  reorderFields,
  createSubmission,
  async listSubmissions(user?: AuthUser) {
    return listSubmissions({ authUser: user ?? null });
  },
  async listSubmissionsPaginated(input: Parameters<typeof listSubmissionsPaginated>[0], user?: AuthUser) {
    return listSubmissionsPaginated(input, { authUser: user ?? null });
  },
  listSubmissionTemplateOptions,
  async getSubmissionById(id: string, user?: AuthUser) {
    const submission = await getSubmissionById(id);

    if (!submission) {
      return null;
    }

    if (!user) {
      return submission;
    }

    const canView = canViewSubmission(user, {
      createdById: submission.serviceRequest?.createdById ?? null,
      currentStepOrder: submission.currentStepOrder,
      workflowStatus: submission.workflowStatus,
      workflowSteps: submission.workflowSteps,
    });

    if (!canView) {
      throw new AppError("Usuario sem acesso a esta submissao", 403);
    }

    return submission;
  },
  getSubmissionByProtocol,
};
