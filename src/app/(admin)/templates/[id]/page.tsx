import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import { TemplateEditor } from "@/components/forms/TemplateEditor";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TemplateDetailsPage({ params }: Props) {
  await requirePagePermission("templates.update");

  const { id } = await params;
  const template = await laudosService.getTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Editor de modelo"
        description="CRUD completo de modelo, secoes e campos dinamicos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/templates/${template.id}/workflow`} className="btn-secondary">
              Configurar aprovacoes
            </Link>
            <Link href={`/templates/${template.id}/builder`} className="btn-secondary">
              Abrir Form Builder
            </Link>
            <Link href={`/templates/${template.id}/sections`} className="btn-secondary">
              Gerenciar secoes
            </Link>
            <Link href={`/laudos/${template.slug}`} className="btn-secondary">
              Abrir formulario publico
            </Link>
          </div>
        }
      />
      <TemplateEditor template={template} />
    </section>
  );
}
