import { TemplateCreateForm } from "@/components/forms/TemplateCreateForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewTemplatePage() {
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
