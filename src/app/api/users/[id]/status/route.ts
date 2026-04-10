import { requireApiPermission } from "@/auth/guards";
import { getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { userService } from "@/application/users/userService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "users.manage");

    const identity = getAuthIdentityFromRequest(request);
    const actor = await resolveAuthUser(identity);

    const { id } = await context.params;
    const body = await request.json();
    const user = await userService.updateUserStatus(id, body, actor);

    return ok({ user });
  } catch (error) {
    return asHttpError(error);
  }
}
