"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERMISSION_CATALOG } from "@/auth/permissions";
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from "@/auth/roles";
import {
  WORKFLOW_TRANSITION_BEHAVIORS,
  type WorkflowDecision,
  type WorkflowTransitionBehavior,
} from "@/domain/laudos/workflow";

type WorkflowStepInput = {
  id?: string;
  name: string;
  description: string;
  order: number;
  areaKey: string;
  authorizedRoleKeys: RoleKey[];
  requiredPermissions: string[];
  instructions: string;
  paymentRequiredCents: number | null;
  stageFieldKeysText: string;
  decisionRequired: boolean;
  requiresObservation: boolean;
  isRequired: boolean;
  isFinalStage: boolean;
  transitionRules: Partial<Record<WorkflowDecision, WorkflowTransitionBehavior>>;
};

type InitialWorkflow = {
  name: string;
  description: string | null;
  isActive: boolean;
  steps: Array<{
    id: string;
    name: string;
    description: string | null;
    order: number;
    areaKey: string;
    authorizedRoleKeys: unknown;
    requiredPermissions: unknown;
    instructions: string | null;
    paymentRequiredCents: number | null;
    stageFieldKeys: unknown;
    decisionRequired: boolean;
    requiresObservation: boolean;
    isRequired: boolean;
    isFinalStage: boolean;
    transitionRules: unknown;
  }>;
} | null;

type TemplateWorkflowEditorProps = {
  templateId: string;
  templateTitle: string;
  initialWorkflow: InitialWorkflow;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function createEmptyStep(order: number): WorkflowStepInput {
  return {
    name: `Etapa ${order + 1}`,
    description: "",
    order,
    areaKey: "operacional",
    authorizedRoleKeys: ["admin"],
    requiredPermissions: ["submissions.workflow.execute"],
    instructions: "",
    paymentRequiredCents: null,
    stageFieldKeysText: "",
    decisionRequired: true,
    requiresObservation: false,
    isRequired: true,
    isFinalStage: false,
    transitionRules: {},
  };
}

function toTransitionRules(value: unknown): Partial<Record<WorkflowDecision, WorkflowTransitionBehavior>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const decisions: WorkflowDecision[] = ["APTO", "NAO_APTO", "PENDENTE", "APROVADO", "REPROVADO"];
  const rules: Partial<Record<WorkflowDecision, WorkflowTransitionBehavior>> = {};

  for (const decision of decisions) {
    const candidate = source[decision];

    if (
      candidate === "NEXT" ||
      candidate === "HOLD" ||
      candidate === "FINAL_REJECT" ||
      candidate === "FINAL_APPROVE"
    ) {
      rules[decision] = candidate;
    }
  }

  return rules;
}

function transitionDecisionOptions(isFinalStage: boolean): WorkflowDecision[] {
  if (isFinalStage) {
    return ["APROVADO", "REPROVADO", "PENDENTE"];
  }

  return ["APTO", "NAO_APTO", "PENDENTE"];
}

