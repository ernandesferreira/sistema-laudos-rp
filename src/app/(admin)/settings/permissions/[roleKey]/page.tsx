import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSuperAdmin } from "@/auth/guards";
import { getRbacMatrix } from "@/application/auth/rbacService";
import { roleKeySchema } from "@/application/auth/rbacSchemas";
import type { Permission } from "@/auth/permissions";
import type { RoleKey } from "@/auth/roles";
import { RolePermissionsEditor } from "@/components/admin/rbac/RolePermissionsEditor";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ roleKey: string }>;
};

export default async function PermissionsRoleDetailPage({ params }: Props) {
  await requirePageSuperAdmin();

  const { roleKey: roleKeyRaw } = await params;
  const parsedRoleKey = roleKeySchema.safeParse(roleKeyRaw);

  if (!parsedRoleKey.success) {
    notFound();
  }

  const { roles, permissions } = await getRbacMatrix();
  type RoleRow = (typeof roles)[number];
  type PermissionRow = (typeof permissions)[number];
  const role = roles.find((entry: RoleRow) => entry.key === parsedRoleKey.data);

  if (!role) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Gestao de permissoes"
        description="Ative ou remova permissoes por modulo para o perfil selecionado."
        actions={
          <Link href="/settings/permissions" className="btn-secondary">
            Voltar para perfis
          </Link>
        }
      />

      <RolePermissionsEditor
        role={{
          id: role.id,
          key: parsedRoleKey.data as RoleKey,
          name: role.name,
          description: role.description,
          permissions: role.rolePermissions.map((entry: RoleRow["rolePermissions"][number]) => ({
            key: entry.permission.key as Permission,
            name: entry.permission.name,
            resource: entry.permission.resource,
            description: entry.permission.description,
          })),
        }}
        catalog={permissions.map((permission: PermissionRow) => ({
          key: permission.key as Permission,
          name: permission.name,
          resource: permission.resource,
          description: permission.description,
        }))}
      />
    </section>
  );
}
