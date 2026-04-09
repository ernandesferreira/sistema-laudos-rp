import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { TemplateStatus } from "@prisma/client";

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
        orderBy: { order: "asc" },
        include: {
          fields: {
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
        orderBy: { order: "asc" },
        include: {
          fields: {
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
    where: { templateId: input.templateId },
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
    where: { templateId },
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
  return prisma.reportSection.delete({ where: { id } });
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
  submittedByName?: string | null;
  submittedByContact?: string | null;
  answers: Record<string, string | number | boolean | string[]>;
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
