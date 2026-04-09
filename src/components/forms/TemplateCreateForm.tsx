"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  isActive: boolean;
};

const initialState: FormState = {
  title: "",
  slug: "",
  description: "",
  status: "DRAFT",
  version: 1,
  isActive: true,
};

export function TemplateCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: form.slug.trim().toLowerCase(),
        description: form.description || null,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? "Nao foi possivel criar o modelo.");
      return;
    }

    router.push(`/templates/${payload.template.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-4 md:p-6">
      <div>
        <label className="label" htmlFor="title">
          Titulo do modelo
        </label>
        <input
          id="title"
          className="input"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="slug">
          Slug publico
        </label>
        <input
          id="slug"
          className="input"
          value={form.slug}
          onChange={(event) =>
            setForm((current) => ({ ...current, slug: event.target.value }))
          }
          required
          placeholder="laudo-pericia-mecanica"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descricao
        </label>
        <textarea
          id="description"
          className="input min-h-24"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="input"
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as FormState["status"],
              }))
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="version">
            Versao
          </label>
          <input
            id="version"
            className="input"
            type="number"
            min={1}
            value={form.version}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                version: Number(event.target.value || 1),
              }))
            }
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) =>
            setForm((current) => ({ ...current, isActive: event.target.checked }))
          }
        />
        Modelo ativo para receber submisses
      </label>

      {error ? (
        <p className="rounded-lg border border-danger-700/20 bg-danger-100 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Criando..." : "Criar modelo"}
      </button>
    </form>
  );
}
