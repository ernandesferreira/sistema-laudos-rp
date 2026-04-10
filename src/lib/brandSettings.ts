export const BRAND_SETTINGS_STORAGE_KEY = "rp_brand_settings_v1";
export const BRAND_SETTINGS_COOKIE_KEY = "rp_brand_settings_v1";

export type BrandSettings = {
  systemName: string;
  logoUrl: string;
  tagline: string;
};

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  systemName: "Sistema de Laudos RP",
  logoUrl: "",
  tagline: "Investigacao, organizacao e credibilidade nas solicitacoes RP",
};

export function sanitizeBrandSettings(input: Partial<BrandSettings> | null | undefined): BrandSettings {
  return {
    systemName: input?.systemName?.trim() || DEFAULT_BRAND_SETTINGS.systemName,
    logoUrl: input?.logoUrl?.trim() || "",
    tagline: input?.tagline?.trim() || DEFAULT_BRAND_SETTINGS.tagline,
  };
}

export function serializeBrandSettings(input: Partial<BrandSettings> | null | undefined) {
  const sanitized = sanitizeBrandSettings(input);
  return encodeURIComponent(JSON.stringify(sanitized));
}

export function parseBrandSettings(raw: string | null | undefined): BrandSettings {
  if (!raw) {
    return DEFAULT_BRAND_SETTINGS;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<BrandSettings>;
    return sanitizeBrandSettings(parsed);
  } catch {
    return DEFAULT_BRAND_SETTINGS;
  }
}
