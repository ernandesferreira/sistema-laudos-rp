"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldType } from "@/domain/laudos/types";

type Field = {
  id: string;
  label: string;
  name: string;
  type: FieldType;
  required: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  options: unknown;
};

type Section = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  fields: Field[];
};

type Template = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  sections: Section[];
};

const fieldTypes: FieldType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "DATETIME",
  "SELECT",
  "RADIO",
  "CHECKBOX",
];

export function TemplateEditor({ template }: { template: Template }) {
  const router = useRouter();
  const [title, setTitle] = useState(template.title);
  const [slug, setSlug] = useState(template.slug);
  const [description, setDescription] = useState(template.description ?? "");
  const [statusValue, setStatusValue] = useState(template.status);
  const [version, setVersion] = useState(template.version);
  const [isActive, setIsActive] = useState(template.isActive);
  const [sectionTitle, setSectionTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function saveTemplate() {
    setStatus(null);

    const response = await fetch(`/api/templates/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug.toLowerCase(),
        description: description || null,
        status: statusValue,
        version,
        isActive,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Erro ao salvar modelo");
      return;
    }

    setStatus("Modelo atualizado");
    router.refresh();
  }

  async function removeTemplate() {
    const confirmed = window.confirm("Arquivar este modelo (exclusao logica)?");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/templates/${template.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      router.push("/templates");
      router.refresh();
    }
  }

  async function createSection() {
    if (!sectionTitle.trim()) {
      return;
    }

    const response = await fetch(`/api/templates/${template.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: sectionTitle, order: template.sections.length }),
    });

    if (response.ok) {
      setSectionTitle("");
      router.refresh();
    }
  }

  async function updateSection(
    sectionId: string,
    input: { title: string; description?: string | null; order?: number },
  ) {
    await fetch(`/api/sections/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    router.refresh();
  }

  async function removeSection(sectionId: string) {
    await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function createField(sectionId: string) {
    await fetch(`/api/sections/${sectionId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Novo campo",
        name: `campo_${Date.now()}`,
        type: "TEXT",
        required: false,
      }),
    });

    router.refresh();
  }

  async function updateField(
    fieldId: string,
    input: Partial<{
      label: string;
      name: string;
      type: FieldType;
      required: boolean;
      order: number;
      placeholder: string | null;
      helpText: string | null;
      options: string[] | null;
    }>,
  ) {
    await fetch(`/api/fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    router.refresh();
  }

  async function removeField(fieldId: string) {
    await fetch(`/api/fields/${fieldId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4 p-4 md:p-6">
        <h2 className="text-2xl uppercase">Configuracoes do modelo</h2>

        <div className="grid gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-slate-600 md:grid-cols-2">
          <p>
            Criado em:{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(template.createdAt)}
          </p>
          <p>
            Atualizado em:{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(template.updatedAt)}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Titulo</label>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Descricao</label>
            <textarea
              className="input min-h-24"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={statusValue}
              onChange={(event) =>
                setStatusValue(event.target.value as Template["status"])
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <div>
            <label className="label">Versao</label>
            <input
              className="input"
              type="number"
              min={1}
              value={version}
              onChange={(event) => setVersion(Number(event.target.value || 1))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Aceitar novas submisses
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={saveTemplate}>
            Salvar modelo
          </button>
          <button type="button" className="btn-secondary" onClick={removeTemplate}>
            Arquivar modelo
          </button>
        </div>

        {status ? <p className="text-sm text-brand-700">{status}</p> : null}
      </section>

      <section className="card space-y-4 p-4 md:p-6">
        <h2 className="text-2xl uppercase">Secoes e campos dinamicos</h2>

        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Nova secao"
            value={sectionTitle}
            onChange={(event) => setSectionTitle(event.target.value)}
          />
          <button type="button" className="btn-primary" onClick={createSection}>
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {template.sections.map((section) => (
            <article key={section.id} className="rounded-xl border border-brand-200 p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div>
                  <label className="label">Titulo da secao</label>
                  <input
                    className="input"
                    defaultValue={section.title}
                    onBlur={(event) =>
                      updateSection(section.id, {
                        title: event.currentTarget.value,
                        order: section.order,
                      })
                    }
                  />
                </div>
                <button type="button" className="btn-secondary" onClick={() => createField(section.id)}>
                  Novo campo
                </button>
                <button type="button" className="btn-secondary" onClick={() => removeSection(section.id)}>
                  Excluir secao
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {section.fields.map((field) => (
                  <div key={field.id} className="grid gap-2 rounded-lg border border-brand-100 p-2 md:grid-cols-6">
                    <input
                      className="input md:col-span-2"
                      defaultValue={field.label}
                      onBlur={(event) => updateField(field.id, { label: event.currentTarget.value })}
                    />
                    <input
                      className="input"
                      defaultValue={field.name}
                      onBlur={(event) => updateField(field.id, { name: event.currentTarget.value })}
                    />
                    <select
                      className="input"
                      defaultValue={field.type}
                      onChange={(event) => updateField(field.id, { type: event.currentTarget.value as FieldType })}
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 rounded-lg border border-brand-200 px-3 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        defaultChecked={field.required}
                        onChange={(event) => updateField(field.id, { required: event.currentTarget.checked })}
                      />
                      Obrigatorio
                    </label>
                    <button type="button" className="btn-secondary" onClick={() => removeField(field.id)}>
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
