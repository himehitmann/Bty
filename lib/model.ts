import { z } from "zod";

export const categories = ["soin", "maquillage", "cheveux"] as const;
export const categoryLabels = { soin: "Soin", maquillage: "Maquillage", cheveux: "Cheveux" };
export const sourceLabels = { manuel: "Saisie manuelle", local: "Catalogue local · formule indicative", "open-beauty-facts": "Open Beauty Facts" };

const identifier = z.string().min(1).max(160);
const name = z.string().trim().min(1).max(140);
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const productImage = z.string().max(700).refine((url) => /^\/images\/[\w-]+\.webp$/.test(url) || /^https:\/\/(?:images\.openbeautyfacts\.(?:org|net)|images\.openfoodfacts\.(?:org|net))\//i.test(url));

export const productInput = z.object({
  name,
  brand: z.string().trim().max(140),
  category: z.enum(categories),
  ingredients: z.string().trim().max(6500),
  barcode: z.string().trim().regex(/^\d{8,14}$/).optional(),
});

export const productSchema = productInput.extend({
  id: identifier,
  imageUrl: productImage.catch("").transform((image) => image || undefined).optional(),
  source: z.enum(["manuel", "local", "open-beauty-facts"]),
  tint: hex.optional(),
});

const zoneSchema = z.enum(["visage", "front", "joues", "yeux", "levres", "menton", "cheveux"]);
const stepSchema = z.object({
  id: identifier, productId: identifier, zone: zoneSchema, note: z.string().max(800),
});
const routineSchema = z.object({
  id: identifier, name, period: z.enum(["matin", "soir", "libre"]), steps: z.array(stepSchema).max(40),
});
const colorSchema = z.object({
  id: identifier, hex, name, photoPath: z.string().max(300).optional(),
});
export const preferenceSchema = z.object({
  fragranceFree: z.boolean(),
  sensitive: z.boolean(),
  avoid: z.string().trim().max(600),
});
export const stateSchema = z.object({
  products: z.array(productSchema).max(500),
  routines: z.array(routineSchema).max(100),
  palette: z.array(colorSchema).max(200),
  preferences: preferenceSchema,
  completed: z.array(z.object({ routineId: identifier, at: z.iso.datetime() })).max(1000),
});

export type Product = z.infer<typeof productSchema>;
export type FaceZone = z.infer<typeof zoneSchema>;
export type RoutineStep = z.infer<typeof stepSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type PaletteColor = z.infer<typeof colorSchema>;
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
    { id: "example-lipstick", name: "Rouge à lèvres Velours", brand: "Atelier Muse", category: "maquillage", ingredients: "Ricinus Communis Seed Oil, Cera Alba, Tocopherol, CI 77491", source: "local", imageUrl: "/images/lipstick.webp", tint: "#f4e3ea" },
    { id: "example-cream", name: "Crème Nuage hydratante", brand: "Peau Douce", category: "soin", ingredients: "Aqua, Glycerin, Squalane, Cetearyl Alcohol, Ceramide NP", source: "local", imageUrl: "/images/cream.webp", tint: "#f1e7df" },
  ],
  routines: [
    { id: "example-morning", name: "Éclat du matin", period: "matin", steps: [
      { id: "example-step-1", productId: "example-serum", zone: "visage", note: "Appliquer sur peau propre selon la notice du produit." },
      { id: "example-step-2", productId: "example-cream", zone: "visage", note: "Répartir la crème sur le visage en suivant la notice." },
      { id: "example-step-3", productId: "example-lipstick", zone: "levres", note: "Appliquer le rouge sur les lèvres." },
    ] },
    { id: "example-evening", name: "Rituel du soir", period: "soir", steps: [
      { id: "example-step-4", productId: "example-serum", zone: "visage", note: "Appliquer après le nettoyage." },
      { id: "example-step-5", productId: "example-cream", zone: "joues", note: "Répartir délicatement sur les joues." },
    ] },
  ],
};
