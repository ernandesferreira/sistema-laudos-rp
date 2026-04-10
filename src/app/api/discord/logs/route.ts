import { requireApiPermission } from "@/auth/guards";
import { discordService } from "@/application/discord/discordService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "discord.manage");

    const searchParams = new URL(request.url).searchParams;

    const result = await discordService.listNotificationLogs({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      eventKey: searchParams.get("eventKey"),
    });

    return ok(result);
  } catch (error) {
    return asHttpError(error);
  }
}
