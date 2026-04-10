export function SubmissionsTableSkeleton() {
  return (
    <section className="space-y-4">
      <div className="card p-4">
        <div className="h-6 w-52 animate-pulse rounded bg-slate-800" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-800" />
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-10 animate-pulse rounded bg-slate-800" />
          <div className="h-10 animate-pulse rounded bg-slate-800" />
          <div className="h-10 animate-pulse rounded bg-slate-800" />
          <div className="h-10 animate-pulse rounded bg-slate-800" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded bg-slate-900" />
          ))}
        </div>
      </div>
    </section>
  );
}
