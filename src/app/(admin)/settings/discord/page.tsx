import { requirePagePermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { DiscordSettingsPanel } from "@/components/admin/discord/DiscordSettingsPanel";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function DiscordSettingsPage() {
  await requirePagePermission("discord.manage");

  const data = await discordService.getDiscordSettingsPageData();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Notificacoes Discord"
        description="Configure webhooks, eventos e templates para notificacoes automaticas no Discord."
      />

      <DiscordSettingsPanel
        initialIntegrations={data.integrations}
        initialEventConfigs={data.eventConfigs}
        initialLogs={data.logs}
      />
    </section>
  );
}
