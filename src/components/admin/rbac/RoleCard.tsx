import Link from "next/link";
import type { RoleKey } from "@/auth/roles";

type RoleCardProps = {
  role: {
    key: RoleKey;
    name: string;
    description: string | null;
    permissionsCount: number;
  };
};

export function RoleCard({ role }: RoleCardProps) {
  const isSuperAdmin = role.key === "super_admin";

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl uppercase text-slate-100">{role.name}</h2>
          <p className="text-xs text-slate-400">{role.key}</p>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            isSuperAdmin
              ? "border border-amber-400/45 bg-amber-500/20 text-amber-200"
              : "border border-sky-400/35 bg-sky-500/20 text-sky-200"
          }`}
        >
          {role.permissionsCount} permissoes
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-300">{role.description ?? "Sem descricao"}</p>

      <div className="mt-4">
        <Link href={`/settings/permissions/${role.key}`} className="btn-secondary">
          Gerenciar permissoes
        </Link>
      </div>
    </article>
  );
}
