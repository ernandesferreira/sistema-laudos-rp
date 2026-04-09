"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Section = {
  id: string;
  title: string;
  description: string | null;
  order: number;
};

type Props = {
  templateId: string;
  sections: Section[];
};

export function TemplateSectionsManager({ templateId, sections }: Props) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function createSection() {
    if (!newTitle.trim()) {
      setStatus("Informe o titulo da secao.");
      return;
    }

    setIsBusy(true);
    setStatus(null);

    const response = await fetch(`/api/templates/${templateId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao criar secao.");
      setIsBusy(false);
      return;
    }

    setNewTitle("");
    setNewDescription("");
    setStatus("Secao criada com sucesso.");
    setIsBusy(false);
    router.refresh();
  }

  async function saveSection(sectionId: string, data: { title: string; description: string; order: number }) {
    const response = await fetch(`/api/sections/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        order: data.order,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao salvar secao.");
      return;
    }

    setStatus("Secao atualizada.");
    router.refresh();
  }

  async function deleteSection(sectionId: string) {
    const confirmed = window.confirm("Excluir esta secao? Os campos dela tambem serao removidos.");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/sections/${sectionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatus("Nao foi possivel excluir a secao.");
      return;
    }

    setStatus("Secao excluida.");
    router.refresh();
  }

  async function reorder(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sections.length) {
      return;
    }

    const nextIds = sections.map((item) => item.id);
    const currentId = nextIds[index];
    nextIds[index] = nextIds[targetIndex];
    nextIds[targetIndex] = currentId;

    const response = await fetch(`/api/templates/${templateId}/sections/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: nextIds }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao reordenar secoes.");
      return;
    }

    setStatus("Ordem atualizada.");
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-2xl uppercase">Secoes do modelo</h2>
        <p className="text-sm text-slate-600">
          Crie, edite, exclua e reorganize as secoes deste modelo.
        </p>
      </div>

      <div className="grid gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          className="input"
          placeholder="Titulo da nova secao"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <input
          className="input"
          placeholder="Descricao (opcional)"
          value={newDescription}
          onChange={(event) => setNewDescription(event.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={createSection}
          disabled={isBusy}
        >
          {isBusy ? "Criando..." : "Adicionar secao"}
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-300 p-6 text-center">
          <p className="text-base font-semibold text-slate-700">Nenhuma secao cadastrada</p>
          <p className="text-sm text-slate-600">Adicione a primeira secao para estruturar o laudo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <SectionEditorRow
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onSave={saveSection}
              onDelete={deleteSection}
              onMove={reorder}
            />
          ))}
        </div>
      )}

      {status ? <p className="text-sm text-brand-700">{status}</p> : null}
    </section>
  );
}

type RowProps = {
  section: Section;
  index: number;
  total: number;
  onSave: (sectionId: string, data: { title: string; description: string; order: number }) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
  onMove: (index: number, direction: "up" | "down") => Promise<void>;
};

function SectionEditorRow({ section, index, total, onSave, onDelete, onMove }: RowProps) {
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? "");

  return (
    <article className="rounded-xl border border-brand-200 p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end">
        <div>
          <label className="label">Titulo</label>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label className="label">Descricao</label>
          <input
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onMove(index, "up")}
          disabled={index === 0}
        >
          Subir
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onMove(index, "down")}
          disabled={index === total - 1}
        >
          Descer
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onSave(section.id, {
              title,
              description,
              order: section.order,
            })
          }
        >
          Salvar
        </button>
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>Ordem atual: {section.order + 1}</span>
        <button type="button" className="text-danger-700 underline" onClick={() => onDelete(section.id)}>
          Excluir secao
        </button>
      </div>
    </article>
  );
}
