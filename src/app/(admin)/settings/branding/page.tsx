import { requirePageSuperAdmin } from "@/auth/guards";
import { BrandingSettingsPanel } from "@/components/admin/BrandingSettingsPanel";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  await requirePageSuperAdmin();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Branding"
        description="Personalize nome e logo do sistema para exibicao no painel."
      />

      <BrandingSettingsPanel />
    </section>
  );
}
