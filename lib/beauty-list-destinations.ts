import type { useLocale } from "./i18n";
import type { BeautyList, Product } from "./model";

export const vanityDestination = "navier:vanity";

const defaults = [
  { id: "navier:favourites", fr: "Favoris", en: "Favourites" },
  { id: "navier:try", fr: "À essayer", en: "Want to try" },
  { id: "navier:skip", fr: "Je ne rachète pas", en: "Won’t repurchase" },
] as const;

export function isDefaultBeautyList(id: string) {
  return defaults.some((item) => item.id === id);
}

export function beautyListsWithDefaults(lists: BeautyList[] = []): BeautyList[] {
  return [
    ...defaults.map(({ id, fr }) => lists.find((list) => list.id === id) ?? { id, name: fr, items: [] }),
    ...lists.filter(({ id }) => !isDefaultBeautyList(id)),
  ];
}

export function storedBeautyLists(lists: BeautyList[]) {
  return lists.filter((list) => {
    const builtin = defaults.find(({ id }) => list.id === id);
    return !builtin || list.name !== builtin.fr || list.items.length > 0;
  });
}

export function beautyListName(list: Pick<BeautyList, "id" | "name">, t: ReturnType<typeof useLocale>["t"]) {
  const builtin = defaults.find(({ id, fr }) => list.id === id && list.name === fr);
  return builtin ? t(builtin.fr, builtin.en) : list.name;
}

export function sameProductVariant(first: Product, second: Product): boolean {
  return first.id === second.id || Boolean(first.barcode && second.barcode &&
    first.barcode.padStart(14, "0") === second.barcode.padStart(14, "0") &&
    first.selectedVariantId === second.selectedVariantId);
}

export function productListSnapshot(product: Product): Product {
  const { id, name, brand, category, source, barcode, manufacturerUrl, selectedVariantId, makeupKind, makeupEffect, shadeHex } = product;
  const variant = product.variants?.find((item) => item.id === selectedVariantId);
  return { id, name, brand, category, source, barcode, manufacturerUrl, selectedVariantId, makeupKind, makeupEffect, shadeHex,
    variants: variant ? [variant] : undefined, ingredients: "" };
}
