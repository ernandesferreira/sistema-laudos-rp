import Link from "next/link";
import { hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { userService } from "@/application/users/userService";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserRowActions } from "@/components/admin/users/UserRowActions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ search?: string | string[] }>;
};

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function UsersPage({ searchParams }: Props) {
  await requirePagePermission("users.read");

  const authUser = await getCurrentAuthUser();
  const canManageUsers = authUser ? hasPermission(authUser, "users.manage") : false;

  const rawParams = await searchParams;
  const search = firstValue(rawParams.search);
  const users = await userService.listUsers({ search });

  return (
    <section className="space-y-4">
      <PageHeader
        title="Usuarios"
        description="Cadastro de usuario, atribuicao de perfis e controle de acesso ao sistema."
        actions={
          canManageUsers ? (
            <Link href="/settings/users/new" className="btn-primary">
              Novo usuario
            </Link>
          ) : null
        }
      />

      <form method="get" className="card flex items-center gap-2 p-4">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Buscar por nome, passaporte ou OAB"
          className="input"
        />
        <button type="submit" className="btn-primary">
          Buscar
        </button>
        <Link href="/settings/users" className="btn-secondary">
          Limpar
        </Link>
      </form>

      {users.length === 0 ? (
        <EmptyState
          title="Nenhum usuario encontrado"
          description="Cadastre um usuario e atribua ao menos um perfil de permissao."
        />
      ) : (
        <article className="card overflow-hidden">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Passaporte</th>
                <th className="px-3 py-2">OAB</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Perfis</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Criado em</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800/70 align-top">
                  <td className="px-3 py-2 text-slate-100">{user.name}</td>
                  <td className="px-3 py-2 text-slate-300">{user.passportNumber}</td>
                  <td className="px-3 py-2 text-slate-300">{user.oabNumber ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{user.email}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {user.roles.map((entry) => entry.role.name).join(", ") || "Sem perfil"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-500/35 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-slate-600 bg-slate-700/40 px-2 py-1 text-xs text-slate-200">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                      user.createdAt,
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canManageUsers ? <UserRowActions userId={user.id} isActive={user.isActive} /> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}
