"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELD_TYPES, type FieldType } from "@/domain/laudos/types";

type BuilderField = {
  id: string;
  sectionId: string;
  label: string;
  name: string;
  type: FieldType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  order: number;
  defaultValue: unknown;
  mask: string | null;
  isActive: boolean;
  options: unknown;
};

type BuilderSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  fields: BuilderField[];
};

type BuilderTemplate = {
  id: string;
  title: string;
  slug: string;
  sections: BuilderSection[];
};

type Props = {
  template: BuilderTemplate;
};

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function optionsToString(options: unknown) {
  if (!Array.isArray(options)) {
    return "";
  }

  return options.filter((item) => typeof item === "string").join(", ");
}

export function FormBuilder({ template }: Props) {
  const router = useRouter();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    template.sections[0]?.id ?? null,
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("TEXT");
  const [status, setStatus] = useState<string | null>(null);

  const selectedSection = useMemo(
    () => template.sections.find((section) => section.id === selectedSectionId) ?? null,
    [template.sections, selectedSectionId],
  );

  async function createField() {
    if (!selectedSection) {
      setStatus("Selecione uma secao.");
      return;
    }

    if (!newFieldLabel.trim()) {
      setStatus("Informe o label do campo.");
      return;
    }

    const response = await fetch(`/api/sections/${selectedSection.id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newFieldLabel.trim(),
        name: slugifyName(newFieldLabel),
        type: newFieldType,
        required: false,
        isActive: true,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao criar campo.");
      return;
    }

    setNewFieldLabel("");
    setNewFieldType("TEXT");
    setStatus("Campo criado com sucesso.");
    router.refresh();
  }

  async function updateField(
    fieldId: string,
    values: {
      label: string;
      name: string;
      type: FieldType;
      placeholder: string;
      helpText: string;
      required: boolean;
      defaultValue: string;
      mask: string;
      isActive: boolean;
      options: string;
      order: number;
    },
  ) {
    const response = await fetch(`/api/fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: values.label,
        name: values.name,
        type: values.type,
        placeholder: values.placeholder || null,
        helpText: values.helpText || null,
        required: values.required,
        order: values.order,
        defaultValue: values.defaultValue || null,
        mask: values.mask || null,
        isActive: values.isActive,
        options: values.options
          ? values.options
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : null,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao atualizar campo.");
      return;
    }

    setStatus("Campo atualizado.");
    router.refresh();
  }

  async function deleteField(fieldId: string) {
    const confirmed = window.confirm("Excluir este campo?");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/fields/${fieldId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatus("Nao foi possivel excluir o campo.");
      return;
    }

    setStatus("Campo excluido.");
    router.refresh();
  }

  async function reorderFields(index: number, direction: "up" | "down") {
    if (!selectedSection) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= selectedSection.fields.length) {
      return;
    }

    const nextIds = selectedSection.fields.map((field) => field.id);
    const currentId = nextIds[index];
    nextIds[index] = nextIds[targetIndex];
    nextIds[targetIndex] = currentId;

    const response = await fetch(`/api/sections/${selectedSection.id}/fields/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldIds: nextIds }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Falha ao reordenar campos.");
      return;
    }

    setStatus("Ordem dos campos atualizada.");
    router.refresh();
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="card h-fit p-4">
        <p className="text-xs font-semibold uppercase text-brand-700">Secoes</p>
        <h2 className="text-2xl uppercase">{template.title}</h2>

        <div className="mt-3 space-y-2">
          {template.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSelectedSectionId(section.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                selectedSectionId === section.id
                  ? "border-brand-600 bg-brand-100 text-brand-700"
                  : "border-brand-200 text-slate-700"
              }`}
            >
              <p className="font-semibold">{section.title}</p>
              <p className="text-xs text-slate-500">Ordem: {section.order + 1}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="card p-4 md:p-6">
          <h3 className="text-2xl uppercase">Novo campo</h3>
          <p className="text-sm text-slate-600">
            Adicione campos para a secao selecionada.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px_auto]">
            <input
              className="input"
              placeholder="Label do campo"
              value={newFieldLabel}
              onChange={(event) => setNewFieldLabel(event.target.value)}
              disabled={!selectedSection}
            />
            <select
              className="input"
              value={newFieldType}
              onChange={(event) => setNewFieldType(event.target.value as FieldType)}
              disabled={!selectedSection}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={createField} disabled={!selectedSection}>
              Criar campo
            </button>
          </div>
        </div>

        {!selectedSection ? (
          <div className="card border-dashed p-8 text-center">
            <p className="text-lg font-semibold text-slate-700">Nenhuma secao selecionada</p>
            <p className="text-sm text-slate-600">Crie secoes primeiro e selecione uma para montar o formulario.</p>
          </div>
        ) : selectedSection.fields.length === 0 ? (
          <div className="card border-dashed p-8 text-center">
            <p className="text-lg font-semibold text-slate-700">Sem campos nesta secao</p>
            <p className="text-sm text-slate-600">Crie o primeiro campo para comecar o builder.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSection.fields.map((field, index) => (
              <FieldRow
                key={field.id}
                field={field}
                canMoveDown={index < selectedSection.fields.length - 1}
                canMoveUp={index > 0}
                onDelete={deleteField}
                onMove={reorderFields}
                onSave={updateField}
                index={index}
              />
            ))}
          </div>
        )}

        {status ? <p className="text-sm text-brand-700">{status}</p> : null}
      </div>
    </section>
  );
}

