"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PERMISSION_CATEGORY_ORDER,
  toPermissionCategory,
  type PermissionItem,
  type RolePermissionsView,
} from "@/components/admin/rbac/types";
import { PermissionCategorySection } from "@/components/admin/rbac/PermissionCategorySection";

type RolePermissionsEditorProps = {
  role: RolePermissionsView;
  catalog: PermissionItem[];
};

function groupPermissionsByCategory(catalog: PermissionItem[]) {
  const grouped = new Map<string, PermissionItem[]>();

  for (const permission of catalog) {
    const category = toPermissionCategory(permission.resource);
    const current = grouped.get(category) ?? [];
    current.push(permission);
    grouped.set(category, current);
  }

  for (const [key, list] of grouped.entries()) {
    grouped.set(
      key,
      [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    );
  }

  return grouped;
}

export function RolePermissionsEditor({ role, catalog }: RolePermissionsEditorProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(role.permissions.map((item) => item.key)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => groupPermissionsByCategory(catalog), [catalog]);
  const isSuperAdmin = role.key === "super_admin";

  function togglePermission(permissionKey: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });
  }

  function save() {
    setError(null);
    setMessage(null);

    if (!isSuperAdmin && selectedKeys.size === 0) {
      setError("Selecione ao menos uma permissao para este perfil.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/rbac/roles/${role.key}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissionKeys: [...selectedKeys] }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Nao foi possivel salvar as permissoes.");
        return;
      }

      setMessage("Permissoes atualizadas com sucesso.");
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl uppercase text-slate-100">{role.name}</h2>
            <p className="text-xs text-slate-400">{role.key}</p>
            <p className="mt-1 text-sm text-slate-300">{role.description ?? "Sem descricao"}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-300">
              {selectedKeys.size} selecionadas
            </span>
            <button
              type="button"
              className="btn-primary"
              disabled={isPending || isSuperAdmin}
              onClick={save}
            >
              {isPending ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </div>

        {isSuperAdmin ? (
          <p className="mt-3 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
            O perfil super_admin possui acesso total sistêmico e nao pode ser alterado.
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {PERMISSION_CATEGORY_ORDER.map((category) => (
          <PermissionCategorySection
            key={category}
            category={category}
            permissions={grouped.get(category) ?? []}
            selected={selectedKeys}
            disabled={isPending || isSuperAdmin}
            onToggle={togglePermission}
          />
        ))}
      </div>
    </div>
  );
}
