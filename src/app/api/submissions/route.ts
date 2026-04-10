import { requireApiPermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import { listSubmissionsQuerySchema } from "@/application/laudos/submissionSchemas";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const authUser = await requireApiPermission(request, "submissions.read");

    const searchParams = new URL(request.url).searchParams;
    const parsedQuery = listSubmissionsQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      protocol: searchParams.get("protocol"),
      name: searchParams.get("name"),
      templateId: searchParams.get("templateId"),
      status: searchParams.get("status"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const [result, templates] = await Promise.all([
      laudosService.listSubmissionsPaginated(parsedQuery, authUser ?? undefined),
      laudosService.listSubmissionTemplateOptions(),
    ]);

    return ok({
      submissions: result.submissions,
      pagination: result.pagination,
      templates,
      filters: parsedQuery,
    });
  } catch (error) {
    return asHttpError(error);
  }
}
