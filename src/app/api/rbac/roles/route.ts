import { requireApiSuperAdmin } from "@/auth/guards";
import { getRbacMatrix } from "@/application/auth/rbacService";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiSuperAdmin(request);

    const matrix = await getRbacMatrix();

    const roles = matrix.roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      permissionsCount: role.rolePermissions.length,
    }));

    return ok({ roles });
  } catch (error) {
    return asHttpError(error);
  }
}
