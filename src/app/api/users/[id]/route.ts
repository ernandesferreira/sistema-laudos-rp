import { requireApiPermission } from "@/auth/guards";
import { getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { userService } from "@/application/users/userService";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "users.read");

    const { id } = await context.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return fail("Usuario nao encontrado", 404);
    }

    return ok({ user });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "users.manage");

    const identity = getAuthIdentityFromRequest(request);
    const actor = await resolveAuthUser(identity);

    const { id } = await context.params;
    const body = await request.json();
    const user = await userService.updateUser(id, body, actor);

    return ok({ user });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "users.manage");

    const identity = getAuthIdentityFromRequest(request);
    const actor = await resolveAuthUser(identity);

    const { id } = await context.params;
    await userService.deleteUser(id, actor);

    return ok({ success: true });
  } catch (error) {
    return asHttpError(error);
  }
}
