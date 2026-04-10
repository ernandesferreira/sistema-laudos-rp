"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandSettings } from "@/hooks/useBrandSettings";

export function LoginForm() {
  const router = useRouter();
  const { settings } = useBrandSettings();
  const [passportNumber, setPassportNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (passportNumber.trim().length < 3) {
      setError("Informe um passaporte valido.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Senha invalida.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passportNumber: passportNumber.trim().toUpperCase(),
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel entrar");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-6 md:p-7">
      <div>
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logoUrl}
            alt="Logo do sistema"
            className="mb-3 h-10 w-10 rounded-lg border border-slate-700 object-cover"
          />
        ) : null}
        <p className="text-xs uppercase tracking-wider text-sky-300">{settings.systemName}</p>
        <h1 className="mt-1 text-3xl uppercase text-slate-100">Login</h1>
        <p className="mt-2 text-sm text-slate-300">Acesse com passaporte cadastrado e senha.</p>
      </div>

      <label className="space-y-1">
        <span className="text-xs uppercase text-slate-400">Passaporte</span>
        <input
          className="input"
          value={passportNumber}
          onChange={(event) => setPassportNumber(event.target.value.toUpperCase())}
          placeholder="Ex.: P12345"
          required
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase text-slate-400">Senha</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
