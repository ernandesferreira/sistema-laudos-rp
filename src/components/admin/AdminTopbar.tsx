export function AdminTopbar() {
  const now = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  return (
    <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-lg shadow-black/30 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Area administrativa</p>
        <p className="text-sm text-slate-300">{now}</p>
      </div>
      <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
        Uso ficticio RP
      </span>
    </header>
  );
}
