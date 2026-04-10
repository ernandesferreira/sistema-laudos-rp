import { z } from "zod";
import { DISCORD_EVENT_DEFINITIONS } from "@/application/discord/discordEvents";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const EVENT_KEYS = DISCORD_EVENT_DEFINITIONS.map((eventDefinition) => eventDefinition.key);

export const discordEventKeySchema = z.enum(EVENT_KEYS as [string, ...string[]]);

export const createDiscordIntegrationPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  webhookUrl: z.string().trim().url().max(500),
  isActive: z.boolean().optional().default(true),
  description: z.preprocess(emptyStringToUndefined, z.string().trim().max(300).optional()),
});

export const updateDiscordIntegrationPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  webhookUrl: z.string().trim().url().max(500).optional(),
  isActive: z.boolean().optional(),
  description: z.preprocess(emptyStringToUndefined, z.string().trim().max(300).optional()),
});

export const discordIntegrationIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const testDiscordWebhookPayloadSchema = z.object({
  message: z.preprocess(emptyStringToUndefined, z.string().trim().max(1800).optional()),
});

export const discordEventConfigItemSchema = z.object({
  eventKey: discordEventKeySchema,
  integrationId: z.preprocess(emptyStringToUndefined, z.string().cuid().optional()),
  isEnabled: z.boolean().default(false),
  messageTemplate: z.string().trim().min(1).max(1800),
});

export const updateDiscordEventConfigsPayloadSchema = z.object({
  configs: z.array(discordEventConfigItemSchema),
});

export const listDiscordNotificationLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(30),
  eventKey: z.preprocess(emptyStringToUndefined, discordEventKeySchema.optional()),
});
