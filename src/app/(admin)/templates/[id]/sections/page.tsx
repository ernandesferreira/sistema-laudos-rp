import Link from "next/link";
import { notFound } from "next/navigation";
import { laudosService } from "@/application/laudos/service";
import { TemplateSectionsManager } from "@/components/forms/TemplateSectionsManager";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TemplateSectionsPage({ params }: Props) {
  const { id } = await params;
  const template = await laudosService.getTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Gerenciar secoes"
        description="CRUD completo de secoes para o modelo selecionado."
        actions={
          <Link href={`/templates/${template.id}`} className="btn-secondary">
            Voltar ao modelo
          </Link>
        }
      />

      <TemplateSectionsManager
        templateId={template.id}
        sections={template.sections.map((section) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order,
        }))}
      />
    </section>
  );
}
