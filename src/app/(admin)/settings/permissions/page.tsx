import { requirePageSuperAdmin } from "@/auth/guards";
import { getRbacMatrix } from "@/application/auth/rbacService";
import type { RoleKey } from "@/auth/roles";
import { RoleCard } from "@/components/admin/rbac/RoleCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function PermissionsRolesPage() {
  await requirePageSuperAdmin();

  const { roles } = await getRbacMatrix();
  type RoleRow = (typeof roles)[number];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Perfis e permissoes"
        description="Gerencie o acesso por perfil no sistema (RBAC)."
      />

      {roles.length === 0 ? (
        <EmptyState
          title="Nenhum perfil encontrado"
          description="Execute o seed inicial para criar os perfis de sistema."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role: RoleRow) => (
            <RoleCard
              key={role.id}
              role={{
                key: role.key as RoleKey,
                name: role.name,
                description: role.description,
                permissionsCount: role.rolePermissions.length,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
