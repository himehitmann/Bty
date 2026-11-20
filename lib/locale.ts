export const localeOptions = [
  { value: "fr", intl: "fr-FR", name: "Français" },
  { value: "en", intl: "en-GB", name: "English" },
  { value: "es", intl: "es-ES", name: "Español" },
  { value: "it", intl: "it-IT", name: "Italiano" },
] as const;

export type Locale = (typeof localeOptions)[number]["value"];

export function isLocale(value: unknown): value is Locale {
  return localeOptions.some((option) => option.value === value);
}