function toCurrency(cents: number | null) {
  if (typeof cents !== "number") {
    return "Nao exigido";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function TemplateWorkflowEditor({
  templateId,
  templateTitle,
  initialWorkflow,
}: TemplateWorkflowEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialWorkflow?.name ?? `${templateTitle} - Aprovacoes`);
  const [description, setDescription] = useState(initialWorkflow?.description ?? "");
  const [isActive, setIsActive] = useState(initialWorkflow?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [steps, setSteps] = useState<WorkflowStepInput[]>(() => {
    if (!initialWorkflow || initialWorkflow.steps.length === 0) {
      return [createEmptyStep(0)];
    }

    return initialWorkflow.steps
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({
        id: step.id,
        name: step.name,
        description: step.description ?? "",
        order: index,
        areaKey: step.areaKey,
        authorizedRoleKeys: toStringArray(step.authorizedRoleKeys).filter((role): role is RoleKey =>
          ROLE_KEYS.includes(role as RoleKey),
        ),
        requiredPermissions: toStringArray(step.requiredPermissions),
        instructions: step.instructions ?? "",
        paymentRequiredCents: step.paymentRequiredCents,
        stageFieldKeysText: toStringArray(step.stageFieldKeys).join(", "),
        decisionRequired: step.decisionRequired,
        requiresObservation: step.requiresObservation,
        isRequired: step.isRequired,
        isFinalStage: step.isFinalStage,
        transitionRules: toTransitionRules(step.transitionRules),
      }));
  });

  const workflowSummary = useMemo(() => {
    const finalStages = steps.filter((step) => step.isFinalStage).length;
    const requiredStages = steps.filter((step) => step.isRequired).length;

    return {
      total: steps.length,
      finalStages,
      requiredStages,
    };
  }, [steps]);

  function addStep() {
    setSteps((current) => [...current, createEmptyStep(current.length)]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index).map((step, order) => ({ ...step, order })));
  }

  function updateStep(index: number, input: Partial<WorkflowStepInput>) {
    setSteps((current) =>
      current.map((step, stepIndex) => {
        if (stepIndex !== index) {
          return step;
        }

        return {
          ...step,
          ...input,
        };
      }),
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    setSteps((current) => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return next.map((step, order) => ({ ...step, order }));
    });
  }

  function toggleRole(index: number, role: RoleKey, checked: boolean) {
    updateStep(index, {
      authorizedRoleKeys: checked
        ? Array.from(new Set([...steps[index].authorizedRoleKeys, role]))
        : steps[index].authorizedRoleKeys.filter((item) => item !== role),
    });
  }

  function togglePermission(index: number, permissionKey: string, checked: boolean) {
    updateStep(index, {
      requiredPermissions: checked
        ? Array.from(new Set([...steps[index].requiredPermissions, permissionKey]))
        : steps[index].requiredPermissions.filter((item) => item !== permissionKey),
    });
  }

  function updateTransitionRule(
    index: number,
    decision: WorkflowDecision,
    value: string,
  ) {
    const current = steps[index].transitionRules;
    const next: Partial<Record<WorkflowDecision, WorkflowTransitionBehavior>> = {
      ...current,
    };

    if (value.length === 0) {
      delete next[decision];
    } else {
      next[decision] = value as WorkflowTransitionBehavior;
    }

    updateStep(index, { transitionRules: next });
  }

  function saveWorkflow() {
    setError(null);
    setMessage(null);

    if (steps.length === 0) {
      setError("Adicione ao menos uma etapa.");
      return;
    }

    if (workflowSummary.finalStages !== 1) {
      setError("Defina exatamente uma etapa final.");
      return;
    }

    const hasEmptyRoles = steps.some((step) => step.authorizedRoleKeys.length === 0);

    if (hasEmptyRoles) {
      setError("Cada etapa precisa de ao menos um perfil autorizado.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/templates/${templateId}/workflow`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          isActive,
          steps: steps.map((step, order) => ({
            id: step.id,
            name: step.name,
            description: step.description.trim() || null,
            order,
            areaKey: step.areaKey,
            authorizedRoleKeys: step.authorizedRoleKeys,
            requiredPermissions: step.requiredPermissions,
            instructions: step.instructions.trim() || null,
            paymentRequiredCents: step.paymentRequiredCents ?? null,
            stageFieldKeys: step.stageFieldKeysText
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            decisionRequired: step.decisionRequired,
            requiresObservation: step.requiresObservation,
            isRequired: step.isRequired,
            isFinalStage: step.isFinalStage,
            transitionRules: step.transitionRules,
          })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao salvar aprovacoes");
        return;
      }

      setMessage("Aprovacoes salvas com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-4">
        <h2 className="text-2xl uppercase text-slate-100">Configuracao das aprovacoes</h2>
        <p className="mt-1 text-sm text-slate-300">Defina etapas, responsaveis, regras de decisao e pagamentos exigidos.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="label">Ativo</label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Aprovacoes habilitadas para novas submissoes
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="label">Descricao</label>
            <textarea
              className="input min-h-24"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-300 md:grid-cols-3">
          <p>Total de etapas: {workflowSummary.total}</p>
          <p>Etapas obrigatorias: {workflowSummary.requiredStages}</p>
          <p>Etapa final configurada: {workflowSummary.finalStages}</p>
        </div>
      </section>

      <section className="space-y-3">
        {steps.map((step, index) => (
          <article key={`${step.id ?? "new"}-${index}`} className="card space-y-3 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl uppercase text-slate-100">
                Etapa {index + 1} - {step.name || "Sem nome"}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => moveStep(index, "up")}>Subir</button>
                <button type="button" className="btn-secondary" onClick={() => moveStep(index, "down")}>Descer</button>
                <button type="button" className="btn-secondary" onClick={() => removeStep(index)}>Remover</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label">Nome da etapa</label>
                <input className="input" value={step.name} onChange={(event) => updateStep(index, { name: event.target.value })} />
              </div>
              <div>
                <label className="label">Area responsavel</label>
                <input className="input" value={step.areaKey} onChange={(event) => updateStep(index, { areaKey: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descricao</label>
                <textarea
                  className="input min-h-20"
                  value={step.description}
                  onChange={(event) => updateStep(index, { description: event.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Instrucoes da etapa</label>
                <textarea
                  className="input min-h-20"
                  value={step.instructions}
                  onChange={(event) => updateStep(index, { instructions: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Pagamento exigido (centavos)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={step.paymentRequiredCents ?? ""}
                  onChange={(event) =>
                    updateStep(index, {
                      paymentRequiredCents:
                        event.target.value.trim().length === 0 ? null : Number(event.target.value),
                    })
                  }
                />
                <p className="mt-1 text-xs text-slate-400">{toCurrency(step.paymentRequiredCents)}</p>
              </div>
              <div>
                <label className="label">Campos especificos (separados por virgula)</label>
                <input
                  className="input"
                  value={step.stageFieldKeysText}
                  onChange={(event) => updateStep(index, { stageFieldKeysText: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-sm font-semibold text-slate-200">Perfis autorizados</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {ROLE_KEYS.map((role) => {
                    const checked = step.authorizedRoleKeys.includes(role);

                    return (
                      <label key={role} className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleRole(index, role, event.target.checked)}
                        />
                        {ROLE_LABELS[role]}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-sm font-semibold text-slate-200">Permissoes obrigatorias da etapa</p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {PERMISSION_CATALOG.map((permission) => {
                    const checked = step.requiredPermissions.includes(permission.key);

                    return (
                      <label key={permission.key} className="flex items-start gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            togglePermission(index, permission.key, event.target.checked)
                          }
                        />
                        <span>
                          <span className="font-semibold">{permission.name}</span>
                          <span className="block text-slate-400">{permission.key}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={step.decisionRequired}
                  onChange={(event) => updateStep(index, { decisionRequired: event.target.checked })}
                />
                Decisao obrigatoria
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={step.requiresObservation}
                  onChange={(event) => updateStep(index, { requiresObservation: event.target.checked })}
                />
                Exigir observacao
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={step.isRequired}
                  onChange={(event) => updateStep(index, { isRequired: event.target.checked })}
                />
                Etapa obrigatoria
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={step.isFinalStage}
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((entry, entryIndex) => ({
                        ...entry,
                        isFinalStage: entryIndex === index ? event.target.checked : false,
                      })),
                    )
                  }
                />
                Etapa final
              </label>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-sm font-semibold text-slate-200">Regras de transicao por decisao</p>
              <p className="mt-1 text-xs text-slate-400">
                Opcional. Se vazio, o motor aplica o comportamento padrao do sistema.
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {transitionDecisionOptions(step.isFinalStage).map((decisionKey) => (
                  <div key={decisionKey}>
                    <label className="label">{decisionKey}</label>
                    <select
                      className="input"
                      value={step.transitionRules[decisionKey] ?? ""}
                      onChange={(event) =>
                        updateTransitionRule(index, decisionKey, event.target.value)
                      }
                    >
                      <option value="">Padrao</option>
                      {WORKFLOW_TRANSITION_BEHAVIORS.map((behavior) => (
                        <option key={behavior} value={behavior}>
                          {behavior}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}

        <button type="button" className="btn-secondary" onClick={addStep}>
          Adicionar etapa
        </button>
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" disabled={isPending} onClick={saveWorkflow}>
            {isPending ? "Salvando..." : "Salvar aprovacoes"}
          </button>
        </div>

        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
