import { z } from "zod";
import { findMakeupPlacement, makeupPlacementIds } from "./makeup-placements";
import { studioPlacementDetailsSchema } from "./studio-advanced";

export const studioAreas = ["visage", "joues", "yeux", "levres"] as const;
export type StudioArea = (typeof studioAreas)[number];

export const studioToolsByArea = {
  visage: ["foundation", "concealer", "powder", "setting-powder"],
  joues: ["contour", "bronzer", "blush", "highlighter"],
  yeux: ["eyeshadow", "eyeliner", "mascara", "brow"],
  levres: ["lip"],
} as const satisfies Record<StudioArea, readonly string[]>;

export type StudioTool = (typeof studioToolsByArea)[StudioArea][number];
type StudioPigment = Exclude<StudioTool, "setting-powder">;

const studioTools = Object.values(studioToolsByArea).flat();
const pigments = studioTools.filter((tool): tool is StudioPigment => tool !== "setting-powder");

export const studioLookLimits = { looks: 30, name: 60 } as const;

const identifier = z.string().min(1).max(160);
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const percentage = z.number().int().min(0).max(100);
export const studioSkinTones = [
  "#F8E2D3", "#EBC5B0", "#DDBEA6", "#D7A385", "#C89577", "#B78263", "#A87863",
  "#945C46", "#875849", "#714733", "#68463F", "#513329", "#3F2B2A", "#342420",
] as const;
export const studioPortraitSchema = z.object({ skinTone: hex, iris: hex, hair: hex, showHair: z.boolean() });
export type StudioPortrait = z.infer<typeof studioPortraitSchema>;
export const defaultStudioPortrait: StudioPortrait = {
  skinTone: studioSkinTones[1], iris: "#5A4359", hair: "#473342", showHair: false,
};

const studioLayerSchema = z.object({
  name: z.string().trim().min(1).max(140),
  hex,
  intensity: percentage,
  mix: z.object({ hex, amount: percentage }).optional(),
  productId: identifier.optional(),
  variantId: identifier.optional(),
  approximate: z.boolean().optional(),
  swatchId: identifier.optional(),
  details: studioPlacementDetailsSchema.optional(),
});

const areaLayersSchema = z.partialRecord(z.enum(pigments), studioLayerSchema.optional());
const studioLookLayersSchema = z.partialRecord(z.enum(studioAreas), areaLayersSchema.optional())
  .superRefine((layers, context) => {
    for (const area of studioAreas) {
      const tools: readonly StudioTool[] = studioToolsByArea[area];
      for (const tool of Object.keys(layers[area] ?? {})) {
        if (!tools.some((allowed) => allowed === tool)) {
          context.addIssue({ code: "custom", path: [area, tool], message: "This tool does not belong to this area." });
        }
      }
    }
  });

const studioPlacementsSchema = z.partialRecord(z.enum(studioTools), z.enum(makeupPlacementIds).optional())
  .superRefine((placements, context) => {
    for (const tool of studioTools) {
      const placement = placements[tool];
      const kind = tool === "setting-powder" ? "powder" : tool;
      if (placement !== undefined && !findMakeupPlacement(kind, placement)) {
        context.addIssue({ code: "custom", path: [tool], message: "This placement does not belong to this tool." });
      }
    }
  });

const studioSettingSchema = z.object({ productId: identifier.optional() });

const studioLookSnapshotSchema = z.object({
  portrait: studioPortraitSchema,
  layers: studioLookLayersSchema,
  placements: studioPlacementsSchema,
  setting: studioSettingSchema.nullable(),
});

export const savedStudioLookSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(studioLookLimits.name),
  updatedAt: z.iso.datetime(),
  snapshot: studioLookSnapshotSchema,
});

export type StudioLayer = z.infer<typeof studioLayerSchema>;
export type StudioLookLayers = z.infer<typeof studioLookLayersSchema>;
export type StudioPlacements = z.infer<typeof studioPlacementsSchema>;
export type StudioSetting = z.infer<typeof studioSettingSchema>;
export type StudioLookSnapshot = z.infer<typeof studioLookSnapshotSchema>;
export type SavedStudioLook = z.infer<typeof savedStudioLookSchema>;
