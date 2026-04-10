import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import {
  createDiscordIntegrationPayloadSchema,
  discordIntegrationIdParamSchema,
  listDiscordNotificationLogsQuerySchema,
  testDiscordWebhookPayloadSchema,
  updateDiscordEventConfigsPayloadSchema,
  updateDiscordIntegrationPayloadSchema,
} from "@/application/discord/discordSchemas";
import {
  DISCORD_EVENT_DEFINITIONS,
  getDefaultTemplateForEvent,
  getDiscordEventLabel,
  type DiscordEventKey,
} from "@/application/discord/discordEvents";
import {
  createDiscordIntegration,
  createDiscordNotificationLog,
  getDiscordIntegrationById,
  listDiscordEventConfigs,
  listDiscordIntegrations,
  listDiscordNotificationLogs,
  listEnabledDiscordEventConfigs,
  updateDiscordIntegration,
  upsertDiscordEventConfig,
} from "@/infra/repositories/discordRepository";

type DiscordAttachmentInput = {
  fileName: string;
  bytes: Uint8Array;
  mimeType?: string;
};

type SendDiscordNotificationOptions = {
  attachment?: DiscordAttachmentInput;
};

function flattenContext(
  input: Record<string, unknown>,
  prefix = "",
  target: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(input)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      target[nextKey] = String(value);
      continue;
    }

    if (value instanceof Date) {
      target[nextKey] = value.toISOString();
      continue;
    }

    if (Array.isArray(value)) {
      target[nextKey] = value
        .map((entry) => {
          if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
            return String(entry);
          }

          return JSON.stringify(entry);
        })
        .join(", ");
      continue;
    }

    if (typeof value === "object") {
      flattenContext(value as Record<string, unknown>, nextKey, target);
    }
  }

  return target;
}

function renderDiscordMessageTemplate(template: string, context: Record<string, unknown>) {
  const flat = flattenContext(context);

  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_full, rawToken: string) => {
    const token = rawToken.trim();

    if (token === "json") {
      return JSON.stringify(context, null, 2);
    }

    return flat[token] ?? "";
  });
}

