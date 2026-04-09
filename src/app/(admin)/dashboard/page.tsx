import { laudosService } from "@/application/laudos/service";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";
import { RecentReportsTable } from "@/components/admin/RecentReportsTable";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

function isAfter(date: Date, periodStart: Date) {
  return date >= periodStart;
}

export default async function DashboardPage() {
  let templates: Awaited<ReturnType<typeof laudosService.listTemplates>> = [];
  let submissions: Awaited<ReturnType<typeof laudosService.listSubmissions>> = [];
  let databaseUnavailable = false;

  try {
    [templates, submissions] = await Promise.all([
      laudosService.listTemplates(),
      laudosService.listSubmissions(),
    ]);
  } catch {
    databaseUnavailable = true;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalTemplates = templates.length;
  const publishedTemplates = templates.filter((template) => template.isActive).length;
  const totalSubmissions = submissions.length;
  const submissionsLast7Days = submissions.filter((entry) =>
    isAfter(entry.createdAt, sevenDaysAgo),
  ).length;
  const submissionsLast30Days = submissions.filter((entry) =>
    isAfter(entry.createdAt, thirtyDaysAgo),
  ).length;
  const submissionsCurrentMonth = submissions.filter((entry) =>
    isAfter(entry.createdAt, monthStart),
  ).length;
  const recentSubmissions = submissions.slice(0, 8);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/30 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Dashboard</p>
        <h1 className="mt-1 text-4xl uppercase text-slate-100 md:text-5xl">
          Central administrativa de laudos RP
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Acompanhe operacao do sistema, publicacao de modelos e preenchimentos
          recentes em tempo real.
        </p>
      </header>

      <Disclaimer />

      {databaseUnavailable ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">Banco indisponivel no momento.</p>
          <p className="mt-1 text-amber-200">
            Configure uma DATABASE_URL valida (Neon Postgres) no arquivo .env para carregar os dados reais do painel.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Modelos cadastrados" value={totalTemplates} tone="blue" />
        <StatCard title="Modelos publicados" value={publishedTemplates} tone="green" />
        <StatCard title="Total de submisses" value={totalSubmissions} tone="amber" />
        <StatCard
          title="Submisses no mes"
          value={submissionsCurrentMonth}
          hint="Periodo atual"
          tone="blue"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/20 lg:col-span-1">
          <h2 className="text-2xl uppercase text-slate-100">Submisses por periodo</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <span>Ultimos 7 dias</span>
              <strong className="text-slate-100">{submissionsLast7Days}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <span>Ultimos 30 dias</span>
              <strong className="text-slate-100">{submissionsLast30Days}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <span>Mes atual</span>
              <strong className="text-slate-100">{submissionsCurrentMonth}</strong>
            </div>
          </div>
        </article>

        <div className="lg:col-span-2">
          <DashboardQuickActions />
        </div>
      </div>

      <section className="space-y-2">
        <div>
          <h2 className="text-2xl uppercase text-slate-100">Ultimos laudos preenchidos</h2>
          <p className="text-sm text-slate-400">
            Lista dos registros mais recentes enviados no formulario publico.
          </p>
        </div>
        <RecentReportsTable items={recentSubmissions} />
      </section>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
          <p className="text-lg font-semibold text-slate-100">Nenhum modelo encontrado</p>
          <p className="mt-1 text-sm text-slate-400">
            Crie o primeiro modelo de laudo para habilitar o fluxo de submisses.
          </p>
        </div>
      ) : null}

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
          <p className="text-lg font-semibold text-slate-100">Sem submisses ate o momento</p>
          <p className="mt-1 text-sm text-slate-400">
            Compartilhe o link publico de um modelo para comecar a receber laudos.
          </p>
        </div>
      ) : null}
    </section>
  );
}
