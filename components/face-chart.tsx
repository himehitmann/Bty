"use client";

import { useId, type CSSProperties, type KeyboardEvent } from "react";
import type { PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import type { MakeupPlacement } from "@/lib/makeup-placements";
import type { FaceZone } from "@/lib/model";
import styles from "./face-chart.module.css";

type Shape = { path: string; transform?: string };
type HairArea = "scalp" | "lengths" | "ends";
type Application = { kind: "care" | "hair"; hairArea?: HairArea; massage?: boolean };

const mirror = "translate(320 0) scale(-1 1)";
const single = (path: string): Shape[] => [{ path }];
const pair = (path: string): Shape[] => [{ path }, { path, transform: mirror }];
const head = "M160 32C118 32 88 52 73 83C62 105 59 131 62 165L64 199C64 229 75 260 92 284C111 312 139 337 160 338C181 337 209 312 228 284C245 260 256 229 256 199L258 165C261 131 258 105 247 83C232 52 202 32 160 32Z";
const neck = "M112 292C116 319 112 339 98 353C88 363 48 369 23 393H297C272 369 232 363 222 353C208 339 204 319 208 292Z";
const ear = "M65 156C49 142 36 149 38 170C40 193 52 219 67 218L70 205Z";
const hairSilhouette = "M160 25C112 22 75 43 57 78C42 108 40 140 42 177C43 224 36 266 44 309C56 302 71 297 83 294C79 263 82 216 75 176C69 144 67 118 81 95C100 64 125 47 160 44C195 47 220 64 239 95C253 118 251 144 245 176C238 216 241 263 237 294C249 297 264 302 276 309C284 266 277 224 278 177C280 140 278 108 263 78C245 43 208 22 160 25Z";
const hairline = "M60 153C51 116 58 80 79 56C99 33 130 23 160 25C196 25 228 39 246 61C263 82 269 119 260 153C254 115 236 83 207 65C186 54 168 48 157 43C138 57 114 65 91 82C72 99 65 124 60 153Z";
const eye = "M83 156C95 145 111 141 127 147C133 149 138 154 142 159C125 167 101 172 83 156Z";
const upperLash = "M83 156C98 144 113 142 127 147C133 150 138 154 142 159";
const lowerLash = "M85 158C101 170 124 168 140 160";
const brow = "M79 129C91 115 110 113 124 117C134 120 140 124 143 128C132 124 124 123 115 123C101 123 92 126 79 129Z";
const lipUpper = "M123 265C139 262 145 250 153 254C157 256 158 259 160 259C162 259 163 256 167 254C175 250 181 262 197 265C183 266 173 269 160 268C147 269 137 266 123 265Z";
const lipLower = "M123 265C139 267 148 270 160 268C172 270 181 267 197 265C187 278 174 285 160 286C146 285 133 278 123 265Z";
const lips = [...single(lipUpper), ...single(lipLower)];
const eyeShade = pair("M77 154C86 139 101 134 116 136C126 137 135 144 141 154C121 147 98 147 83 159Z");
const liner = pair("M77 151C81 152 83 155 87 153C103 142 126 142 142 159C123 146 102 150 87 158C84 158 79 154 77 151Z");
const lashes = pair("M85 156Q81 152 79 149M93 151Q90 147 89 144M102 147Q100 143 100 140M112 146Q111 141 112 139M122 148Q123 143 125 141");
const forehead = single("M91 103C100 69 128 53 160 53C192 53 220 69 229 103C212 126 108 126 91 103Z");
const chin = single("M130 304C138 292 182 292 190 304C188 321 176 328 160 329C144 328 132 321 130 304Z");
const apples = pair("M85 206C93 187 118 183 136 195C145 201 142 215 129 224C109 237 87 226 85 206Z");
const cheekArea = pair("M71 188C82 170 113 172 144 188C158 204 144 236 122 249C97 256 76 225 71 188Z");
const underEyes = pair("M90 170C101 175 124 175 142 165C139 181 127 192 111 194C101 193 94 185 90 170Z");
const noseCenter = single("M155 158C159 154 164 156 166 162C169 178 167 194 171 211C176 221 174 232 165 234C153 238 145 231 149 220C154 206 152 176 155 158Z");
const cupid = single("M149 251C152 246 157 249 160 251C163 249 168 246 171 251C169 256 151 256 149 251Z");
const centerForehead = single("M124 85C133 71 188 71 196 85C200 96 189 114 160 115C131 114 120 96 124 85Z");
const contourCheeks = pair("M72 208C90 204 103 218 129 232C135 238 132 243 120 243C100 241 80 230 72 218Z");
const contourTemples = pair("M70 115C72 89 88 66 111 56C111 75 98 89 92 109C88 125 83 138 75 142Z");
const contourJaw = pair("M65 222C72 220 76 238 87 258C106 291 127 314 150 328C135 329 110 314 91 291C74 270 66 245 65 222Z");
const contourNose = pair("M145 165C149 164 151 169 149 181C148 196 145 211 140 222C136 228 132 226 134 219C138 199 139 178 145 165Z");
const sunSweep = single("M85 194C112 185 129 191 158 197C187 191 208 185 235 194C226 211 202 220 180 212C170 209 166 209 160 211C154 209 150 209 140 212C118 220 94 211 85 194Z");
const highlightCheeks = pair("M87 187C97 177 116 173 136 177C126 179 110 186 94 196C87 198 84 193 87 187Z");
const highlightNose = [
  ...single("M156 176C158 168 163 168 165 176C167 185 166 199 163 207C161 211 158 210 156 205C154 197 154 183 156 176Z"),
  ...single("M152 224C154 219 166 219 168 224C170 229 165 232 160 232C155 232 150 229 152 224Z"),
];
const powderTZone = [...centerForehead, ...noseCenter, ...chin];
const fullFace = single(head);

const placementShapes = {
  "blush-apples": apples,
  "blush-lifted": pair("M76 185C93 169 122 178 146 200C139 216 119 218 101 207C85 200 76 194 76 185Z"),
  "blush-sun-kissed": [...apples, ...sunSweep],
  "blush-under-eyes": underEyes,
  "blush-draped": pair("M66 154C78 146 90 155 92 170C100 187 136 194 142 213C131 228 107 223 91 207C78 194 66 168 66 154Z"),
  "contour-cheeks": contourCheeks,
  "contour-temples": contourTemples,
  "contour-jaw": contourJaw,
  "contour-nose": contourNose,
  "contour-complete": [...contourCheeks, ...contourTemples, ...contourJaw, ...contourNose],
  "bronzer-sun": [...pair("M73 104C80 76 105 58 132 52C117 69 109 82 98 97C91 107 83 112 73 104Z"), ...sunSweep],
  "bronzer-three": pair("M104 55C82 63 67 86 64 112C64 133 78 147 78 169C78 183 71 194 70 214C68 236 84 268 103 287C107 286 107 279 105 274C86 252 83 226 86 213C89 194 96 186 98 171C98 149 78 137 80 114C82 92 96 74 109 63Z"),
  "bronzer-cheeks": pair("M75 185C90 178 116 182 135 195C143 204 133 214 120 217C103 222 80 210 75 195Z"),
  "highlight-cheekbones": highlightCheeks,
  "highlight-center": [...highlightNose, ...cupid],
  "highlight-points": [...highlightCheeks, ...highlightNose, ...cupid],
  "powder-tzone": powderTZone,
  "powder-under-eyes": underEyes,
  "powder-center": [...powderTZone, ...underEyes],
  "powder-full": fullFace,
  "concealer-under-eyes": underEyes,
  "concealer-center": [...underEyes, ...noseCenter, ...cupid, ...chin],
  "concealer-redness": [...pair("M124 209C129 199 143 205 145 217C143 227 132 231 125 223C123 219 122 213 124 209Z"), ...single("M137 299C145 292 175 292 183 299C182 311 138 313 137 299Z")],
} satisfies Record<MakeupPlacement, Shape[]>;

const zoneNames = {
  visage: ["Visage", "Face"], front: ["Front", "Forehead"], joues: ["Joues", "Cheeks"], yeux: ["Yeux", "Eyes"],
  levres: ["Lèvres", "Lips"], menton: ["Menton", "Chin"], cheveux: ["Cheveux", "Hair"],
} satisfies Record<FaceZone, [string, string]>;
const zoneGeometry = {
  visage: fullFace, front: forehead, joues: cheekArea,
  yeux: pair("M75 153C81 130 108 125 133 138C149 148 153 169 139 177C111 188 83 178 75 153Z"),
  levres: single(`${lipUpper} ${lipLower}`), menton: chin,
  cheveux: single(hairSilhouette),
} satisfies Record<FaceZone, Shape[]>;
const guideZones: FaceZone[] = ["visage", "cheveux", "front", "joues", "yeux", "levres", "menton"];
const hairGeometry = {
  scalp: single("M67 112C75 65 113 38 160 36C207 38 245 69 254 112"),
  lengths: pair("M52 126C48 145 51 164 52 189C53 214 49 237 49 255"),
  ends: pair("M48 253C45 272 44 290 47 302C55 295 61 292 69 289"),
} satisfies Record<HairArea, Shape[]>;

function tone(value: string | number | undefined, fallback: string) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function mix(first: string, second: string, amount: number) {
  let mixed = "#";
  for (const start of [1, 3, 5]) {
    const a = Number.parseInt(first.slice(start, start + 2), 16);
    const b = Number.parseInt(second.slice(start, start + 2), 16);
    mixed += Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  }
  return mixed;
}

function pigmentShapes(layer: PigmentLayer): Shape[] {
  if (layer.placement) return placementShapes[layer.placement];
  if (layer.kind === "eyeshadow") return eyeShade;
  if (layer.kind === "eyeliner") return liner;
  if (layer.kind === "mascara") return lashes;
  if (layer.kind === "lip") return lips;
  if (layer.zone === "joues") {
    if (layer.kind === "highlighter") return highlightCheeks;
    if (layer.kind === "contour") return contourCheeks;
    if (layer.kind === "blush") return apples;
  }
  return zoneGeometry[layer.zone];
}

export function FaceChart({ selected, layers, onSelect, availableZones, className, style, application, placementGuide, mattePlacement, showHair }: {
  selected: FaceZone;
  layers: PigmentLayer[];
  onSelect: (zone: FaceZone) => void;
  availableZones?: readonly FaceZone[];
  className?: string;
  style?: CSSProperties;
  application?: Application;
  placementGuide?: MakeupPlacement;
  mattePlacement?: MakeupPlacement;
  showHair?: boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  const design = style as (CSSProperties & Record<string, string | number | undefined>) | undefined;
  const skin = tone(design?.["--face-skin"], "#DCAF98");
  const iris = tone(design?.["--face-iris"], "#775043");
  const hair = tone(design?.["--face-hair"], "#60443C");
  const ink = mix(skin, "#39231F", .72);
  const shade = mix(skin, "#5C342B", .52);
  const light = mix(skin, "#FFF2DD", .2);
  const darkLip = mix(skin, "#813B46", .42);
  const lightLip = mix(darkLip, "#E2AB99", .48);
  const hairVisible = showHair || application?.kind === "hair" || (!availableZones && selected === "cheveux");
  const targets = availableZones ?? guideZones;
  const outline = placementGuide ? placementShapes[placementGuide] : undefined;
  const markings = application?.kind === "hair" ? (application.hairArea ? hairGeometry[application.hairArea] : zoneGeometry.cheveux)
    : application?.kind === "care" ? zoneGeometry[selected] : [];

  function activate(event: KeyboardEvent<SVGGElement>, zone: FaceZone) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(zone);
  }

  return <svg className={className ? `${styles.face} ${className}` : styles.face} style={style}
    viewBox="0 0 320 394" role="group" aria-labelledby={`${id}-title`}>
    <title id={`${id}-title`}>{t("Carte interactive des zones du visage", "Interactive face chart")}</title>
    <defs>
      <radialGradient id={`${id}-skin`} cx="47%" cy="36%" r="69%">
        <stop stopColor={light}/><stop offset="65%" stopColor={skin}/><stop offset="100%" stopColor={shade}/>
      </radialGradient>
      <linearGradient id={`${id}-neck`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor={shade}/><stop offset="63%" stopColor={skin}/><stop offset="100%" stopColor={light}/>
      </linearGradient>
      <radialGradient id={`${id}-shade`}>
        <stop stopColor={shade} stopOpacity=".47"/><stop offset="100%" stopColor={shade} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-light`}>
        <stop stopColor={light} stopOpacity=".89"/><stop offset="100%" stopColor={light} stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={`${id}-lip-upper`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor={mix(darkLip, "#472529", .24)}/><stop offset="100%" stopColor={darkLip}/>
      </linearGradient>
      <linearGradient id={`${id}-lip-lower`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor={darkLip}/><stop offset="58%" stopColor={lightLip}/><stop offset="100%" stopColor={darkLip}/>
      </linearGradient>
      <radialGradient id={`${id}-iris`} cx="46%" cy="46%" r="65%">
        <stop stopColor="#312420"/><stop offset="42%" stopColor={iris}/><stop offset="79%" stopColor={mix(iris, "#211D1B", .34)}/><stop offset="100%" stopColor="#241B19"/>
      </radialGradient>
      <linearGradient id={`${id}-sclera`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor="#D3B4A8"/><stop offset="44%" stopColor="#FBF4EA"/><stop offset="100%" stopColor="#E5CCC0"/>
      </linearGradient>
      <linearGradient id={`${id}-hair`} x1="0" x2="100%" y1="0" y2="100%">
        <stop stopColor={mix(hair, light, .3)}/><stop offset="48%" stopColor={hair}/><stop offset="100%" stopColor={mix(hair, "#271D1C", .35)}/>
      </linearGradient>
      <clipPath id={`${id}-head`}><path d={head}/></clipPath>
      <clipPath id={`${id}-eye-left`}><path d={eye}/></clipPath>
      <clipPath id={`${id}-eye-right`}><path d={eye} transform={mirror}/></clipPath>
      <mask id={`${id}-complexion`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="394">
        <path d={head} fill="white"/>
        <path d={eye} fill="black"/><path d={eye} fill="black" transform={mirror}/>
        <path d={lipUpper} fill="black"/><path d={lipLower} fill="black"/>
      </mask>
      <filter id={`${id}-feather`} x="-35%" y="-45%" width="170%" height="190%">
        <feGaussianBlur stdDeviation="2.4"/>
      </filter>
      <filter id={`${id}-diffuse`} x="-50%" y="-60%" width="200%" height="220%">
        <feGaussianBlur stdDeviation="4.1"/>
      </filter>
      {layers.map((layer, index) => layer.kind === "lip" ?
        <linearGradient id={`${id}-colour-${index}`} key={layer.stepId} x1="0" x2="0" y1="0" y2="100%">
          <stop stopColor={mix(layer.hex, "#37202C", .29)}/><stop offset="46%" stopColor={layer.hex}/>
          <stop offset="65%" stopColor={mix(layer.hex, "#FFE4CC", .17)}/><stop offset="100%" stopColor={mix(layer.hex, "#3E202D", .24)}/>
        </linearGradient> :
        <radialGradient id={`${id}-colour-${index}`} key={layer.stepId}>
          <stop offset="3%" stopColor={layer.hex} stopOpacity="1"/><stop offset="64%" stopColor={layer.hex} stopOpacity={layer.kind === "contour" ? ".5" : ".66"}/>
          <stop offset="100%" stopColor={layer.hex} stopOpacity="0"/>
        </radialGradient>)}
    </defs>

    <g aria-hidden="true" className={styles.artwork}>
      {hairVisible && <path d={hairSilhouette} fill={`url(#${id}-hair)`}/>}
      <path d={neck} fill={`url(#${id}-neck)`} stroke={ink} strokeWidth=".55" strokeOpacity=".28"/>
      <path d="M95 364C116 360 141 370 150 379M225 364C204 360 179 370 170 379" stroke={shade} strokeWidth=".9" strokeOpacity=".52" fill="none"/>
      {pair(ear).map(({ path, transform }, index) => <g key={index} transform={transform}>
        <path d={path} fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".7" strokeOpacity=".49"/>
        <path d="M56 159C44 152 43 171 48 184C51 194 56 207 64 206C57 197 55 189 55 182C53 176 56 171 61 173C61 165 58 160 56 159Z" fill={shade} opacity=".33"/>
        <path d="M53 169C49 171 50 179 53 184M61 193C55 197 59 204 62 205" fill="none" stroke={ink} strokeWidth=".7" strokeOpacity=".5"/>
      </g>)}
      <path d={head} fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".78" strokeOpacity=".54"/>
      <g clipPath={`url(#${id}-head)`} mask={`url(#${id}-complexion)`}>
        <ellipse cx="160" cy="92" rx="58" ry="44" fill={`url(#${id}-light)`} opacity=".6"/>
        <ellipse cx="104" cy="211" rx="32" ry="49" transform="rotate(-27 104 211)" fill={`url(#${id}-light)`} opacity=".44"/>
        <ellipse cx="221" cy="215" rx="35" ry="48" transform="rotate(28 221 215)" fill={`url(#${id}-shade)`} opacity=".37"/>
        <ellipse cx="160" cy="313" rx="38" ry="19" fill={`url(#${id}-light)`} opacity=".56"/>
        <ellipse cx="148" cy="206" rx="10" ry="44" transform="rotate(8 148 206)" fill={`url(#${id}-shade)`} opacity=".69"/>
        <ellipse cx="172" cy="204" rx="10" ry="42" transform="rotate(-8 172 204)" fill={`url(#${id}-shade)`} opacity=".51"/>
        <ellipse cx="159" cy="209" rx="12" ry="44" fill={`url(#${id}-light)`} opacity=".68"/>
        <ellipse cx="160" cy="244" rx="22" ry="9" fill={`url(#${id}-shade)`} opacity=".36"/>
        <ellipse cx="160" cy="291" rx="29" ry="9" fill={`url(#${id}-shade)`} opacity=".53"/>
      </g>
      <path d={lipUpper} fill={`url(#${id}-lip-upper)`}/>
      <path d={lipLower} fill={`url(#${id}-lip-lower)`}/>
      <g className={styles.pigments} clipPath={`url(#${id}-head)`}>
        {layers.map((layer, index) => {
          const isStroke = layer.kind === "mascara";
          const isLine = isStroke || layer.kind === "eyeliner";
          const isLip = layer.kind === "lip";
          const blend = layer.kind === "contour" || layer.kind === "bronzer" ? "multiply" : undefined;
          const softEdge = blend || layer.kind === "blush" ? "diffuse" : "feather";
          return <g key={layer.stepId} data-pigment={layer.kind} data-zone={layer.zone} data-placement={layer.placement}
            opacity={layer.opacity} style={{ mixBlendMode: blend }} filter={isLine || isLip ? undefined : `url(#${id}-${softEdge})`}
            mask={layer.zone === "visage" || layer.kind === "powder" ? `url(#${id}-complexion)` : undefined}>
            {pigmentShapes(layer).map(({ path, transform }, shapeIndex) => <path d={path} transform={transform} key={shapeIndex}
              fill={isStroke ? "none" : isLine ? layer.hex : `url(#${id}-colour-${index})`}
              stroke={isStroke ? layer.hex : undefined} strokeWidth={isStroke ? "1.65" : undefined}/>) }
          </g>;
        })}
        {mattePlacement && <g data-matte-placement={mattePlacement} style={{ mixBlendMode: "luminosity" }} opacity=".095"
          filter={`url(#${id}-feather)`} mask={`url(#${id}-complexion)`}>
          {placementShapes[mattePlacement].map(({ path, transform }, index) => <path key={index} d={path} transform={transform} fill="#999"/>) }
        </g>}
      </g>
      <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M151 175C149 188 147 203 143 216M170 176C172 194 174 207 177 216" strokeWidth=".78" opacity=".29"/>
        <path d="M143 220C137 224 137 231 143 233M177 220C183 224 183 231 177 233M150 230C155 230 156 235 160 235C164 235 165 230 170 230" strokeWidth=".9" opacity=".58"/>
        <path d="M143 230C145 227 148 227 150 229M177 230C175 227 172 227 170 229" strokeWidth="1.38" opacity=".62"/>
        <path d="M124 265C140 266 148 269 160 268C172 269 183 266 196 265" strokeWidth=".96" opacity=".72"/>
        <path d="M143 276C151 280 168 280 178 276" stroke={mix(lightLip, "#FAE4D7", .45)} strokeWidth="1.04" opacity=".53"/>
      </g>
      {[false, true].map((rightEye) => {
        const centre = rightEye ? 207 : 113;
        const transform = rightEye ? mirror : undefined;
        return <g key={String(rightEye)}>
          <path d={brow} transform={transform} fill={mix(hair, ink, .34)} opacity=".93"/>
          <path d="M88 125L92 122M95 123L99 119M102 122L105 118M109 122L112 118M116 122L119 119M123 123L126 121M130 124L133 123" transform={transform}
            fill="none" stroke={mix(hair, light, .32)} strokeWidth=".58" opacity=".7"/>
          <path d="M83 148C96 134 122 134 139 150" transform={transform} fill="none" stroke={ink} strokeWidth=".69" opacity=".46"/>
          <path d={eye} transform={transform} fill={`url(#${id}-sclera)`}/>
          <g clipPath={`url(#${id}-eye-${rightEye ? "right" : "left"})`}>
            <circle cx={centre} cy="155.5" r="11" fill={`url(#${id}-iris)`}/>
            <circle cx={centre} cy="155.3" r="4.4" fill="#231A18"/>
            <circle cx={centre - 3.2} cy="151.2" r="2" fill="#FFFBF3" opacity=".92"/>
            <circle cx={centre + 3.2} cy="161.4" r=".9" fill="#FFF0DE" opacity=".72"/>
          </g>
          <path d={upperLash} transform={transform} fill="none" stroke={mix(hair, "#281F1D", .45)} strokeWidth="1.42"/>
          <path d={lowerLash} transform={transform} fill="none" stroke={ink} strokeWidth=".67" opacity=".58"/>
          <path d="M85 156Q81 153 80 150M91 152Q87 149 87 147M96 149Q94 147 94 145" transform={transform}
            fill="none" stroke={mix(hair, "#291F1C", .44)} strokeWidth=".75" opacity=".76"/>
          <path d="M139 158L142 159L139 161" transform={transform} fill="none" stroke="#AD6D66" strokeWidth=".64" opacity=".76"/>
        </g>;
      })}
      {hairVisible && <>
        <path d={hairline} fill={`url(#${id}-hair)`}/>
        <path d="M159 44C132 58 113 54 89 75M162 42C192 44 228 63 243 96M49 153C45 214 52 239 47 269M269 154C272 217 266 242 273 269" fill="none" stroke={mix(hair, light, .35)} strokeWidth=".7" opacity=".63"/>
      </>}
    </g>

    {outline && <g className={styles.placementGuide} data-placement-guide={placementGuide} aria-hidden="true">
      {outline.map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
    </g>}
    {application && <g className={styles.applicationMarking} data-application={application.kind} data-hair-area={application.hairArea}
      key={`${application.kind}-${application.hairArea ?? selected}`} aria-hidden="true">
      {markings.map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
      {application.kind === "hair" && application.massage && <path className={styles.massageArrows}
        d="M113 63c-9 1-13-7-8-13 5-5 14-2 15 5m-6-3 6 4 3-5m78 4c1-7 10-10 15-5 5 6 1 14-8 13m1-5-4 5 6 2"/>}
    </g>}
    {targets.filter((zone) => zone !== "cheveux" || hairVisible).map((zone) => {
      const highlight = !availableZones && !application && !outline && zone === selected;
      return <g className={styles.faceZone} role="button" tabIndex={0} key={zone} data-zone={zone} data-active={selected === zone}
        data-highlight={highlight} data-guided={application?.kind === "care" && selected === zone}
        aria-label={t(...zoneNames[zone])} aria-pressed={selected === zone}
        onClick={() => onSelect(zone)} onKeyDown={(event) => activate(event, zone)}>
        {zoneGeometry[zone].map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
      </g>;
    })}
  </svg>;
}
