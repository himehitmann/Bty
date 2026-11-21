import imageSources from "./catalog-image-sources.json";

const communityOrigins = new Set(imageSources.community);
const manufacturerSources: Record<string, string> = imageSources.manufacturer;
const manufacturerPrefixes = Object.values(manufacturerSources);

export const catalogImageCspSources = [...communityOrigins, ...manufacturerPrefixes];

function isManufacturerImage(url: URL, manufacturerUrl?: string): boolean {
  const base = `${url.origin}${url.pathname}`;
  const prefixes = manufacturerUrl ? [manufacturerSources[new URL(manufacturerUrl).origin]].filter(Boolean) : manufacturerPrefixes;
  const prefix = prefixes.find((candidate) => base.startsWith(candidate));
  if (!prefix || !/^[\w .()+,-]+\.(?:jpe?g|png|webp|avif)$/i.test(decodeURIComponent(base.slice(prefix.length)))) return false;

  const params = [...url.searchParams.entries()];
  if (new Set(params.map(([key]) => key)).size !== params.length) return false;
  return params.every(([key, value]) => (key === "v" && /^\d{1,15}$/.test(value)) ||
    (key === "width" && /^\d{2,3}$/.test(value) && Number(value) >= 100 && Number(value) <= 800));
}

export function catalogImageUrl(value?: string | null, barcode?: string, manufacturerUrl?: string): string | undefined {
  if (!value || value.length > 700) return undefined;
  if (!manufacturerUrl && /^\/images\/[\w-]+\.webp$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return undefined;
    if (isManufacturerImage(url, manufacturerUrl)) return url.href;
    if (manufacturerUrl || !communityOrigins.has(url.origin) || url.search) return undefined;
    const match = /^\/images\/products\/(\d+(?:\/\d+)*)\/front(?:_[\w-]+)?\.\d+\.(?:100|200|400)\.(?:jpe?g|png|webp)$/i.exec(url.pathname);
    const imageBarcode = match?.[1].replaceAll("/", "");
    if (!imageBarcode || !/^\d{8,14}$/.test(imageBarcode)) return undefined;
    if (barcode && imageBarcode.padStart(14, "0") !== barcode.padStart(14, "0")) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function catalogCommunityImageUrl(value?: string | null, barcode?: string): string | undefined {
  const url = catalogImageUrl(value, barcode);
  return url?.startsWith("https://") && communityOrigins.has(new URL(url).origin) ? url : undefined;
}
