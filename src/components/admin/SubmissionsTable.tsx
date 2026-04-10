import Link from "next/link";

type SubmissionItem = {
  id: string;
  protocol: string | null;
  status: "PENDING" | "REVIEWED" | "ARCHIVED";
  submittedByName: string | null;
  createdAt: Date;
  template: {
    id: string;
    title: string;
    slug: string;
  };
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type ActiveFilters = {
  protocol?: string;
  name?: string;
  templateId?: string;
  status?: "PENDING" | "REVIEWED" | "ARCHIVED";
  dateFrom?: string;
  dateTo?: string;
  pageSize: number;
};

type SubmissionsTableProps = {
  submissions: SubmissionItem[];
  pagination: PaginationMeta;
  filters: ActiveFilters;
  canViewDetails: boolean;
};

function statusLabel(status: SubmissionItem["status"]) {
  if (status === "REVIEWED") {
    return "Revisado";
  }

  if (status === "ARCHIVED") {
    return "Arquivado";
  }

  return "Pendente";
}

function statusClassName(status: SubmissionItem["status"]) {
  if (status === "REVIEWED") {
    return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30";
  }

  if (status === "ARCHIVED") {
    return "bg-slate-500/20 text-slate-200 border border-slate-500/35";
  }

  return "bg-amber-500/20 text-amber-200 border border-amber-500/30";
}

function pageList(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const first = Math.max(1, currentPage - 2);
  const last = Math.min(totalPages, currentPage + 2);
  const pages = [1];

  for (let page = first; page <= last; page += 1) {
    if (!pages.includes(page)) {
      pages.push(page);
    }
  }

  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return pages;
}

function buildPageHref(page: number, filters: ActiveFilters) {
  const params = new URLSearchParams();

  if (filters.protocol) {
    params.set("protocol", filters.protocol);
  }

  if (filters.name) {
    params.set("name", filters.name);
  }

  if (filters.templateId) {
    params.set("templateId", filters.templateId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  params.set("pageSize", String(filters.pageSize));
  params.set("page", String(page));

  return `/submissions?${params.toString()}`;
}

export function SubmissionsTable({ submissions, pagination, filters, canViewDetails }: SubmissionsTableProps) {
  const pages = pageList(pagination.page, pagination.totalPages);

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-700 bg-slate-900/75 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">Modelo</th>
                <th className="hidden px-3 py-2 md:table-cell">Protocolo</th>
                <th className="hidden px-3 py-2 lg:table-cell">Nome</th>
                <th className="px-3 py-2">Status</th>
                <th className="hidden px-3 py-2 md:table-cell">Data</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-900/55">
                  <td className="px-3 py-3 align-top">
                    <p className="font-semibold text-slate-100">{submission.template.title}</p>
                    <p className="text-xs text-slate-400">/{submission.template.slug}</p>
                    <p className="mt-1 text-xs text-slate-400 md:hidden">
                      Protocolo: {submission.protocol ?? "N/A"}
                    </p>
                    <p className="text-xs text-slate-400 lg:hidden">
                      Nome: {submission.submittedByName ?? "Nao informado"}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-300 md:table-cell">
                    {submission.protocol ?? "N/A"}
                  </td>
                  <td className="hidden px-3 py-3 text-slate-300 lg:table-cell">
                    {submission.submittedByName ?? "Nao informado"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClassName(submission.status)}`}
                    >
                      {statusLabel(submission.status)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-slate-300 md:table-cell">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(submission.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {canViewDetails ? (
                      <Link href={`/submissions/${submission.id}`} className="btn-secondary">
                        Detalhes
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">Sem acesso</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-300">
          Total: <strong>{pagination.total}</strong> registros
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {pagination.hasPreviousPage ? (
            <Link href={buildPageHref(pagination.page - 1, filters)} className="btn-secondary">
              Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-500">
              Anterior
            </span>
          )}

          {pages.map((page) => {
            const isCurrentPage = page === pagination.page;

            return isCurrentPage ? (
              <span
                key={page}
                className="rounded-md border border-sky-500 bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
              >
                {page}
              </span>
            ) : (
              <Link key={page} href={buildPageHref(page, filters)} className="btn-secondary">
                {page}
              </Link>
            );
          })}

          {pagination.hasNextPage ? (
            <Link href={buildPageHref(pagination.page + 1, filters)} className="btn-secondary">
              Proxima
            </Link>
          ) : (
            <span className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-500">
              Proxima
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
