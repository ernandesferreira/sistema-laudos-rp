import Link from "next/link";
import { requirePagePermission } from "@/auth/guards";
import { userService } from "@/application/users/userService";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "@/components/admin/users/UserForm";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requirePagePermission("users.manage");

  const roleOptions = await userService.listRolesForAssignment();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Novo usuario"
        description="Cadastre um novo usuario e atribua os perfis de permissao do sistema."
        actions={
          <Link href="/settings/users" className="btn-secondary">
            Voltar
          </Link>
        }
      />

      <UserForm mode="create" roleOptions={roleOptions} />
    </section>
  );
}
