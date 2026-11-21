import type { FaceZone, PaletteColor, Product, RoutineStep } from "./model";
import { findMakeupPlacement, type MakeupPlacement } from "./makeup-placements";
import type { StudioPlacementDetails } from "./studio-advanced";

const complexionZones = ["visage", "front", "joues", "menton"] as const;
const shapes = {
  foundation: { zones: complexionZones, opacity: 0.38, defaultZone: "visage" },
  concealer: { zones: [...complexionZones, "yeux"], opacity: 0.42, defaultZone: "menton" },
  blush: { zones: ["joues"], opacity: 0.52, defaultZone: "joues" },
  contour: { zones: complexionZones, opacity: 0.4, defaultZone: "joues" },
  bronzer: { zones: complexionZones, opacity: 0.4, defaultZone: "joues" },
  highlighter: { zones: ["front", "joues", "menton"], opacity: 0.34, defaultZone: "joues" },
  eyeshadow: { zones: ["yeux"], opacity: 0.64, defaultZone: "yeux" },
  eyeliner: { zones: ["yeux"], opacity: 0.92, defaultZone: "yeux" },
  mascara: { zones: ["yeux"], opacity: 0.92, defaultZone: "yeux" },
  lip: { zones: ["levres"], opacity: 0.82, defaultZone: "levres" },
  powder: { zones: [...complexionZones, "yeux"], opacity: 0.27, defaultZone: "visage" },
} satisfies Record<string, { zones: readonly FaceZone[]; opacity: number; defaultZone: FaceZone }>;

type PigmentKind = keyof typeof shapes;
type MakeupAppearance =
  | { effect: "none" | "unknown" | "transparent" | "mattifying" | "wrong-zone" | "no-shade" }
  | { effect: "tinted"; kind: PigmentKind; hex: string; name: string; opacity: number; placement?: MakeupPlacement };

export type PigmentLayer = Omit<Extract<MakeupAppearance, { effect: "tinted" }>, "kind"> & {
  kind: PigmentKind | "brow";
  details?: StudioPlacementDetails;
  stepId: string;
  productName: string;
  zone: FaceZone;
};

function pigmentKind(product: Product): PigmentKind | undefined {
  const kind = product.makeupKind;
  return product.category === "maquillage" && kind && Object.hasOwn(shapes, kind)
    ? kind as PigmentKind
    : undefined;
}

function hasTranslucentLabel(product: Product) {
  const name = product.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return /\b(?:translucid\w*|translucen\w*|transparen\w*|incolor\w*|colou?rless)\b/.test(name);
}

export function makeupAppearance(product: Product | undefined, step: RoutineStep, palette: PaletteColor[]): MakeupAppearance {
  if (product?.category !== "maquillage") return { effect: "none" };

  const { makeupEffect } = product;
  if (makeupEffect === "transparent" || hasTranslucentLabel(product)) return { effect: "transparent" };
  if (makeupEffect === "mattifying") return { effect: "mattifying" };

  const kind = pigmentKind(product);
  if (makeupEffect !== "tinted" || !kind) return { effect: "unknown" };

  const shape = shapes[kind];
  const zones: readonly FaceZone[] = shape.zones;
  const placement = findMakeupPlacement(kind, step.placement)?.id;
  if (!placement && !zones.includes(step.zone)) return { effect: "wrong-zone" };

  const swatch = step.swatchId ? palette.find((entry) => entry.id === step.swatchId) : undefined;
  const hex = swatch?.hex ?? product.shadeHex;
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return { effect: "no-shade" };
  return { effect: "tinted", kind, hex, name: swatch?.name ?? hex, opacity: shape.opacity, ...(placement && { placement }) };
}

export function defaultApplicationZone(product: Product, selected?: FaceZone): FaceZone {
  if (product.category === "cheveux") return "cheveux";
  const kind = pigmentKind(product);
  if (!kind) return selected && selected !== "cheveux" ? selected : "visage";

  const zones: readonly FaceZone[] = shapes[kind].zones;
  return selected && zones.includes(selected) ? selected : shapes[kind].defaultZone;
}

export function faceMakeupLayers(steps: RoutineStep[], products: Product[], palette: PaletteColor[], through: number): PigmentLayer[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  return steps.slice(0, through + 1).flatMap((step) => {
    const product = productById.get(step.productId);
    if (!product) return [];
    const appearance = makeupAppearance(product, step, palette);
    if (appearance.effect !== "tinted") return [];
    return [{ ...appearance, stepId: step.id, productName: product.name, zone: step.zone }];
  });
}
