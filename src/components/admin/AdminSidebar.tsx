import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/templates", label: "Modelos de Laudo" },
  { href: "/submissions", label: "Submisses" },
];

export function AdminSidebar() {
  return (
    <aside className="h-fit rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/30 md:sticky md:top-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Painel RP</p>
      <h2 className="mt-1 text-3xl uppercase text-slate-100">Laudos</h2>
      <p className="mt-1 text-xs text-slate-400">Administracao e monitoramento</p>

      <nav className="mt-5 flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
