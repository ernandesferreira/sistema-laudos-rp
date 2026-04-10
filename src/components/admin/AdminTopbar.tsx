"use client";

import Link from "next/link";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import type { Permission } from "@/auth/permissions";
import type { RoleKey } from "@/auth/roles";
import { ROLE_LABELS } from "@/auth/roles";

type CurrentUser = {
  name: string;
  roles: RoleKey[];
  permissions: Permission[];
};

type AdminTopbarProps = {
  currentUser: CurrentUser | null;
};

export function AdminTopbar({ currentUser }: AdminTopbarProps) {
  const { settings } = useBrandSettings();

  const now = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const roleLabel = currentUser?.roles.length
    ? currentUser.roles.map((role) => ROLE_LABELS[role]).join(", ")
    : "Sem perfil";

  const canReadRequests = currentUser ? hasPermission(currentUser, "requests.read") : false;
  const canCreateRequests = currentUser ? hasPermission(currentUser, "requests.create") : false;
  const canReadWorkflows = currentUser ? hasPermission(currentUser, "workflows.read") : false;
  const canReadUsers = currentUser ? hasPermission(currentUser, "users.read") : false;
  const canManageDiscord = currentUser ? hasPermission(currentUser, "discord.manage") : false;
  const canReadBranding = currentUser ? hasAnyRole(currentUser, ["super_admin"]) : false;
  const canReadPermissions = currentUser ? hasAnyRole(currentUser, ["super_admin"]) : false;
  const showAdministrationBlock = canReadUsers || canManageDiscord || canReadPermissions || canReadBranding;

  return (
    <header className="glass-panel space-y-3 rounded-2xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Area administrativa</p>
        <p className="truncate text-sm font-semibold text-slate-100">{settings.systemName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{now}</span>
          {currentUser ? (
            <>
              <span className="text-slate-600">•</span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-200">
                {currentUser.name}
              </span>
              <span className="rounded-full border border-sky-800/70 bg-sky-950/45 px-2 py-1 text-sky-200">
                {roleLabel}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-2">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Operacao</span>
          {canReadRequests ? (
            <Link href="/requests" className="btn-secondary text-xs">
              Solicitacoes
            </Link>
          ) : null}
          {canCreateRequests ? (
            <Link href="/requests/new" className="btn-secondary text-xs">
              Nova solicitacao
            </Link>
          ) : null}
          {canReadWorkflows ? (
            <Link href="/workflows" className="btn-secondary text-xs">
              Aprovacoes
            </Link>
          ) : null}
        </div>

        {showAdministrationBlock ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-2">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Administracao</span>
            {canReadUsers ? (
              <Link href="/settings/users" className="btn-secondary text-xs">
                Usuarios
              </Link>
            ) : null}
            {canManageDiscord ? (
              <Link href="/settings/discord" className="btn-secondary text-xs">
                Discord
              </Link>
            ) : null}
            {canReadPermissions ? (
              <Link href="/settings/permissions" className="btn-secondary text-xs">
                Permissoes
              </Link>
            ) : null}
            {canReadBranding ? (
              <Link href="/settings/branding" className="btn-secondary text-xs">
                Branding
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-2 lg:justify-end lg:gap-2">
          <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
            Uso ficticio RP
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
