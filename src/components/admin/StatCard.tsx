type StatCardProps = {
  title: string;
  value: number;
  hint?: string;
  tone?: "blue" | "green" | "amber";
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  blue: "from-blue-500/25 to-cyan-400/10 text-blue-100 border-blue-400/30",
  green: "from-emerald-500/25 to-lime-400/10 text-emerald-100 border-emerald-400/30",
  amber: "from-amber-500/25 to-orange-400/10 text-amber-100 border-amber-400/30",
};

export function StatCard({
  title,
  value,
  hint,
  tone = "blue",
}: StatCardProps) {
  return (
    <article
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-lg shadow-black/20 ${toneClasses[tone]}`}
    >
      <p className="text-xs uppercase tracking-widest text-slate-300">{title}</p>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-300">{hint}</p> : null}
    </article>
  );
}
