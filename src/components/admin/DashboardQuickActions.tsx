import Link from "next/link";

export function DashboardQuickActions() {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/30 md:p-5">
      <h2 className="text-2xl uppercase text-slate-100">Atalhos rapidos</h2>
      <p className="mt-1 text-sm text-slate-400">
        Fluxos principais para operacao do painel administrativo.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/templates/new"
          className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
        >
          Criar modelo
        </Link>
        <Link
          href="/templates"
          className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
        >
          Ver modelos
        </Link>
        <Link
          href="/submissions"
          className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
        >
          Ver laudos enviados
        </Link>
        <Link
          href="/templates"
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
        >
          Acessar links publicos
        </Link>
      </div>
    </section>
  );
}
