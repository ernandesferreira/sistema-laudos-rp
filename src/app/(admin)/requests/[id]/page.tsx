import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import { canActOnCurrentStep, resolveCurrentWorkflowStep } from "@/auth/workflowAccess";
import { requirePagePermission } from "@/auth/guards";
import { requestService } from "@/application/requests/requestService";
import { RequestRowActionsSelect } from "@/components/admin/requests/RequestRowActionsSelect";
import { SubmissionWorkflowRunner } from "@/components/admin/workflow/SubmissionWorkflowRunner";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceRequestDetailsPage({ params }: Props) {
  const authUser = await requirePagePermission("requests.read");
  const canOpenWorkflow = authUser ? hasPermission(authUser, "submissions.details.read") : false;
  const canManageWorkflowByPermission = authUser
    ? hasPermission(authUser, "submissions.workflow.execute") ||
      hasPermission(authUser, "submissions.workflow.rollback")
    : false;

  const { id } = await params;
  const serviceRequest = await requestService.getServiceRequestById(id, authUser ?? undefined);

  if (!serviceRequest) {
    notFound();
  }

  const currentWorkflowStep = resolveCurrentWorkflowStep(
    serviceRequest.submission.workflowSteps,
    serviceRequest.submission.currentStepOrder,
  );
  const canActCurrentStep = canActOnCurrentStep(authUser, currentWorkflowStep);
  const canManageWorkflow = canManageWorkflowByPermission && canOpenWorkflow;
  const isSuperAdmin = authUser ? hasAnyRole(authUser, ["super_admin"]) : false;

  const citizenName = serviceRequest.citizenName;
  const citizenDocument = serviceRequest.citizenDocument;
  const citizenContact = serviceRequest.citizenContact;
  const requesterName = serviceRequest.requesterName;
  const requesterDocument = serviceRequest.requesterDocument;
  const requesterOabNumber = serviceRequest.requesterOabNumber;
  const isFinishedWorkflow =
    serviceRequest.submission.workflowStatus === "FINAL_APPROVED" ||
    serviceRequest.submission.workflowStatus === "FINAL_REJECTED";
  const canDownloadDeclaration =
    isFinishedWorkflow && (authUser ? !hasAnyRole(authUser, ["operador", "medico"]) : false);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Detalhes da solicitacao"
        description={`Modelo: ${serviceRequest.template.title}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/requests" className="btn-secondary">
              Voltar
            </Link>
            {isSuperAdmin ? (
              <RequestRowActionsSelect
                requestId={serviceRequest.id}
                options={[]}
                canInactivate={(serviceRequest as { isActive?: boolean }).isActive !== false && serviceRequest.status !== "CANCELLED"}
                canDelete={true}
                placeholder="Gerenciar"
              />
            ) : null}
            {canOpenWorkflow && canActCurrentStep ? (
              <Link href={`/submissions/${serviceRequest.submissionId}/workflow`} className="btn-primary">
                Aprovar solicitacao
              </Link>
            ) : null}
            {canDownloadDeclaration ? (
              <a href={`/api/requests/${serviceRequest.id}/declaration`} className="btn-secondary">
                Baixar declaracao em PDF
              </a>
            ) : null}
          </div>
        }
      />

      <article className="card p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados do solicitante</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Operador responsavel</p>
                <p className="text-sm text-slate-100">{requesterName}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Passaporte</p>
                <p className="text-sm text-slate-100">{requesterDocument}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">OAB</p>
                <p className="text-sm text-slate-100">{requesterOabNumber ?? "Nao informado"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados do cidadao</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Cidadao</p>
                <p className="text-sm text-slate-100">{citizenName}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Documento</p>
                <p className="text-sm text-slate-100">{citizenDocument}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Contato</p>
                <p className="text-sm text-slate-100">{citizenContact}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Protocolo</p>
            <p className="text-sm text-slate-100">{serviceRequest.protocol}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Status da solicitacao</p>
            <p className="text-sm text-slate-100">{serviceRequest.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Submissao vinculada</p>
            <p className="text-sm text-slate-100">{serviceRequest.submissionId}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Etapa atual</p>
            <p className="text-sm text-slate-100">
              {serviceRequest.currentStepOrder !== null ? `#${serviceRequest.currentStepOrder + 1}` : "Concluida"}
            </p>
          </div>
        </div>

        {serviceRequest.initialNotes ? (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-xs uppercase text-slate-500">Observacoes iniciais</p>
            <p className="mt-1 text-sm text-slate-200">{serviceRequest.initialNotes}</p>
          </div>
        ) : null}
      </article>

      <article className="card p-4 md:p-6">
        <h2 className="text-xl uppercase tracking-wide text-slate-100">Timeline de status da solicitacao</h2>
        <div className="mt-3 space-y-2">
          {serviceRequest.statusHistory.length === 0 ? (
            <p className="text-sm text-slate-400">Sem movimentacoes de status registradas.</p>
          ) : (
            serviceRequest.statusHistory.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-xs uppercase text-slate-500">
                  {entry.fromStatus ? `${entry.fromStatus} -> ${entry.toStatus}` : entry.toStatus}
                </p>
                <p className="text-sm text-slate-200">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(entry.changedAt)}
                </p>
                <p className="text-xs text-slate-400">Origem: {entry.source}</p>
                {entry.changedBy ? (
                  <p className="text-xs text-slate-400">Responsavel: {entry.changedBy.name}</p>
                ) : null}
                {entry.reason ? <p className="mt-1 text-sm text-slate-300">{entry.reason}</p> : null}
              </div>
            ))
          )}
        </div>
      </article>

      <article className="card p-4 md:p-6">
        <h2 className="text-xl uppercase tracking-wide text-slate-100">Timeline das aprovacoes</h2>
        <div className="mt-3 space-y-2">
          {serviceRequest.submission.workflowEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Sem eventos registrados.</p>
          ) : (
            serviceRequest.submission.workflowEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-xs uppercase text-slate-500">{event.action}</p>
                <p className="text-sm text-slate-200">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(event.performedAt)}
                </p>
                {event.performedBy ? (
                  <p className="text-xs text-slate-400">Responsavel: {event.performedBy.name}</p>
                ) : null}
                {event.notes ? <p className="mt-1 text-sm text-slate-300">{event.notes}</p> : null}
              </div>
            ))
          )}
        </div>
      </article>

      {canManageWorkflow ? (
        <SubmissionWorkflowRunner
          submissionId={serviceRequest.submission.id}
          workflowStatus={serviceRequest.submission.workflowStatus}
          currentStepOrder={serviceRequest.submission.currentStepOrder}
          steps={serviceRequest.submission.workflowSteps}
          events={serviceRequest.submission.workflowEvents}
          currentUserRoles={authUser?.roles ?? []}
          currentUserPermissions={authUser?.permissions ?? []}
        />
      ) : null}
    </section>
  );
}
