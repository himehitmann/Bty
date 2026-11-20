import type { Product } from "./model";

export const upcomingWindowDays = 30;

const calendarDayMilliseconds = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });

export function localCalendarDate(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTrackingDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function dateAfterMonths(date: string, months: number) {
  const result = new Date(`${date}T00:00:00Z`);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months + 1, 0);
  result.setUTCDate(Math.min(day, result.getUTCDate()));
  if (result.getUTCFullYear() > 9999) return undefined;
  return result.toISOString().slice(0, 10);
}

export function getProductLifecycle(product: Pick<Product, "openedOn" | "paoMonths" | "expiresOn">, today = localCalendarDate()) {
  const paoDate = product.openedOn && product.paoMonths ? dateAfterMonths(product.openedOn, product.paoMonths) : undefined;
  const printDate = product.expiresOn;
  const deadline = printDate && (!paoDate || printDate <= paoDate)
    ? { date: printDate, source: "printed" as const }
    : paoDate ? { date: paoDate, source: "pao" as const } : undefined;

  if (!deadline) return { paoDate, deadline, status: "untracked" as const };

  const daysLeft = (Date.parse(deadline.date) - Date.parse(today)) / calendarDayMilliseconds;
  const status: keyof typeof lifecycleStatusLabels = daysLeft < 0 ? "past" : daysLeft === 0 ? "today" : daysLeft <= upcomingWindowDays ? "soon" : "upcoming";
  return { paoDate, deadline, status };
}

export const lifecycleStatusLabels = {
  past: "Repère dépassé",
  today: "Échéance aujourd’hui",
  soon: "À vérifier bientôt",
  upcoming: "Prochain repère",
} as const;
