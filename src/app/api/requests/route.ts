import { requireApiPermission } from "@/auth/guards";
import { getCurrentAuthUser, getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { requestService } from "@/application/requests/requestService";
import { listServiceRequestsQuerySchema } from "@/application/requests/requestSchemas";
import { AppError } from "@/lib/errors";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "requests.read");

    const searchParams = new URL(request.url).searchParams;
    const parsedQuery = listServiceRequestsQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      protocol: searchParams.get("protocol"),
      citizenName: searchParams.get("citizenName"),
      citizenDocument: searchParams.get("citizenDocument"),
      templateId: searchParams.get("templateId"),
      status: searchParams.get("status"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      judgeQueue: searchParams.get("judgeQueue"),
    });

    const [result, templates] = await Promise.all([
      requestService.listServiceRequests(parsedQuery),
      requestService.listServiceRequestTemplateOptions(),
    ]);

    return ok({
      requests: result.requests,
      pagination: result.pagination,
      templates,
      filters: parsedQuery,
    });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request) {
  try {
    let user = await requireApiPermission(request, "requests.create");

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

    const body = await request.json();
    const serviceRequest = await requestService.createServiceRequest(body, user);

    return ok({ serviceRequest }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
