import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeCatalogText, searchLocalCatalog } from "@/lib/catalog";
import { productSchema, type Product } from "@/lib/model";

const externalOrigin = "https://world.openbeautyfacts.org";
const maxResponseBytes = 512 * 1024;
const maxCacheEntries = 64;
const cacheLifetime = 10 * 60 * 1000;
const maxPendingSearches = 4;
const requestWindow = 60 * 1000;
const resultCache = new Map<string, { products: Product[]; expires: number }>();
const pendingSearches = new Map<string, Promise<Product[]>>();
const budgets = {
  barcode: { used: 0, resets: 0, limit: 90 },
  name: { used: 0, resets: 0, limit: 10 },
};
const fieldNames = [
  "code",
  "product_name_fr",
  "product_name",
  "brands",
  "ingredients_text_fr",
  "ingredients_text",
  "image_front_small_url",
  "categories_tags",
].join(",");

const searchQuery = z.string().trim().max(120).refine((query) => !/\p{Cc}/u.test(query))
  .transform((query) => query.normalize("NFC").replace(/\s+/g, " "));
const externalProduct = z.object({
  code: z.string().regex(/^\d{8,14}$/),
  product_name_fr: z.string().nullish(),
  product_name: z.string().nullish(),
  brands: z.string().nullish(),
  ingredients_text_fr: z.string().nullish(),
  ingredients_text: z.string().nullish(),
  image_front_small_url: z.string().nullish(),
  categories_tags: z.array(z.string()).nullish(),
});
const externalSearch = z.object({ products: z.array(z.unknown()) });
const externalLookup = z.object({ status: z.number(), product: z.unknown().optional() });
const imageHosts = new Set([
  "images.openbeautyfacts.org",
  "images.openbeautyfacts.net",
  "images.openfoodfacts.org",
  "images.openfoodfacts.net",
]);

function getCategory(name: string, tags: string[] = []): Product["category"] {
  const text = normalizeCatalogText([name, ...tags].join(" "));
  if (/shampoo|cheveux|capillaire|hair[- ]|demelant|conditioner|apres.shamp/.test(text)) return "cheveux";
  if (/blush|mascara|teint\b|maquillage|make[- ]?up|fard\b|eye[- ]?(liner|shadow)|lip(stick|.gloss)|rouge a levres|concealer/.test(text)) {
    return "maquillage";
  }
  return "soin";
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

function normalizeProduct(product: unknown): Product | null {
  const parsed = externalProduct.safeParse(product);
  if (!parsed.success) return null;

  const data = parsed.data;
  const name = (data.product_name_fr?.trim() || data.product_name?.trim())?.slice(0, 140);
  if (!name) return null;

  const normalized = productSchema.safeParse({
    id: `obf-${data.code}`,
    name,
    brand: (data.brands?.trim() || "Marque non renseignée").slice(0, 140),
    category: getCategory(name, data.categories_tags ?? []),
    ingredients: (data.ingredients_text_fr?.trim() || data.ingredients_text?.trim() || "").slice(0, 6500),
    barcode: data.code,
    imageUrl: getImageUrl(data.image_front_small_url),
    source: "open-beauty-facts",
  });

  return normalized.success ? normalized.data : null;
}

function externalUrl(query: string, barcode: string): URL {
  const path = barcode ? `/api/v2/product/${barcode}.json` : "/cgi/search.pl";
  const url = new URL(path, externalOrigin);
  url.searchParams.set("fields", fieldNames);

  if (!barcode) {
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "12");
  }

  return url;
}

async function searchExternalCatalog(query: string, barcode: string): Promise<Product[]> {
  const contact = process.env.OPEN_BEAUTY_FACTS_CONTACT?.trim();
  const site = "https://github.com/himehitmann/Bty";
  const userAgent = `Navier/1.0 (${contact || site})`;
  const response = await fetch(externalUrl(query, barcode), {
    headers: { Accept: "application/json", "User-Agent": userAgent },
    redirect: "error",
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });

  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    if (barcode && response.status === 404) return [];
    throw new Error("Open Beauty Facts indisponible");
  }

  const payload = await readExternalResponse(response);
  const products = barcode ? [externalLookup.parse(payload).product] : externalSearch.parse(payload).products;
  return products.slice(0, 12).flatMap((product) => {
    const normalized = normalizeProduct(product);
    return normalized ? [normalized] : [];
  });
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

async function cachedExternalSearch(query: string, barcode: string): Promise<Product[]> {
  const key = barcode ? `barcode:${barcode}` : `name:${query.toLocaleLowerCase("fr-FR")}`;
  const now = Date.now();
  const cached = resultCache.get(key);
  if (cached && cached.expires > now) return cached.products;
  if (cached) resultCache.delete(key);

  const pending = pendingSearches.get(key);
  if (pending) return pending;

  const budget = barcode ? budgets.barcode : budgets.name;
  if (now >= budget.resets) {
    budget.resets = now + requestWindow;
    budget.used = 0;
  }
  if (budget.used >= budget.limit || pendingSearches.size >= maxPendingSearches) {
    throw new Error("Recherche Open Beauty Facts temporairement limitée");
  }
  budget.used += 1;

  const operation = searchExternalCatalog(query, barcode).then((products) => {
    resultCache.set(key, { products, expires: Date.now() + cacheLifetime });
    if (resultCache.size > maxCacheEntries) {
      const oldest = resultCache.keys().next();
      if (!oldest.done) resultCache.delete(oldest.value);
    }
    return products;
  }).finally(() => pendingSearches.delete(key));
  pendingSearches.set(key, operation);
  return operation;
}

export async function GET(request: NextRequest) {
  const query = searchQuery.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "Recherche invalide." }, { status: 400 });

  const digits = query.data.replace(/[\s-]/g, "");
  const barcode = /^\d{8,14}$/.test(digits) ? digits : "";
  const localResults = searchLocalCatalog(barcode || query.data);

  if (query.data.length < 2) {
    return NextResponse.json({ products: localResults, externalStatus: "not-requested" });
  }

  try {
    const externalResults = await cachedExternalSearch(query.data, barcode);
    return NextResponse.json({
      products: [...externalResults, ...localResults],
      externalStatus: "ok",
    });
  } catch {
    return NextResponse.json({ products: localResults, externalStatus: "unavailable" });
  }
}
