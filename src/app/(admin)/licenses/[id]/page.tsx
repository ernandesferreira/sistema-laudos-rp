import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission } from "@/auth/authorization";
import { requirePagePermission } from "@/auth/guards";
import { getCurrentAuthUser } from "@/auth/session";
import { licenseService } from "@/application/licenses/licenseService";
import { RevokeLicenseModal } from "@/components/admin/licenses/RevokeLicenseModal";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function licenseStatusLabel(status: string) {
  if (status === "revogada_definitivamente") {
    return "Revogada definitivamente";
  }

  if (status === "revogada_temporariamente") {
    return "Revogada temporariamente";
  }

  if (status === "expirada") {
    return "Expirada";
  }

  return "Ativa";
}

export default async function ReleasedLicenseDetailsPage({ params }: Props) {
  await requirePagePermission("licenses.view");
  const authUser = await getCurrentAuthUser();

  const { id } = await params;
  const releasedLicense = await licenseService.getReleasedLicenseById(id);

  if (!releasedLicense) {
    notFound();
  }

  const displayStatus =
    releasedLicense.licenseStatus === "ACTIVE"
      ? "ativa"
      : releasedLicense.revocationType === "PERMANENT"
        ? "revogada_definitivamente"
        : releasedLicense.revocationEndsAt && releasedLicense.revocationEndsAt <= new Date()
          ? "expirada"
          : "revogada_temporariamente";
  const canRevoke = authUser ? hasPermission(authUser, "licenses.revoke") : false;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Detalhes da Licenca Liberada"
        description={`Licenca ${releasedLicense.licenseNumber} vinculada ao protocolo ${releasedLicense.protocol}.`}
        actions={
          <div className="flex items-center gap-2">
            <RevokeLicenseModal
              licenseId={releasedLicense.id}
              canRevoke={canRevoke}
              status={displayStatus}
            />
            <Link href="/licenses" className="btn-secondary">
              Voltar para licencas
            </Link>
            <Link href={`/requests/${releasedLicense.serviceRequestId}`} className="btn-primary">
              Ver solicitacao
            </Link>
          </div>
        }
      />

      <article className="card p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados da licenca</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Numero da licenca</p>
                <p className="text-sm text-slate-100">{releasedLicense.licenseNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Status da licenca</p>
                <p className="text-sm text-slate-100">{licenseStatusLabel(displayStatus)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Liberada em</p>
                <p className="text-sm text-slate-100">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  }).format(releasedLicense.releasedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados do cidadao</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Nome</p>
                <p className="text-sm text-slate-100">{releasedLicense.citizenName}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Documento</p>
                <p className="text-sm text-slate-100">{releasedLicense.citizenDocument}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados da solicitacao</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Protocolo</p>
                <p className="text-sm text-slate-100">{releasedLicense.protocol}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Modelo</p>
                <p className="text-sm text-slate-100">{releasedLicense.templateTitle}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Operador de abertura</p>
                <p className="text-sm text-slate-100">{releasedLicense.serviceRequest.createdBy.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Numero da OAB do solicitante</p>
                <p className="text-sm text-slate-100">
                  {releasedLicense.serviceRequest.requesterOabNumber ?? "Nao informado"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Conclusao do workflow</p>
                <p className="text-sm text-slate-100">
                  {releasedLicense.serviceRequest.submission.workflowCompletedAt
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(releasedLicense.serviceRequest.submission.workflowCompletedAt)
                    : "Nao registrado"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Dados de revogacao</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Revogada em</p>
                <p className="text-sm text-slate-100">
                  {releasedLicense.revokedAt
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(releasedLicense.revokedAt)
                    : "Nao revogada"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Revogada por</p>
                <p className="text-sm text-slate-100">{releasedLicense.revokedBy?.name ?? "Nao aplicavel"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Prazo de revogacao</p>
                <p className="text-sm text-slate-100">
                  {releasedLicense.revocationType === "PERMANENT"
                    ? "Definitivo"
                    : releasedLicense.revocationType && releasedLicense.revocationValue
                      ? `${releasedLicense.revocationValue} ${releasedLicense.revocationType.toLowerCase()}`
                      : "Nao aplicavel"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Revogacao expira em</p>
                <p className="text-sm text-slate-100">
                  {releasedLicense.revocationEndsAt
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(releasedLicense.revocationEndsAt)
                    : releasedLicense.revocationType === "PERMANENT"
                      ? "Sem expiracao"
                      : "Nao aplicavel"}
                </p>
              </div>
            </div>

            {releasedLicense.revocationReason ? (
              <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs uppercase text-slate-500">Motivo da revogacao</p>
                <p className="mt-1 text-sm text-slate-200">{releasedLicense.revocationReason}</p>
              </div>
            ) : null}
          </div>
        </div>
      </article>

      <article className="card p-4 md:p-6">
        <h2 className="text-xl uppercase tracking-wide text-slate-100">Historico de bloqueios do documento</h2>
        <div className="mt-3 space-y-2">
          {releasedLicense.restrictions.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum bloqueio registrado para esta licenca.</p>
          ) : (
            releasedLicense.restrictions.map((restriction) => (
              <div key={restriction.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <p className="text-xs uppercase text-slate-500">
                  {restriction.isPermanent
                    ? "Bloqueio definitivo"
                    : `Bloqueio temporario (${restriction.restrictionType.toLowerCase()})`}
                </p>
                <p className="text-sm text-slate-200">
                  Inicio: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(restriction.startsAt)}
                </p>
                <p className="text-sm text-slate-200">
                  Fim: {restriction.endsAt
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(restriction.endsAt)
                    : "Sem expiracao"}
                </p>
                <p className="text-xs text-slate-400">Registrado por: {restriction.createdBy?.name ?? "Sistema"}</p>
                {restriction.reason ? <p className="mt-1 text-sm text-slate-300">{restriction.reason}</p> : null}
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
