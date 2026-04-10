import { requireApiPermission } from "@/auth/guards";
import { requestService } from "@/application/requests/requestService";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "requests.details.read");

    const { id } = await context.params;
    const serviceRequest = await requestService.getServiceRequestById(id);

    if (!serviceRequest) {
      return fail("Solicitacao nao encontrada", 404);
    }

    return ok({ serviceRequest });
  } catch (error) {
    return asHttpError(error);
  }
}
