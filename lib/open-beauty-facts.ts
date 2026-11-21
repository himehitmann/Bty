import { z } from "zod";
import { catalogBarcode, catalogBrandAlias, localCatalog, matchesCatalogBrand, normalizeCatalogQuery, normalizeCatalogText, type CatalogSearchMode } from "@/lib/catalog";
import { catalogCommunityImageUrl } from "@/lib/catalog-images";
import { declaredProductText, productSchema, type Product } from "@/lib/model";

const externalOrigin = "https://world.openbeautyfacts.org";
const maxResponseBytes = 512 * 1024;
const maxProducts = 12;
const providerPageSize = 18;
const requestTimeout = 4000;
const fieldNames = [
  "code",
  "product_name_fr",
  "product_name",
  "brands",
  "brands_tags",
  "ingredients_text_fr",
  "ingredients_text",
  "image_front_small_url",
  "categories_tags",
  "labels_tags",
  "usage_fr",
  "usage",
  "directions_fr",
  "directions",
  "instructions_fr",
  "instructions",
].join(",");

export const catalogSearchQuery = z.string().trim().max(120).refine((query) => !/\p{Cc}/u.test(query))
  .transform((query) => query.normalize("NFC").replace(/\s+/g, " "));
export const catalogSearchMode = z.enum(["all", "brand"]);
const optionalExternalText = (max: number) => z.string().max(max).nullish().catch(undefined);
const externalName = z.string().max(1024).refine((value) => !/[\p{Cc}\p{Bidi_Control}]/u.test(value.trim()))
  .nullish().catch(undefined);
const externalTags = z.preprocess(
  (value) => Array.isArray(value) && value.length > 128 ? undefined : value,
  z.array(z.string().max(160)).nullish().catch(undefined),
);
const externalProduct = z.object({
  code: z.string().regex(/^\d{8,14}$/),
  product_name_fr: externalName,
  product_name: externalName,
  brands: externalName,
  brands_tags: externalTags,
  ingredients_text_fr: optionalExternalText(8192),
  ingredients_text: optionalExternalText(8192),
  image_front_small_url: optionalExternalText(700),
  categories_tags: externalTags,
  labels_tags: externalTags,
  usage_fr: optionalExternalText(1600),
  usage: optionalExternalText(1600),
  directions_fr: optionalExternalText(1600),
  directions: optionalExternalText(1600),
  instructions_fr: optionalExternalText(1600),
  instructions: optionalExternalText(1600),
});
const externalSearch = z.object({
  products: z.preprocess((value) => Array.isArray(value) ? value.slice(0, providerPageSize) : value, z.array(z.unknown())),
});
const externalLookup = z.object({ status: z.union([z.literal(0), z.literal(1)]), product: z.unknown().optional() });
const genericProductNames = new Set([
  "product", "cosmetic", "cosmetics", "makeup", "shampoo", "shampooing", "conditioner", "lipstic", "lipstick",
  "unknown", "name unknown", "non renseigne", "sans nom",
]);
const perfumes = new Set(["en:perfumes", "fr:parfums"]);
const veganLabels = new Set([
  "en:vegan", "fr:vegan", "fr:vegetalien", "en:the-vegan-society", "en:vegetarian-society-approved-vegan",
  "en:peta-cruelty-free-and-vegan",
]);
const crueltyFreeLabels = new Set([
  "en:cruelty-free", "en:leaping-bunny", "en:peta-cruelty-free", "en:peta-cruelty-free-and-vegan",
  "en:not-tested-on-animals", "en:cruelty-free-international", "fr:non-teste-sur-les-animaux",
]);
const contradictoryVeganLabels = new Set(["en:non-vegan", "en:not-vegan", "fr:non-vegan"]);
const contradictoryCrueltyFreeLabels = new Set(["en:tested-on-animals", "en:not-cruelty-free", "fr:teste-sur-les-animaux"]);

