import type { Product } from "@/lib/model";
import { catalogImageUrl } from "./catalog-images";
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
    .normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function catalogBarcode(value: string): string | undefined {
  const digits = value.replace(/[\s\p{Pd}]/gu, "");
  return /^\d{8,14}$/.test(digits) ? digits : undefined;
}

const catalogBrandNames = [
  ["Huda Beauty", "huda"],
  ["rom&nd", "romand", "롬앤"],
  ["CLIO", "clubclio", "클리오"],
  ["peripera", "페리페라"],
  ["ETUDE", "etude house", "에뛰드", "에뛰드 하우스"],
  ["dasique", "데이지크"],
  ["TIRTIR", "티르티르"],
  ["3CE", "3ce stylenanda", "3 concept eyes", "3ce 3 concept eyes", "쓰리씨이"],
  ["fwee", "퓌"],
  ["hince", "힌스"],
  ["Medicube", "메디큐브"],
  ["COSRX", "코스알엑스"],
  ["Beauty of Joseon", "조선미녀"],
  ["Anua", "아누아"],
] as const;

const brandAliases = new Map<string, string>(catalogBrandNames.flatMap(([brand, ...aliases]) =>
  [brand, ...aliases].map((alias) => [normalizeCatalogQuery(alias).replaceAll(" ", ""), brand] as const),
));

export function catalogBrandAlias(query: string): string | undefined {
  return brandAliases.get(normalizeCatalogQuery(query.replace(/^[a-z]{2}:/i, "")).replaceAll(" ", ""));
}

function brandPrefix(words: string[]): { brand: string; wordCount: number } | undefined {
  for (let wordCount = Math.min(4, words.length); wordCount > 0; wordCount -= 1) {
    const brand = catalogBrandAlias(words.slice(0, wordCount).join(" "));
    if (brand) return { brand, wordCount };
  }
}

export function catalogBrandInTitle(title: string): string | undefined {
  return brandPrefix(normalizeCatalogQuery(title).split(" "))?.brand;
}

export function normalizeCatalogBrandPrefix(value: string): string {
  const words = normalizeCatalogQuery(value).split(" ");
  const prefix = brandPrefix(words);
  return prefix ? [normalizeCatalogQuery(prefix.brand), ...words.slice(prefix.wordCount)].join(" ") : words.join(" ");
}

function normalizeBrand(value: string): string {
  const name = value.replace(/^[a-z]{2}:/i, "");
  return normalizeCatalogQuery(catalogBrandAlias(name) ?? name);
}

function matchWords(words: string[], text: string): boolean {
  const options = text.split(" ");
  return words.every((word) => options.some((option) => option.startsWith(word)));
}

function brandScore(value: string, query: string, words: string[]): number {
  const brand = normalizeBrand(value);
  if (!brand) return 0;
  if (brand === query || brand.replaceAll(" ", "") === query.replaceAll(" ", "")) return 90;
  if (brand.startsWith(`${query} `)) return 78;
  return matchWords(words, brand) ? 62 : 0;
}

export function matchesCatalogBrand(brands: readonly string[], query: string): boolean {
  const alias = catalogBrandAlias(query);
  if (alias) return brands.some((brand) => catalogBrandAlias(brand) === alias);
  const name = normalizeCatalogQuery(query);
  if (!name) return false;
  const words = name.split(" ");
  return brands.some((brand) => brandScore(brand, name, words) > 0);
}

