export function DashboardSkeleton() {
  return (
    <section className="space-y-4">
      <div className="animate-pulse rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <div className="h-4 w-32 rounded bg-slate-700" />
        <div className="mt-3 h-8 w-52 rounded bg-slate-700" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-slate-700 bg-slate-900"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
    </section>
  );
}
