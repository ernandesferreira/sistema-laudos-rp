import { requireApiPermission } from "@/auth/guards";
import { licenseService } from "@/application/licenses/licenseService";
import { getCurrentAuthUser } from "@/auth/session";
import { AppError } from "@/lib/errors";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    let user = await requireApiPermission(request, "licenses.revoke");

    if (!user) {
      user = await getCurrentAuthUser();
    }

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = await context.params;
    const payload = await request.json();
    const revoked = await licenseService.revokeLicense(id, payload, user.id);

    return ok({ releasedLicense: revoked });
  } catch (error) {
    return asHttpError(error);
  }
}
