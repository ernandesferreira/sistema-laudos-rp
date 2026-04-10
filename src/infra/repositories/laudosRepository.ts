import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type { SubmissionStatus, TemplateStatus } from "@prisma/client";
import { initializeSubmissionWorkflow } from "@/infra/repositories/workflowRepository";

const ARCHIVED_SECTION_TAG = "[SECTION_ARCHIVED]";

function buildArchivedSectionDescription(description: string | null) {
  const current = (description ?? "").trim();

  if (current.startsWith(ARCHIVED_SECTION_TAG)) {
    return current;
  }

  return current ? `${ARCHIVED_SECTION_TAG} ${current}` : ARCHIVED_SECTION_TAG;
}

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

type TemplateInput = {
  title: string;
  slug: string;
  description?: string | null;
  status?: TemplateStatus;
  version?: number;
  isActive?: boolean;
};

type ListTemplatesInput = {
  q?: string;
  status?: TemplateStatus;
  active?: "true" | "false";
};

type ListSubmissionsInput = {
  page: number;
  pageSize: number;
  protocol?: string;
  name?: string;
  templateId?: string;
  status?: SubmissionStatus;
  dateFrom?: string;
  dateTo?: string;
};

type SectionInput = {
  templateId: string;
  title: string;
  description?: string | null;
  order?: number;
};

type FieldInput = {
  sectionId: string;
  label: string;
  name: string;
  type:
    | "TEXT"
    | "TEXTAREA"
    | "NUMBER"
    | "DATE"
    | "TIME"
    | "DATETIME"
    | "SELECT"
    | "MULTISELECT"
    | "RADIO"
    | "CHECKBOX"
    | "FILE_FAKE"
    | "SIGNATURE_TEXT"
    | "CPF_FAKE"
    | "RG_FAKE"
    | "PLATE"
    | "OBSERVATIONS";
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean;
  order?: number;
  defaultValue?: string | number | boolean | null;
  mask?: string | null;
  isActive?: boolean;
  options?: string[] | null;
  validation?: Record<string, unknown> | null;
};

export async function listTemplates(filters: ListTemplatesInput = {}) {
  const where: Prisma.ReportTemplateWhereInput = {
    deletedAt: null,
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { slug: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.active) {
    where.isActive = filters.active === "true";
  }

  return prisma.reportTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sections: true,
          submissions: true,
        },
      },
    },
  });
}

