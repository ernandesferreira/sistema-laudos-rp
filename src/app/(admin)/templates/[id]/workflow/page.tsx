import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import { workflowService } from "@/application/laudos/workflowService";
import { TemplateWorkflowEditor } from "@/components/admin/workflow/TemplateWorkflowEditor";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TemplateWorkflowPage({ params }: Props) {
  await requirePagePermission("workflows.manage");

  const { id } = await params;

  const [template, workflow] = await Promise.all([
    laudosService.getTemplateById(id),
    workflowService.getTemplateWorkflowByTemplateId(id),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Aprovacoes do modelo"
        description={`Configure as aprovacoes do modelo ${template.title}.`}
        actions={
          <Link href={`/templates/${template.id}`} className="btn-secondary">
            Voltar ao modelo
          </Link>
        }
      />

      <TemplateWorkflowEditor
        templateId={template.id}
        templateTitle={template.title}
        initialWorkflow={
          workflow
            ? {
                name: workflow.name,
                description: workflow.description,
                isActive: workflow.isActive,
                steps: workflow.steps,
              }
            : null
        }
      />
    </section>
  );
}
