"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RowActionOption = {
  value: string;
  label: string;
  href: string;
  openInNewTab?: boolean;
};

type RequestRowActionsSelectProps = {
  requestId: string;
  options: RowActionOption[];
  canInactivate: boolean;
  canDelete: boolean;
  placeholder?: string;
  className?: string;
};

type AdminAction = "inactivate" | "delete";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

export function RequestRowActionsSelect({
  requestId,
  options,
  canInactivate,
  canDelete,
  placeholder = "Acoes",
  className,
}: RequestRowActionsSelectProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState("");
  const [pendingAdminAction, setPendingAdminAction] = useState<AdminAction | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isPending, startTransition] = useTransition();

  async function inactivateRequest() {
    const response = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "inactivate" }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback({
        tone: "error",
        message: payload?.error ?? "Nao foi possivel inativar a solicitacao.",
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: "Solicitacao inativada com sucesso.",
    });
    router.refresh();
  }

  async function deleteRequest() {
    const response = await fetch(`/api/requests/${requestId}`, {
      method: "DELETE",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback({
        tone: "error",
        message: payload?.error ?? "Nao foi possivel excluir a solicitacao.",
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: "Solicitacao excluida com sucesso.",
    });
    router.refresh();
  }

  function openAdminActionModal(action: AdminAction) {
    setFeedback(null);
    setPendingAdminAction(action);
  }

  function closeAdminActionModal() {
    if (isPending) {
      return;
    }

    setPendingAdminAction(null);
  }

  function confirmAdminAction() {
    if (!pendingAdminAction) {
      return;
    }

    startTransition(async () => {
      if (pendingAdminAction === "inactivate") {
        await inactivateRequest();
      }

      if (pendingAdminAction === "delete") {
        await deleteRequest();
      }

      setPendingAdminAction(null);
      setSelectedAction("");
    });
  }

  function handleActionChange(nextValue: string) {
    setSelectedAction(nextValue);

    if (!nextValue) {
      return;
    }

    if (nextValue === "inactivate") {
      openAdminActionModal("inactivate");
      return;
    }

    if (nextValue === "delete") {
      openAdminActionModal("delete");
      return;
    }

    const selected = options.find((option) => option.value === nextValue);

    if (!selected) {
      setSelectedAction("");
      return;
    }

    if (selected.openInNewTab) {
      window.open(selected.href, "_blank");
      setSelectedAction("");
      return;
    }

    router.push(selected.href);
    setSelectedAction("");
  }

  const confirmTitle = pendingAdminAction === "delete" ? "Confirmar exclusao" : "Confirmar inativacao";
  const confirmDescription =
    pendingAdminAction === "delete"
      ? "Esta acao marca a solicitacao como excluida e remove da operacao ativa."
      : "Esta acao inativa a solicitacao e interrompe o fluxo operacional.";
  const confirmButtonLabel = pendingAdminAction === "delete" ? "Confirmar exclusao" : "Confirmar inativacao";
  const confirmButtonClass =
    pendingAdminAction === "delete"
      ? "btn-secondary border-rose-500/45 text-rose-200 hover:!border-rose-400 hover:!bg-rose-500/20"
      : "btn-primary";

  return (
    <>
      <div className="space-y-2">
        <select
          className={className ?? "input h-8 min-w-[150px] max-w-[160px] pr-7 !text-[0.60rem] leading-none"}
          value={selectedAction}
          onChange={(event) => handleActionChange(event.target.value)}
          disabled={isPending}
        >
          <option value="">{isPending ? "Processando..." : placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {canInactivate ? <option value="inactivate">Inativar solicitacao</option> : null}
          {canDelete ? <option value="delete">Excluir solicitacao</option> : null}
        </select>

        {feedback ? (
          <p
            className={`rounded-xl border px-2 py-1 text-[11px] ${
              feedback.tone === "success"
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/35 bg-rose-500/10 text-rose-200"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>

      {pendingAdminAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-100">{confirmTitle}</h3>
            <p className="mt-2 text-sm text-slate-300">{confirmDescription}</p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={closeAdminActionModal} disabled={isPending}>
                Cancelar
              </button>
              <button type="button" className={confirmButtonClass} onClick={confirmAdminAction} disabled={isPending}>
                {isPending ? "Processando..." : confirmButtonLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
