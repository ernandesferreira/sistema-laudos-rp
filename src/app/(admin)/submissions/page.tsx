import Link from "next/link";
import { laudosService } from "@/application/laudos/service";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const submissions = await laudosService.listSubmissions();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Submisses"
        description="Historico de laudos preenchidos por terceiros."
      />

      {submissions.length === 0 ? (
        <EmptyState
          title="Nenhuma submissao"
          description="As respostas publicas aparecerao aqui quando enviadas."
        />
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="card flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center"
            >
              <div>
                <p className="text-xs font-semibold uppercase text-brand-700">
                  {submission.template.title}
                </p>
                <p className="text-sm text-slate-600">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(submission.createdAt)}
                </p>
                <p className="text-sm text-slate-600">
                  Responsavel: {submission.submittedByName ?? "Nao informado"}
                </p>
              </div>

              <Link href={`/submissions/${submission.id}`} className="btn-secondary">
                Ver detalhes
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
