import { notFound } from "next/navigation";
import { laudosService } from "@/application/laudos/service";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function stringifyValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return JSON.stringify(value);
}

export default async function SubmissionDetailsPage({ params }: Props) {
  const { id } = await params;
  const submission = await laudosService.getSubmissionById(id);

  if (!submission) {
    notFound();
  }

  const answers = Object.entries((submission.answers ?? {}) as Record<string, unknown>);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Detalhes da submissao"
        description={`Modelo: ${submission.template.title}`}
      />

      <article className="card p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Responsavel</p>
            <p className="text-sm text-slate-700">{submission.submittedByName ?? "Nao informado"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Contato</p>
            <p className="text-sm text-slate-700">{submission.submittedByContact ?? "Nao informado"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Data</p>
            <p className="text-sm text-slate-700">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(submission.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p className="text-sm text-slate-700">{submission.status}</p>
          </div>
        </div>
      </article>

      <article className="card p-4 md:p-6">
        <h2 className="text-2xl uppercase">Respostas</h2>
        <div className="mt-3 grid gap-2">
          {answers.map(([key, value]) => (
            <div key={key} className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
              <p className="text-sm text-slate-800">{stringifyValue(value)}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
