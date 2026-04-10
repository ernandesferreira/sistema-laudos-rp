"use client";

import { useState } from "react";

type ProtocolResult = {
  protocol: string | null;
  templateTitle: string;
  status: string;
  submittedByName: string | null;
  submittedAt: string;
};

export default function ProtocolLookupPage() {
  const [protocol, setProtocol] = useState("");
  const [result, setResult] = useState<ProtocolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!protocol.trim()) {
      setError("Informe um protocolo.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await fetch(`/api/public/submissions/${protocol.trim()}`);
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Protocolo nao encontrado.");
      setIsLoading(false);
      return;
    }

    setResult(payload.submission as ProtocolResult);
    setIsLoading(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 md:px-8">
      <header className="card p-4 md:p-6">
        <p className="text-xs font-semibold uppercase text-brand-700">Consulta publica</p>
        <h1 className="text-4xl uppercase">Consultar protocolo de solicitacao</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sistema ficticio para uso em roleplay.
        </p>
      </header>

      <form onSubmit={onSearch} className="card space-y-3 p-4 md:p-6">
        <label className="label" htmlFor="protocol">
          Protocolo
        </label>
        <div className="flex gap-2">
          <input
            id="protocol"
            className="input"
            placeholder="RP-20260409-ABC123"
            value={protocol}
            onChange={(event) => setProtocol(event.target.value.toUpperCase())}
          />
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-danger-700/20 bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <article className="card p-4 md:p-6">
          <h2 className="text-2xl uppercase">Resultado</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p>
              <strong>Protocolo:</strong> {result.protocol ?? "N/A"}
            </p>
            <p>
              <strong>Status:</strong> {result.status}
            </p>
            <p>
              <strong>Modelo:</strong> {result.templateTitle}
            </p>
            <p>
              <strong>Responsavel:</strong> {result.submittedByName ?? "Nao informado"}
            </p>
            <p>
              <strong>Enviado em:</strong>{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(result.submittedAt))}
            </p>
          </div>
        </article>
      ) : null}
    </main>
  );
}
