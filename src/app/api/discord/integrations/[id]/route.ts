import { requireApiPermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "discord.manage");

    const { id } = await context.params;
    const integration = await discordService.getIntegrationById(id);

    if (!integration) {
      return fail("Integracao nao encontrada", 404);
    }

    return ok({ integration });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "discord.manage");

    const { id } = await context.params;
    const body = await request.json();
    const integration = await discordService.updateIntegration(id, body);

    return ok({ integration });
  } catch (error) {
    return asHttpError(error);
  }
}
