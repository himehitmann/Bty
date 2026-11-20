"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";

const localeKey = "navier-locale";
const localeEvent = "navier-locale-change";
const locales = { fr: "fr-FR", en: "en-GB" } satisfies Record<Locale, string>;
type Translate = (french: string, english: string) => string;

export function readBrowserLocale(): Locale {
  try { return localStorage.getItem(localeKey) === "en" ? "en" : "fr"; }
  catch { return "fr"; }
}

function createLocale(locale: Locale) {
  const t: Translate = (french, english) => locale === "en" ? english : french;
  function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locales[locale], options).format(date);
  }
  function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locales[locale], options).format(value);
  }
  return { locale, intlLocale: locales[locale], t, formatDate, formatNumber };
}

const LocaleContext = createContext(createLocale("fr"));

export function LocaleProvider({ locale, children }: { locale?: Locale; children: ReactNode }) {
  const [savedLocale, setSavedLocale] = useState<Locale>("fr");

  useEffect(() => {
    function syncSavedLocale() {
      setSavedLocale(readBrowserLocale());
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === localeKey || event.key === null) syncSavedLocale();
    }
    function syncLocale(event: Event) {
      const updated = (event as CustomEvent<Locale>).detail;
      if (updated === "fr" || updated === "en") setSavedLocale(updated);
    }
    syncSavedLocale();
    window.addEventListener(localeEvent, syncLocale);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(localeEvent, syncLocale);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const current = locale ?? savedLocale;
  useEffect(() => {
    document.documentElement.lang = current;
    if (locale) {
      setSavedLocale(current);
      try {
        if (localStorage.getItem(localeKey) !== current) {
          localStorage.setItem(localeKey, current);
        }
      } catch { /* Persistence is optional. */ }
      window.dispatchEvent(new CustomEvent<Locale>(localeEvent, { detail: current }));
    }
  }, [current, locale]);

  const context = useMemo(() => createLocale(current), [current]);
  return <LocaleContext.Provider value={context}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function Localized({ fr, en }: { fr: ReactNode; en: ReactNode }) {
  return useLocale().locale === "en" ? en : fr;
}
