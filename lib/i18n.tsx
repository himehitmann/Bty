"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocale, localeOptions, type Locale } from "./locale";
import { translate } from "./translations";

export type { Locale } from "./locale";

const localeKey = "navier-locale";
const localeEvent = "navier-locale-change";

export function readBrowserLocale(): Locale {
  try {
    const stored = localStorage.getItem(localeKey);
    return isLocale(stored) ? stored : "fr";
  } catch {
    return "fr";
  }
}

function createLocale(locale: Locale) {
  const intlLocale = localeOptions.find((option) => option.value === locale)?.intl ?? "fr-FR";
  return {
    locale,
    intlLocale,
    t: (french: string, english: string) => translate(locale, french, english),
    formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale, options).format(date),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intlLocale, options).format(value),
  };
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
      const updated = (event as CustomEvent<unknown>).detail;
      if (isLocale(updated)) setSavedLocale(updated);
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
  const { locale, t } = useLocale();
  if (typeof fr === "string" && typeof en === "string") return t(fr, en);
  return locale === "fr" ? fr : en;
}
