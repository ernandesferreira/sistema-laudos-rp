-- CreateEnum
CREATE TYPE "public"."DiscordNotificationStatus" AS ENUM ('SUCCESS', 'ERROR', 'SKIPPED');

-- CreateTable
CREATE TABLE "public"."discord_integrations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "webhook_url" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "discord_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discord_event_configs" (
  "id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "integration_id" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "message_template" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "discord_event_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discord_notification_logs" (
  "id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "integration_id" TEXT,
  "event_config_id" TEXT,
  "payload" JSONB NOT NULL,
  "status" "public"."DiscordNotificationStatus" NOT NULL,
  "response_status" INTEGER,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "discord_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discord_integrations_is_active_idx" ON "public"."discord_integrations"("is_active");

-- CreateIndex
CREATE INDEX "discord_event_configs_event_key_is_enabled_idx" ON "public"."discord_event_configs"("event_key", "is_enabled");

-- CreateIndex
CREATE INDEX "discord_event_configs_integration_id_idx" ON "public"."discord_event_configs"("integration_id");

-- CreateIndex
CREATE INDEX "discord_notification_logs_event_key_created_at_idx" ON "public"."discord_notification_logs"("event_key", "created_at");

-- CreateIndex
CREATE INDEX "discord_notification_logs_status_created_at_idx" ON "public"."discord_notification_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "discord_notification_logs_integration_id_created_at_idx" ON "public"."discord_notification_logs"("integration_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."discord_event_configs"
  ADD CONSTRAINT "discord_event_configs_integration_id_fkey"
  FOREIGN KEY ("integration_id") REFERENCES "public"."discord_integrations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discord_notification_logs"
  ADD CONSTRAINT "discord_notification_logs_integration_id_fkey"
  FOREIGN KEY ("integration_id") REFERENCES "public"."discord_integrations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discord_notification_logs"
  ADD CONSTRAINT "discord_notification_logs_event_config_id_fkey"
  FOREIGN KEY ("event_config_id") REFERENCES "public"."discord_event_configs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
