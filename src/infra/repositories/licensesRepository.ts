import { Prisma, type LicenseRevocationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

type ListReleasedLicensesInput = {
  page: number;
  pageSize: number;
  protocol?: string;
  licenseNumber?: string;
  citizenName?: string;
  citizenDocument?: string;
  dateFrom?: string;
  dateTo?: string;
};

type RevokeLicenseInput = {
  id: string;
  revokedByUserId: string;
  type: "days" | "months" | "years" | "permanent";
  value?: number;
  reason?: string;
};

function normalizeDocument(document: string) {
  return document.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function toPrismaRevocationType(type: RevokeLicenseInput["type"]): LicenseRevocationType {
  if (type === "days") {
    return "DAYS";
  }

  if (type === "months") {
    return "MONTHS";
  }

  if (type === "years") {
    return "YEARS";
  }

  return "PERMANENT";
}

function calculateRevocationEndsAt(type: RevokeLicenseInput["type"], value?: number) {
  if (type === "permanent") {
    return null;
  }

  if (!value) {
    return null;
  }

  const base = new Date();

  if (type === "days") {
    base.setDate(base.getDate() + value);
    return base;
  }

  if (type === "months") {
    base.setMonth(base.getMonth() + value);
    return base;
  }

  base.setFullYear(base.getFullYear() + value);
  return base;
}

function deriveLicenseStatus(license: {
  licenseStatus: "ACTIVE" | "REVOKED";
  revocationType: "DAYS" | "MONTHS" | "YEARS" | "PERMANENT" | null;
  revocationEndsAt: Date | null;
}) {
  if (license.licenseStatus === "ACTIVE") {
    return "ativa" as const;
  }

  if (license.revocationType === "PERMANENT") {
    return "revogada_definitivamente" as const;
  }

  if (license.revocationEndsAt && license.revocationEndsAt <= new Date()) {
    return "expirada" as const;
  }

  return "revogada_temporariamente" as const;
}

async function reconcileReleasedLicenses() {
  const now = new Date();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "public"."released_licenses" (
        "id",
        "serviceRequestId",
        "licenseNumber",
        "protocol",
        "citizenName",
        "citizenDocument",
        "templateTitle",
        "licenseStatus",
        "releasedAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        'rls_' || sr."id",
        sr."id",
        'LIC-' || sr."protocol",
        sr."protocol",
        sr."citizenName",
        sr."citizenDocument",
        rt."title",
        'ACTIVE'::"public"."ReleasedLicenseStatus",
        COALESCE(rs."workflowCompletedAt", sr."updatedAt", ${now}),
        ${now},
        ${now}
      FROM "public"."ServiceRequest" sr
      INNER JOIN "public"."ReportTemplate" rt
        ON rt."id" = sr."templateId"
      LEFT JOIN "public"."ReportSubmission" rs
        ON rs."id" = sr."submissionId"
      LEFT JOIN "public"."released_licenses" rl
        ON rl."serviceRequestId" = sr."id"
      WHERE
        rl."id" IS NULL
        AND sr."isDeleted" = false
        AND (
          sr."status" = 'FINAL_APPROVED'
          OR rs."workflowStatus"::text = 'FINAL_APPROVED'
        )
      ON CONFLICT ("serviceRequestId") DO NOTHING
    `,
  );
}

export async function listReleasedLicensesPaginated(input: ListReleasedLicensesInput) {
  await reconcileReleasedLicenses();

  const andClauses: Prisma.ReleasedLicenseWhereInput[] = [];

  if (input.protocol) {
    andClauses.push({
      protocol: {
        contains: input.protocol,
        mode: "insensitive",
      },
    });
  }

  if (input.licenseNumber) {
    andClauses.push({
      licenseNumber: {
        contains: input.licenseNumber,
        mode: "insensitive",
      },
    });
  }

  if (input.citizenName) {
    andClauses.push({
      citizenName: {
        contains: input.citizenName,
        mode: "insensitive",
      },
    });
  }

  if (input.citizenDocument) {
    andClauses.push({
      citizenDocument: {
        contains: input.citizenDocument,
        mode: "insensitive",
      },
    });
  }

  if (input.dateFrom || input.dateTo) {
    const releasedAt: Prisma.DateTimeFilter = {};

    if (input.dateFrom) {
      releasedAt.gte = new Date(`${input.dateFrom}T00:00:00.000`);
    }

    if (input.dateTo) {
      releasedAt.lte = new Date(`${input.dateTo}T23:59:59.999`);
    }

    andClauses.push({ releasedAt });
  }

  const where: Prisma.ReleasedLicenseWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};
  const skip = (input.page - 1) * input.pageSize;

  const [licenses, total] = await prisma.$transaction([
    prisma.releasedLicense.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { releasedAt: "desc" },
      include: {
        serviceRequest: {
          select: {
            id: true,
            status: true,
            submissionId: true,
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        revokedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.releasedLicense.count({ where }),
  ]);

  const mappedLicenses = licenses.map((license) => ({
    ...license,
    displayStatus: deriveLicenseStatus(license),
  }));

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    licenses: mappedLicenses,
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

export async function getReleasedLicenseById(id: string) {
  return prisma.releasedLicense.findUnique({
    where: { id },
    include: {
      serviceRequest: {
        select: {
          id: true,
          requesterOabNumber: true,
          citizen: {
            select: {
              id: true,
              fullName: true,
              documentNumber: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              oabNumber: true,
            },
          },
          template: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          submission: {
            select: {
              id: true,
              workflowStatus: true,
              workflowCompletedAt: true,
            },
          },
        },
      },
      revokedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      restrictions: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          createdBy: {
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

export async function revokeReleasedLicense(input: RevokeLicenseInput) {
  const now = new Date();
  const revocationEndsAt = calculateRevocationEndsAt(input.type, input.value);
  const revocationType = toPrismaRevocationType(input.type);

  return prisma.$transaction(async (tx) => {
    const license = await tx.releasedLicense.findUnique({
      where: { id: input.id },
      include: {
        serviceRequest: {
          select: {
            id: true,
            citizenDocument: true,
          },
        },
      },
    });

    if (!license) {
      throw new AppError("Licenca nao encontrada", 404);
    }

    if (license.licenseStatus === "REVOKED") {
      throw new AppError("Licenca ja revogada", 409);
    }

    const normalized = normalizeDocument(license.serviceRequest.citizenDocument);

    const updated = await tx.releasedLicense.update({
      where: { id: license.id },
      data: {
        licenseStatus: "REVOKED",
        revokedAt: now,
        revokedByUserId: input.revokedByUserId,
        revocationReason: input.reason ?? null,
        revocationType,
        revocationValue: input.type === "permanent" ? null : input.value ?? null,
        revocationEndsAt,
      },
    });

    await tx.documentRestriction.create({
      data: {
        documentNumber: license.serviceRequest.citizenDocument,
        documentNumberNormalized: normalized,
        serviceRequestId: license.serviceRequest.id,
        releasedLicenseId: license.id,
        restrictionType: revocationType,
        restrictionValue: input.type === "permanent" ? null : input.value ?? null,
        startsAt: now,
        endsAt: revocationEndsAt,
        isPermanent: input.type === "permanent",
        reason: input.reason ?? null,
        createdByUserId: input.revokedByUserId,
      },
    });

    return {
      ...updated,
      displayStatus: deriveLicenseStatus(updated),
    };
  });
}

export async function findActiveDocumentRestriction(documentNumber: string) {
  const normalized = normalizeDocument(documentNumber);
  const now = new Date();

  return prisma.documentRestriction.findFirst({
    where: {
      documentNumberNormalized: normalized,
      startsAt: {
        lte: now,
      },
      OR: [
        {
          isPermanent: true,
        },
        {
          endsAt: {
            gt: now,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      releasedLicense: {
        select: {
          id: true,
          licenseNumber: true,
        },
      },
    },
  });
}
