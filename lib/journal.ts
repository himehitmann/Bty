import { z } from "zod";

export const journalComfort = {
  comfortable: "Confortable",
  mixed: "Mitigé",
  uncomfortable: "Inconfortable",
} as const;

export const maxJournalProducts = 12;
export const journalPageSize = 60;
const snapshotSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().trim().min(1).max(140),
});

export const journalEntrySchema = z.object({
  entry_date: z.iso.date(),
  comfort: z.enum(["comfortable", "mixed", "uncomfortable"]),
  routine: snapshotSchema.nullable(),
  products: z.array(snapshotSchema).max(maxJournalProducts)
    .refine((products) => new Set(products.map((product) => product.id)).size === products.length),
  notes: z.string().trim().max(500),
});

export const storedJournalEntrySchema = journalEntrySchema.extend({
  updated_at: z.iso.datetime({ offset: true }),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type StoredJournalEntry = z.infer<typeof storedJournalEntrySchema>;
export type JournalComfort = JournalEntry["comfort"];

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const dayOfWeek = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });

export function localDateKey(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function journalDateLabel(date: string): string {
  return longDate.format(new Date(date + "T12:00:00Z"));
}

export function makeJournalDays(today: string) {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() - (13 - index));
    return {
      date: date.toISOString().slice(0, 10),
      weekday: dayOfWeek.format(date),
      label: shortDate.format(date),
    };
  });
}

export function summarizeJournal(entries: JournalEntry[], dates: string[]) {
  const inPeriod = entries.filter((entry) => dates.includes(entry.entry_date));
  return {
    count: inPeriod.length,
    comfortable: inPeriod.filter((entry) => entry.comfort === "comfortable").length,
  };
}