export async function sendDiscordNotification(
  eventKey: DiscordEventKey,
  context: Record<string, unknown>,
  options?: SendDiscordNotificationOptions,
) {
  const eventConfigs = await listEnabledDiscordEventConfigs(eventKey);

  if (eventConfigs.length === 0) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const eventConfig of eventConfigs) {
    const integration = eventConfig.integration;

    if (!integration || !integration.isActive) {
      skipped += 1;

      await createDiscordNotificationLog({
        eventKey,
        integrationId: integration?.id,
        eventConfigId: eventConfig.id,
        payload: context as Prisma.InputJsonValue,
        status: "SKIPPED",
        errorMessage: !integration
          ? "Integracao nao encontrada para a configuracao do evento"
          : "Integracao inativa",
      });

      continue;
    }

    const content = renderDiscordMessageTemplate(eventConfig.messageTemplate, context);
    const payload = {
      content,
    };
    const attachment = options?.attachment;
    const payloadForLog = {
      content,
      hasAttachment: Boolean(attachment),
      attachmentFileName: attachment?.fileName ?? null,
      attachmentMimeType: attachment?.mimeType ?? null,
    };

    try {
      let response: Response;

      if (attachment) {
        const formData = new FormData();
        formData.set("payload_json", JSON.stringify(payload));
        formData.set(
          "files[0]",
          new Blob([Buffer.from(attachment.bytes)], { type: attachment.mimeType ?? "application/pdf" }),
          attachment.fileName,
        );

        response = await fetch(integration.webhookUrl, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(integration.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const responseBody = (await response.text()).slice(0, 1200);

        failed += 1;

        await createDiscordNotificationLog({
          eventKey,
          integrationId: integration.id,
          eventConfigId: eventConfig.id,
          payload: payloadForLog as Prisma.InputJsonValue,
          status: "ERROR",
          responseStatus: response.status,
          errorMessage: responseBody || "Webhook retornou resposta sem sucesso",
        });

        continue;
      }

      sent += 1;

      await createDiscordNotificationLog({
        eventKey,
        integrationId: integration.id,
        eventConfigId: eventConfig.id,
        payload: payloadForLog as Prisma.InputJsonValue,
        status: "SUCCESS",
        responseStatus: response.status,
      });
    } catch (error) {
      failed += 1;

      await createDiscordNotificationLog({
        eventKey,
        integrationId: integration.id,
        eventConfigId: eventConfig.id,
        payload: payloadForLog as Prisma.InputJsonValue,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message.slice(0, 1200) : "Falha inesperada",
      });
    }
  }

  return {
    sent,
    failed,
    skipped,
  };
}

export const discordService = {
  async listIntegrations() {
    return listDiscordIntegrations();
  },

  async getIntegrationById(idRaw: string) {
    const { id } = discordIntegrationIdParamSchema.parse({ id: idRaw });
    return getDiscordIntegrationById(id);
  },

  async createIntegration(rawPayload: unknown) {
    const payload = createDiscordIntegrationPayloadSchema.parse(rawPayload);

    return createDiscordIntegration({
      name: payload.name,
      webhookUrl: payload.webhookUrl,
      isActive: payload.isActive,
      description: payload.description,
    });
  },

  async updateIntegration(idRaw: string, rawPayload: unknown) {
    const { id } = discordIntegrationIdParamSchema.parse({ id: idRaw });
    const payload = updateDiscordIntegrationPayloadSchema.parse(rawPayload);

    try {
      return await updateDiscordIntegration(id, {
        name: payload.name,
        webhookUrl: payload.webhookUrl,
        isActive: payload.isActive,
        description: payload.description,
      });
    } catch {
      throw new AppError("Integracao nao encontrada", 404);
    }
  },

  async testIntegrationWebhook(idRaw: string, rawPayload: unknown) {
    const { id } = discordIntegrationIdParamSchema.parse({ id: idRaw });
    const payload = testDiscordWebhookPayloadSchema.parse(rawPayload);

    const integration = await getDiscordIntegrationById(id);

    if (!integration) {
      throw new AppError("Integracao nao encontrada", 404);
    }

    const message =
      payload.message ??
      `[Teste de webhook]\nIntegracao: ${integration.name}\nMomento: ${new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date())}`;

    try {
      const response = await fetch(integration.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
        }),
      });

      if (!response.ok) {
        const responseBody = (await response.text()).slice(0, 1200);

        await createDiscordNotificationLog({
          eventKey: "request.created",
          integrationId: integration.id,
          payload: {
            message,
            mode: "test",
          } as Prisma.InputJsonValue,
          status: "ERROR",
          responseStatus: response.status,
          errorMessage: responseBody || "Webhook retornou erro no teste",
        });

        throw new AppError("Webhook retornou erro no teste", 400, {
          responseStatus: response.status,
          responseBody,
        });
      }

      await createDiscordNotificationLog({
        eventKey: "request.created",
        integrationId: integration.id,
        payload: {
          message,
          mode: "test",
        } as Prisma.InputJsonValue,
        status: "SUCCESS",
        responseStatus: response.status,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      await createDiscordNotificationLog({
        eventKey: "request.created",
        integrationId: integration.id,
        payload: {
          message,
          mode: "test",
        } as Prisma.InputJsonValue,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Erro inesperado no teste",
      });

      throw new AppError("Falha ao enviar teste do webhook", 400);
    }
  },

  async listEventConfigsForAdmin() {
    const eventConfigs = await listDiscordEventConfigs();

    const byEventKey = new Map(eventConfigs.map((eventConfig) => [eventConfig.eventKey, eventConfig]));

    return DISCORD_EVENT_DEFINITIONS.map((eventDefinition) => {
      const existing = byEventKey.get(eventDefinition.key);

      return {
        eventKey: eventDefinition.key,
        label: eventDefinition.label,
        integrationId: existing?.integrationId ?? null,
        isEnabled: existing?.isEnabled ?? false,
        messageTemplate: existing?.messageTemplate ?? eventDefinition.defaultTemplate,
      };
    });
  },

  async saveEventConfigs(rawPayload: unknown) {
    const payload = updateDiscordEventConfigsPayloadSchema.parse(rawPayload);

    return Promise.all(
      payload.configs.map((config) =>
        upsertDiscordEventConfig({
          eventKey: config.eventKey as DiscordEventKey,
          integrationId: config.integrationId,
          isEnabled: config.isEnabled,
          messageTemplate: config.messageTemplate,
        }),
      ),
    );
  },

  async listNotificationLogs(rawInput: unknown) {
    const input = listDiscordNotificationLogsQuerySchema.parse(rawInput);
    return listDiscordNotificationLogs(input);
  },

  async getDiscordSettingsPageData() {
    const [integrations, eventConfigs, logsResult] = await Promise.all([
      listDiscordIntegrations(),
      this.listEventConfigsForAdmin(),
      listDiscordNotificationLogs({ page: 1, pageSize: 30 }),
    ]);

    return {
      integrations,
      eventConfigs,
      logs: logsResult.logs,
      availableEvents: DISCORD_EVENT_DEFINITIONS.map((eventDefinition) => ({
        key: eventDefinition.key,
        label: getDiscordEventLabel(eventDefinition.key),
        defaultTemplate: getDefaultTemplateForEvent(eventDefinition.key),
      })),
    };
  },
};
