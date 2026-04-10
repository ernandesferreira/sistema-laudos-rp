"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TemplateOption = {
  id: string;
  title: string;
};

type SubmissionFilterValues = {
  protocol?: string;
  name?: string;
  templateId?: string;
  status?: "PENDING" | "REVIEWED" | "ARCHIVED";
  dateFrom?: string;
  dateTo?: string;
  pageSize: number;
};

type SubmissionFiltersProps = {
  templateOptions: TemplateOption[];
  current: SubmissionFilterValues;
};

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "REVIEWED", label: "Revisado" },
  { value: "ARCHIVED", label: "Arquivado" },
] as const;

const pageSizeOptions = [10, 20, 30, 50] as const;

function setOrDelete(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === "") {
    params.delete(key);
    return;
  }

  params.set(key, String(value));
}

export function SubmissionFilters({ templateOptions, current }: SubmissionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [protocol, setProtocol] = useState(current.protocol ?? "");
  const [name, setName] = useState(current.name ?? "");
  const [dateFrom, setDateFrom] = useState(current.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(current.dateTo ?? "");

  function navigateWith(next: Partial<SubmissionFilterValues>) {
    const params = new URLSearchParams();

    setOrDelete(params, "protocol", next.protocol ?? protocol.trim());
    setOrDelete(params, "name", next.name ?? name.trim());
    setOrDelete(params, "templateId", next.templateId ?? current.templateId);
    setOrDelete(params, "status", next.status ?? current.status);
    setOrDelete(params, "dateFrom", next.dateFrom ?? dateFrom);
    setOrDelete(params, "dateTo", next.dateTo ?? dateTo);
    setOrDelete(params, "pageSize", next.pageSize ?? current.pageSize);
    setOrDelete(params, "page", 1);

    const queryString = params.toString();

    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  return (
    <div className="glass-panel space-y-3 rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="label" htmlFor="submission-protocol">
            Protocolo
          </label>
          <input
            id="submission-protocol"
            className="input"
            placeholder="Ex.: LRP-20260409-AB12"
            value={protocol}
            onChange={(event) => setProtocol(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="submission-name">
            Nome
          </label>
          <input
            id="submission-name"
            className="input"
            placeholder="Responsavel pelo envio"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="submission-template">
            Modelo
          </label>
          <select
            id="submission-template"
            className="input"
            value={current.templateId ?? ""}
            onChange={(event) => navigateWith({ templateId: event.target.value || undefined })}
          >
            <option value="">Todos os modelos</option>
            {templateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="submission-status">
            Status
          </label>
          <select
            id="submission-status"
            className="input"
            value={current.status ?? ""}
            onChange={(event) =>
              navigateWith({
                status: (event.target.value as SubmissionFilterValues["status"]) || undefined,
              })
            }
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_200px_auto] xl:items-end">
        <div>
          <label className="label" htmlFor="submission-date-from">
            Data inicial
          </label>
          <input
            id="submission-date-from"
            type="date"
            className="input"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="submission-date-to">
            Data final
          </label>
          <input
            id="submission-date-to"
            type="date"
            className="input"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="submission-page-size">
            Itens por pagina
          </label>
          <select
            id="submission-page-size"
            className="input"
            value={String(current.pageSize)}
            onChange={(event) => navigateWith({ pageSize: Number(event.target.value) })}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => navigateWith({})}>
            Filtrar
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setProtocol("");
              setName("");
              setDateFrom("");
              setDateTo("");

              startTransition(() => {
                router.push(pathname);
              });
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {isPending ? <p className="text-xs text-slate-400">Carregando resultados...</p> : null}
    </div>
  );
}
