"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import type { Permission } from "@/auth/permissions";
import type { RoleKey } from "@/auth/roles";

type CurrentUser = {
  roles: RoleKey[];
  permissions: Permission[];
};

type SidebarLink = {
  href: string;
  label: string;
  requiredPermission?: Permission;
  requiredRoles?: RoleKey[];
};

type SidebarSection = {
  title: string;
  links: SidebarLink[];
};

type AdminSidebarProps = {
  currentUser: CurrentUser | null;
};

const menuSections: SidebarSection[] = [
  {
    title: "Visao geral",
    links: [{ href: "/dashboard", label: "Dashboard", requiredPermission: "dashboard.read" }],
  },
  {
    title: "Operacao",
    links: [
      { href: "/requests", label: "Solicitacoes", requiredPermission: "requests.read" },
      { href: "/submissions", label: "Submisses", requiredPermission: "submissions.read" },
    ],
  },
  {
    title: "Modelagem",
    links: [
      { href: "/templates", label: "Modelos de Solicitacao", requiredPermission: "templates.read" },
      { href: "/workflows", label: "Aprovacoes", requiredPermission: "workflows.read" },
    ],
  },
  {
    title: "Administracao",
    links: [
      { href: "/settings/users", label: "Usuarios", requiredPermission: "users.read" },
      { href: "/settings/permissions", label: "Permissoes", requiredRoles: ["super_admin"] },
      { href: "/settings/branding", label: "Branding", requiredRoles: ["super_admin"] },
    ],
  },
];

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function canAccessLink(currentUser: CurrentUser | null, link: SidebarLink) {
  if (!currentUser) {
    return false;
  }

  if (link.requiredPermission && !hasPermission(currentUser, link.requiredPermission)) {
    return false;
  }

  if (link.requiredRoles && link.requiredRoles.length > 0 && !hasAnyRole(currentUser, link.requiredRoles)) {
    return false;
  }

  return true;
}

export function AdminSidebar({ currentUser }: AdminSidebarProps) {
  const pathname = usePathname();
  const { settings } = useBrandSettings();

  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => canAccessLink(currentUser, link)),
    }))
    .filter((section) => section.links.length > 0);

  return (
    <aside className="glass-panel h-fit rounded-3xl p-4 md:sticky md:top-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-11 w-11 rounded-xl border border-slate-700 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/35 via-sky-500/30 to-transparent text-sm font-semibold text-amber-100">
              {initialsFromName(settings.systemName) || "RP"}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/90">
              Painel investigativo
            </p>
            <h2 className="mt-0.5 text-xl text-slate-100">{settings.systemName}</h2>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">{settings.tagline}</p>
      </div>

      <nav className="mt-5 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.title}
            </p>

            <div className="flex flex-col gap-2">
              {section.links.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "border-sky-400/45 bg-sky-500/20 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800/70"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
