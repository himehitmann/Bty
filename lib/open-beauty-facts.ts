import { z } from "zod";
import { catalogBarcode, matchesCatalogBrand, normalizeCatalogQuery, normalizeCatalogText, type CatalogSearchMode } from "@/lib/catalog";
import { declaredProductText, productSchema, type Product } from "@/lib/model";

const externalOrigin = "https://world.openbeautyfacts.org";
const maxResponseBytes = 512 * 1024;
const maxProducts = 12;
const requestTimeout = 4000;
const fieldNames = [
  "code",
  "product_name_fr",
  "product_name",
  "brands",
  "brands_tags",
  "ingredients_text_fr",
  "ingredients_text",
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
const optionalExternalText = z.string().nullish().catch(undefined);
const externalProduct = z.object({
  code: z.string().regex(/^\d{8,14}$/),
  product_name_fr: z.string().nullish(),
  product_name: z.string().nullish(),
  brands: z.string().nullish(),
  brands_tags: z.array(z.string()).nullish().catch(undefined),
  ingredients_text_fr: z.string().nullish(),
  ingredients_text: z.string().nullish(),
  image_front_small_url: z.string().nullish(),
  categories_tags: z.array(z.string()).nullish(),
  labels_tags: z.array(z.string()).nullish().catch(undefined),
  usage_fr: optionalExternalText,
  usage: optionalExternalText,
  directions_fr: optionalExternalText,
  directions: optionalExternalText,
  instructions_fr: optionalExternalText,
  instructions: optionalExternalText,
});
const externalSearch = z.object({ products: z.array(z.unknown()) });
const externalLookup = z.object({ status: z.number(), product: z.unknown().optional() });
const imageHosts = new Set([
  "images.openbeautyfacts.org",
  "images.openbeautyfacts.net",
  "images.openfoodfacts.org",
  "images.openfoodfacts.net",
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

function getImageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && imageHosts.has(url.hostname) && !url.username && !url.password && !url.port
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizeProduct(product: unknown, includeImages: boolean, brandQuery?: string): Product | null {
  const parsed = externalProduct.safeParse(product);
  if (!parsed.success) return null;

  const data = parsed.data;
  if (brandQuery && !matchesCatalogBrand([
    ...(data.brands?.split(/[,;|]/) ?? []), ...(data.brands_tags ?? []),
  ], brandQuery)) return null;
  const name = (data.product_name_fr?.trim() || data.product_name?.trim())?.slice(0, 140);
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
    category: getCategory(name, data.categories_tags ?? []),
    ingredients,
    barcode: data.code,
    imageUrl: includeImages ? getImageUrl(data.image_front_small_url) : undefined,
    source: "open-beauty-facts",
    sourceUrl,
    claims: getClaimEvidence(data.labels_tags ?? [], sourceUrl),
    usageInstructions: instructions ? { text: instructions, source: "open-beauty-facts", url: sourceUrl } : undefined,
  });

  return normalized.success ? normalized.data : null;
}

export function catalogProviderQuery(query: string, mode: CatalogSearchMode): string {
  // The provider distinguishes certain hyphenated brand names in combined searches.
  return mode === "brand" ? normalizeCatalogQuery(query) : query.replace(/[\u2010-\u2015]/g, "-").replace(/[‘’]/g, "'");
}

function externalUrl(query: string, mode: CatalogSearchMode, barcode: string | undefined, includeImages: boolean): URL {
  const path = barcode ? `/api/v2/product/${barcode}.json`
    : mode === "brand" ? `/facets/brands/${encodeURIComponent(query.replaceAll(" ", "-"))}.json`
      : "/cgi/search.pl";
  const url = new URL(path, externalOrigin);
  url.searchParams.set("fields", includeImages ? `${fieldNames},image_front_small_url` : fieldNames);

  if (!barcode) {
    url.searchParams.set("page_size", String(maxProducts));
    if (mode === "all") {
      url.searchParams.set("search_terms", query);
      url.searchParams.set("search_simple", "1");
      url.searchParams.set("action", "process");
      url.searchParams.set("json", "1");
    }
  }

  return url;
}

type SearchOptions = { signal?: AbortSignal; userAgent?: string; includeImages?: boolean };

export async function searchOpenBeautyFacts(
  input: string, mode: CatalogSearchMode, { signal, userAgent, includeImages = false }: SearchOptions = {},
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
    const response = await fetch(externalUrl(query, mode, barcode, includeImages), {
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
    const products = barcode ? [externalLookup.parse(payload).product] : externalSearch.parse(payload).products;
    return products.slice(0, maxProducts).flatMap((product) => {
      const normalized = normalizeProduct(product, includeImages, mode === "brand" ? query : undefined);
      return normalized ? [normalized] : [];
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

async function readExternalResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const contentLength = Number(response.headers.get("content-length"));
  if (!response.body || contentType !== "application/json" || contentLength > maxResponseBytes) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error("Réponse Open Beauty Facts non valide");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let json = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size > maxResponseBytes) {
        void reader.cancel().catch(() => undefined);
        throw new Error("Réponse Open Beauty Facts trop volumineuse");
      }
      json += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(json + decoder.decode());
}
