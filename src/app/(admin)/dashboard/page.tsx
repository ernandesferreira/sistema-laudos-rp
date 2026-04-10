import Link from "next/link";
import { hasAnyRole, hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { laudosService } from "@/application/laudos/service";
import { requestService } from "@/application/requests/requestService";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";
import { RecentReportsTable } from "@/components/admin/RecentReportsTable";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

function isAfter(date: Date, periodStart: Date) {
  return date >= periodStart;
}

function requestStatusLabel(status: string) {
  if (status === "IN_PROGRESS") {
    return "Em andamento";
  }

  if (status === "FINAL_APPROVED") {
    return "Aprovada";
  }

  if (status === "FINAL_REJECTED") {
    return "Rejeitada";
  }

  if (status === "PENDING") {
    return "Pendente";
  }

  if (status === "CANCELLED") {
    return "Cancelada";
  }

  return "Aberta";
}

export default async function DashboardPage() {
  await requirePagePermission("dashboard.read");

  const authUser = await getCurrentAuthUser();
  const isOperatorProfile = authUser
    ? hasAnyRole(authUser, ["operador"]) && !hasAnyRole(authUser, ["super_admin", "admin"])
    : false;
  const isMedicoProfile = authUser
    ? hasAnyRole(authUser, ["medico"]) && !hasAnyRole(authUser, ["super_admin", "admin"])
    : false;
  const isPeritoProfile = authUser
    ? hasAnyRole(authUser, ["perito_rp"]) && !hasAnyRole(authUser, ["super_admin", "admin"])
    : false;

  if (isPeritoProfile && authUser) {
    let peritoSummary: Awaited<ReturnType<typeof requestService.getPeritoDashboardSummary>> | null = null;
    let databaseUnavailable = false;

    try {
      peritoSummary = await requestService.getPeritoDashboardSummary();
    } catch {
      databaseUnavailable = true;
    }

    const canReadRequestDetails = hasPermission(authUser, "requests.details.read");
    const canOpenSubmissionWorkflow = hasPermission(authUser, "submissions.details.read");

    return (
      <section className="space-y-4">
        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/30 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Dashboard do perito</p>
          <h1 className="mt-1 text-4xl uppercase text-slate-100 md:text-5xl">Solicitacoes do fluxo pericial</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Painel das solicitacoes abertas que ainda devem passar por validacao do perfil perito.
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Solicitacoes do fluxo pericial" value={peritoSummary?.totalRequests ?? 0} tone="blue" />
          <StatCard title="Ultimos 7 dias" value={peritoSummary?.requestsLast7Days ?? 0} tone="amber" />
          <StatCard title="Na etapa atual do perito" value={peritoSummary?.currentRoleStepCount ?? 0} tone="green" />
          <StatCard
            title="Em andamento"
            value={(peritoSummary?.countsByStatus.IN_PROGRESS ?? 0) + (peritoSummary?.countsByStatus.PENDING ?? 0)}
            tone="green"
          />
          <StatCard
            title="Concluidas"
            value={(peritoSummary?.countsByStatus.FINAL_APPROVED ?? 0) + (peritoSummary?.countsByStatus.FINAL_REJECTED ?? 0)}
            tone="blue"
          />
        </div>

        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h2 className="text-2xl uppercase text-slate-100">Atalhos periciais</h2>
          <p className="mt-1 text-sm text-slate-400">Acesse rapidamente as solicitacoes pendentes no seu fluxo.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/requests" className="btn-secondary">
              Ver solicitacoes
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <div>
            <h2 className="text-2xl uppercase text-slate-100">Solicitacoes abertas que passam por perito</h2>
            <p className="text-sm text-slate-400">Lista das solicitacoes ativas com etapas pendentes para esse perfil.</p>
          </div>

          {!peritoSummary || peritoSummary.recentRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
              <p className="text-lg font-semibold text-slate-100">Nenhuma solicitacao pendente</p>
              <p className="mt-1 text-sm text-slate-400">No momento nao ha solicitacoes abertas para avaliacao pericial.</p>
            </div>
          ) : (
            <article className="card overflow-hidden">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Protocolo</th>
                    <th className="px-3 py-2">Cidadao</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2">Prioridade</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {peritoSummary.recentRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-800/70">
                      <td className="px-3 py-2 font-semibold text-slate-100">{request.protocol}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.fullName}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.documentNumber}</td>
                      <td className="px-3 py-2 text-slate-300">{request.template.title}</td>
                      <td className="px-3 py-2">
                        {request.isCurrentRoleStep ? (
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                            Etapa atual
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                            Fluxo futuro
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{requestStatusLabel(request.status)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(request.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {canReadRequestDetails ? (
                            <Link href={`/requests/${request.id}`} className="btn-secondary text-xs">
                              Detalhes
                            </Link>
                          ) : null}

                          {request.isCurrentRoleStep && canOpenSubmissionWorkflow ? (
                            <Link href={`/submissions/${request.submissionId}/workflow`} className="btn-primary text-xs">
                              Abrir aprovacoes
                            </Link>
                          ) : null}

                          {!canReadRequestDetails && (!request.isCurrentRoleStep || !canOpenSubmissionWorkflow) ? (
                            <span className="text-xs text-slate-500">Sem acesso</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </section>
      </section>
    );
  }

  if (isMedicoProfile && authUser) {
    let medicoSummary: Awaited<ReturnType<typeof requestService.getMedicoDashboardSummary>> | null = null;
    let databaseUnavailable = false;

    try {
      medicoSummary = await requestService.getMedicoDashboardSummary();
    } catch {
      databaseUnavailable = true;
    }

    const canReadRequestDetails = hasPermission(authUser, "requests.details.read");
    const canOpenSubmissionWorkflow = hasPermission(authUser, "submissions.details.read");

    return (
      <section className="space-y-4">
        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/30 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Dashboard medico</p>
          <h1 className="mt-1 text-4xl uppercase text-slate-100 md:text-5xl">Solicitacoes do fluxo medico</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Painel das solicitacoes abertas que ainda devem passar por validacao do perfil medico.
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Solicitacoes do fluxo medico" value={medicoSummary?.totalRequests ?? 0} tone="blue" />
          <StatCard title="Ultimos 7 dias" value={medicoSummary?.requestsLast7Days ?? 0} tone="amber" />
          <StatCard title="Na etapa atual do medico" value={medicoSummary?.currentRoleStepCount ?? 0} tone="green" />
          <StatCard
            title="Em andamento"
            value={(medicoSummary?.countsByStatus.IN_PROGRESS ?? 0) + (medicoSummary?.countsByStatus.PENDING ?? 0)}
            tone="green"
          />
          <StatCard
            title="Concluidas"
            value={(medicoSummary?.countsByStatus.FINAL_APPROVED ?? 0) + (medicoSummary?.countsByStatus.FINAL_REJECTED ?? 0)}
            tone="blue"
          />
        </div>

        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h2 className="text-2xl uppercase text-slate-100">Atalhos medicos</h2>
          <p className="mt-1 text-sm text-slate-400">Acesse rapidamente as solicitacoes pendentes no seu fluxo.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/requests" className="btn-secondary">
              Ver solicitacoes
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <div>
            <h2 className="text-2xl uppercase text-slate-100">Solicitacoes abertas que passam por medico</h2>
            <p className="text-sm text-slate-400">Lista das solicitacoes ativas com etapas pendentes para esse perfil.</p>
          </div>

          {!medicoSummary || medicoSummary.recentRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
              <p className="text-lg font-semibold text-slate-100">Nenhuma solicitacao pendente</p>
              <p className="mt-1 text-sm text-slate-400">No momento nao ha solicitacoes abertas para avaliacao medica.</p>
            </div>
          ) : (
            <article className="card overflow-hidden">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Protocolo</th>
                    <th className="px-3 py-2">Cidadao</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2">Prioridade</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {medicoSummary.recentRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-800/70">
                      <td className="px-3 py-2 font-semibold text-slate-100">{request.protocol}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.fullName}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.documentNumber}</td>
                      <td className="px-3 py-2 text-slate-300">{request.template.title}</td>
                      <td className="px-3 py-2">
                        {request.isCurrentRoleStep ? (
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                            Etapa atual
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                            Fluxo futuro
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{requestStatusLabel(request.status)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(request.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {canReadRequestDetails ? (
                            <Link href={`/requests/${request.id}`} className="btn-secondary text-xs">
                              Detalhes
                            </Link>
                          ) : null}

                          {request.isCurrentRoleStep && canOpenSubmissionWorkflow ? (
                            <Link href={`/submissions/${request.submissionId}/workflow`} className="btn-primary text-xs">
                              Abrir aprovacoes
                            </Link>
                          ) : null}

                          {!canReadRequestDetails && (!request.isCurrentRoleStep || !canOpenSubmissionWorkflow) ? (
                            <span className="text-xs text-slate-500">Sem acesso</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </section>
      </section>
    );
  }

  if (isOperatorProfile && authUser) {
    let operatorSummary: Awaited<ReturnType<typeof requestService.getOperatorDashboardSummary>> | null = null;
    let databaseUnavailable = false;

    try {
      operatorSummary = await requestService.getOperatorDashboardSummary(authUser.id);
    } catch {
      databaseUnavailable = true;
    }

    const canCreateRequest = hasPermission(authUser, "requests.create");
    const canReadRequestDetails = hasPermission(authUser, "requests.details.read");

    return (
      <section className="space-y-4">
        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/30 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Dashboard do operador</p>
          <h1 className="mt-1 text-4xl uppercase text-slate-100 md:text-5xl">Minhas solicitacoes</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Visao operacional focada nas solicitacoes abertas por voce e no acompanhamento do andamento.
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
          <StatCard title="Minhas solicitacoes" value={operatorSummary?.totalRequests ?? 0} tone="blue" />
          <StatCard title="Ultimos 7 dias" value={operatorSummary?.requestsLast7Days ?? 0} tone="amber" />
          <StatCard
            title="Em andamento"
            value={(operatorSummary?.countsByStatus.IN_PROGRESS ?? 0) + (operatorSummary?.countsByStatus.PENDING ?? 0)}
            tone="green"
          />
          <StatCard
            title="Concluidas"
            value={(operatorSummary?.countsByStatus.FINAL_APPROVED ?? 0) + (operatorSummary?.countsByStatus.FINAL_REJECTED ?? 0)}
            tone="blue"
          />
        </div>

        <section className="glass-panel rounded-2xl p-4 md:p-5">
          <h2 className="text-2xl uppercase text-slate-100">Atalhos operacionais</h2>
          <p className="mt-1 text-sm text-slate-400">Acesse rapidamente o que faz parte da sua rotina de solicitacoes.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/requests" className="btn-secondary">
              Ver minhas solicitacoes
            </Link>
            {canCreateRequest ? (
              <Link href="/requests/new" className="btn-primary">
                Abrir nova solicitacao
              </Link>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <div>
            <h2 className="text-2xl uppercase text-slate-100">Ultimas solicitacoes abertas por voce</h2>
            <p className="text-sm text-slate-400">Historico recente para acompanhamento rapido.</p>
          </div>

          {!operatorSummary || operatorSummary.recentRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
              <p className="text-lg font-semibold text-slate-100">Nenhuma solicitacao encontrada</p>
              <p className="mt-1 text-sm text-slate-400">Abra uma nova solicitacao para iniciar seu fluxo operacional.</p>
            </div>
          ) : (
            <article className="card overflow-hidden">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Protocolo</th>
                    <th className="px-3 py-2">Cidadao</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorSummary.recentRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-800/70">
                      <td className="px-3 py-2 font-semibold text-slate-100">{request.protocol}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.fullName}</td>
                      <td className="px-3 py-2 text-slate-300">{request.citizen.documentNumber}</td>
                      <td className="px-3 py-2 text-slate-300">{request.template.title}</td>
                      <td className="px-3 py-2 text-slate-200">{requestStatusLabel(request.status)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(request.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        {canReadRequestDetails ? (
                          <Link href={`/requests/${request.id}`} className="btn-secondary text-xs">
                            Detalhes
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">Sem acesso</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </section>
      </section>
    );
  }

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
          Central administrativa de solicitacoes RP
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
          <h2 className="text-2xl uppercase text-slate-100">Ultimas solicitacoes preenchidas</h2>
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
            Crie o primeiro modelo de solicitacao para habilitar o fluxo de submisses.
          </p>
        </div>
      ) : null}

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
          <p className="text-lg font-semibold text-slate-100">Sem submisses ate o momento</p>
          <p className="mt-1 text-sm text-slate-400">
            Compartilhe o link publico de um modelo para comecar a receber solicitacoes.
          </p>
        </div>
      ) : null}
    </section>
  );
}
