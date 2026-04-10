import Link from "next/link";
import { requirePagePermission } from "@/auth/guards";
import { requestService } from "@/application/requests/requestService";
import { RequestCreateForm } from "@/components/admin/requests/RequestCreateForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewServiceRequestPage() {
  await requirePagePermission("requests.create");

  const templateOptions = await requestService.listServiceRequestTemplateOptions();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Nova solicitacao"
        description="Abertura de solicitacao por operador com vinculacao automatica as aprovacoes do modelo."
        actions={
          <Link href="/requests" className="btn-secondary">
            Voltar para lista
          </Link>
        }
      />

      {templateOptions.length === 0 ? (
        <EmptyState
          title="Nenhum modelo disponivel"
          description="Publique um modelo e configure aprovacoes ativas para abrir solicitacoes."
        />
      ) : (
        <RequestCreateForm templateOptions={templateOptions} />
      )}
    </section>
  );
}
