"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type UserRowActionsProps = {
  userId: string;
  isActive: boolean;
};

export function UserRowActions({ userId, isActive }: UserRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateStatus(nextIsActive: boolean) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextIsActive,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao alterar status");
        return;
      }

      router.refresh();
    });
  }

  function deleteUser() {
    const confirmed = window.confirm("Confirma a exclusao definitiva deste usuario?");

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao excluir usuario");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/settings/users/${userId}`} className="btn-secondary text-xs">
          Editar
        </Link>

        {isActive ? (
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isPending}
            onClick={() => updateStatus(false)}
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={isPending}
            onClick={() => updateStatus(true)}
          >
            Reativar
          </button>
        )}

        <button type="button" className="btn-secondary text-xs" disabled={isPending} onClick={deleteUser}>
          Excluir
        </button>
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
