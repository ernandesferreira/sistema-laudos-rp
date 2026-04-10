import Link from "next/link";
import { hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { laudosService } from "@/application/laudos/service";
import { listTemplatesQuerySchema } from "@/application/laudos/schemas";
import { TemplateFilters } from "@/components/forms/TemplateFilters";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    active?: string;
  }>;
};

function mapStatusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  if (status === "PUBLISHED") {
    return "Publicado";
  }

  if (status === "ARCHIVED") {
    return "Arquivado";
  }

  return "Draft";
}

export default async function TemplatesPage({ searchParams }: Props) {
  await requirePagePermission("templates.read");

  const authUser = await getCurrentAuthUser();
  const canCreateTemplate = authUser ? hasPermission(authUser, "templates.create") : false;
  const canUpdateTemplate = authUser ? hasPermission(authUser, "templates.update") : false;

  const rawFilters = await searchParams;
  const parsed = listTemplatesQuerySchema.safeParse(rawFilters);
  const filters = parsed.success ? parsed.data : {};
  const templates = await laudosService.listTemplates(filters);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Modelos de solicitacao"
        description="Crie e organize modelos com secoes e campos dinamicos."
        actions={
          canCreateTemplate ? (
            <Link href="/templates/new" className="btn-primary">
              Novo modelo
            </Link>
          ) : null
        }
      />

      <TemplateFilters />

      {templates.length === 0 ? (
        <EmptyState
          title="Nenhum modelo cadastrado"
          description="Nenhum resultado para os filtros atuais. Ajuste a busca ou crie um novo modelo."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl uppercase text-slate-100">{template.title}</h2>
                  <p className="text-xs text-slate-400">/{template.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      template.isActive
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-rose-500/20 text-rose-200"
                    }`}
                  >
                    {template.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <span className="rounded-full bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-200">
                    {mapStatusLabel(template.status)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm text-slate-300">{template.description ?? "Sem descricao"}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1">
                  Versao: {template.version}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1">
                  Secoes: {template._count.sections}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1">
                  Submisses: {template._count.submissions}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <p>
                  Criado em:{" "}
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                    template.createdAt,
                  )}
                </p>
                <p>
                  Atualizado em:{" "}
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                    template.updatedAt,
                  )}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canUpdateTemplate ? (
                  <Link href={`/templates/${template.id}`} className="btn-secondary">
                    Editar
                  </Link>
                ) : null}
                <Link href={`/laudos/${template.slug}`} className="btn-secondary">
                  Formulario de solicitacao
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
