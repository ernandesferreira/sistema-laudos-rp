import { prisma } from "@/lib/prisma";
import type { DiscordNotificationStatus, Prisma } from "@prisma/client";
import type { DiscordEventKey } from "@/application/discord/discordEvents";

type UpsertDiscordEventConfigInput = {
  eventKey: DiscordEventKey;
  integrationId?: string;
  isEnabled: boolean;
  messageTemplate: string;
};

type CreateDiscordNotificationLogInput = {
  eventKey: DiscordEventKey;
  integrationId?: string;
  eventConfigId?: string;
  payload: Prisma.InputJsonValue;
  status: DiscordNotificationStatus;
  responseStatus?: number;
  errorMessage?: string;
};

export async function listDiscordIntegrations() {
  return prisma.discordIntegration.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getDiscordIntegrationById(id: string) {
  return prisma.discordIntegration.findUnique({ where: { id } });
}

export async function createDiscordIntegration(input: {
  name: string;
  webhookUrl: string;
  isActive: boolean;
  description?: string;
}) {
  return prisma.discordIntegration.create({
    data: {
      name: input.name,
      webhookUrl: input.webhookUrl,
      isActive: input.isActive,
      description: input.description ?? null,
    },
  });
}

export async function updateDiscordIntegration(
  id: string,
  input: {
    name?: string;
    webhookUrl?: string;
    isActive?: boolean;
    description?: string;
  },
) {
  return prisma.discordIntegration.update({
    where: { id },
    data: {
      name: input.name,
      webhookUrl: input.webhookUrl,
      isActive: input.isActive,
      description: input.description ?? null,
    },
  });
}

export async function listDiscordEventConfigs() {
  return prisma.discordEventConfig.findMany({
    include: {
      integration: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function listEnabledDiscordEventConfigs(eventKey: DiscordEventKey) {
  return prisma.discordEventConfig.findMany({
    where: {
      eventKey,
      isEnabled: true,
    },
    include: {
      integration: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function upsertDiscordEventConfig(input: UpsertDiscordEventConfigInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.discordEventConfig.findFirst({
      where: { eventKey: input.eventKey },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return tx.discordEventConfig.update({
        where: { id: existing.id },
        data: {
          integrationId: input.integrationId ?? null,
          isEnabled: input.isEnabled,
          messageTemplate: input.messageTemplate,
        },
        include: {
          integration: true,
        },
      });
    }

    return tx.discordEventConfig.create({
      data: {
        eventKey: input.eventKey,
        integrationId: input.integrationId ?? null,
        isEnabled: input.isEnabled,
        messageTemplate: input.messageTemplate,
      },
      include: {
        integration: true,
      },
    });
  });
}

export async function createDiscordNotificationLog(input: CreateDiscordNotificationLogInput) {
  return prisma.discordNotificationLog.create({
    data: {
      eventKey: input.eventKey,
      integrationId: input.integrationId ?? null,
      eventConfigId: input.eventConfigId ?? null,
      payload: input.payload,
      status: input.status,
      responseStatus: input.responseStatus,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

export async function listDiscordNotificationLogs(input: {
  page: number;
  pageSize: number;
  eventKey?: string;
}) {
  const where: Prisma.DiscordNotificationLogWhereInput = input.eventKey
    ? { eventKey: input.eventKey }
    : {};

  const skip = (input.page - 1) * input.pageSize;

  const [logs, total] = await prisma.$transaction([
    prisma.discordNotificationLog.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: input.pageSize,
    }),
    prisma.discordNotificationLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    logs,
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
