import type { Product } from "@/lib/model";
import { catalogCommunityImageUrl, catalogImageUrl } from "./catalog-images";
import { manufacturerCatalog } from "./manufacturer-catalog";

export { catalogImageUrl } from "./catalog-images";

export type CatalogSearchMode = "all" | "brand";

// Open Beauty Facts product metadata (ODbL).
function offlineProduct(name: string, brand: string, barcode: string, category: Product["category"]): Product {
  return {
    id: `obf-${barcode}`,
    name,
    brand,
    barcode,
    category,
    ingredients: "",
    source: "open-beauty-facts",
    sourceUrl: `https://world.openbeautyfacts.org/product/${barcode}`,
  };
}

export const localCatalog: readonly Product[] = [
  offlineProduct("SA Smoothing Cleanser", "CeraVe", "3337875795456", "soin"),
  offlineProduct("Skin Renewing Night Cream", "CeraVe", "3337875903509", "soin"),
  offlineProduct("Effaclar Duo+", "La Roche-Posay", "3337875863377", "soin"),
  offlineProduct("Cicaplast Baume B5+", "La Roche-Posay", "3337875816847", "soin"),
  offlineProduct("Rouge Blush", "Dior", "3348901607339", "maquillage"),
  offlineProduct("Forever Nude Bronze", "Dior", "3348901746687", "maquillage"),
  offlineProduct("Baby Blush Duo", "Huda Beauty", "6294018409120", "maquillage"),
  offlineProduct("Blush Filter", "Huda Beauty", "88176321", "maquillage"),
  offlineProduct("Desert Dusk Palette", "Huda Beauty", "6291106031454", "maquillage"),
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
    makeupKind: "blush",
    makeupEffect: "tinted",
    ingredients: "Ricinus Communis Seed Oil, Caprylic/Capric Triglyceride, Cera Alba, Tocopherol, CI 77491, CI 77891",
    source: "local",
    tint: "#d49a9b",
  },
  {
    id: "local-baume-levres",
    name: "Baume à lèvres teinté",
    brand: "Formule indicative",
    category: "maquillage",
    makeupKind: "lip",
    makeupEffect: "tinted",
    ingredients: "Ricinus Communis Seed Oil, Butyrospermum Parkii Butter, Cera Alba, Tocopherol, CI 15850",
    source: "local",
    tint: "#d9a5a7",
  },
  {
    id: "local-fard-paupieres",
    name: "Fard à paupières satiné",
    brand: "Formule indicative",
    category: "maquillage",
    makeupKind: "eyeshadow",
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
  {
    id: "local-eau-de-parfum",
    name: "Eau de parfum florale",
    brand: "Formule indicative",
    category: "parfums",
    ingredients: "Alcohol Denat., Parfum, Aqua",
    source: "local",
    tint: "#ead9c9",
  },
];

