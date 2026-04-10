"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmissionWorkflowHistory } from "@/components/admin/workflow/SubmissionWorkflowHistory";
import type { Permission } from "@/auth/permissions";

type WorkflowStep = {
  id: string;
  order: number;
  name: string;
  description: string | null;
  areaKey: string;
  authorizedRoleKeys: unknown;
  requiredPermissions: unknown;
  instructions: string | null;
  paymentRequiredCents: number | null;
  decisionRequired: boolean;
  requiresObservation: boolean;
  isRequired: boolean;
  isFinalStage: boolean;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  decision: string | null;
  observations: string | null;
  startedAt: Date | null;
  executedAt: Date | null;
  executedById: string | null;
};

type WorkflowEvent = {
  id: string;
  action: string;
  decision: string | null;
  notes: string | null;
  performedAt: Date;
  performedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type SubmissionWorkflowRunnerProps = {
  submissionId: string;
  workflowStatus: string;
  currentStepOrder: number | null;
  steps: WorkflowStep[];
  events: WorkflowEvent[];
  currentUserRoles: string[];
  currentUserPermissions: Permission[];
};

function parseRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function canUserExecuteStep(step: WorkflowStep, userRoles: string[]) {
  if (userRoles.includes("super_admin")) {
    return true;
  }

  const allowed = parseRoles(step.authorizedRoleKeys);
  return allowed.some((role) => userRoles.includes(role));
}

function isBlockedByOperatorStepRule(step: WorkflowStep, userRoles: string[]) {
  return userRoles.includes("operador") && !userRoles.includes("super_admin") && step.order !== 0;
}

function workflowStatusBadge(status: string) {
  if (status === "FINAL_APPROVED") {
    return "border border-emerald-500/35 bg-emerald-500/20 text-emerald-200";
  }

  if (status === "FINAL_REJECTED") {
    return "border border-rose-500/35 bg-rose-500/20 text-rose-200";
  }

  if (status === "PENDING") {
    return "border border-amber-500/35 bg-amber-500/20 text-amber-200";
  }

  return "border border-sky-500/35 bg-sky-500/20 text-sky-200";
}

export function SubmissionWorkflowRunner({
  submissionId,
  workflowStatus,
  currentStepOrder,
  steps,
  events,
  currentUserRoles,
  currentUserPermissions,
}: SubmissionWorkflowRunnerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [decision, setDecision] = useState("APTO");
  const [observations, setObservations] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackTargetStepId, setRollbackTargetStepId] = useState<string>("");
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentStep = useMemo(
    () => steps.find((step) => step.status === "IN_PROGRESS") ?? null,
    [steps],
  );

  const editableStep = selectedStepId
    ? steps.find((step) => step.id === selectedStepId) ?? currentStep
    : currentStep;

  const decisionOptions = editableStep?.isFinalStage
    ? ["APROVADO", "REPROVADO", "PENDENTE"]
    : ["APTO", "NAO_APTO", "PENDENTE"];
  const activeDecision = decisionOptions.includes(decision) ? decision : decisionOptions[0];

  const rollbackOptions = useMemo(() => {
    if (!currentStep) {
      return [] as WorkflowStep[];
    }

    return steps
      .filter((step) => step.order < currentStep.order)
      .sort((a, b) => b.order - a.order);
  }, [currentStep, steps]);

  const rollbackTargetStep = useMemo(() => {
    if (rollbackTargetStepId.length > 0) {
      return rollbackOptions.find((step) => step.id === rollbackTargetStepId) ?? null;
    }

    return rollbackOptions[0] ?? null;
  }, [rollbackOptions, rollbackTargetStepId]);

  const rollbackImpactedSteps = useMemo(() => {
    if (!rollbackTargetStep) {
      return [] as WorkflowStep[];
    }

    return steps
      .filter((step) => step.order >= rollbackTargetStep.order)
      .sort((a, b) => a.order - b.order);
  }, [rollbackTargetStep, steps]);

  const canExecuteWorkflow = currentUserPermissions.includes("submissions.workflow.execute");
  const canRollbackWorkflow = currentUserPermissions.includes("submissions.workflow.rollback");
  const canExecuteSelectedStep = editableStep
    ? canUserExecuteStep(editableStep, currentUserRoles)
    : false;
  const blockedByOperatorRule = editableStep
    ? isBlockedByOperatorStepRule(editableStep, currentUserRoles)
    : false;

  function executeStep(nextDecision?: string) {
    if (!editableStep) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!canUserExecuteStep(editableStep, currentUserRoles)) {
      setError("Seu perfil nao esta autorizado para executar esta etapa.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/submissions/${submissionId}/workflow/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stepId: editableStep.id,
          decision: nextDecision ?? activeDecision,
          observations: observations.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao executar etapa.");
        return;
      }

      setMessage("Etapa executada com sucesso.");
      router.refresh();
    });
  }

  function rollbackStep() {
    if (!rollbackTargetStep) {
      setError("Nao existe etapa anterior para retorno.");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/submissions/${submissionId}/workflow/rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetStepId: rollbackTargetStep.id,
          reason: rollbackReason.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao retornar etapa.");
        return;
      }

      setMessage("Aprovacoes retornadas para etapa anterior com sucesso.");
      setRollbackReason("");
      setIsRollbackConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl uppercase text-slate-100">Execucao por etapas</h2>
            <p className="text-sm text-slate-300">Current step order: {currentStepOrder ?? "Sem etapa ativa"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${workflowStatusBadge(workflowStatus)}`}>
            {workflowStatus}
          </span>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <article className="card space-y-3 p-4">
          <h3 className="text-xl uppercase text-slate-100">Etapas da solicitacao</h3>

          <div className="space-y-2">
            {steps.map((step) => {
              const canExecute = canUserExecuteStep(step, currentUserRoles);
              const active = editableStep?.id === step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-sky-400/45 bg-sky-500/15"
                      : "border-slate-700 bg-slate-900/55 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedStepId(step.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {step.order + 1}. {step.name}
                    </p>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                      {step.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Area: {step.areaKey}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Pagamento: {typeof step.paymentRequiredCents === "number" ? `${step.paymentRequiredCents / 100}k` : "Nao exigido"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Autorizado para voce: {canExecute ? "Sim" : "Nao"}</p>
                </button>
              );
            })}
          </div>
        </article>

        <article className="card space-y-3 p-4">
          <h3 className="text-xl uppercase text-slate-100">Decisao da etapa</h3>

          {!editableStep ? (
            <p className="text-sm text-slate-400">Nenhuma etapa selecionada.</p>
          ) : (
            <>
              <p className="text-sm text-slate-300">Etapa: {editableStep.name}</p>
              <p className="text-xs text-slate-400">{editableStep.instructions ?? "Sem instrucoes adicionais."}</p>

              <div>
                <label className="label">Decisao</label>
                <select
                  className="input"
                  value={activeDecision}
                  onChange={(event) => setDecision(event.target.value)}
                >
                  {decisionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Observacoes</label>
                <textarea
                  className="input min-h-24"
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                />
              </div>

              {canExecuteWorkflow && canExecuteSelectedStep ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => executeStep()}
                    disabled={
                      isPending ||
                      editableStep.status !== "IN_PROGRESS" ||
                      blockedByOperatorRule
                    }
                  >
                    {isPending ? "Executando..." : "Executar etapa"}
                  </button>

                  {editableStep.order === 0 ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => executeStep("APTO")}
                      disabled={
                        isPending ||
                        editableStep.status !== "IN_PROGRESS" ||
                        blockedByOperatorRule
                      }
                    >
                      Aprovar etapa 1
                    </button>
                  ) : null}
                </div>
              ) : canExecuteWorkflow ? (
                <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                  Seu perfil nao esta autorizado para executar esta etapa.
                </p>
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                  Seu perfil nao possui permissao para executar etapas das aprovacoes.
                </p>
              )}

              {blockedByOperatorRule ? (
                <p className="rounded-xl border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                  Perfil operador pode aprovar apenas a etapa 1.
                </p>
              ) : null}

              {canRollbackWorkflow ? (
                <>
                  <div>
                    <label className="label">Motivo do retorno de etapa</label>
                    <textarea
                      className="input min-h-20"
                      value={rollbackReason}
                      onChange={(event) => setRollbackReason(event.target.value)}
                      placeholder="Explique porque o fluxo precisa voltar para a etapa anterior"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsRollbackConfirmOpen(true)}
                    disabled={isPending || !rollbackTargetStep}
                  >
                    {rollbackTargetStep
                      ? `Retornar para etapa ${rollbackTargetStep.order + 1}`
                      : "Sem etapa anterior"}
                  </button>

                  <div>
                    <label className="label">Etapa alvo do retorno</label>
                    <select
                      className="input"
                      value={rollbackTargetStep?.id ?? ""}
                      onChange={(event) => setRollbackTargetStepId(event.target.value)}
                      disabled={rollbackOptions.length === 0}
                    >
                      {rollbackOptions.length === 0 ? (
                        <option value="">Sem etapas anteriores</option>
                      ) : (
                        rollbackOptions.map((step) => (
                          <option key={step.id} value={step.id}>
                            {`${step.order + 1}. ${step.name} (${step.status})`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {rollbackImpactedSteps.length > 0 ? (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-300">Impacto do rollback</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-400">
                        {rollbackImpactedSteps.map((step) => (
                          <li key={step.id}>
                            {`${step.order + 1}. ${step.name} - estado atual: ${step.status}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                  Seu perfil nao possui permissao para retornar etapas das aprovacoes.
                </p>
              )}

              {message ? (
                <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                  {message}
                </p>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </article>
      </section>

      {isRollbackConfirmOpen && rollbackTargetStep ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-lg font-semibold text-slate-100">Confirmar retorno de etapa</h4>
            <p className="mt-2 text-sm text-slate-300">
              As aprovacoes serao retornadas para a etapa {rollbackTargetStep.order + 1} ({rollbackTargetStep.name}).
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Etapas impactadas: {rollbackImpactedSteps.length}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsRollbackConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={rollbackStep} disabled={isPending}>
                {isPending ? "Retornando..." : "Confirmar retorno"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SubmissionWorkflowHistory events={events} />
    </div>
  );
}
