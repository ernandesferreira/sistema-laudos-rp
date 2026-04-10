import type { FieldType } from "@/domain/laudos/types";

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

type FieldRendererProps = {
  field: PublicField;
  value: unknown;
  error?: string;
  onChange: (next: unknown) => void;
};

function optionValues(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

function asString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

export function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const common = {
    id: field.id,
    name: field.name,
    required: field.required,
    className: "input",
    placeholder: field.placeholder ?? "",
  };

  const options = optionValues(field.options);
  const stringValue = asString(value);

  if (!field.isActive) {
    return null;
  }

  switch (field.type) {
    case "TEXTAREA":
    case "OBSERVATIONS":
      return (
        <textarea
          {...common}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input min-h-28 ${error ? "border-danger-700" : ""}`}
        />
      );

    case "NUMBER":
      return (
        <input
          {...common}
          type="number"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "DATE":
      return (
        <input
          {...common}
          type="date"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "TIME":
      return (
        <input
          {...common}
          type="time"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "DATETIME":
      return (
        <input
          {...common}
          type="datetime-local"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "SELECT":
      return (
        <select
          {...common}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        >
          <option value="">Selecione...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case "RADIO":
      return (
        <div className="space-y-2">
          {options.map((option) => {
            const checked = stringValue === option;

            return (
              <label
                key={option}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-100 transition ${
                  checked
                    ? "border-sky-400/80 bg-sky-500/20"
                    : "border-slate-700/80 bg-slate-900/35"
                }`}
              >
                <input
                  type="radio"
                  name={field.name}
                  checked={checked}
                  onChange={() => onChange(option)}
                  className="h-4 w-4 accent-sky-400"
                />
                {option}
              </label>
            );
          })}
        </div>
      );

    case "MULTISELECT": {
      const selected = asStringArray(value);
      return (
        <div className="space-y-2">
          {options.map((option) => {
            const checked = selected.includes(option);

            return (
              <label
                key={option}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-100 transition ${
                  checked
                    ? "border-sky-400/80 bg-sky-500/20"
                    : "border-slate-700/80 bg-slate-900/35"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  className="h-4 w-4 accent-sky-400"
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...selected, option]);
                      return;
                    }

                    onChange(selected.filter((item) => item !== option));
                  }}
                />
                {option}
              </label>
            );
          })}
        </div>
      );
    }

    case "CHECKBOX":
      const checked = asBoolean(value);

      return (
        <label
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-100 transition ${
            checked
              ? "border-sky-400/80 bg-sky-500/20"
              : "border-slate-700/80 bg-slate-900/35"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            className="h-4 w-4 accent-sky-400"
            onChange={(event) => onChange(event.target.checked)}
          />
          Confirmar
        </label>
      );

    case "FILE_FAKE":
      return (
        <div className="space-y-1">
          <input
            {...common}
            type="text"
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder ?? "Ex.: anexo_foto_placa.jpg"}
            className={`input ${error ? "border-danger-700" : ""}`}
          />
          <p className="text-xs text-slate-500">Upload real sera adicionado em versao futura.</p>
        </div>
      );

    case "SIGNATURE_TEXT":
      return (
        <input
          {...common}
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "Digite seu nome como assinatura"}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "CPF_FAKE":
      return (
        <input
          {...common}
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "000.000.000-00"}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "RG_FAKE":
      return (
        <input
          {...common}
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "00.000.000-0"}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    case "PLATE":
      return (
        <input
          {...common}
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder={field.placeholder ?? "AAA-0A00"}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );

    default:
      return (
        <input
          {...common}
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          className={`input ${error ? "border-danger-700" : ""}`}
        />
      );
  }
}
