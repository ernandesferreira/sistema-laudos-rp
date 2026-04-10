"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeLicensePayloadSchema } from "@/application/licenses/licenseSchemas";

type RevocationType = "days" | "months" | "years" | "permanent";

type RevokeLicenseModalProps = {
  licenseId: string;
  canRevoke: boolean;
  status: "ativa" | "revogada_temporariamente" | "revogada_definitivamente" | "expirada";
};

function typeLabel(type: RevocationType) {
  if (type === "days") {
    return "Dias";
  }

  if (type === "months") {
    return "Meses";
  }

  if (type === "years") {
    return "Anos";
  }

  return "Definitivo";
}

export function RevokeLicenseModal({ licenseId, canRevoke, status }: RevokeLicenseModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RevocationType>("days");
  const [value, setValue] = useState("30");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAlreadyRevoked = status === "revogada_temporariamente" || status === "revogada_definitivamente";
  const canOpen = canRevoke && !isAlreadyRevoked;

  const helperText = useMemo(() => {
    if (type === "permanent") {
      return "Bloqueio sem expiracao para este documento.";
    }

    return `Bloqueio por ${typeLabel(type).toLowerCase()} com expiracao automatica.`;
  }, [type]);

  function closeModal() {
    if (isPending) {
      return;
    }

    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  function confirmRevoke() {
    setError(null);
    setSuccess(null);

    const parsed = revokeLicensePayloadSchema.safeParse({
      type,
      value: type === "permanent" ? undefined : value,
      reason,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.message ?? "Dados invalidos para revogacao.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/licenses/${licenseId}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Nao foi possivel revogar a licenca.");
        return;
      }

      setSuccess("Licenca revogada com sucesso.");
      router.refresh();

      setTimeout(() => {
        setOpen(false);
      }, 500);
    });
  }

  if (!canOpen) {
    return (
      <button type="button" className="btn-secondary text-[11px] px-2 py-1 opacity-50" disabled>
        Revogar Licenca
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary text-[11px] px-2 py-1 text-rose-200 border-rose-500/40 hover:!bg-rose-500/20 hover:!border-rose-400"
        onClick={() => setOpen(true)}
      >
        Revogar Licenca
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-100">Revogar Licenca</h3>
            <p className="mt-1 text-sm text-slate-400">
              Defina o prazo de revogacao para bloquear novas solicitacoes deste documento.
            </p>

            <div className="mt-4 space-y-3">
              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Tipo de prazo</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as RevocationType)}
                  className="input"
                  disabled={isPending}
                >
                  <option value="days">Dias</option>
                  <option value="months">Meses</option>
                  <option value="years">Anos</option>
                  <option value="permanent">Definitivo</option>
                </select>
              </label>

              {type !== "permanent" ? (
                <label className="space-y-1">
                  <span className="text-xs uppercase text-slate-400">Quantidade</span>
                  <input
                    type="number"
                    min={1}
                    max={1200}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="input"
                    disabled={isPending}
                  />
                </label>
              ) : null}

              <p className="text-xs text-slate-500">{helperText}</p>

              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Motivo (opcional)</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="input min-h-[84px]"
                  maxLength={400}
                  disabled={isPending}
                />
              </label>
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="mt-3 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                {success}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isPending}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmRevoke} disabled={isPending}>
                {isPending ? "Revogando..." : "Confirmar revogacao"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
