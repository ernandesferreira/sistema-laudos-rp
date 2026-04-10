import { validateSubmissionAnswers } from "@/application/laudos/publicSubmissionValidation";
import {
  createSubmissionPayloadSchema,
  submissionProtocolParamSchema,
} from "@/application/laudos/submissionSchemas";
import {
  createSubmissionWithFieldValues,
  findPublishedTemplateBySlug,
  findSubmissionByProtocol,
} from "@/infra/repositories/submissionRepository";
import { AppError } from "@/lib/errors";
import { generateSubmissionProtocol } from "@/lib/protocol";

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
    const protocol = generateSubmissionProtocol();

    try {
      await createAttempt(protocol);
      return protocol;
    } catch (error) {
      if (!isUniqueProtocolError(error)) {
        throw error;
      }
    }
  }

  throw new AppError("Could not generate a unique protocol", 500);
}

export async function createPublicSubmission(inputRaw: {
  slug: string;
  payload: unknown;
}) {
  const payload = createSubmissionPayloadSchema.parse(inputRaw.payload);
  const template = await findPublishedTemplateBySlug(inputRaw.slug);

  if (!template) {
    throw new AppError("Template unavailable", 404);
  }

  const fields = template.sections.flatMap((section) => section.fields);
  const validation = validateSubmissionAnswers(fields, payload.answers);

  if (!validation.ok) {
    throw new AppError("Validation failed", 422, {
      fieldErrors: validation.fieldErrors,
    });
  }

  const fieldByName = new Map(
    fields.map((field) => [field.name, { id: field.id, label: field.label, type: field.type }]),
  );

  const protocol = await generateUniqueProtocol(async (nextProtocol) => {
    await createSubmissionWithFieldValues({
      templateId: template.id,
      protocol: nextProtocol,
      submittedByName: payload.submittedByName ?? null,
      submittedByContact: payload.submittedByContact ?? null,
      answers: validation.data,
      meta: {
        ...(payload.meta ?? {}),
        protocol: nextProtocol,
      },
      fieldByName,
    });
  });

  const createdSubmission = await findSubmissionByProtocol(protocol);

  if (!createdSubmission) {
    throw new AppError("Submission could not be loaded after creation", 500);
  }

  return {
    submissionId: createdSubmission.id,
    protocol,
    submittedAt: createdSubmission.createdAt,
    template: {
      id: template.id,
      title: template.title,
      slug: template.slug,
    },
  };
}

export async function getFormattedSubmissionByProtocol(protocolRaw: string) {
  const { protocol } = submissionProtocolParamSchema.parse({ protocol: protocolRaw });
  const submission = await findSubmissionByProtocol(protocol);

  if (!submission) {
    throw new AppError("Protocol not found", 404);
  }

  return {
    protocol: submission.protocol,
    templateTitle: submission.template.title,
    templateSlug: submission.template.slug,
    status: submission.status,
    submittedByName: submission.submittedByName,
    submittedByContact: submission.submittedByContact,
    submittedAt: submission.createdAt,
    values: submission.fieldAnswers.map((item) => ({
      fieldName: item.field.name,
      label: item.labelSnapshot,
      type: item.typeSnapshot,
      value: item.value,
    })),
  };
}
