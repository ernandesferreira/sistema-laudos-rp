import Link from "next/link";
import { notFound } from "next/navigation";
import { laudosService } from "@/application/laudos/service";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TemplateBuilderPage({ params }: Props) {
  const { id } = await params;
  const template = await laudosService.getTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Form Builder"
        description="Monte o formulario com secoes e campos dinamicos para o laudo RP."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/templates/${template.id}/sections`} className="btn-secondary">
              Gerenciar secoes
            </Link>
            <Link href={`/templates/${template.id}`} className="btn-secondary">
              Voltar ao modelo
            </Link>
          </div>
        }
      />

      <FormBuilder template={template} />
    </section>
  );
}
