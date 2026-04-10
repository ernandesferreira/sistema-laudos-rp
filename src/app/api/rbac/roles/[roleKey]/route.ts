import { requireApiSuperAdmin } from "@/auth/guards";
import { getRbacMatrix } from "@/application/auth/rbacService";
import { roleKeySchema } from "@/application/auth/rbacSchemas";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ roleKey: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    await requireApiSuperAdmin(request);

    const { roleKey: roleKeyRaw } = await context.params;
    const roleKey = roleKeySchema.parse(roleKeyRaw);

    const { roles, permissions } = await getRbacMatrix();
    const role = roles.find((entry) => entry.key === roleKey);

    if (!role) {
      return fail("Role not found", 404);
    }

    return ok({
      role: {
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.rolePermissions.map((entry) => entry.permission),
      },
      catalog: permissions,
    });
  } catch (error) {
    return asHttpError(error);
  }
}
