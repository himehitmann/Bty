import type { PigmentLayer } from "@/lib/face-makeup";
import type { MakeupPlacement } from "@/lib/makeup-placements";
import type { FaceZone } from "@/lib/model";
import { getStudioAnchor, type StudioAnchor, type StudioBrowShape, type StudioLinerStyle, type StudioShadowZone, type StudioSide } from "@/lib/studio-advanced";

export type Shape = { path: string; transform?: string };

export const portraitHeight = 356;
export const head = "M159 25C111 24 75 41 55 73C33 108 37 150 47 183C53 207 57 228 65 249C75 275 90 295 115 311C133 324 145 338 159 338C175 338 188 325 207 311C232 294 248 275 257 247C265 225 270 202 275 182C285 152 288 110 265 74C244 42 207 24 159 25Z";
export const hairSilhouette = "M159 10C105 2 66 20 42 50C14 86 13 126 22 166C31 201 21 230 13 263C3 298 15 327 37 342C34 329 37 312 45 302C45 321 54 334 74 341C60 311 83 277 79 254L243 248C245 278 267 311 254 345C275 338 282 323 283 309C293 316 294 328 290 343C313 324 318 299 309 268C300 236 291 207 300 168C313 112 302 78 281 48C256 15 209 1 159 10Z";
export const eye = "M77 189C85 181 94 174 107 174C122 173 134 182 143 197C134 199 120 207 106 207C92 206 84 199 77 189Z";
export const lip = "M128 287C136 283 141 274 150 273C155 272 158 275 160 276C163 275 165 272 170 273C179 274 184 283 192 287C184 299 173 305 160 305C147 305 136 299 128 287Z";

export const mirror = "translate(320 0) scale(-1 1)";
export const irisCenter = { x: 110, y: 190 } as const;

export function single(path: string): Shape[] {
  return [{ path }];
}

export function pair(path: string): Shape[] {
  return [{ path }, { path, transform: mirror }];
}

// These paths share the chart's 320 × 356 viewBox. The left eye opens at
// (77, 189), rises to (107, 174), and closes at the tear duct (143, 197).
export const eyeShade = pair("M68 188C75 173 88 161 106 162C123 162 137 173 144 193C134 185 123 179 109 179C94 179 80 187 74 192Z");
export const liner = pair("M65 177C71 182 75 185 80 182C88 175 97 172 108 172C123 172 135 183 143 197C134 188 126 181 115 177C102 173 91 181 81 188C75 189 70 185 65 177Z");
export const lashes = pair("M77 189C71 184 67 177 67 171M82 184C77 180 74 173 75 168M89 180C84 176 82 169 83 165M96 176C93 173 91 166 93 162M104 174C102 170 101 164 104 161M112 175C112 171 112 166 115 163M121 178C122 174 123 170 126 168M129 183C131 180 132 177 135 176");

const linerVariants = {
  classic: pair("M76 190C84 178 95 172 107 172C122 172 135 182 143 197C135 189 127 179 110 176C97 173 86 182 76 190Z"),
  winged: liner,
  puppy: pair("M63 199C69 196 73 191 78 185C89 176 97 172 109 172C124 173 135 183 143 197C136 188 127 179 110 176C97 174 87 181 79 189C76 194 71 199 63 199Z"),
  graphic: [
    ...liner,
    ...pair("M63 167C73 172 79 172 87 167C96 161 105 159 115 161C126 163 135 171 139 178C135 175 130 172 125 169C113 162 99 163 88 169C79 174 72 174 63 167Z"),
  ],
} satisfies Record<StudioLinerStyle, Shape[]>;

const shadowVariants = {
  lid: pair("M77 188C86 175 96 168 109 169C122 169 135 181 143 195C131 185 121 176 107 177C94 177 84 184 77 188Z"),
  crease: pair("M72 177C86 162 98 157 111 158C127 160 138 171 145 184C137 175 125 167 112 166C98 165 84 169 72 177Z"),
  outer: pair("M66 186C72 172 80 170 91 168C98 171 102 177 99 182C91 184 82 187 77 194C72 195 69 191 66 186Z"),
  inner: pair("M128 181C136 182 143 190 149 198C152 204 148 208 141 206C136 201 134 191 128 181Z"),
  lower: pair("M75 193C84 202 97 210 108 210C121 209 134 203 142 200C136 210 122 217 107 218C93 217 82 208 75 193Z"),
  whole: eyeShade,
} satisfies Record<StudioShadowZone, Shape[]>;

