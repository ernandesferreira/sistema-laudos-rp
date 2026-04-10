import { requireApiSuperAdmin } from "@/auth/guards";
import { updateRolePermissions } from "@/application/auth/rbacService";
import { asHttpError, ok } from "@/lib/http";

type Context = {
  params: Promise<{ roleKey: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    await requireApiSuperAdmin(request);

    const { roleKey } = await context.params;
    const body = await request.json();

    const updatedRole = await updateRolePermissions({
      roleKey,
      permissionKeys: body.permissionKeys,
    });

    return ok({
      role: updatedRole,
      message: "Permissions updated successfully",
    });
  } catch (error) {
    return asHttpError(error);
  }
}
