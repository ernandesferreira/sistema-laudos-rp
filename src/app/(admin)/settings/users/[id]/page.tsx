import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/auth/guards";
import { userService } from "@/application/users/userService";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "@/components/admin/users/UserForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: Props) {
  await requirePagePermission("users.manage");

  const { id } = await params;

  const [user, roleOptions] = await Promise.all([
    userService.getUserById(id),
    userService.listRolesForAssignment(),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Editar usuario"
        description="Atualize dados do usuario e altere os perfis de permissao atribuidos."
        actions={
          <Link href="/settings/users" className="btn-secondary">
            Voltar
          </Link>
        }
      />

      <UserForm
        mode="edit"
        roleOptions={roleOptions}
        initialUser={{
          id: user.id,
          name: user.name,
          passportNumber: user.passportNumber,
          oabNumber: user.oabNumber ?? "",
          email: user.email,
          isActive: user.isActive,
          roleKeys: user.roles.map((entry) => entry.role.key),
        }}
      />
    </section>
  );
}
