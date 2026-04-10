import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ARCHIVED_SECTION_TAG = "[SECTION_ARCHIVED]";

function activeSectionFilter(): Prisma.ReportSectionWhereInput {
  return {
    OR: [
      {
        description: null,
      },
      {
        description: {
          not: {
            startsWith: ARCHIVED_SECTION_TAG,
          },
        },
      },
    ],
  };
}

export async function findPublishedTemplateBySlug(slug: string) {
  return prisma.reportTemplate.findFirst({
    where: {
      slug,
      deletedAt: null,
      status: "PUBLISHED",
      isActive: true,
    },
    include: {
      sections: {
        where: activeSectionFilter(),
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
    },
  });
}

export async function createSubmissionWithFieldValues(params: {
  templateId: string;
  protocol: string;
  submittedByName?: string | null;
  submittedByContact?: string | null;
  answers: Record<string, unknown>;
  meta?: Record<string, unknown> | null;
  fieldByName: Map<string, { id: string; label: string; type: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.reportSubmission.create({
      data: {
        templateId: params.templateId,
        protocol: params.protocol,
        submittedByName: params.submittedByName ?? null,
        submittedByContact: params.submittedByContact ?? null,
        answers: params.answers as Prisma.InputJsonValue,
        meta: (params.meta ?? {}) as Prisma.InputJsonValue,
      },
    });

    const answerRows = Object.entries(params.answers)
      .map(([fieldName, value]) => {
        const field = params.fieldByName.get(fieldName);

        if (!field) {
          return null;
        }

        return {
          submissionId: submission.id,
          fieldId: field.id,
          labelSnapshot: field.label,
          typeSnapshot: field.type as Prisma.ReportFieldCreateManyInput["type"],
          value: value as Prisma.InputJsonValue,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (answerRows.length > 0) {
      await tx.submissionFieldAnswer.createMany({
        data: answerRows,
      });
    }

    return submission;
  });
}

export async function findSubmissionByProtocol(protocol: string) {
  return prisma.reportSubmission.findFirst({
    where: { protocol },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      fieldAnswers: {
        include: {
          field: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}
