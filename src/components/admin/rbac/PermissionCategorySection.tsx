"use client";

import {
  PERMISSION_CATEGORY_LABELS,
  type PermissionCategory,
  type PermissionItem,
} from "@/components/admin/rbac/types";

type PermissionCategorySectionProps = {
  category: PermissionCategory;
  permissions: PermissionItem[];
  selected: Set<string>;
  disabled?: boolean;
  onToggle: (permissionKey: string, checked: boolean) => void;
};

export function PermissionCategorySection({
  category,
  permissions,
  selected,
  disabled = false,
  onToggle,
}: PermissionCategorySectionProps) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg uppercase text-slate-100">{PERMISSION_CATEGORY_LABELS[category]}</h3>
        <span className="rounded-full border border-slate-700 bg-slate-900/75 px-2 py-1 text-xs text-slate-300">
          {permissions.length}
        </span>
      </div>

      {permissions.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma permissao neste modulo.</p>
      ) : (
        <div className="space-y-2">
          {permissions.map((permission) => {
            const checked = selected.has(permission.key);

            return (
              <label
                key={permission.key}
                className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/45 px-3 py-2"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => onToggle(permission.key, event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-200">{permission.name}</span>
                  <span className="block text-xs text-slate-400">{permission.key}</span>
                  {permission.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{permission.description}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
