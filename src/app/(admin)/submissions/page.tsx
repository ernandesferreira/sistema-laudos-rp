import { hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { laudosService } from "@/application/laudos/service";
import { listSubmissionsQuerySchema } from "@/application/laudos/submissionSchemas";
import { SubmissionFilters } from "@/components/admin/SubmissionFilters";
import { SubmissionsTable } from "@/components/admin/SubmissionsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    protocol?: string | string[];
    name?: string | string[];
    templateId?: string | string[];
    status?: string | string[];
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

export default async function SubmissionsPage({ searchParams }: Props) {
  await requirePagePermission("submissions.read");

  const authUser = await getCurrentAuthUser();
  const canReadSubmissionDetails = authUser ? hasPermission(authUser, "submissions.details.read") : false;

  const rawParams = await searchParams;
  const parsedQuery = listSubmissionsQuerySchema.safeParse({
    page: firstValue(rawParams.page),
    pageSize: firstValue(rawParams.pageSize),
    protocol: firstValue(rawParams.protocol),
    name: firstValue(rawParams.name),
    templateId: firstValue(rawParams.templateId),
    status: firstValue(rawParams.status),
    dateFrom: firstValue(rawParams.dateFrom),
    dateTo: firstValue(rawParams.dateTo),
  });

  const filters = parsedQuery.success
    ? parsedQuery.data
    : listSubmissionsQuerySchema.parse({});

  const [result, templateOptions] = await Promise.all([
    laudosService.listSubmissionsPaginated(filters, authUser ?? undefined),
    laudosService.listSubmissionTemplateOptions(),
  ]);

  const filtersKey = JSON.stringify({
    protocol: filters.protocol,
    name: filters.name,
    templateId: filters.templateId,
    status: filters.status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    pageSize: filters.pageSize,
  });

  return (
    <section className="space-y-4">
      <PageHeader
        title="Submissoes"
        description="Historico de solicitacoes recebidas com filtros, busca e paginacao."
      />

      <SubmissionFilters
        key={filtersKey}
        templateOptions={templateOptions}
        current={{
          protocol: filters.protocol,
          name: filters.name,
          templateId: filters.templateId,
          status: filters.status,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          pageSize: filters.pageSize,
        }}
      />

      {result.pagination.total === 0 ? (
        <EmptyState
          title="Nenhuma submissao"
          description="Nenhuma solicitacao encontrada para os filtros atuais."
        />
      ) : (
        <SubmissionsTable
          submissions={result.submissions}
          pagination={result.pagination}
          canViewDetails={canReadSubmissionDetails}
          currentUser={authUser}
          filters={{
            protocol: filters.protocol,
            name: filters.name,
            templateId: filters.templateId,
            status: filters.status,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            pageSize: filters.pageSize,
          }}
        />
      )}
    </section>
  );
}
