import { requireApiPermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "discord.manage");

    const configs = await discordService.listEventConfigsForAdmin();
    return ok({ configs });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireApiPermission(request, "discord.manage");

    const body = await request.json();
    const configs = await discordService.saveEventConfigs(body);

    return ok({ configs });
  } catch (error) {
    return asHttpError(error);
  }
}
