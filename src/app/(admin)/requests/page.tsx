import Link from "next/link";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import { canActOnCurrentStep, resolveCurrentWorkflowStep } from "@/auth/workflowAccess";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { requestService } from "@/application/requests/requestService";
import { listServiceRequestsQuerySchema } from "@/application/requests/requestSchemas";
import { RequestRowActionsSelect } from "@/components/admin/requests/RequestRowActionsSelect";
import { CopyProtocolCell } from "@/components/shared/CopyProtocolCell";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    protocol?: string | string[];
    citizenName?: string | string[];
    citizenDocument?: string | string[];
    templateId?: string | string[];
    status?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    judgeQueue?: string | string[];
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

export default async function ServiceRequestsPage({ searchParams }: Props) {
  await requirePagePermission("requests.read");

  const authUser = await getCurrentAuthUser();
  const canCreateRequest = authUser ? hasPermission(authUser, "requests.create") : false;
  const canReadRequestDetails = authUser ? hasPermission(authUser, "requests.details.read") : false;
  const canExecuteSubmissionWorkflow = authUser
    ? hasPermission(authUser, "submissions.workflow.execute")
    : false;
  const canOpenWorkflowDetails = authUser ? hasPermission(authUser, "submissions.details.read") : false;
  const canShowDetailsAction = canReadRequestDetails || canOpenWorkflowDetails;
  const canDownloadDeclaration = authUser ? !hasAnyRole(authUser, ["operador", "medico"]) : false;
  const isSuperAdmin = authUser ? hasAnyRole(authUser, ["super_admin"]) : false;
  const isJudgeProfile = authUser
    ? hasAnyRole(authUser, ["juiz"]) && !hasAnyRole(authUser, ["super_admin", "admin"])
    : false;

  const rawParams = await searchParams;
  const parsedQuery = listServiceRequestsQuerySchema.safeParse({
    page: firstValue(rawParams.page),
    pageSize: firstValue(rawParams.pageSize),
    protocol: firstValue(rawParams.protocol),
    citizenName: firstValue(rawParams.citizenName),
    citizenDocument: firstValue(rawParams.citizenDocument),
    templateId: firstValue(rawParams.templateId),
    status: firstValue(rawParams.status),
    dateFrom: firstValue(rawParams.dateFrom),
    dateTo: firstValue(rawParams.dateTo),
    judgeQueue: firstValue(rawParams.judgeQueue),
  });

  const parsedFilters = parsedQuery.success ? parsedQuery.data : listServiceRequestsQuerySchema.parse({});
  const filters = parsedFilters;
  const isJudgeQueueView = Boolean(filters.judgeQueue);

  const [result, templateOptions] = await Promise.all([
    requestService.listServiceRequests(filters, authUser ?? undefined),
    requestService.listServiceRequestTemplateOptions(),
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        title={isJudgeQueueView ? "Fila de solicitacoes do juiz" : "Solicitacoes"}
        description={
          isJudgeQueueView
            ? "Solicitacoes finalizadas com declaracao de aptidao pronta para validacao judicial e download."
            : "Fila de abertura de solicitacoes com rastreabilidade de operador, cidadao e andamento das aprovacoes."
        }
        actions={
          canCreateRequest && !isJudgeProfile ? (
            <Link href="/requests/new" className="btn-primary">
              Nova solicitacao
            </Link>
          ) : null
        }
      />

      {isJudgeProfile ? (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <Link
            href={`/requests${buildQueryString({
              protocol: filters.protocol,
              citizenName: filters.citizenName,
              citizenDocument: filters.citizenDocument,
              templateId: filters.templateId,
              status: filters.status,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
              pageSize: filters.pageSize,
              page: 1,
            })}`}
            className={isJudgeQueueView ? "btn-secondary" : "btn-primary"}
          >
            Solicitacoes abertas
          </Link>
          <Link
            href={`/requests${buildQueryString({
              protocol: filters.protocol,
              citizenName: filters.citizenName,
              citizenDocument: filters.citizenDocument,
              templateId: filters.templateId,
              status: filters.status,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
              judgeQueue: "true",
              pageSize: filters.pageSize,
              page: 1,
            })}`}
            className={isJudgeQueueView ? "btn-primary" : "btn-secondary"}
          >
            Fila judicial
          </Link>
        </div>
      ) : null}

      <form method="get" className="card grid gap-3 p-4 md:grid-cols-4 md:p-5">
        {isJudgeQueueView ? <input type="hidden" name="judgeQueue" value="true" /> : null}
        <input name="protocol" defaultValue={filters.protocol ?? ""} placeholder="Protocolo" className="input" />
        <input
          name="citizenName"
          defaultValue={filters.citizenName ?? ""}
          placeholder="Nome do cidadao"
          className="input"
        />
        <input
          name="citizenDocument"
          defaultValue={filters.citizenDocument ?? ""}
          placeholder="Documento"
          className="input"
        />
        <select name="templateId" defaultValue={filters.templateId ?? ""} className="input">
          <option value="">Todos os modelos</option>
          {templateOptions.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>

        <select name="status" defaultValue={filters.status ?? ""} className="input">
          <option value="">Todos os status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="PENDING">PENDING</option>
          <option value="FINAL_APPROVED">FINAL_APPROVED</option>
          <option value="FINAL_REJECTED">FINAL_REJECTED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

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
          <Link href="/requests" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      {result.pagination.total === 0 ? (
        <EmptyState
          title="Nenhuma solicitacao"
          description="Nao foram encontradas solicitacoes para os filtros informados."
        />
      ) : (
        <article className="card overflow-hidden">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Protocolo</th>
                <th className="px-3 py-2">Cidadao</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Solicitacao</th>
                <th className="px-3 py-2">Situacao</th>
                <th className="px-3 py-2">Etapa</th>
                <th className="px-3 py-2">Operador</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {result.requests.map((request) => (
                <tr key={request.id} className="border-t border-slate-800/70">
                  <td className="px-3 py-2">
                    <CopyProtocolCell protocol={request.protocol} />
                  </td>
                  <td className="px-3 py-2 text-slate-200">{request.citizen.fullName}</td>
                  <td className="px-3 py-2 text-slate-300">{request.citizen.documentNumber}</td>
                  <td className="px-3 py-2 text-slate-300">{request.template.title}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {request.isFinalized ? (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-500/35 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
                        Finalizado
                      </span>
                    ) : request.currentStepOrder !== null ? (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-sky-500/35 bg-sky-500/20 px-2 py-1 text-xs text-sky-200">
                        Em andamento
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-amber-500/35 bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                        Em transicao
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {request.isFinalized
                      ? "Finalizado"
                      : request.currentStepOrder !== null
                        ? `${`#${request.currentStepOrder + 1}`}${request.currentStepName ? ` - ${request.currentStepName}` : ""}`
                        : "Em transicao"}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{request.createdBy.name}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(request.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const workflowSteps =
                        request.submission.workflowSteps.length > 0
                          ? request.submission.workflowSteps
                          : request.workflowInstance?.steps;

                      const currentStep = resolveCurrentWorkflowStep(
                        workflowSteps,
                        request.currentStepOrder,
                      );
                      const canApproveCurrentStep = canActOnCurrentStep(authUser, currentStep);

                      const actionOptions: Array<{
                        value: string;
                        label: string;
                        href: string;
                        openInNewTab?: boolean;
                      }> = [];

                      if (canApproveCurrentStep && canExecuteSubmissionWorkflow && canOpenWorkflowDetails) {
                        actionOptions.push({
                          value: "approve",
                          label: "Aprovar solicitacao",
                          href: `/submissions/${request.submissionId}/workflow`,
                        });
                      }

                      if (canShowDetailsAction) {
                        actionOptions.push({
                          value: "details",
                          label: "Detalhes",
                          href: canReadRequestDetails
                            ? `/requests/${request.id}`
                            : `/submissions/${request.submissionId}/workflow`,
                        });
                      }

                      if (
                        canDownloadDeclaration &&
                        (request.submission.workflowStatus === "FINAL_APPROVED" ||
                          request.submission.workflowStatus === "FINAL_REJECTED")
                      ) {
                        actionOptions.push({
                          value: "pdf",
                          label: "Baixar PDF",
                          href: `/api/requests/${request.id}/declaration`,
                          openInNewTab: true,
                        });
                      }

                      const requestIsActive = (request as { isActive?: boolean }).isActive !== false;
                      const canInactivateRequest = isSuperAdmin && requestIsActive && request.status !== "CANCELLED";
                      const canDeleteRequest = isSuperAdmin;

                      return actionOptions.length > 0 || canInactivateRequest || canDeleteRequest ? (
                        <RequestRowActionsSelect
                          requestId={request.id}
                          options={actionOptions}
                          canInactivate={canInactivateRequest}
                          canDelete={canDeleteRequest}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Sem acesso</span>
                      );
                    })()}
                  </td>
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
                  href={`/requests${buildQueryString({
                    protocol: filters.protocol,
                    citizenName: filters.citizenName,
                    citizenDocument: filters.citizenDocument,
                    templateId: filters.templateId,
                    status: filters.status,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    judgeQueue: filters.judgeQueue ? "true" : undefined,
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
                  href={`/requests${buildQueryString({
                    protocol: filters.protocol,
                    citizenName: filters.citizenName,
                    citizenDocument: filters.citizenDocument,
                    templateId: filters.templateId,
                    status: filters.status,
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    judgeQueue: filters.judgeQueue ? "true" : undefined,
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
