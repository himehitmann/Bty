import type { Preferences, Product, Routine } from "./model";

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const fragrance = /^(parfum|fragrance|aroma|limonene|linalool|citral|geraniol|eugenol|cinnamal|citronellol|coumarin)\b/;
const retinoid = /^(retinol|retinal|retinyl palmitate|retinyl acetate|hydroxypinacolone retinoate)\b/;
const exfoliant = /^(glycolic acid|lactic acid|mandelic acid|salicylic acid|gluconolactone|lactobionic acid)\b/;

export function ingredientList(ingredients: string) {
  return ingredients.split(/[,;\n]+/).map((ingredient) => ingredient.trim()).filter(Boolean);
}

export function analyzeProduct(product: Product, preferences: Preferences) {
  const entries = ingredientList(product.ingredients).map(normalize);
  if (!entries.length) return ["Composition indisponible. Consulte la liste sur l’emballage avant de tirer une conclusion."];
  const notes: string[] = [];
  const excluded = ingredientList(preferences.avoid);
  const found = excluded.filter((term) => entries.some((entry) => entry === normalize(term) || entry.startsWith(normalize(term) + " ")));
  if (found.length) notes.push(`Ingrédients à éviter selon tes préférences : ${found.join(", ")}.`);
  const scented = entries.some((entry) => fragrance.test(entry));
  if (scented && (preferences.fragranceFree || preferences.sensitive)) notes.push("La liste mentionne du parfum ou des composés parfumants. Vérifie la formule si tu souhaites les éviter.");
  if (preferences.sensitive && entries.some((entry) => retinoid.test(entry) || exfoliant.test(entry))) {
    notes.push("La liste mentionne un rétinoïde ou un acide parfois utilisé comme exfoliant. Leur tolérance dépend de la formule et de l’usage.");
  }
  return notes;
}

export function analyzeRoutine(routine: Routine, products: Product[], preferences: Preferences) {
  const ordered = routine.steps.flatMap((step) => {
    const product = products.find((item) => item.id === step.productId);
    return product ? [product] : [];
  });
  const entries = ordered.map((product) => ingredientList(product.ingredients).map(normalize));
  const retinoids = entries.flatMap((list, index) => list.some((entry) => retinoid.test(entry)) ? [index] : []);
  const exfoliants = entries.flatMap((list, index) => list.some((entry) => exfoliant.test(entry)) ? [index] : []);
  const notes: string[] = [];
  if (retinoids.some((index) => exfoliants.some((other) => other !== index))) {
    notes.push("Un rétinoïde et un acide sont repérés dans des produits distincts. Vérifie les notices avant de les superposer, surtout si ta peau réagit facilement.");
  }
  if (exfoliants.length > 1) notes.push("Plusieurs étapes contiennent des acides. Vérifie leur rôle et les conseils d’utilisation sur chaque emballage.");
  const firstMakeup = ordered.findIndex((item) => item.category === "maquillage");
  if (firstMakeup >= 0 && ordered.slice(firstMakeup + 1).some((item) => item.category === "soin")) {
    notes.push("Un soin suit une étape de maquillage. Vérifie si cet ordre convient au rendu voulu et aux notices de tes produits.");
  }
  for (const product of new Map(ordered.map((item) => [item.id, item])).values()) {
    notes.push(...analyzeProduct(product, preferences).map((note) => `${product.name} — ${note}`));
  }
  return notes;
}
