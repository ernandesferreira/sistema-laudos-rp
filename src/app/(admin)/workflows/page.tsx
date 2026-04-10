import Link from "next/link";
import { requirePagePermission } from "@/auth/guards";
import { workflowService } from "@/application/laudos/workflowService";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  await requirePagePermission("workflows.read");

  const workflows = await workflowService.listTemplateWorkflows();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Aprovacoes"
        description="Matriz de aprovacoes por modelo de solicitacao com etapas configuraveis."
      />

      {workflows.length === 0 ? (
        <EmptyState
          title="Nenhuma aprovacao configurada"
          description="Abra um modelo para configurar as etapas e regras de progressao."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <article key={workflow.id} className="card space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl uppercase text-slate-100">{workflow.name}</h2>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    workflow.isActive
                      ? "border border-emerald-500/35 bg-emerald-500/20 text-emerald-200"
                      : "border border-slate-600 bg-slate-700/40 text-slate-200"
                  }`}
                >
                  {workflow.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-sm text-slate-300">Template: {workflow.template.title}</p>
              <p className="text-sm text-slate-400">Slug publico: /laudos/{workflow.template.slug}</p>
              <p className="text-sm text-slate-400">Etapas: {workflow._count.steps}</p>

              <div className="flex flex-wrap gap-2">
                <Link href={`/templates/${workflow.template.id}/workflow`} className="btn-primary">
                  Configurar etapas
                </Link>
                <Link href={`/templates/${workflow.template.id}`} className="btn-secondary">
                  Abrir modelo
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
