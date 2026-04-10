"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldRenderer } from "@/components/forms/public-fields/FieldRenderer";
import type { FieldType } from "@/domain/laudos/types";

type TemplateOption = {
  id: string;
  title: string;
  slug: string;
};

type RequestCreateFormProps = {
  templateOptions: TemplateOption[];
};

type TemplateField = {
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

type TemplateSection = {
  id: string;
  title: string;
  description: string | null;
  fields: TemplateField[];
};

function defaultValueForField(field: TemplateField) {
  if (field.defaultValue !== null && field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === "MULTISELECT") {
    return [];
  }

  if (field.type === "CHECKBOX") {
    return false;
  }

  return "";
}

function getFieldContainerClass(type: FieldType) {
  if (type === "TEXTAREA" || type === "OBSERVATIONS") {
    return "md:col-span-2 xl:col-span-3";
  }

  if (type === "RADIO" || type === "MULTISELECT" || type === "CHECKBOX") {
    return "md:col-span-2";
  }

  return "";
}

export function RequestCreateForm({ templateOptions }: RequestCreateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState({
    templateId: templateOptions[0]?.id ?? "",
  });

  const isDisabled = useMemo(() => {
    return isSubmitting || isLoadingTemplate || !form.templateId;
  }, [form, isLoadingTemplate, isSubmitting]);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplateFields() {
      if (!form.templateId) {
        if (isMounted) {
          setSections([]);
          setAnswers({});
        }
        return;
      }

      setIsLoadingTemplate(true);
      setError(null);
      setFieldErrors({});

      try {
        const response = await fetch(`/api/templates/${form.templateId}`);
        const data = (await response.json()) as {
          error?: string;
          template?: { sections?: TemplateSection[] };
        };

        if (!response.ok || !data.template) {
          throw new Error(data.error ?? "Nao foi possivel carregar o modelo selecionado");
        }

        if (!isMounted) {
          return;
        }

        const nextSections = data.template.sections ?? [];
        setSections(nextSections);

        const defaults: Record<string, unknown> = {};

        for (const section of nextSections) {
          for (const field of section.fields) {
            if (!field.isActive) {
              continue;
            }

            defaults[field.name] = defaultValueForField(field);
          }
        }

        setAnswers(defaults);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setSections([]);
        setAnswers({});
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar modelo");
      } finally {
        if (isMounted) {
          setIsLoadingTemplate(false);
        }
      }
    }

    void loadTemplateFields();

    return () => {
      isMounted = false;
    };
  }, [form.templateId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: form.templateId,
          answers,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        details?: {
          fieldErrors?: Record<string, string>;
        };
        serviceRequest?: { id: string };
      };

      if (!response.ok || !data.serviceRequest) {
        if (data.details?.fieldErrors) {
          setFieldErrors(data.details.fieldErrors);
        }

        throw new Error(data.error ?? "Falha ao abrir solicitacao");
      }

      router.push(`/requests/${data.serviceRequest.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-1">
        <label className="space-y-1">
          <span className="text-xs uppercase text-slate-200">Modelo de solicitacao</span>
          <select
            value={form.templateId}
            onChange={(event) => setForm((prev) => ({ ...prev, templateId: event.target.value }))}
            className="input"
            required
          >
            {templateOptions.length === 0 ? <option value="">Nenhum modelo disponivel</option> : null}
            {templateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-50">Campos do modelo selecionado</p>
          <p className="text-xs text-slate-300">
            Preencha os dados especificos da solicitacao conforme o modelo.
          </p>
        </div>

        {isLoadingTemplate ? <p className="text-sm text-slate-300">Carregando campos do modelo...</p> : null}

        {!isLoadingTemplate && sections.length === 0 ? (
          <p className="text-sm text-slate-300">Este modelo nao possui campos cadastrados.</p>
        ) : null}

        {!isLoadingTemplate
          ? sections.map((section) => (
              <article key={section.id} className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-50">{section.title}</h3>
                  {section.description ? (
                    <p className="text-xs text-slate-300">{section.description}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {section.fields
                    .filter((field) => field.isActive)
                    .map((field) => (
                      <label
                        key={field.id}
                        className={`space-y-1 rounded-lg border border-slate-800/70 bg-slate-900/40 p-3 ${getFieldContainerClass(field.type)}`}
                      >
                        <span className="text-xs uppercase text-slate-200">
                          {field.label}
                          {field.required ? " *" : ""}
                        </span>
                        <FieldRenderer
                          field={field}
                          value={answers[field.name]}
                          error={fieldErrors[field.name]}
                          onChange={(nextValue) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [field.name]: nextValue,
                            }))
                          }
                        />
                        {field.helpText ? <p className="text-xs text-slate-300">{field.helpText}</p> : null}
                        {fieldErrors[field.name] ? (
                          <p className="text-xs text-rose-300">{fieldErrors[field.name]}</p>
                        ) : null}
                      </label>
                    ))}
                </div>
              </article>
            ))
          : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-slate-800/70 bg-slate-950/95 p-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <div className="flex items-center justify-end gap-2">
          <button type="submit" className="btn-primary w-full md:w-auto" disabled={isDisabled}>
          {isSubmitting ? "Abrindo..." : "Abrir solicitacao"}
          </button>
        </div>
      </div>
    </form>
  );
}
