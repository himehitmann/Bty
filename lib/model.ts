import { z } from "zod";
import { makeupPlacementIds } from "./makeup-placements";

export const categories = ["soin", "maquillage", "cheveux", "parfums"] as const;
export const categoryLabels = { soin: "Soin", maquillage: "Maquillage", cheveux: "Cheveux", parfums: "Parfums" };
export const sourceLabels = { manuel: "Saisie manuelle", local: "Catalogue local · formule indicative", "open-beauty-facts": "Open Beauty Facts" };

export const makeupKinds = ["foundation", "concealer", "blush", "contour", "bronzer", "highlighter", "eyeshadow", "eyeliner", "mascara", "lip", "powder", "other"] as const;
export const makeupEffects = ["tinted", "transparent", "mattifying", "unknown"] as const;
export const makeupKindLabels = {
  foundation: "Fond de teint", concealer: "Correcteur", blush: "Blush", contour: "Contouring", bronzer: "Poudre bronzante",
  highlighter: "Enlumineur", eyeshadow: "Fard à paupières", eyeliner: "Eyeliner", mascara: "Mascara",
  lip: "Lèvres", powder: "Poudre", other: "Autre",
} satisfies Record<(typeof makeupKinds)[number], string>;
export const makeupEffectLabels = {
  tinted: "Teinté", transparent: "Transparent", mattifying: "Matifiant", unknown: "Non renseigné",
} satisfies Record<(typeof makeupEffects)[number], string>;

const identifier = z.string().min(1).max(160);
const name = z.string().trim().min(1).max(140);
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const productImage = z.string().max(700).refine((url) => /^\/images\/[\w-]+\.webp$/.test(url) || /^https:\/\/(?:images\.openbeautyfacts\.(?:org|net)|images\.openfoodfacts\.(?:org|net))\//i.test(url));

const evidenceUrl = z.string().trim().max(700).refine((value) => {
  if (!/^https:\/\//i.test(value) || /\p{Cc}/u.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
});
const catalogSourceUrl = evidenceUrl.regex(/^https:\/\/world\.openbeautyfacts\.org\/product\/\d{8,14}\/?$/i);
const catalogEvidence = z.object({ source: z.literal("open-beauty-facts"), url: catalogSourceUrl });
const manufacturerEvidence = z.object({ source: z.literal("manufacturer"), url: evidenceUrl });
const claimEvidence = z.discriminatedUnion("source", [
  catalogEvidence.extend({ label: z.string().trim().min(1).max(120).optional() }),
  manufacturerEvidence,
]);
const instructionText = z.string().trim().min(1).max(1200);

export const productFeedbackOptions = ["favorite", "liked", "disappointed"] as const;
export const personalProductNoteLimit = 800;

export function declaredProductText(value: string): string {
  const text = value.trim();
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/^(?:ingredients?|inci)\s*:\s*/, "").replace(/[.\s]+$/, "");
  return /^(?:[-–—?]+|n\/?a|non renseignee?|non disponible|inconnue?|unknown|not available|not provided|not specified)$/.test(normalized)
    ? "" : text;
}

export const productInput = z.object({
  name,
  brand: z.string().trim().max(140),
  category: z.enum(categories),
  ingredients: z.string().trim().max(6500).transform(declaredProductText),
  barcode: z.string().trim().regex(/^\d{8,14}$/).optional(),
  openedOn: z.iso.date().optional(),
  paoMonths: z.number().int().min(1).max(60).optional(),
  expiresOn: z.iso.date().optional(),
  purchased: z.boolean().optional(),
  feedback: z.enum(productFeedbackOptions).optional(),
  personalNote: z.string().trim().max(personalProductNoteLimit).optional(),
  claims: z.object({ vegan: claimEvidence.optional(), crueltyFree: claimEvidence.optional() }).optional(),
  usageInstructions: z.discriminatedUnion("source", [
    catalogEvidence.extend({ text: instructionText }),
    manufacturerEvidence.extend({ text: instructionText }),
    z.object({ source: z.literal("packaging"), text: instructionText }),
  ]).optional(),
  makeupKind: z.enum(makeupKinds).optional(),
  makeupEffect: z.enum(makeupEffects).optional(),
  shadeHex: hex.optional(),
});

export const productSchema = productInput.extend({
  id: identifier,
  imageUrl: productImage.catch("").transform((image) => image || undefined).optional(),
  source: z.enum(["manuel", "local", "open-beauty-facts"]),
  sourceUrl: catalogSourceUrl.optional(),
  tint: hex.optional(),
}).superRefine((product, context) => {
  const links = [
    { url: product.sourceUrl, path: ["sourceUrl"] },
    { url: product.claims?.vegan?.source === "open-beauty-facts" ? product.claims.vegan.url : undefined, path: ["claims", "vegan", "url"] },
    { url: product.claims?.crueltyFree?.source === "open-beauty-facts" ? product.claims.crueltyFree.url : undefined, path: ["claims", "crueltyFree", "url"] },
    { url: product.usageInstructions?.source === "open-beauty-facts" ? product.usageInstructions.url : undefined, path: ["usageInstructions", "url"] },
  ];
  for (const { url, path } of links) {
    if (url && /\/product\/(\d{8,14})\/?$/i.exec(url)?.[1] !== product.barcode) {
      context.addIssue({ code: "custom", path, message: "La fiche Open Beauty Facts doit correspondre au code-barres du produit." });
    }
  }
});

const zoneSchema = z.enum(["visage", "front", "joues", "yeux", "levres", "menton", "cheveux"]);
export const hairApplicationAreas = ["scalp", "lengths", "ends"] as const;
const stepSchema = z.object({
  id: identifier, productId: identifier, zone: zoneSchema, note: z.string().max(800),
  swatchId: identifier.optional(),
  placement: z.enum(makeupPlacementIds).optional(),
  applicationsPerWeek: z.number().int().min(1).max(7).optional(),
  tool: z.string().trim().max(120).optional(),
  hairArea: z.enum(hairApplicationAreas).optional(),
  massage: z.boolean().optional(),
});
const routineSchema = z.object({
  id: identifier, name, period: z.enum(["matin", "soir", "libre"]), steps: z.array(stepSchema).max(40),
});
const colorSchema = z.object({
  id: identifier, hex, name, photoPath: z.string().max(300).optional(),
  collection: z.string().trim().min(1).max(100).optional(),
});
export const beautyListLimits = { lists: 30, items: 120, name: 100, text: 300, reason: 400 } as const;
const beautyListItemSchema = z.object({
  id: identifier,
  text: z.string().trim().min(1).max(beautyListLimits.text),
  reason: z.string().trim().max(beautyListLimits.reason).optional(),
  checked: z.boolean(),
  productId: identifier.optional(),
});
const beautyListSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(beautyListLimits.name),
  items: z.array(beautyListItemSchema).max(beautyListLimits.items)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
});
export const skinFeels = ["seche", "brillante", "mixte", "equilibree", "incertaine"] as const;
export const skinConcerns = ["tiraillements", "brillance", "rougeurs", "imperfections", "texture"] as const;
export const undertones = ["froid", "chaud", "neutre", "olive", "incertain"] as const;
export const preferenceSchema = z.object({
  locale: z.enum(["fr", "en", "es", "it"]).optional(),
  fragranceFree: z.boolean(),
  sensitive: z.boolean(),
  avoid: z.string().trim().max(600),
  skinFeel: z.enum(skinFeels).optional(),
  skinConcerns: z.array(z.enum(skinConcerns)).max(skinConcerns.length).optional(),
  undertone: z.enum(undertones).optional(),
});
export const stateSchema = z.object({
  products: z.array(productSchema).max(500),
  routines: z.array(routineSchema).max(100),
  palette: z.array(colorSchema).max(200),
  lists: z.array(beautyListSchema).max(beautyListLimits.lists)
    .refine((lists) => new Set(lists.map((list) => list.id)).size === lists.length).optional(),
  preferences: preferenceSchema,
  completed: z.array(z.object({ routineId: identifier, at: z.iso.datetime() })).max(1000),
});

