import type { Preferences, Product, Routine } from "./model";

type AnalysisLocale = "fr" | "en";

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const fragrance = /^(parfum|fragrance|aroma|limonene|linalool|citral|geraniol|eugenol|cinnamal|citronellol|coumarin)\b/;
const retinoid = /^(retinol|retinal|retinyl palmitate|retinyl acetate|hydroxypinacolone retinoate)\b/;
const exfoliant = /^(glycolic acid|lactic acid|mandelic acid|salicylic acid|gluconolactone|lactobionic acid)\b/;

export function ingredientList(ingredients: string) {
  const entries: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < ingredients.length; index += 1) {
    const character = ingredients[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (depth > 0 || !/[,;\n]/.test(character)) continue;

    // INCI locants can have internal commas, as in 1,2-Hexanediol.
    if (character === "," && /\d/.test(ingredients[index - 1] ?? "") && /\d/.test(ingredients[index + 1] ?? "")) continue;
    entries.push(ingredients.slice(start, index).trim());
    start = index + 1;
  }
  entries.push(ingredients.slice(start).trim());
  return entries.filter(Boolean);
}

function ingredientNames(ingredients: string) {
  return ingredientList(ingredients.replace(/[()]/g, ",")).map(normalize);
}

export function analyzeProduct(product: Product, preferences: Preferences, locale: AnalysisLocale = "fr") {
  const t = (fr: string, en: string) => locale === "en" ? en : fr;
  const entries = ingredientNames(product.ingredients);
  if (!entries.length) return [t(
    "Composition indisponible. Consulte la liste sur l’emballage avant de tirer une conclusion.",
    "Ingredients unavailable. Check the list on the packaging before drawing a conclusion.",
  )];
  const notes: string[] = [];
  const excluded = ingredientList(preferences.avoid);
  const found = excluded.filter((term) => entries.some((entry) => entry === normalize(term) || entry.startsWith(normalize(term) + " ")));
  if (found.length) notes.push(t(
    `Présence d’ingrédients que tu souhaites éviter — ${found.join(", ")}.`,
    `Contains ingredients you want to avoid — ${found.join(", ")}.`,
  ));
  const scented = entries.some((entry) => fragrance.test(entry));
  if (scented && (preferences.fragranceFree || preferences.sensitive)) notes.push(t(
    "La liste mentionne du parfum ou des composés parfumants. Vérifie la formule si tu souhaites les éviter.",
    "The ingredient list mentions fragrance or fragrance compounds. Check the formula if you want to avoid them.",
  ));
  if (preferences.sensitive && entries.some((entry) => retinoid.test(entry) || exfoliant.test(entry))) {
    notes.push(t(
      "La liste mentionne un rétinoïde ou un acide parfois utilisé comme exfoliant. Leur tolérance dépend de la formule et de l’usage.",
      "The list mentions a retinoid or an acid sometimes used for exfoliation. How well you tolerate it depends on the formula and how you use it.",
    ));
  }
  return notes;
}

export function analyzeRoutine(routine: Routine, products: Product[], preferences: Preferences, locale: AnalysisLocale = "fr") {
  const t = (fr: string, en: string) => locale === "en" ? en : fr;
  const ordered = routine.steps.flatMap((step) => {
    const product = products.find((item) => item.id === step.productId);
    return product ? [product] : [];
  });
  const entries = ordered.map((product) => ingredientNames(product.ingredients));
  const retinoids = entries.flatMap((list, index) => list.some((entry) => retinoid.test(entry)) ? [index] : []);
  const exfoliants = entries.flatMap((list, index) => list.some((entry) => exfoliant.test(entry)) ? [index] : []);
  const notes: string[] = [];
  if (retinoids.some((index) => exfoliants.some((other) => other !== index))) {
    notes.push(t(
      "Un rétinoïde et un acide sont repérés dans des produits distincts. Vérifie les notices avant de les superposer, surtout si ta peau réagit facilement.",
      "A retinoid and an acid appear in different products. Read the product instructions before layering them, especially if your skin reacts easily.",
    ));
  }
  if (exfoliants.length > 1) notes.push(t(
    "Plusieurs étapes contiennent des acides. Vérifie leur rôle et les conseils d’utilisation sur chaque emballage.",
    "Several steps contain acids. Check their intended purpose and each product’s instructions.",
  ));
  const firstMakeup = ordered.findIndex((item) => item.category === "maquillage");
  if (firstMakeup >= 0 && ordered.slice(firstMakeup + 1).some((item) => item.category === "soin")) {
    notes.push(t(
      "Un soin suit une étape de maquillage. Vérifie si cet ordre convient au rendu voulu et aux notices de tes produits.",
      "A skincare step follows makeup. Check that the order suits the finish you want and the product instructions.",
    ));
  }
  for (const product of new Map(ordered.map((item) => [item.id, item])).values()) {
    notes.push(...analyzeProduct(product, preferences, locale).map((note) => `${product.name} — ${note}`));
  }
  return notes;
}
