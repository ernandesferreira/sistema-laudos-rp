"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const statuses = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "ARCHIVED", label: "Arquivado" },
];

const activeOptions = [
  { value: "", label: "Ativo e inativo" },
  { value: "true", label: "Somente ativos" },
  { value: "false", label: "Somente inativos" },
];

export function TemplateFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const selectedStatus = useMemo(
    () => searchParams.get("status") ?? "",
    [searchParams],
  );
  const selectedActive = useMemo(
    () => searchParams.get("active") ?? "",
    [searchParams],
  );

  function applyFilters(next: {
    q?: string;
    status?: string;
    active?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const qValue = next.q ?? query;
    if (qValue.trim()) {
      params.set("q", qValue.trim());
    } else {
      params.delete("q");
    }

    if (next.status !== undefined) {
      if (next.status) {
        params.set("status", next.status);
      } else {
        params.delete("status");
      }
    }

    if (next.active !== undefined) {
      if (next.active) {
        params.set("active", next.active);
      } else {
        params.delete("active");
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <div className="glass-panel grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
      <div>
        <label className="label" htmlFor="template-search">
          Busca
        </label>
        <input
          id="template-search"
          className="input"
          placeholder="Titulo, slug ou descricao"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="template-status">
          Status
        </label>
        <select
          id="template-status"
          className="input"
          value={selectedStatus}
          onChange={(event) => applyFilters({ status: event.target.value })}
        >
          {statuses.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="template-active">
          Situacao
        </label>
        <select
          id="template-active"
          className="input"
          value={selectedActive}
          onChange={(event) => applyFilters({ active: event.target.value })}
        >
          {activeOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => applyFilters({ q: query })}
        >
          Filtrar
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setQuery("");
            router.push(pathname);
          }}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
