import { requireApiPermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "discord.manage");

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await discordService.testIntegrationWebhook(id, body);

    return ok(result);
  } catch (error) {
    return asHttpError(error);
  }
}