function rankProduct(product: Product, query: string, words: string[], mode: CatalogSearchMode): number {
  const brands = product.brand.split(/[,;|]/);
  const brand = Math.max(0, ...brands.map((part) => brandScore(part, query, words)));
  if (mode === "brand") return brand;

  const name = normalizeCatalogBrandPrefix(product.name);
  if (name === query) return 100;
  if (brand === 90) return brand;
  const brandedName = `${name} ${brands.map(normalizeBrand).join(" ")}`;
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

const titleOrder = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function sourcePriority(source: Product["source"]): number {
  return source === "manufacturer" ? 2 : source === "open-beauty-facts" ? 1 : 0;
}

export function rankCatalogProducts(
  products: readonly Product[],
  search: string,
  mode: CatalogSearchMode = "all",
): Product[] {
  const query = normalizeCatalogBrandPrefix(search);
  const brand = catalogBrandAlias(search);
  const gtin = mode === "all" ? catalogBarcode(search)?.padStart(14, "0") : undefined;
  const words = query.split(" ");
  const ranked = products.flatMap((product) => {
    const productGtin = product.barcode?.padStart(14, "0");
    if (gtin && productGtin !== gtin) return [];
    if (brand && !matchesCatalogBrand(product.brand.split(/[,;|]/), brand)) return [];
    const score = query && !gtin ? rankProduct(product, query, words, mode) : 0;
    if (query && !gtin && !score) return [];
    const imageUrl = catalogImageUrl(product.imageUrl, product.barcode, product.manufacturerUrl);
    const entry = imageUrl === product.imageUrl ? product : { ...product, imageUrl };
    return [{ product: entry, key: productGtin ? `barcode:${productGtin}` : product.id, score }];
  });

  // For duplicate barcodes, the first source is authoritative (official, then live community, then offline).
  const canonical = new Map<string, (typeof ranked)[number]>();
  for (const entry of ranked) {
    if (!canonical.has(entry.key)) canonical.set(entry.key, entry);
  }
  return [...canonical.values()].sort((left, right) => right.score - left.score
    || sourcePriority(right.product.source) - sourcePriority(left.product.source)
    || titleOrder.compare(left.product.brand, right.product.brand)
    || titleOrder.compare(left.product.name, right.product.name)
    || left.product.id.localeCompare(right.product.id)).map(({ product }) => product);
}

export function searchOfficialCatalog(query: string, mode: CatalogSearchMode = "all"): Product[] {
  const barcode = mode === "all" ? catalogBarcode(query) : undefined;
  if (!barcode) return rankCatalogProducts(manufacturerCatalog, query, mode);

  const gtin = barcode.padStart(14, "0");
  return manufacturerCatalog.flatMap((product) => {
    const variant = product.variants?.find((item) => item.barcode?.padStart(14, "0") === gtin);
    if (!variant) return product.barcode?.padStart(14, "0") === gtin ? [product] : [];
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
  return mergeCatalogResults(official, [], query, mode);
}

function catalogTitleKeys(product: Product): string[] {
  const title = normalizeCatalogBrandPrefix(product.name);
  return product.brand.split(/[,;|]/).map(normalizeBrand).filter(Boolean).map((brand) => {
    const productName = title.startsWith(`${brand} `) ? title.slice(brand.length + 1) : title;
    return `${brand}:${productName.replace(/\bpads$/, "pad")}`;
  });
}

export function mergeCatalogResults(
  current: readonly Product[],
  incoming: readonly Product[],
  query: string,
  mode: CatalogSearchMode = "all",
): Product[] {
  const candidates = [...current.filter(({ source }) => source === "manufacturer"), ...incoming,
    ...current.filter(({ source }) => source !== "manufacturer"), ...localCatalog];
  const official = candidates.filter(({ source }) => source === "manufacturer");
  const knownCodes = new Set(official.flatMap((product) =>
    [product.barcode, ...(product.variants ?? []).map(({ barcode }) => barcode)]
      .flatMap((code) => code ? [code.padStart(14, "0")] : [])));
  const officialTitles = new Set(official
    .filter((product) => !product.barcode && !product.variants?.some(({ barcode }) => barcode))
    .flatMap(catalogTitleKeys));
  const barcode = mode === "all" ? catalogBarcode(query) : undefined;
  const distinct = candidates.filter((product) => product.source !== "open-beauty-facts"
    || ((!product.barcode || !knownCodes.has(product.barcode.padStart(14, "0")))
      && (barcode || !catalogTitleKeys(product).some((key) => officialTitles.has(key)))));
  const results = rankCatalogProducts(distinct, query, mode);
  return results.some(({ source }) => source !== "local") ? results.filter(({ source }) => source !== "local") : results;
}
