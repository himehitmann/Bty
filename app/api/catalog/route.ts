import { NextRequest, NextResponse } from "next/server";
import { catalogBarcode, normalizeCatalogQuery, rankCatalogProducts, searchLocalCatalog, type CatalogSearchMode } from "@/lib/catalog";
import type { Product } from "@/lib/model";
import { catalogProviderQuery, catalogSearchMode, catalogSearchQuery, searchOpenBeautyFacts } from "@/lib/open-beauty-facts";

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
async function cachedExternalSearch(query: string, mode: CatalogSearchMode, barcode: string | undefined): Promise<Product[]> {
  const key = barcode ? `barcode:${barcode}` : `${mode}:${catalogProviderQuery(query, mode).toLocaleLowerCase("fr-FR")}`;
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

  const contact = process.env.OPEN_BEAUTY_FACTS_CONTACT?.trim() || "https://github.com/himehitmann/Bty";
  const operation = searchOpenBeautyFacts(query, mode, { userAgent: `Navier/1.0 (${contact})` }).then((products) => {
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
  const params = request.nextUrl.searchParams;
  const query = catalogSearchQuery.safeParse(params.get("q") ?? "");
  const mode = catalogSearchMode.safeParse(params.get("mode") ?? "all");
  if (!query.success || !mode.success) return NextResponse.json({ error: "Recherche invalide." }, { status: 400 });

  const barcode = mode.data === "all" ? catalogBarcode(query.data) : undefined;
  const normalizedQuery = normalizeCatalogQuery(query.data);
  const localResults = searchLocalCatalog(query.data, mode.data);

  if (normalizedQuery.length < 2 || localResults.some(({ source }) => source === "manufacturer")) {
    return NextResponse.json({ products: localResults, externalStatus: "not-requested" });
  }

  try {
    const externalResults = await cachedExternalSearch(query.data, mode.data, barcode);
    return NextResponse.json({
      products: rankCatalogProducts([...externalResults, ...localResults], query.data, mode.data),
      externalStatus: "ok",
    });
  } catch {
    return NextResponse.json({ products: localResults, externalStatus: "unavailable" });
  }
}
