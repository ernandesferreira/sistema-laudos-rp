import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { workflowService } from "@/application/laudos/workflowService";
import { SubmissionWorkflowRunner } from "@/components/admin/workflow/SubmissionWorkflowRunner";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SubmissionWorkflowPage({ params }: Props) {
  await requirePagePermission("submissions.details.read");

  const user = await getCurrentAuthUser();
  const { id } = await params;
  const workflow = await workflowService.getSubmissionWorkflowBySubmissionId(id);

  if (!workflow) {
    notFound();
  }

  if (workflow.workflowSteps.length === 0) {
    return (
      <section className="space-y-4">
        <PageHeader
          title="Aprovacoes da submissao"
          description="Esta solicitacao nao possui aprovacoes configuradas no modelo associado."
          actions={
            <Link href={`/submissions/${workflow.id}`} className="btn-secondary">
              Voltar aos detalhes
            </Link>
          }
        />

        <EmptyState
          title="Aprovacoes indisponiveis"
          description="Configure aprovacoes no modelo para habilitar etapas operacionais nesta solicitacao."
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Aprovacoes da submissao"
        description={`Modelo: ${workflow.template.title}`}
        actions={
          <Link href={`/submissions/${workflow.id}`} className="btn-secondary">
            Voltar aos detalhes
          </Link>
        }
      />

      <SubmissionWorkflowRunner
        submissionId={workflow.id}
        workflowStatus={workflow.workflowStatus}
        currentStepOrder={workflow.currentStepOrder}
        steps={workflow.workflowSteps}
        events={workflow.workflowEvents}
        currentUserRoles={user?.roles ?? []}
        currentUserPermissions={user?.permissions ?? []}
      />
    </section>
  );
}
