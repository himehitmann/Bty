import type { Locale } from "../locale";
import account from "./account.json";
import analysis from "./analysis.json";
import home from "./home.json";
import inventory from "./inventory.json";
import journal from "./journal.json";
import lists from "./lists.json";
import palette from "./palette.json";
import placements from "./placements.json";
import plans from "./plans.json";
import privacy from "./privacy.json";
import publicAndProfile from "./public-and-profile.json";
import routines from "./routines.json";
import studio from "./studio.json";
import tutorials from "./tutorials.json";
import workspace from "./workspace.json";

const translations: Readonly<Record<string, readonly string[]>> = {
  ...account,
  ...analysis,
  ...publicAndProfile,
  ...journal,
  ...plans,
  ...tutorials,
  ...routines,
  ...palette,
  ...inventory,
  ...lists,
  ...studio,
  ...placements,
  ...home,
  ...workspace,
  ...privacy,
};
const placeholders = /\{(\d+)\}/g;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const templates = Object.entries(translations).flatMap(([key, translated]) => {
  const parts = key.split(placeholders);
  if (parts.length < 3 || !parts.some((part, index) => index % 2 === 0 && /\p{L}{2}/u.test(part))) return [];
  const slots: number[] = [];
  let specificity = 0;
  const pattern = parts.map((part, index) => {
    if (index % 2 === 0) {
      specificity += part.length;
      return escapeRegex(part);
    }
    slots.push(Number(part));
    return "(.*?)";
  }).join("");
  return [{ expression: new RegExp(`^${pattern}$`, "su"), slots, translated, specificity }];
}).sort((left, right) => right.specificity - left.specificity);

export function translate(locale: Locale, french: string, english: string): string {
  if (locale === "fr") return french;
  if (locale === "en") return english;

  const language = locale === "es" ? 0 : 1;
  if (Object.hasOwn(translations, english)) return translations[english][language] ?? english;
  for (const { expression, slots, translated } of templates) {
    const match = expression.exec(english);
    const message = translated[language];
    if (!match || !message) continue;
    return message.replace(placeholders, (token, slot: string) => {
      const index = slots.indexOf(Number(slot));
      return index < 0 ? token : match[index + 1];
    });
  }
  return english;
}
