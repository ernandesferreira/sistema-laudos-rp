"use client";

import { useMemo, useState } from "react";
import type { FieldType } from "@/domain/laudos/types";
import { FieldRenderer } from "@/components/forms/public-fields/FieldRenderer";

type PublicField = {
  id: string;
  label: string;
  name: string;
  type: FieldType;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: unknown;
  mask: string | null;
  isActive: boolean;
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

function isBlank(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

export function PublicReportForm({ template }: { template: PublicTemplate }) {
  const [personName, setPersonName] = useState("");
  const [personContact, setPersonContact] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = useMemo(
    () =>
      template.sections
        .flatMap((section) => section.fields)
        .filter((field) => field.isActive),
    [template.sections],
  );

  function validateClientSide() {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const value = answers[field.name];

      if (field.required && isBlank(value)) {
        errors[field.name] = `${field.label} e obrigatorio.`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clientValid = validateClientSide();

    if (!clientValid) {
      setStatusMessage("Revise os campos obrigatorios destacados.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setProtocol(null);
    setFieldErrors({});

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
      if (payload?.details?.fieldErrors) {
        setFieldErrors(payload.details.fieldErrors as Record<string, string>);
      }

      setStatusMessage(payload.error ?? "Falha ao enviar solicitacao");
      setIsSubmitting(false);
      return;
    }

    setStatusMessage("Solicitacao enviada com sucesso.");
    setProtocol(payload.protocol ?? null);
    setAnswers({});
    setFieldErrors({});
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
            {section.fields
              .filter((field) => field.isActive)
              .map((field) => (
              <div key={field.id}>
                <label className="label" htmlFor={field.id}>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                <FieldRenderer
                  field={field}
                  value={answers[field.name] ?? field.defaultValue ?? ""}
                  error={fieldErrors[field.name]}
                  onChange={(next) =>
                    setAnswers((current) => ({ ...current, [field.name]: next }))
                  }
                />
                {field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null}
                {fieldErrors[field.name] ? (
                  <p className="mt-1 text-xs font-semibold text-danger-700">{fieldErrors[field.name]}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      <button type="submit" className="btn-primary" disabled={isSubmitting || fields.length === 0}>
        {isSubmitting ? "Enviando..." : "Enviar solicitacao"}
      </button>

      {statusMessage ? <p className="text-sm font-medium text-brand-700">{statusMessage}</p> : null}

      {protocol ? (
        <div className="rounded-xl border border-ok-700/20 bg-ok-100 px-4 py-3 text-sm text-ok-700">
          Protocolo de envio: <strong>{protocol}</strong>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">Sistema ficticio para uso em roleplay.</p>
    </form>
  );
}
