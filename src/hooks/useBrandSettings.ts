"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BRAND_SETTINGS_COOKIE_KEY,
  BRAND_SETTINGS_STORAGE_KEY,
  DEFAULT_BRAND_SETTINGS,
  parseBrandSettings,
  serializeBrandSettings,
  sanitizeBrandSettings,
  type BrandSettings,
} from "@/lib/brandSettings";

const BRAND_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function persistBrandCookie(settings: BrandSettings) {
  const serialized = serializeBrandSettings(settings);
  document.cookie = `${BRAND_SETTINGS_COOKIE_KEY}=${serialized}; path=/; max-age=${BRAND_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearBrandCookie() {
  document.cookie = `${BRAND_SETTINGS_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function useBrandSettings() {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BRAND_SETTINGS_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BrandSettings>;
        setSettings(sanitizeBrandSettings(parsed));
      } else {
        const cookiePair = document.cookie
          .split(";")
          .map((item) => item.trim())
          .find((item) => item.startsWith(`${BRAND_SETTINGS_COOKIE_KEY}=`));

        const rawCookie = cookiePair?.slice(`${BRAND_SETTINGS_COOKIE_KEY}=`.length) ?? null;
        setSettings(parseBrandSettings(rawCookie));
      }
    } catch {
      setSettings(DEFAULT_BRAND_SETTINGS);
    } finally {
      setReady(true);
    }
  }, []);

  const api = useMemo(
    () => ({
      setBrandSettings(next: BrandSettings) {
        const sanitized = sanitizeBrandSettings(next);
        setSettings(sanitized);
        window.localStorage.setItem(BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
        persistBrandCookie(sanitized);
      },
      resetBrandSettings() {
        setSettings(DEFAULT_BRAND_SETTINGS);
        window.localStorage.removeItem(BRAND_SETTINGS_STORAGE_KEY);
        clearBrandCookie();
      },
    }),
    [],
  );

  return {
    settings,
    ready,
    ...api,
  };
}