export type Product = z.infer<typeof productSchema>;
export type FaceZone = z.infer<typeof zoneSchema>;
export type RoutineStep = z.infer<typeof stepSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type PaletteColor = z.infer<typeof colorSchema>;
export type BeautyList = z.infer<typeof beautyListSchema>;
export type Preferences = z.infer<typeof preferenceSchema>;
export type State = z.infer<typeof stateSchema>;

export const emptyState: State = {
  products: [], routines: [], palette: [], completed: [],
  preferences: { fragranceFree: false, sensitive: false, avoid: "" },
};

export const starterState: State = {
  ...emptyState,
  products: [
    { id: "example-serum", name: "Sérum Éclat", brand: "Maison Rosée", category: "soin", ingredients: "Aqua, Glycerin, Niacinamide, Panthenol, Sodium Hyaluronate", source: "local", imageUrl: "/images/serum.webp", tint: "#e9def4" },
    { id: "example-lipstick", name: "Rouge à lèvres Velours", brand: "Atelier Muse", category: "maquillage", ingredients: "Ricinus Communis Seed Oil, Cera Alba, Tocopherol, CI 77491", source: "local", imageUrl: "/images/lipstick.webp", tint: "#f4e3ea", makeupKind: "lip", makeupEffect: "tinted", shadeHex: "#9c4c5c" },
    { id: "example-cream", name: "Crème Nuage hydratante", brand: "Peau Douce", category: "soin", ingredients: "Aqua, Glycerin, Squalane, Cetearyl Alcohol, Ceramide NP", source: "local", imageUrl: "/images/cream.webp", tint: "#f1e7df" },
    { id: "example-powder", name: "Poudre de finition translucide", brand: "Atelier Muse", category: "maquillage", ingredients: "Silica, Mica", source: "local", makeupKind: "powder", makeupEffect: "mattifying" },
  ],
  routines: [
    { id: "example-morning", name: "Éclat du matin", period: "matin", steps: [
      { id: "example-step-1", productId: "example-serum", zone: "visage", note: "Appliquer sur peau propre selon la notice du produit." },
      { id: "example-step-2", productId: "example-cream", zone: "visage", note: "Répartir la crème sur le visage en suivant la notice." },
      { id: "example-step-powder", productId: "example-powder", zone: "visage", note: "Repérer les zones à matifier selon les consignes du produit." },
      { id: "example-step-3", productId: "example-lipstick", zone: "levres", note: "Appliquer le rouge sur les lèvres." },
    ] },
    { id: "example-evening", name: "Rituel du soir", period: "soir", steps: [
      { id: "example-step-4", productId: "example-serum", zone: "visage", note: "Appliquer après le nettoyage." },
      { id: "example-step-5", productId: "example-cream", zone: "joues", note: "Répartir délicatement sur les joues." },
    ] },
  ],
};
