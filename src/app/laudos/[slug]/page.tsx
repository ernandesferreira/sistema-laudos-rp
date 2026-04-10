import { notFound } from "next/navigation";
import { laudosService } from "@/application/laudos/service";
import { PublicReportForm } from "@/components/forms/PublicReportForm";
import { Disclaimer } from "@/components/shared/Disclaimer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicTemplatePage({ params }: Props) {
  const { slug } = await params;
  const template = await laudosService.getTemplateBySlug(slug);

  if (!template || !template.isActive) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 md:px-8">
      <header className="card p-4 md:p-6">
        <p className="text-xs font-semibold uppercase text-brand-700">Formulario publico RP</p>
        <h1 className="text-4xl uppercase">{template.title}</h1>
        {template.description ? <p className="mt-2 text-sm text-slate-600">{template.description}</p> : null}
        <p className="mt-2 text-xs text-slate-500">Sistema ficticio para uso em roleplay.</p>
      </header>

      <Disclaimer />

      <PublicReportForm template={template} />
    </main>
  );
}
