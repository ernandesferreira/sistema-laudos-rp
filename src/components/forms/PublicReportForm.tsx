"use client";

import { useMemo, useState } from "react";
import type { FieldType } from "@/domain/laudos/types";

type PublicField = {
  id: string;
  label: string;
  name: string;
  type: FieldType;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: unknown;
};

type PublicSection = {
  id: string;
  title: string;
  description: string | null;
  fields: PublicField[];
};

type PublicTemplate = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sections: PublicSection[];
};

function isOptionArray(options: unknown): options is string[] {
  return Array.isArray(options) && options.every((item) => typeof item === "string");
}

function renderInput(
  field: PublicField,
  value: string,
  onChange: (next: string) => void,
) {
  const common = {
    id: field.id,
    name: field.name,
    required: field.required,
    className: "input",
  };

  switch (field.type) {
    case "TEXTAREA":
      return (
        <textarea
          {...common}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? ""}
          className="input min-h-28"
        />
      );
    case "NUMBER":
      return (
        <input
          {...common}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? ""}
        />
      );
    case "DATE":
      return <input {...common} type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
    case "DATETIME":
      return (
        <input
          {...common}
          type="datetime-local"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "SELECT": {
      const options = isOptionArray(field.options) ? field.options : [];
      return (
        <select {...common} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Selecione...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    default:
      return (
        <input
          {...common}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? ""}
        />
      );
  }
}

export function PublicReportForm({ template }: { template: PublicTemplate }) {
  const [personName, setPersonName] = useState("");
  const [personContact, setPersonContact] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = useMemo(
    () => template.sections.flatMap((section) => section.fields),
    [template.sections],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const response = await fetch(`/api/public/templates/${template.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submittedByName: personName || null,
        submittedByContact: personContact || null,
        answers,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao enviar laudo");
      setIsSubmitting(false);
      return;
    }

    setStatus("Laudo enviado com sucesso.");
    setAnswers({});
    setPersonName("");
    setPersonContact("");
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="card space-y-3 p-4 md:p-6">
        <h2 className="text-2xl uppercase">Identificacao</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Nome do responsavel</label>
            <input className="input" value={personName} onChange={(event) => setPersonName(event.target.value)} />
          </div>
          <div>
            <label className="label">Contato</label>
            <input
              className="input"
              value={personContact}
              onChange={(event) => setPersonContact(event.target.value)}
            />
          </div>
        </div>
      </section>

      {template.sections.map((section) => (
        <section key={section.id} className="card space-y-3 p-4 md:p-6">
          <h3 className="text-2xl uppercase">{section.title}</h3>
          {section.description ? <p className="text-sm text-slate-600">{section.description}</p> : null}

          <div className="grid gap-3">
            {section.fields.map((field) => (
              <div key={field.id}>
                <label className="label" htmlFor={field.id}>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {renderInput(field, answers[field.name] ?? "", (next) =>
                  setAnswers((current) => ({ ...current, [field.name]: next }))
                )}
                {field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      <button type="submit" className="btn-primary" disabled={isSubmitting || fields.length === 0}>
        {isSubmitting ? "Enviando..." : "Enviar laudo"}
      </button>

      {status ? <p className="text-sm font-medium text-brand-700">{status}</p> : null}
    </form>
  );
}
