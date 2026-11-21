import { NextRequest, NextResponse } from "next/server";
import { catalogBarcode, mergeCatalogResults, normalizeCatalogQuery, searchLocalCatalog, type CatalogSearchMode } from "@/lib/catalog";
import { catalogProviderQuery, catalogSearchMode, catalogSearchPage, catalogSearchQuery, searchOpenBeautyFacts, type ExternalCatalogPage } from "@/lib/open-beauty-facts";

const maxCacheEntries = 64;
const cacheLifetime = 10 * 60 * 1000;
const maxPendingSearches = 4;
const requestWindow = 60 * 1000;
const resultCache = new Map<string, { result: ExternalCatalogPage; expires: number }>();
const pendingSearches = new Map<string, Promise<ExternalCatalogPage>>();
const budgets = {
  barcode: { used: 0, resets: 0, limit: 90 },
  name: { used: 0, resets: 0, limit: 10 },
};
async function cachedExternalSearch(query: string, mode: CatalogSearchMode, barcode: string | undefined, page: number): Promise<ExternalCatalogPage> {
  const key = barcode ? `barcode:${barcode}` : `${mode}:${page}:${catalogProviderQuery(query, mode).toLocaleLowerCase("fr-FR")}`;
  const now = Date.now();
  const cached = resultCache.get(key);
  if (cached && cached.expires > now) return cached.result;
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
  const operation = searchOpenBeautyFacts(query, mode, { userAgent: `Navier/1.0 (${contact})`, page }).then((result) => {
    resultCache.set(key, { result, expires: Date.now() + cacheLifetime });
    if (resultCache.size > maxCacheEntries) {
      const oldest = resultCache.keys().next();
      if (!oldest.done) resultCache.delete(oldest.value);
    }
    return result;
  }).finally(() => pendingSearches.delete(key));
  pendingSearches.set(key, operation);
  return operation;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = catalogSearchQuery.safeParse(params.get("q") ?? "");
  const mode = catalogSearchMode.safeParse(params.get("mode") ?? "all");
  const page = catalogSearchPage.safeParse(params.get("page") ?? "1");
  if (!query.success || !mode.success || !page.success) {
    return NextResponse.json({ error: "Recherche invalide." }, { status: 400 });
  }

  const barcode = mode.data === "all" ? catalogBarcode(query.data) : undefined;
  const localResults = searchLocalCatalog(query.data, mode.data);
  if (normalizeCatalogQuery(query.data).length < 2 ||
    (barcode && (page.data > 1 || localResults.some(({ source }) => source === "manufacturer")))) {
    return NextResponse.json({ products: page.data === 1 ? localResults : [], externalStatus: "not-requested", hasMore: false });
  }

  try {
    const external = await cachedExternalSearch(query.data, mode.data, barcode, page.data);
    return NextResponse.json({
      products: mergeCatalogResults(localResults, external.products, query.data, mode.data),
      externalStatus: "ok",
      hasMore: external.hasMore,
    });
  } catch {
    return NextResponse.json({ products: localResults, externalStatus: "unavailable", hasMore: false });
  }
}
