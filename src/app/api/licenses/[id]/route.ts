import { requireApiPermission } from "@/auth/guards";
import { licenseService } from "@/application/licenses/licenseService";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "licenses.view");

    const { id } = await context.params;
    const releasedLicense = await licenseService.getReleasedLicenseById(id);

    if (!releasedLicense) {
      return fail("Licenca nao encontrada", 404);
    }

    return ok({ releasedLicense });
  } catch (error) {
    return asHttpError(error);
  }
}
