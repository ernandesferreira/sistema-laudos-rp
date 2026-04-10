import { requireApiPermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "discord.manage");

    const integrations = await discordService.listIntegrations();
    return ok({ integrations });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "discord.manage");

    const body = await request.json();
    const integration = await discordService.createIntegration(body);

    return ok({ integration }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
