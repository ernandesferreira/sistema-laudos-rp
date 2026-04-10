import Link from "next/link";

type RecentReport = {
  id: string;
  createdAt: Date;
  submittedByName: string | null;
  status: string;
  template: {
    title: string;
    slug: string;
  };
};

type RecentReportsTableProps = {
  items: RecentReport[];
};

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  REVIEWED: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  ARCHIVED: "bg-slate-600/20 text-slate-200 border-slate-500/40",
};

export function RecentReportsTable({ items }: RecentReportsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-10 text-center">
        <p className="text-lg font-semibold text-slate-200">Nenhuma solicitacao preenchida ainda</p>
        <p className="mt-1 text-sm text-slate-400">
          Assim que terceiros enviarem formularios, os ultimos registros aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-800/70">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-300">
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Responsavel</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/60">
                <td className="px-4 py-3 text-slate-100">
                  <p className="font-semibold">{item.template.title}</p>
                  <p className="text-xs text-slate-400">/{item.template.slug}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {item.submittedByName ?? "Nao informado"}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(item.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${statusTone[item.status] ?? "bg-slate-500/20 text-slate-200 border-slate-400/30"}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/submissions/${item.id}`}
                    className="rounded-lg border border-slate-500/40 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700/40"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
