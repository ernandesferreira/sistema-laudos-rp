import Link from "next/link";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { licenseService } from "@/application/licenses/licenseService";
import { listReleasedLicensesQuerySchema } from "@/application/licenses/licenseSchemas";
import { LicenseActionsSelect } from "@/components/admin/licenses/LicenseActionsSelect";
import { CopyProtocolCell } from "@/components/shared/CopyProtocolCell";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    protocol?: string | string[];
    licenseNumber?: string | string[];
    citizenName?: string | string[];
    citizenDocument?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
  }>;
};

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildQueryString(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

function licenseStatusLabel(status: string) {
  if (status === "revogada_definitivamente") {
    return {
      label: "Revogada definitivamente",
      classes: "border-rose-500/35 bg-rose-500/20 text-rose-200",
    };
  }

  if (status === "revogada_temporariamente") {
    return {
      label: "Revogada temporariamente",
      classes: "border-amber-500/35 bg-amber-500/20 text-amber-200",
    };
  }

  if (status === "expirada") {
    return {
      label: "Expirada",
      classes: "border-slate-500/35 bg-slate-500/20 text-slate-200",
    };
  }

  return {
    label: "Ativa",
    classes: "border-emerald-500/35 bg-emerald-500/20 text-emerald-200",
  };
}

export default async function ReleasedLicensesPage({ searchParams }: Props) {
  await requirePagePermission("licenses.view");

  const authUser = await getCurrentAuthUser();
  const canRevoke = authUser ? hasPermission(authUser, "licenses.revoke") : false;
  const canDownloadPdf = authUser ? !hasAnyRole(authUser, ["operador", "medico"]) : false;

  const rawParams = await searchParams;
  const parsedQuery = listReleasedLicensesQuerySchema.safeParse({
    page: firstValue(rawParams.page),
    pageSize: firstValue(rawParams.pageSize),
    protocol: firstValue(rawParams.protocol),
    licenseNumber: firstValue(rawParams.licenseNumber),
    citizenName: firstValue(rawParams.citizenName),
    citizenDocument: firstValue(rawParams.citizenDocument),
    dateFrom: firstValue(rawParams.dateFrom),
    dateTo: firstValue(rawParams.dateTo),
  });

  const filters = parsedQuery.success ? parsedQuery.data : listReleasedLicensesQuerySchema.parse({});
  const result = await licenseService.listReleasedLicenses(filters);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Licencas Liberadas"
        description="Registros gerados automaticamente quando uma solicitacao e aprovada no fluxo final."
      />

      <form method="get" className="card grid gap-3 p-4 md:grid-cols-4 md:p-5">
        <input name="licenseNumber" defaultValue={filters.licenseNumber ?? ""} placeholder="Numero da licenca" className="input" />
        <input name="protocol" defaultValue={filters.protocol ?? ""} placeholder="Protocolo da solicitacao" className="input" />
        <input name="citizenName" defaultValue={filters.citizenName ?? ""} placeholder="Nome do cidadao" className="input" />
        <input name="citizenDocument" defaultValue={filters.citizenDocument ?? ""} placeholder="Documento" className="input" />
        <input type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} className="input" />
        <input type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} className="input" />
        <select name="pageSize" defaultValue={String(filters.pageSize)} className="input">
          {[10, 20, 30, 50].map((size) => (
            <option key={size} value={size}>
              {size} por pagina
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 md:col-span-4">
          <button type="submit" className="btn-primary">
            Filtrar
          </button>
          <Link href="/licenses" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {result.pagination.total === 0 ? (
        <EmptyState
          title="Nenhuma licenca liberada"
          description="Nao foram encontradas licencas para os filtros informados."
        />
      ) : (
        <article className="card overflow-hidden">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Licenca</th>
                <th className="px-3 py-2">Protocolo</th>
                <th className="px-3 py-2">Cidadao</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Status da licenca</th>
                <th className="px-3 py-2">Liberada em</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {result.licenses.map((license) => (
                <tr key={license.id} className="border-t border-slate-800/70">
                  {(() => {
                    const status = licenseStatusLabel(license.displayStatus);

                    return (
                      <>
                  <td className="px-3 py-2">
                    <CopyProtocolCell protocol={license.licenseNumber} copyLabel="licenca" />
                  </td>
                  <td className="px-3 py-2">
                    <CopyProtocolCell protocol={license.protocol} />
                  </td>
                  <td className="px-3 py-2 text-slate-200">{license.citizenName}</td>
                  <td className="px-3 py-2 text-slate-300">{license.citizenDocument}</td>
                  <td className="px-3 py-2 text-slate-300">{license.templateTitle}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-xs ${status.classes}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(license.releasedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <LicenseActionsSelect
                      licenseId={license.id}
                      canRevoke={canRevoke}
                      canDownloadPdf={canDownloadPdf}
                      status={license.displayStatus}
                    />
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-800/70 px-3 py-3 text-sm text-slate-300">
            <p>
              Pagina {result.pagination.page} de {result.pagination.totalPages} ({result.pagination.total} itens)
            </p>
            <div className="flex items-center gap-2">
              {result.pagination.hasPreviousPage ? (
                <Link
                  href={`/licenses${buildQueryString({
                    licenseNumber: filters.licenseNumber,
                    protocol: filters.protocol,
                    citizenName: filters.citizenName,
                    citizenDocument: filters.citizenDocument,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    pageSize: filters.pageSize,
                    page: result.pagination.page - 1,
                  })}`}
                  className="btn-secondary text-xs"
                >
                  Anterior
                </Link>
              ) : null}

              {result.pagination.hasNextPage ? (
                <Link
                  href={`/licenses${buildQueryString({
                    licenseNumber: filters.licenseNumber,
                    protocol: filters.protocol,
                    citizenName: filters.citizenName,
                    citizenDocument: filters.citizenDocument,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    pageSize: filters.pageSize,
                    page: result.pagination.page + 1,
                  })}`}
                  className="btn-secondary text-xs"
                >
                  Proxima
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
