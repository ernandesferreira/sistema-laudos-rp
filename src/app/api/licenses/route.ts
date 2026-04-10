import { requireApiPermission } from "@/auth/guards";
import { licenseService } from "@/application/licenses/licenseService";
import { listReleasedLicensesQuerySchema } from "@/application/licenses/licenseSchemas";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "licenses.view");

    const searchParams = new URL(request.url).searchParams;
    const parsedQuery = listReleasedLicensesQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      protocol: searchParams.get("protocol"),
      licenseNumber: searchParams.get("licenseNumber"),
      citizenName: searchParams.get("citizenName"),
      citizenDocument: searchParams.get("citizenDocument"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const result = await licenseService.listReleasedLicenses(parsedQuery);

    return ok({
      licenses: result.licenses,
      pagination: result.pagination,
      filters: parsedQuery,
    });
  } catch (error) {
    return asHttpError(error);
  }
}
