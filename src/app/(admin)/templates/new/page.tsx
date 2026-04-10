import { requirePagePermission } from "@/auth/guards";
import { TemplateCreateForm } from "@/components/forms/TemplateCreateForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function NewTemplatePage() {
  await requirePagePermission("templates.create");

  return (
    <section className="space-y-4">
      <PageHeader
        title="Novo modelo"
        description="Defina metadados iniciais. Em seguida configure secoes e campos."
      />
      <TemplateCreateForm />
    </section>
  );
}