export async function getTemplateById(id: string) {
  return prisma.reportTemplate.findFirst({
    where: {
      id,
      deletedAt: null,
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

export async function getTemplateBySlug(slug: string) {
  return prisma.reportTemplate.findFirst({
    where: {
      slug,
      deletedAt: null,
      status: "PUBLISHED",
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

export async function createTemplate(input: TemplateInput) {
  return prisma.reportTemplate.create({
    data: {
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      status: input.status ?? "DRAFT",
      version: input.version ?? 1,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateTemplate(
  id: string,
  input: Partial<TemplateInput>,
) {
  const result = await prisma.reportTemplate.updateMany({
    where: {
      id,
      deletedAt: null,
    },
    data: input,
  });

  if (result.count === 0) {
    return null;
  }

  return getTemplateById(id);
}

export async function deleteTemplate(id: string) {
  const result = await prisma.reportTemplate.updateMany({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
      status: "ARCHIVED",
    },
  });

  return result.count > 0;
}

export async function createSection(input: SectionInput) {
  const lastSection = await prisma.reportSection.findFirst({
    where: {
      templateId: input.templateId,
      ...activeSectionFilter(),
    },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.reportSection.create({
    data: {
      templateId: input.templateId,
      title: input.title,
      description: input.description ?? null,
      order: input.order ?? (lastSection?.order ?? -1) + 1,
    },
  });
}

export async function listSectionsByTemplateId(templateId: string) {
  return prisma.reportSection.findMany({
    where: {
      templateId,
      ...activeSectionFilter(),
    },
    orderBy: { order: "asc" },
  });
}

export async function updateSection(
  id: string,
  input: Partial<Omit<SectionInput, "templateId">>,
) {
  return prisma.reportSection.update({
    where: { id },
    data: input,
  });
}

export async function deleteSection(id: string) {
  const section = await prisma.reportSection.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  if (!section) {
    throw new AppError("Secao nao encontrada.", 404);
  }

  const answersCount = await prisma.submissionFieldAnswer.count({
    where: {
      field: {
        sectionId: id,
      },
    },
  });

  if (answersCount > 0) {
    await prisma.$transaction([
      prisma.reportField.updateMany({
        where: {
          sectionId: id,
        },
        data: {
          isActive: false,
        },
      }),
      prisma.reportSection.update({
        where: {
          id,
        },
        data: {
          title: section.title.startsWith("[Arquivada]")
            ? section.title
            : `[Arquivada] ${section.title}`,
          description: buildArchivedSectionDescription(section.description),
        },
      }),
    ]);

    return {
      archived: true,
      deleted: false,
    };
  }

  await prisma.reportSection.delete({ where: { id } });

  return {
    archived: false,
    deleted: true,
  };
}

export async function reorderSections(templateId: string, sectionIds: string[]) {
  const existing = await prisma.reportSection.findMany({
    where: {
      templateId,
      id: { in: sectionIds },
    },
    select: { id: true },
  });

  if (existing.length !== sectionIds.length) {
    throw new Error("One or more sections are invalid for this template");
  }

  await prisma.$transaction(
    sectionIds.map((sectionId, index) =>
      prisma.reportSection.update({
        where: { id: sectionId },
        data: { order: index },
      }),
    ),
  );

  return listSectionsByTemplateId(templateId);
}

export async function createField(input: FieldInput) {
  const lastField = await prisma.reportField.findFirst({
    where: { sectionId: input.sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.reportField.create({
    data: {
      sectionId: input.sectionId,
      label: input.label,
      name: input.name,
      type: input.type,
      placeholder: input.placeholder ?? null,
      helpText: input.helpText ?? null,
      required: input.required ?? false,
      order: input.order ?? (lastField?.order ?? -1) + 1,
      defaultValue: input.defaultValue as Prisma.InputJsonValue,
      mask: input.mask ?? null,
      isActive: input.isActive ?? true,
      options: input.options as Prisma.InputJsonValue,
      validation: input.validation as Prisma.InputJsonValue,
    },
  });
}

export async function updateField(id: string, input: Partial<FieldInput>) {
  return prisma.reportField.update({
    where: { id },
    data: {
      ...input,
      defaultValue: input.defaultValue as Prisma.InputJsonValue,
      options: input.options as Prisma.InputJsonValue,
      validation: input.validation as Prisma.InputJsonValue,
    },
  });
}

export async function deleteField(id: string) {
  return prisma.reportField.delete({ where: { id } });
}

export async function listFieldsBySectionId(sectionId: string) {
  return prisma.reportField.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
  });
}

export async function reorderFields(sectionId: string, fieldIds: string[]) {
  const existing = await prisma.reportField.findMany({
    where: {
      sectionId,
      id: { in: fieldIds },
    },
    select: { id: true },
  });

  if (existing.length !== fieldIds.length) {
    throw new Error("One or more fields are invalid for this section");
  }

  await prisma.$transaction(
    fieldIds.map((fieldId, index) =>
      prisma.reportField.update({
        where: { id: fieldId },
        data: { order: index },
      }),
    ),
  );

  return listFieldsBySectionId(sectionId);
}

export async function createSubmission(params: {
  templateId: string;
  protocol?: string | null;
  submittedByName?: string | null;
  submittedByContact?: string | null;
  answers: Record<string, unknown>;
  meta?: Record<string, unknown> | null;
}) {
  const template = await getTemplateById(params.templateId);

  if (!template || !template.isActive || template.status !== "PUBLISHED") {
    throw new Error("Template not available");
  }

  const fieldByName = new Map(
    template.sections
      .flatMap((section) => section.fields)
      .map((field) => [field.name, field]),
  );

  return prisma.$transaction(async (tx) => {
    const submission = await tx.reportSubmission.create({
      data: {
        templateId: params.templateId,
        protocol: params.protocol ?? null,
        submittedByName: params.submittedByName ?? null,
        submittedByContact: params.submittedByContact ?? null,
        answers: params.answers as Prisma.InputJsonValue,
        meta: (params.meta ?? {}) as Prisma.InputJsonValue,
      },
    });

    const answerRows = Object.entries(params.answers)
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

    await initializeSubmissionWorkflow(tx, submission.id, params.templateId);

    return submission;
  });
}

export async function listSubmissions() {
  return prisma.reportSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });
}

export async function listSubmissionsPaginated(input: ListSubmissionsInput) {
  const where: Prisma.ReportSubmissionWhereInput = {};

  if (input.protocol) {
    where.protocol = {
      contains: input.protocol,
      mode: "insensitive",
    };
  }

  if (input.name) {
    where.submittedByName = {
      contains: input.name,
      mode: "insensitive",
    };
  }

  if (input.templateId) {
    where.templateId = input.templateId;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {};

    if (input.dateFrom) {
      where.createdAt.gte = new Date(`${input.dateFrom}T00:00:00.000`);
    }

    if (input.dateTo) {
      where.createdAt.lte = new Date(`${input.dateTo}T23:59:59.999`);
    }
  }

  const skip = (input.page - 1) * input.pageSize;

  const [submissions, total] = await prisma.$transaction([
    prisma.reportSubmission.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.reportSubmission.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    submissions,
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

export async function listSubmissionTemplateOptions() {
  return prisma.reportTemplate.findMany({
    where: {
      deletedAt: null,
      submissions: {
        some: {},
      },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

export async function getSubmissionById(id: string) {
  return prisma.reportSubmission.findUnique({
    where: { id },
    include: {
      template: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              fields: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      fieldAnswers: {
        include: {
          field: true,
        },
      },
    },
  });
}

export async function getSubmissionByProtocol(protocol: string) {
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
    },
  });
}
