import type { Product } from "@/lib/model";

export const localCatalog: readonly Product[] = [
  {
    id: "local-gel-nettoyant",
    name: "Gel nettoyant doux",
    brand: "Formule indicative",
    category: "soin",
    ingredients: "Aqua, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Sodium Chloride, Citric Acid, Sodium Benzoate",
    source: "local",
    tint: "#e8d8cd",
  },
  {
    id: "local-serum-niacinamide",
    name: "Sérum niacinamide",
    brand: "Formule indicative",
    category: "soin",
    ingredients: "Aqua, Niacinamide, Glycerin, Panthenol, Zinc PCA, Xanthan Gum, Phenoxyethanol",
    source: "local",
    tint: "#e7d9e4",
  },
  {
    id: "local-creme-hydratante",
    name: "Crème hydratante",
    brand: "Formule indicative",
    category: "soin",
    ingredients: "Aqua, Glycerin, Squalane, Cetearyl Alcohol, Butyrospermum Parkii Butter, Ceramide NP, Xanthan Gum, Phenoxyethanol",
    source: "local",
    tint: "#efdcd1",
  },
  {
    id: "local-serum-retinol",
    name: "Sérum au rétinol",
    brand: "Formule indicative",
    category: "soin",
    ingredients: "Squalane, Caprylic/Capric Triglyceride, Retinol, Tocopherol",
    source: "local",
    tint: "#ede0cf",
  },
  {
    id: "local-blush-creme",
    name: "Blush crème rose",
    brand: "Formule indicative",
    category: "maquillage",
    ingredients: "Ricinus Communis Seed Oil, Caprylic/Capric Triglyceride, Cera Alba, Tocopherol, CI 77491, CI 77891",
    source: "local",
    tint: "#d49a9b",
  },
  {
    id: "local-baume-levres",
    name: "Baume à lèvres teinté",
    brand: "Formule indicative",
    category: "maquillage",
    ingredients: "Ricinus Communis Seed Oil, Butyrospermum Parkii Butter, Cera Alba, Tocopherol, CI 15850",
    source: "local",
    tint: "#d9a5a7",
  },
  {
    id: "local-fard-paupieres",
    name: "Fard à paupières satiné",
    brand: "Formule indicative",
    category: "maquillage",
    ingredients: "Mica, Silica, Dimethicone, Lauroyl Lysine, CI 77491, CI 77499, CI 77891",
    source: "local",
    tint: "#cbb2a2",
  },
  {
    id: "local-shampooing-doux",
    name: "Shampooing doux",
    brand: "Formule indicative",
    category: "cheveux",
    ingredients: "Aqua, Sodium Cocoyl Isethionate, Cocamidopropyl Betaine, Glycerin, Panthenol, Parfum, Citric Acid, Sodium Benzoate",
    source: "local",
    tint: "#dedecb",
  },
  {
    id: "local-apres-shampooing",
    name: "Après-shampooing démêlant",
    brand: "Formule indicative",
    category: "cheveux",
    ingredients: "Aqua, Cetearyl Alcohol, Behentrimonium Chloride, Glycerin, Panthenol, Lactic Acid, Phenoxyethanol",
    source: "local",
    tint: "#e1ddce",
  },
];

export function normalizeCatalogText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function searchLocalCatalog(query: string): Product[] {
  const words = normalizeCatalogText(query).trim().split(/\s+/).filter(Boolean);

  return localCatalog.filter((product) => {
    const text = normalizeCatalogText(
      [product.name, product.brand, product.category, product.ingredients, product.barcode].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}