export function normalizeCatalogText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function normalizeCatalogQuery(value: string): string {
  return normalizeCatalogText(value).replaceAll("œ", "oe").replaceAll("æ", "ae")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function catalogBarcode(value: string): string | undefined {
  const digits = value.replace(/[\s\p{Pd}]/gu, "");
  return /^\d{8,14}$/.test(digits) ? digits : undefined;
}

export function catalogBrandAlias(query: string): string | undefined {
  const name = normalizeCatalogQuery(query);
  return name === "huda" || name === "hudabeauty" || name === "huda beauty" ? "Huda Beauty" : undefined;
}

function matchWords(words: string[], text: string): boolean {
  const options = text.split(" ");
  return words.every((word) => options.some((option) => option.startsWith(word)));
}

function brandScore(value: string, query: string, words: string[]): number {
  const brand = normalizeCatalogQuery(value.replace(/^[a-z]{2}:/i, ""));
  if (!brand) return 0;
  if (brand === query || brand.replaceAll(" ", "") === query.replaceAll(" ", "")) return 90;
  if (brand.startsWith(`${query} `)) return 78;
  return matchWords(words, brand) ? 62 : 0;
}

export function matchesCatalogBrand(brands: readonly string[], query: string): boolean {
  const name = normalizeCatalogQuery(query);
  if (!name) return false;
  const words = name.split(" ");
  return brands.some((brand) => brandScore(brand, name, words) > 0);
}

function rankProduct(product: Product, query: string, words: string[], mode: CatalogSearchMode): number {
  const brand = Math.max(0, ...product.brand.split(/[,;|]/).map((part) => brandScore(part, query, words)));
  if (mode === "brand") return brand;

  const name = normalizeCatalogQuery(product.name);
  if (name === query) return 100;
  if (brand === 90) return brand;
  const brandedName = `${name} ${normalizeCatalogQuery(product.brand)}`;
  const matchesName = matchWords(words, name);
  if (!matchesName && matchWords(words, brandedName)) return 88;
  if (name.startsWith(`${query} `)) return 86;
  if (` ${name} `.includes(` ${query} `)) return 82;
  if (brand === 78) return brand;
  if (matchesName) return 72;
  const variants = (product.variants ?? []).map((variant) => normalizeCatalogQuery(variant.name));
  if (variants.includes(query)) return 84;
  if (variants.some((variant) => matchWords(words, `${variant} ${brandedName}`))) return 68;
  if (brand) return brand;
  const other = normalizeCatalogQuery(`${product.category} ${product.ingredients}`);
  return matchWords(words, `${brandedName} ${other}`) ? 20 : 0;
}

export function rankCatalogProducts(
  products: readonly Product[],
  search: string,
  mode: CatalogSearchMode = "all",
  keepUnmatched = true,
): Product[] {
  const query = normalizeCatalogQuery(catalogBrandAlias(search) ?? search);
  const barcode = mode === "all" ? catalogBarcode(search) : undefined;
  const gtin = barcode?.padStart(14, "0");
  const words = query.split(" ");
  const photosByGtin = new Map<string, string>();
  for (const product of products) {
    const key = product.barcode?.padStart(14, "0");
    const photo = catalogCommunityImageUrl(product.imageUrl, product.barcode);
    if (key && photo && product.source === "open-beauty-facts" && !photosByGtin.has(key)) photosByGtin.set(key, photo);
  }

  const ranked = products.flatMap((product) => {
    const productGtin = product.barcode?.padStart(14, "0");
    const key = productGtin ? `barcode:${productGtin}` : product.id;
    if (gtin && productGtin !== gtin) return [];
    const score = query && !barcode ? rankProduct(product, query, words, mode) : 0;
    if (query && !barcode && !score && !keepUnmatched) return [];
    const imageUrl = catalogImageUrl(product.imageUrl, product.barcode, product.manufacturerUrl) ??
      (productGtin && product.source === "open-beauty-facts" ? photosByGtin.get(productGtin) : undefined);
    const entry = imageUrl === product.imageUrl ? product : { ...product, imageUrl };
    return [{ product: entry, key, score, hasPhoto: Boolean(imageUrl) }];
  }).sort((left, right) => right.score - left.score
    || Number(right.product.source === "manufacturer") - Number(left.product.source === "manufacturer")
    || Number(right.hasPhoto) - Number(left.hasPhoto));

  const seen = new Set<string>();
  return ranked.flatMap(({ product, key }) => {
    if (seen.has(key)) return [];
    seen.add(key);
    return [product];
  });
}

export function searchOfficialCatalog(query: string, mode: CatalogSearchMode = "all"): Product[] {
  const barcode = mode === "all" ? catalogBarcode(query) : undefined;
  if (!barcode) return rankCatalogProducts(manufacturerCatalog, query, mode, false);

  const gtin = barcode.padStart(14, "0");
  return manufacturerCatalog.flatMap((product) => {
    const variant = product.variants?.find((item) => item.barcode?.padStart(14, "0") === gtin);
    if (!variant) return [];
    return [{
      ...product,
      barcode: variant.barcode,
      selectedVariantId: variant.id,
      shadeHex: variant.shadeHex,
    }];
  });
}

export function searchLocalCatalog(query: string, mode: CatalogSearchMode = "all"): Product[] {
  const official = searchOfficialCatalog(query, mode);
  if (official.length) return official;
  return rankCatalogProducts(localCatalog, query, mode, false);
}
