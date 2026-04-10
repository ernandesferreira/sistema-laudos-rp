import { requireApiPermission } from "@/auth/guards";
import { getAuthIdentityFromRequest, getCurrentAuthUser, resolveAuthUser } from "@/auth/session";
import { requestService } from "@/application/requests/requestService";
import { AppError } from "@/lib/errors";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const authUser = await requireApiPermission(request, "requests.read");

    const { id } = await context.params;
    const serviceRequest = await requestService.getServiceRequestById(id, authUser ?? undefined);

    if (!serviceRequest) {
      return fail("Solicitacao nao encontrada", 404);
    }

    return ok({ serviceRequest });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    let user = await requireApiPermission(request, "requests.manage");

    if (!user) {
      user = await getCurrentAuthUser();
    }

    if (!user) {
      const identity = getAuthIdentityFromRequest(request);
      user = await resolveAuthUser(identity);
    }

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = await context.params;
    const payload = await request.json();
    const serviceRequest = await requestService.manageServiceRequest(id, payload, user);

    return ok({ serviceRequest });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    let user = await requireApiPermission(request, "requests.manage");

    if (!user) {
      user = await getCurrentAuthUser();
    }

    if (!user) {
      const identity = getAuthIdentityFromRequest(request);
      user = await resolveAuthUser(identity);
    }

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = await context.params;
    const deleted = await requestService.deleteServiceRequest(id, user);

    return ok({ deleted });
  } catch (error) {
    return asHttpError(error);
  }
}