const forehead = single("M74 121C80 78 111 53 160 53C209 53 240 78 246 121C232 145 202 148 160 147C118 148 88 145 74 121Z");
const centreForehead = single("M120 106C124 91 145 84 160 84C175 84 196 91 200 106C202 121 181 134 160 135C139 134 118 121 120 106Z");
const cheekArea = pair("M61 226C62 207 84 200 109 205C133 208 150 220 148 237C145 257 124 279 105 280C84 279 68 252 61 226Z");
const underEyes = pair("M82 204C96 211 113 213 142 200C140 212 130 225 114 229C101 232 89 224 82 204Z");
const chin = single("M133 317C140 308 150 307 160 308C170 307 180 308 187 317C187 327 176 333 160 334C144 333 133 327 133 317Z");
const nose = single("M156 197C157 193 163 193 165 199C168 211 165 226 169 238C172 248 168 254 160 255C151 254 148 249 151 239C155 226 153 208 156 197Z");
const cupid = single("M149 271C152 266 156 269 160 272C164 269 168 266 171 271C171 274 166 276 160 275C154 276 149 274 149 271Z");

const apples = pair("M78 241C78 228 91 223 103 223C116 223 128 229 131 241C133 254 121 263 107 263C93 263 79 254 78 241Z");
const blushLifted = pair("M57 205C65 202 74 207 84 216C96 226 110 230 125 234C131 238 128 245 120 248C106 250 86 240 72 226C63 218 58 212 57 205Z");
const blushAcross = single("M71 219C91 213 119 215 141 221C150 224 154 225 160 225C166 225 170 224 179 221C201 215 229 213 249 219C243 232 225 240 207 240C188 240 174 235 160 235C146 235 132 240 113 240C95 240 77 232 71 219Z");
const blushDraped = pair("M52 169C57 166 65 173 69 183C74 202 87 210 101 217C114 224 129 229 137 239C133 248 121 250 110 245C91 237 74 228 64 211C56 199 52 184 52 169Z");

const contourCheeks = pair("M61 237C71 236 84 243 96 251C109 260 120 265 126 272C119 275 112 274 103 271C86 265 73 257 66 250C63 246 62 242 61 237Z");
const contourTemples = pair("M44 142C45 118 47 96 61 77C69 65 86 53 104 45C99 57 85 67 77 78C67 91 62 103 58 120C54 135 55 143 49 150C46 150 44 147 44 142Z");
const contourJaw = pair("M65 249C73 250 78 269 93 285C111 303 130 318 151 330C141 333 124 324 107 313C85 298 66 274 65 249Z");
const contourNose = pair("M147 196C151 191 154 194 153 201C153 214 151 227 147 237C146 242 143 244 140 243C138 241 139 238 140 233C144 222 143 208 147 196Z");

const bronzerCheeks = pair("M65 220C76 214 92 213 110 217C122 219 133 226 135 234C130 243 119 247 107 246C88 244 70 236 65 220Z");
const bronzerForehead = single("M74 88C91 64 126 49 160 49C194 49 229 64 246 88C240 101 221 101 203 92C188 84 173 81 160 81C147 81 132 84 117 92C99 101 80 101 74 88Z");
const bronzerNose = single("M155 217C157 211 163 211 165 217C167 224 166 237 162 243C160 246 157 244 155 239C152 233 152 223 155 217Z");
const bronzerThree = pair("M102 57C79 65 52 88 48 119C45 140 51 157 61 174C68 187 66 203 60 218C55 233 64 253 74 268C86 284 99 299 120 311C116 300 106 289 95 274C84 259 76 242 78 225C80 208 88 194 86 181C84 165 69 150 67 131C64 106 78 80 102 64Z");

const highlightCheeks = pair("M75 217C86 206 107 207 131 212C124 215 111 215 100 218C92 220 84 225 78 224C74 223 73 220 75 217Z");
const highlightNose = [
  ...single("M157 199C159 193 163 196 164 202C165 213 165 225 163 235C161 239 158 238 157 234C155 228 155 207 157 199Z"),
  ...single("M153 249C154 244 165 243 168 248C171 253 165 256 160 256C155 256 151 254 153 249Z"),
];
const powderTZone = [...centreForehead, ...nose, ...chin];