type FieldRowProps = {
  field: BuilderField;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (index: number, direction: "up" | "down") => Promise<void>;
  onSave: (
    fieldId: string,
    values: {
      label: string;
      name: string;
      type: FieldType;
      placeholder: string;
      helpText: string;
      required: boolean;
      defaultValue: string;
      mask: string;
      isActive: boolean;
      options: string;
      order: number;
    },
  ) => Promise<void>;
  onDelete: (fieldId: string) => Promise<void>;
};

function FieldRow({
  field,
  index,
  canMoveUp,
  canMoveDown,
  onMove,
  onSave,
  onDelete,
}: FieldRowProps) {
  const [label, setLabel] = useState(field.label);
  const [name, setName] = useState(field.name);
  const [type, setType] = useState<FieldType>(field.type);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [helpText, setHelpText] = useState(field.helpText ?? "");
  const [required, setRequired] = useState(field.required);
  const [defaultValue, setDefaultValue] = useState(
    field.defaultValue === null || field.defaultValue === undefined
      ? ""
      : String(field.defaultValue),
  );
  const [mask, setMask] = useState(field.mask ?? "");
  const [isActive, setIsActive] = useState(field.isActive);
  const [options, setOptions] = useState(optionsToString(field.options));

  return (
    <article className="card p-4 md:p-5">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_220px]">
        <div>
          <label className="label">Label</label>
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={type} onChange={(event) => setType(event.target.value as FieldType)}>
            {FIELD_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div>
          <label className="label">Placeholder</label>
          <input
            className="input"
            value={placeholder}
            onChange={(event) => setPlaceholder(event.target.value)}
          />
        </div>
        <div>
          <label className="label">HelpText</label>
          <input className="input" value={helpText} onChange={(event) => setHelpText(event.target.value)} />
        </div>
        <div>
          <label className="label">Valor padrao</label>
          <input
            className="input"
            value={defaultValue}
            onChange={(event) => setDefaultValue(event.target.value)}
          />
        </div>
        <div>
          <label className="label">Mask (opcional)</label>
          <input className="input" value={mask} onChange={(event) => setMask(event.target.value)} />
        </div>
      </div>

      <div className="mt-2">
        <label className="label">Opcoes (select/radio/multiselect)</label>
        <input
          className="input"
          placeholder="opcao_1, opcao_2, opcao_3"
          value={options}
          onChange={(event) => setOptions(event.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          Obrigatorio
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Ativo
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => onMove(index, "up")} disabled={!canMoveUp}>
          Subir
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onMove(index, "down")}
          disabled={!canMoveDown}
        >
          Descer
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onSave(field.id, {
              label,
              name,
              type,
              placeholder,
              helpText,
              required,
              defaultValue,
              mask,
              isActive,
              options,
              order: field.order,
            })
          }
        >
          Salvar campo
        </button>
        <button type="button" className="btn-secondary" onClick={() => onDelete(field.id)}>
          Excluir campo
        </button>
      </div>
    </article>
  );
}
