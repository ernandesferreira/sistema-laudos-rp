import { requireApiPermission } from "@/auth/guards";
import { getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { userService } from "@/application/users/userService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "users.read");

    const searchParams = new URL(request.url).searchParams;
    const users = await userService.listUsers({
      search: searchParams.get("search"),
    });
    const roleOptions = await userService.listRolesForAssignment();

    return ok({ users, roleOptions });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "users.manage");

    const identity = getAuthIdentityFromRequest(request);
    const actor = await resolveAuthUser(identity);

    const body = await request.json();
    const user = await userService.createUser(body, actor);

    return ok({ user }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
