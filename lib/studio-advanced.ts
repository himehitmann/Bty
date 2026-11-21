import { z } from "zod";
import type { MakeupPlacement } from "./makeup-placements";

export const linerStyles = ["classic", "winged", "puppy", "graphic"] as const;
export const shadowZones = ["lid", "crease", "outer", "inner", "lower", "whole"] as const;
export const browShapes = ["natural", "arched", "straight", "soft"] as const;
export type StudioSide = "left" | "right";
export type StudioPositionTool = "blush" | "brow";

const unit = z.number().min(0).max(1);
const anchorSchema = z.object({ x: unit, y: unit });
const sidesSchema = z.object({ left: anchorSchema.optional(), right: anchorSchema.optional() });

export const studioPlacementDetailsSchema = z.object({
  blush: sidesSchema.optional(),
  liner: z.object({ style: z.enum(linerStyles) }).optional(),
  shadow: z.object({ zone: z.enum(shadowZones) }).optional(),
  brow: sidesSchema.extend({ shape: z.enum(browShapes), thickness: unit.optional(), arch: unit.optional() }).optional(),
});

export type StudioAnchor = z.infer<typeof anchorSchema>;
export type StudioPlacementDetails = z.infer<typeof studioPlacementDetailsSchema>;
export type StudioLinerStyle = (typeof linerStyles)[number];
export type StudioShadowZone = (typeof shadowZones)[number];
export type StudioBrowShape = (typeof browShapes)[number];

export type StudioPlacementMode = { tool: StudioPositionTool; side: StudioSide; anchor: StudioAnchor };

const leftBounds = {
  blush: { minX: 0.195, maxX: 0.435, minY: 0.55, maxY: 0.77 },
  brow: { minX: 0.245, maxX: 0.386, minY: 0.38, maxY: 0.465 },
} as const;

const defaultBlushAnchors: Partial<Record<MakeupPlacement, StudioAnchor>> = {
  "blush-apples": { x: 0.328, y: 0.683 },
  "blush-lifted": { x: 0.292, y: 0.636 },
  "blush-sun-kissed": { x: 0.328, y: 0.683 },
  "blush-under-eyes": { x: 0.348, y: 0.61 },
  "blush-draped": { x: 0.264, y: 0.594 },
};
const defaultBlushAnchor = { x: 0.328, y: 0.683 };
const defaultBrowAnchor = { x: 0.344, y: 0.441 };

export function studioPlacementBounds(tool: StudioPositionTool, side: StudioSide) {
  const bounds = leftBounds[tool];
  return side === "left" ? bounds : { ...bounds, minX: 1 - bounds.maxX, maxX: 1 - bounds.minX };
}

export function boundStudioAnchor(tool: StudioPositionTool, side: StudioSide, anchor: StudioAnchor): StudioAnchor {
  const { minX, maxX, minY, maxY } = studioPlacementBounds(tool, side);
  const round = (number: number) => Math.round(number * 10000) / 10000;
  const x = Number.isFinite(anchor.x) ? anchor.x : (minX + maxX) / 2;
  const y = Number.isFinite(anchor.y) ? anchor.y : (minY + maxY) / 2;
  return { x: round(Math.max(minX, Math.min(maxX, x))), y: round(Math.max(minY, Math.min(maxY, y))) };
}

export function getStudioAnchor(
  tool: StudioPositionTool,
  side: StudioSide,
  details?: StudioPlacementDetails,
  placement?: MakeupPlacement,
): StudioAnchor {
  const value = details?.[tool]?.[side];
  if (value) return boundStudioAnchor(tool, side, value);
  const defaults = tool === "brow" ? defaultBrowAnchor : (placement ? defaultBlushAnchors[placement] : undefined) ?? defaultBlushAnchor;
  return side === "left" ? defaults : { x: 1 - defaults.x, y: defaults.y };
}

export function setStudioAnchor(details: StudioPlacementDetails | undefined, tool: StudioPositionTool, side: StudioSide, value: StudioAnchor): StudioPlacementDetails {
  const anchor = boundStudioAnchor(tool, side, value);
  if (tool === "blush") return { ...details, blush: { ...details?.blush, [side]: anchor } };
  return { ...details, brow: { shape: "natural", ...details?.brow, [side]: anchor } };
}

export function mirrorStudioAnchor(details: StudioPlacementDetails | undefined, tool: StudioPositionTool, side: StudioSide, placement?: MakeupPlacement): StudioPlacementDetails {
  const source = getStudioAnchor(tool, side, details, placement);
  return setStudioAnchor(details, tool, side === "left" ? "right" : "left", { x: 1 - source.x, y: source.y });
}