function normalizeTag(value: string): string {
  return normalizeCatalogText(value).trim().replace(/[\s_-]+/g, "-");
}

function getCategory(name: string, tags: string[] = []): Product["category"] {
  if (tags.some((tag) => perfumes.has(normalizeTag(tag)))) return "parfums";
  const text = normalizeCatalogText([name, ...tags].join(" "));
  if (/shampoo|cheveux|capillaire|hair[- ]|demelant|conditioner|apres.shamp/.test(text)) return "cheveux";
  if (/blush|mascara|teint\b|maquillage|make[- ]?up|fard\b|eye[- ]?(liner|shadow)|lip(stick|.gloss)|rouge a levres|concealer/.test(text)) {
    return "maquillage";
  }
  const productName = normalizeCatalogText(name);
  if (/(?:\b(?:eaux? de (?:parfum|toilette|cologne)|extrait de parfum|brume parfumee|perfumes?)\b|^(?:parfums?|cologne)\b)/.test(productName) &&
      !/\b(?:gel douche|shower gel|lotion|deodorant|creme|cream|savon|soap|parfum d['’]ambiance|room spray)\b/.test(productName)) {
    return "parfums";
  }
  return "soin";
}

function getClaimEvidence(labels: string[], url: string): Product["claims"] {
  const declared = labels.map((label) => ({ label: label.trim(), tag: normalizeTag(label) }));

  function findEvidence(accepted: Set<string>, contradictory: Set<string>) {
    if (declared.some(({ tag }) => contradictory.has(tag))) return undefined;
    const match = declared.find(({ tag }) => accepted.has(tag));
    return match ? { source: "open-beauty-facts" as const, url, label: match.label } : undefined;
  }

  const vegan = findEvidence(veganLabels, contradictoryVeganLabels);
  const crueltyFree = findEvidence(crueltyFreeLabels, contradictoryCrueltyFreeLabels);
  return vegan || crueltyFree ? { vegan, crueltyFree } : undefined;
}

function productNameIsUseful(name: string, brands: readonly string[]): boolean {
  const title = normalizeCatalogQuery(name);
  return Boolean(title) && !genericProductNames.has(title) && !/^(?:www\.|https?:)/i.test(name)
    && !brands.some((brand) => normalizeCatalogQuery(brand.replace(/^[a-z]{2}:/i, "")) === title);
}

function normalizeProduct(product: unknown, barcode?: string, brandQuery?: string): Product | null {
  const parsed = externalProduct.safeParse(product);
  if (!parsed.success) return null;

  const data = parsed.data;
  if (barcode && data.code.padStart(14, "0") !== barcode.padStart(14, "0")) return null;
  const brands = [...(data.brands?.split(/[,;|]/) ?? []), ...(data.brands_tags ?? [])];
  const alias = brandQuery && catalogBrandAlias(brandQuery);
  if (alias) {
    const brand = normalizeCatalogQuery(alias);
    if (!brands.some((label) => normalizeCatalogQuery(label.replace(/^[a-z]{2}:/i, "")) === brand)) return null;
  } else if (brandQuery && !matchesCatalogBrand(brands, brandQuery)) return null;

  const reference = localCatalog.find(({ barcode }) => barcode === data.code);
  const titles = [data.product_name_fr, data.product_name].map((value) => value?.trim());
  const name = (titles.find((value) => value && (barcode || productNameIsUseful(value, brands))) || reference?.name)?.slice(0, 140);
  if (!name) return null;

  const sourceUrl = new URL(`/product/${data.code}`, externalOrigin).href;
  const ingredients = [data.ingredients_text_fr, data.ingredients_text]
    .map((value) => declaredProductText(value ?? ""))
    .find((value) => value.length > 0 && value.length <= 6500) ?? "";
  const instructions = [data.usage_fr, data.directions_fr, data.instructions_fr, data.usage, data.directions, data.instructions]
    .map((value) => declaredProductText(value ?? ""))
    .find((value) => value.length > 0 && value.length <= 1200);
  const normalized = productSchema.safeParse({
    id: `obf-${data.code}`,
    name,
    brand: (data.brands?.trim() || "Marque non renseignée").slice(0, 140),
    category: reference?.category ?? getCategory(name, data.categories_tags ?? []),
    ingredients,
    barcode: data.code,
    imageUrl: catalogCommunityImageUrl(data.image_front_small_url, data.code),
    source: "open-beauty-facts",
    sourceUrl,
    claims: getClaimEvidence(data.labels_tags ?? [], sourceUrl),
    usageInstructions: instructions ? { text: instructions, source: "open-beauty-facts", url: sourceUrl } : undefined,
  });

  return normalized.success ? normalized.data : null;
}

export function catalogProviderQuery(query: string, mode: CatalogSearchMode): string {
  // The provider distinguishes certain hyphenated brand names in combined searches.
  return catalogBrandAlias(query) ?? (mode === "brand" ? normalizeCatalogQuery(query) : query.replace(/[\u2010-\u2015]/g, "-").replace(/[‘’]/g, "'"));
}

function externalUrl(query: string, mode: CatalogSearchMode, barcode: string | undefined): URL {
  // The native Huda Beauty brand facet omits identifiable products returned by text search.
  const useBrandFacet = mode === "brand" && !catalogBrandAlias(query);
  const path = barcode ? `/api/v2/product/${barcode}.json`
    : useBrandFacet ? `/facets/brands/${encodeURIComponent(query.replaceAll(" ", "-"))}.json`
      : "/cgi/search.pl";
  const url = new URL(path, externalOrigin);
  url.searchParams.set("fields", fieldNames);

  if (!barcode) {
    url.searchParams.set("page_size", String(providerPageSize));
    if (!useBrandFacet) {
      url.searchParams.set("search_terms", query);
      url.searchParams.set("search_simple", "1");
      url.searchParams.set("action", "process");
      url.searchParams.set("json", "1");
    }
  }

  return url;
}

type SearchOptions = { signal?: AbortSignal; userAgent?: string };

export async function searchOpenBeautyFacts(
  input: string, mode: CatalogSearchMode, { signal, userAgent }: SearchOptions = {},
): Promise<Product[]> {
  const raw = catalogSearchQuery.parse(input);
  if (normalizeCatalogQuery(raw).length < 2) return [];
  if (signal?.aborted) throw signal.reason;

  const query = catalogProviderQuery(raw, mode);
  const barcode = mode === "all" ? catalogBarcode(raw) : undefined;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, requestTimeout);
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const headers = new Headers({ Accept: "application/json" });
    if (userAgent) headers.set("User-Agent", userAgent);
    const response = await fetch(externalUrl(query, mode, barcode), {
      headers,
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      if ((barcode || mode === "brand") && response.status === 404) return [];
      throw new Error("Open Beauty Facts unavailable");
    }

    const payload = await readExternalResponse(response);
    const lookup = barcode ? externalLookup.parse(payload) : undefined;
    if (lookup?.status === 0) return [];
    const products = lookup ? [lookup.product] : externalSearch.parse(payload).products;
    const brandQuery = mode === "brand" || catalogBrandAlias(raw) ? query : undefined;
    return products.flatMap((product) => {
      const normalized = normalizeProduct(product, barcode, brandQuery);
      return normalized ? [normalized] : [];
    }).slice(0, maxProducts);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

async function readExternalResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const contentLength = response.headers.get("content-length");
  if (!response.body || contentType !== "application/json" ||
    (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxResponseBytes))) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error("Réponse Open Beauty Facts non valide");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let json = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size > maxResponseBytes) {
        throw new Error("Réponse Open Beauty Facts trop volumineuse");
      }
      json += decoder.decode(value, { stream: true });
    }
    return JSON.parse(json + decoder.decode());
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
