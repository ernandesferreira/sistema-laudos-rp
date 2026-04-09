export default function LoadingTemplatesPage() {
  return (
    <section className="space-y-4">
      <div className="card animate-pulse p-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-72 rounded bg-slate-200" />
      </div>

      <div className="card animate-pulse p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="h-10 rounded bg-slate-200 md:col-span-1" />
          <div className="h-10 rounded bg-slate-200" />
          <div className="h-10 rounded bg-slate-200" />
          <div className="h-10 rounded bg-slate-200" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-44 animate-pulse bg-slate-100" />
        ))}
      </div>
    </section>
  );
}
