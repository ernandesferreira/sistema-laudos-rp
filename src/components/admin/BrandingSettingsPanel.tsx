"use client";

import { useState } from "react";
import { DEFAULT_BRAND_SETTINGS, type BrandSettings } from "@/lib/brandSettings";
import { useBrandSettings } from "@/hooks/useBrandSettings";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

export function BrandingSettingsPanel() {
  const { settings, ready, setBrandSettings, resetBrandSettings } = useBrandSettings();
  const [saved, setSaved] = useState(false);

  if (!ready) {
    return (
      <section className="card p-5 md:p-6">
        <p className="text-sm text-slate-300">Carregando configuracoes de branding...</p>
      </section>
    );
  }

  return (
    <BrandingSettingsEditor
      initialSettings={settings}
      saved={saved}
      onSavedChange={setSaved}
      setBrandSettings={setBrandSettings}
      resetBrandSettings={resetBrandSettings}
    />
  );
}

type BrandingSettingsEditorProps = {
  initialSettings: BrandSettings;
  saved: boolean;
  onSavedChange: (value: boolean) => void;
  setBrandSettings: (next: BrandSettings) => void;
  resetBrandSettings: () => void;
};

function BrandingSettingsEditor({
  initialSettings,
  saved,
  onSavedChange,
  setBrandSettings,
  resetBrandSettings,
}: BrandingSettingsEditorProps) {
  const [systemName, setSystemName] = useState(initialSettings.systemName);
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl);
  const [tagline, setTagline] = useState(initialSettings.tagline);

  function saveSettings() {
    setBrandSettings({
      systemName,
      logoUrl,
      tagline,
    });

    onSavedChange(true);
    window.setTimeout(() => onSavedChange(false), 1800);
  }

  function clearSettings() {
    resetBrandSettings();
    setSystemName(DEFAULT_BRAND_SETTINGS.systemName);
    setLogoUrl(DEFAULT_BRAND_SETTINGS.logoUrl);
    setTagline(DEFAULT_BRAND_SETTINGS.tagline);
    onSavedChange(false);
  }

  const previewName = systemName.trim() || DEFAULT_BRAND_SETTINGS.systemName;
  const previewTagline = tagline.trim() || DEFAULT_BRAND_SETTINGS.tagline;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="card p-5 md:p-6">
        <h2 className="text-2xl text-slate-100">Identidade do sistema</h2>
        <p className="mt-1 text-sm text-slate-400">
          Edite o nome e o logotipo para personalizar o painel administrativo.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="brand-system-name">
              Nome do sistema
            </label>
            <input
              id="brand-system-name"
              className="input"
              value={systemName}
              placeholder="Ex.: Sistema de Laudos RP"
              onChange={(event) => setSystemName(event.target.value)}
              maxLength={80}
            />
          </div>

          <div>
            <label className="label" htmlFor="brand-tagline">
              Subtitulo
            </label>
            <input
              id="brand-tagline"
              className="input"
              value={tagline}
              placeholder="Ex.: Investigacao e organizacao de solicitacoes RP"
              onChange={(event) => setTagline(event.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <label className="label" htmlFor="brand-logo-url">
              URL do logotipo
            </label>
            <input
              id="brand-logo-url"
              className="input"
              value={logoUrl}
              placeholder="https://..."
              onChange={(event) => setLogoUrl(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Pode ser uma URL publica ou um caminho local como /brand/logo.png.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={saveSettings}>
              Salvar identidade
            </button>
            <button type="button" className="btn-secondary" onClick={clearSettings}>
              Restaurar padrao
            </button>
            {saved ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                Atualizado
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <h2 className="text-2xl text-slate-100">Preview</h2>
        <p className="mt-1 text-sm text-slate-400">Como a marca aparece no sidebar e no topo.</p>

        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            {logoUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo do sistema"
                className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 via-sky-500/20 to-transparent text-sm font-semibold text-amber-100">
                {initialsFromName(previewName) || "RP"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-100">{previewName}</p>
              <p className="text-xs text-slate-400">{previewTagline}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