export const placementShapes = {
  "blush-apples": apples,
  "blush-lifted": blushLifted,
  "blush-sun-kissed": [...apples, ...blushAcross],
  "blush-under-eyes": underEyes,
  "blush-draped": blushDraped,
  "contour-cheeks": contourCheeks,
  "contour-temples": contourTemples,
  "contour-jaw": contourJaw,
  "contour-nose": contourNose,
  "contour-complete": [...contourCheeks, ...contourTemples, ...contourJaw, ...contourNose],
  "bronzer-sun": [...bronzerForehead, ...bronzerCheeks, ...bronzerNose],
  "bronzer-three": bronzerThree,
  "bronzer-cheeks": bronzerCheeks,
  "highlight-cheekbones": highlightCheeks,
  "highlight-center": [...highlightNose, ...cupid],
  "highlight-points": [...highlightCheeks, ...highlightNose, ...cupid],
  "powder-tzone": powderTZone,
  "powder-under-eyes": underEyes,
  "powder-center": [...powderTZone, ...underEyes],
  "powder-full": single(head),
  "concealer-under-eyes": underEyes,
  "concealer-center": [...underEyes, ...nose, ...cupid, ...chin],
  "concealer-redness": [
    ...pair("M134 238C139 232 148 237 149 246C150 256 143 264 135 262C128 261 127 247 134 238Z"),
    ...single("M142 316C147 311 171 311 178 316C182 322 169 326 160 326C151 326 138 322 142 316Z"),
  ],
} satisfies Record<MakeupPlacement, Shape[]>;

export const zoneGeometry = {
  visage: placementShapes["powder-full"],
  front: forehead,
  joues: cheekArea,
  yeux: pair("M67 192C72 171 88 158 107 159C128 160 144 179 150 195C151 213 134 220 110 222C90 221 75 212 67 192Z"),
  levres: single(lip),
  menton: chin,
  cheveux: single(hairSilhouette),
} satisfies Record<FaceZone, Shape[]>;

function moveShape(shape: Shape, from: StudioAnchor, to: StudioAnchor): Shape {
  if (from.x === to.x && from.y === to.y) return shape;
  const x = ((to.x - from.x) * 320).toFixed(2);
  const y = ((to.y - from.y) * portraitHeight).toFixed(2);
  return { ...shape, transform: `translate(${x} ${y})${shape.transform ? ` ${shape.transform}` : ""}` };
}

const browProfiles = {
  natural: { peak: 105, lift: 8, inner: 164 },
  arched: { peak: 111, lift: 14, inner: 163 },
  straight: { peak: 103, lift: 3, inner: 159 },
  soft: { peak: 103, lift: 10, inner: 169 },
} satisfies Record<StudioBrowShape, { peak: number; lift: number; inner: number }>;

function browGeometry(layer: PigmentLayer): Shape[] {
  const config = layer.details?.brow;
  const { peak, lift, inner } = browProfiles[config?.shape ?? "natural"];
  const peakY = 157 - lift + (0.5 - (config?.arch ?? 0.5)) * 9;
  const thickness = 2.2 + (config?.thickness ?? 0.5) * 9;
  const lowerY = peakY + thickness;
  const path = `M77 163 C86 ${peakY + 4} ${peak - 9} ${peakY} ${peak} ${peakY} C120 ${peakY + 1} 135 ${inner - 7} 143 ${inner} C134 ${inner - 2} 121 ${lowerY + 2} ${peak} ${lowerY} C94 ${lowerY} 85 161 77 163Z`;
  return pair(path).map((shape, index) => {
    const side: StudioSide = index === 0 ? "left" : "right";
    return moveShape(shape, getStudioAnchor("brow", side), getStudioAnchor("brow", side, layer.details));
  });
}

export function pigmentShapes(layer: PigmentLayer): Shape[] {
  if (layer.kind === "brow") return browGeometry(layer);
  if (layer.kind === "blush" && (layer.details?.blush?.left || layer.details?.blush?.right)) {
    const shapes = layer.placement ? placementShapes[layer.placement] : apples;
    return shapes.map((shape, index) => {
      if (index > 1) return shape;
      const side: StudioSide = index === 0 ? "left" : "right";
      const from = getStudioAnchor("blush", side, undefined, layer.placement);
      return moveShape(shape, from, getStudioAnchor("blush", side, layer.details, layer.placement));
    });
  }
  if (layer.placement) return placementShapes[layer.placement];
  if (layer.kind === "eyeshadow") return shadowVariants[layer.details?.shadow?.zone ?? "whole"];
  if (layer.kind === "eyeliner") return linerVariants[layer.details?.liner?.style ?? "winged"];
  if (layer.kind === "mascara") return lashes;
  if (layer.kind === "lip") return zoneGeometry.levres;
  if (layer.zone === "joues") {
    if (layer.kind === "highlighter") return highlightCheeks;
    if (layer.kind === "contour") return contourCheeks;
    if (layer.kind === "blush") return apples;
  }
  return zoneGeometry[layer.zone];
}
