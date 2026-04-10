type WorkflowEvent = {
  id: string;
  action: string;
  decision: string | null;
  notes: string | null;
  performedAt: Date;
  performedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type SubmissionWorkflowHistoryProps = {
  events: WorkflowEvent[];
};

function actionLabel(action: string) {
  if (action === "WORKFLOW_STARTED") {
    return "Aprovacoes iniciadas";
  }

  if (action === "STEP_PENDING") {
    return "Etapa marcada como pendente";
  }

  if (action === "STEP_COMPLETED") {
    return "Etapa concluida";
  }

  if (action === "STEP_ADVANCED") {
    return "Fluxo avancou para proxima etapa";
  }

  if (action === "WORKFLOW_APPROVED") {
    return "Aprovacoes aprovadas";
  }

  if (action === "WORKFLOW_REJECTED") {
    return "Aprovacoes reprovadas";
  }

  if (action === "WORKFLOW_ROLLBACK") {
    return "Aprovacoes retornaram para etapa anterior";
  }

  return action;
}

export function SubmissionWorkflowHistory({ events }: SubmissionWorkflowHistoryProps) {
  return (
    <article className="card p-4">
      <h2 className="text-2xl uppercase text-slate-100">Historico de tramitacao</h2>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhum evento registrado.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-slate-700 bg-slate-900/55 p-3">
              <p className="text-sm font-semibold text-slate-100">{actionLabel(event.action)}</p>
              <p className="text-xs text-slate-400">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(event.performedAt))}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Por: {event.performedBy?.name ?? "Sistema"}
              </p>
              {event.decision ? <p className="mt-1 text-xs text-slate-300">Decisao: {event.decision}</p> : null}
              {event.notes ? <p className="mt-1 text-xs text-slate-300">Obs: {event.notes}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
