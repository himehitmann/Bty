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
const eyeOffset = "translate(0 16)";
const single = (path: string): Shape[] => [{ path }];
const pair = (path: string): Shape[] => [{ path }, { path, transform: mirror }];
const eyePair = (path: string): Shape[] => [{ path, transform: eyeOffset }, { path, transform: `${eyeOffset} ${mirror}` }];
const chartHeight = 350;
const head = "M160 22C127 21 101 31 81 48C60 67 51 91 50 121C49 140 54 162 56 183C58 212 64 238 77 260C92 285 113 304 136 319C145 325 151 328 160 328C169 328 175 325 184 319C207 304 228 285 243 260C256 238 262 212 264 183C266 162 271 140 270 121C269 91 260 67 239 48C219 31 193 21 160 22Z";
const ear = "M57 159C48 149 35 150 32 163C28 177 36 194 45 205C50 211 56 214 61 210L64 196Z";
const hairSilhouette = "M160 15C122 13 86 25 61 49C39 72 32 102 36 141C40 165 41 191 38 225C34 259 29 289 39 318C54 305 66 300 82 300C70 274 73 241 75 205C77 173 71 137 81 101C94 66 126 45 160 42C194 45 226 66 239 101C249 137 243 173 245 205C247 241 250 274 238 300C254 300 266 305 281 318C291 289 286 259 282 225C279 191 280 165 284 141C288 102 281 72 259 49C234 25 198 13 160 15Z";
const hairline = "M54 153C39 126 44 92 61 67C80 36 121 16 160 15C194 15 226 27 248 47C275 70 287 109 266 155C265 119 244 88 216 72C192 57 174 52 157 39C140 54 115 65 95 79C73 96 58 123 54 153Z";
const eye = "M76 153C91 142 100 137 112 140C127 141 136 151 145 159C132 164 122 172 108 171C95 171 84 162 76 153Z";
const upperLash = "M76 153C91 142 100 137 112 140C127 141 136 151 145 159";
const lowerLash = "M79 156C89 168 101 173 113 170C123 169 137 162 145 159";
const brow = "M73 129C84 117 98 111 110 112C125 112 137 120 145 127C137 126 130 122 122 120C113 117 105 117 98 119C87 121 79 127 73 129Z";
const browHairs = "M76 127q2-3 6-5M80 125q3-4 7-6M85 123q4-5 8-7M90 121q3-5 8-7M95 120q4-5 9-7M100 119q3-5 7-7M105 118q3-4 8-5M110 118q3-4 8-4M115 119q4-3 9-3M120 120q4-2 9-2M125 121q4-1 8 0M130 123q4-1 8 1M134 124q4 0 8 2";
const lipUpper = "M128 266C139 266 145 256 151 257C155 257 157 260 160 260C163 260 165 257 169 257C175 256 181 266 192 266C182 269 172 271 160 269C148 271 138 269 128 266Z";
const lipLower = "M128 266C141 269 150 272 160 269C170 272 179 269 192 266C183 277 173 282 160 282C147 282 137 277 128 266Z";
const lipSeam = "M129 266C142 269 151 271 160 269C169 271 178 269 191 266";
const lips = [...single(lipUpper), ...single(lipLower)];
const eyeShade = eyePair("M72 152C79 137 94 128 112 130C130 132 140 144 145 157C128 149 113 144 101 145C89 146 83 153 78 157Z");
const liner = eyePair("M69 145C74 149 78 151 83 148C95 140 104 137 115 140C128 143 139 151 145 159C134 152 126 146 115 144C103 141 91 147 79 155C75 154 71 150 69 145Z");
const naturalLashes = "M77 153C73 150 71 145 71 142M82 149C77 146 74 142 74 138M88 146C84 143 81 138 81 135M95 142C92 138 90 134 91 132M102 140C100 137 98 134 100 130M110 140C110 137 108 133 110 131M118 142C119 138 118 135 120 133M125 145C127 142 126 139 129 137";
const lashes = eyePair("M76 154C69 150 67 144 67 140M82 150C75 146 71 139 72 135M89 145C83 141 80 135 81 131M96 142C92 138 89 132 91 128M103 140C100 136 98 131 100 127M111 140C109 136 108 130 110 127M118 142C120 137 118 132 121 129M126 145C129 141 129 136 132 134");
const irisFibres = Array.from({ length: 31 }, (_, index) => {
  const angle = index * Math.PI * 2 / 31;
  const inner = index % 3 === 0 ? 5.2 : 6.25;
  const outer = index % 4 === 0 ? 10.7 : 11.8;
  return `M${(Math.cos(angle) * inner).toFixed(2)} ${(Math.sin(angle) * inner).toFixed(2)}L${(Math.cos(angle + .055) * outer).toFixed(2)} ${(Math.sin(angle + .055) * outer).toFixed(2)}`;
}).join("");
const forehead = single("M91 103C100 69 128 53 160 53C192 53 220 69 229 103C212 126 108 126 91 103Z");
const chin = single("M129 298C137 288 183 288 191 298C188 312 176 323 160 324C144 323 132 312 129 298Z");
const apples = pair("M85 216C93 198 118 193 136 205C145 211 142 225 129 234C109 244 87 236 85 216Z");
const cheekArea = pair("M71 197C82 180 113 183 144 198C158 214 144 242 122 252C97 258 76 234 71 197Z");
const underEyes = eyePair("M88 170C101 178 124 177 142 166C140 181 128 192 111 195C100 194 93 186 88 170Z");
const noseCenter = single("M156 167C159 162 164 162 166 169C169 183 166 197 171 212C175 221 168 230 161 231C153 231 147 225 150 215C155 202 153 185 156 167Z");
const cupid = single("M149 251C152 246 157 249 160 251C163 249 168 246 171 251C169 256 151 256 149 251Z");
const centerForehead = single("M124 85C133 71 188 71 196 85C200 96 189 114 160 115C131 114 120 96 124 85Z");
const contourCheeks = pair("M62 219C71 218 83 223 95 230C108 237 117 243 125 249C119 251 112 250 103 247C85 241 74 234 66 228C63 225 62 222 62 219Z");
const contourTemples = pair("M70 115C72 89 88 66 111 56C111 75 98 89 92 109C88 125 83 138 75 142Z");
const contourJaw = pair("M59 220C67 222 71 238 83 256C102 285 124 303 151 319C140 324 111 308 88 286C71 269 60 241 59 220Z");
const contourNose = pair("M145 165C149 164 151 169 149 181C148 196 145 211 140 222C136 228 132 226 134 219C138 199 139 178 145 165Z");
const sunSweep = single("M85 194C112 185 129 191 158 197C187 191 208 185 235 194C226 211 202 220 180 212C170 209 166 209 160 211C154 209 150 209 140 212C118 220 94 211 85 194Z");
const highlightCheeks = pair("M87 198C97 188 116 184 136 188C126 190 110 197 94 207C87 209 84 204 87 198Z");
const highlightNose = [
  ...single("M156 176C158 168 163 168 165 176C167 185 166 199 163 207C161 211 158 210 156 205C154 197 154 183 156 176Z"),
  ...single("M152 224C154 219 166 219 168 224C170 229 165 232 160 232C155 232 150 229 152 224Z"),
];
const powderTZone = [...centerForehead, ...noseCenter, ...chin];
const fullFace = single(head);

const placementShapes = {
  "blush-apples": apples,
  "blush-lifted": pair("M76 197C93 181 122 190 146 212C139 228 119 230 101 219C85 212 76 206 76 197Z"),
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
  yeux: eyePair("M69 153C76 130 104 123 132 137C148 145 153 169 138 178C112 190 80 179 69 153Z"),
  levres: single(`${lipUpper} ${lipLower}`), menton: chin,
  cheveux: single(hairSilhouette),
} satisfies Record<FaceZone, Shape[]>;
const guideZones: FaceZone[] = ["visage", "cheveux", "front", "joues", "yeux", "levres", "menton"];
const hairGeometry = {
  scalp: single("M62 105C75 58 113 29 160 28C207 29 245 58 258 105"),
  lengths: pair("M48 113C42 139 48 174 47 202C47 221 42 243 43 263"),
  ends: pair("M42 254C38 278 36 299 41 311C48 304 56 300 66 298"),
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
  const ink = mix(skin, "#35232F", .76);
  const shade = mix(skin, "#583847", .46);
  const warmth = mix(skin, "#B8646F", .38);
  const light = mix(skin, "#FFF1E8", .26);
  const darkLip = mix(skin, "#985261", .39);
  const lightLip = mix(darkLip, "#E4AEAA", .4);
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
    viewBox={`0 0 320 ${chartHeight}`} role="group" aria-labelledby={`${id}-title`}>
    <title id={`${id}-title`}>{t("Carte interactive des zones du visage", "Interactive face chart")}</title>
    <defs>
      <radialGradient id={`${id}-skin`} cx="47%" cy="41%" r="68%">
        <stop stopColor={light}/><stop offset="61%" stopColor={skin}/><stop offset="88%" stopColor={mix(skin, shade, .47)}/><stop offset="100%" stopColor={shade}/>
      </radialGradient>
      <radialGradient id={`${id}-warm`}>
        <stop stopColor={warmth} stopOpacity=".47"/><stop offset="100%" stopColor={warmth} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-shade`}>
        <stop stopColor={shade} stopOpacity=".47"/><stop offset="100%" stopColor={shade} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-light`}>
        <stop stopColor={light} stopOpacity=".89"/><stop offset="100%" stopColor={light} stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={`${id}-lip-upper`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor={mix(darkLip, skin, .26)}/><stop offset="80%" stopColor={darkLip}/><stop offset="100%" stopColor={mix(darkLip, ink, .13)}/>
      </linearGradient>
      <linearGradient id={`${id}-lip-lower`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor={darkLip}/><stop offset="54%" stopColor={lightLip}/><stop offset="100%" stopColor={mix(lightLip, skin, .44)}/>
      </linearGradient>
      <radialGradient id={`${id}-iris`} cx="45%" cy="62%" r="57%">
        <stop stopColor={mix(iris, "#EBBC9A", .33)}/><stop offset="47%" stopColor={iris}/><stop offset="79%" stopColor={mix(iris, "#25182A", .53)}/><stop offset="100%" stopColor="#251B25"/>
      </radialGradient>
      <linearGradient id={`${id}-sclera`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor="#BD9CA1"/><stop offset="47%" stopColor="#F8ECEA"/><stop offset="100%" stopColor="#E2C4C4"/>
      </linearGradient>
      <linearGradient id={`${id}-lid-shadow`} x1="0" x2="0" y1="0" y2="100%">
        <stop stopColor="#342631" stopOpacity=".45"/><stop offset="75%" stopColor="#342631" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id={`${id}-brow`}>
        <stop stopColor={mix(hair, skin, .55)} stopOpacity=".28"/>
        <stop offset="41%" stopColor={mix(hair, ink, .22)} stopOpacity=".7"/>
        <stop offset="100%" stopColor={mix(hair, skin, .41)} stopOpacity=".29"/>
      </linearGradient>
      <linearGradient id={`${id}-hair`} x1="0" x2="100%" y1="0" y2="100%">
        <stop stopColor={mix(hair, light, .3)}/><stop offset="48%" stopColor={hair}/><stop offset="100%" stopColor={mix(hair, "#271D1C", .35)}/>
      </linearGradient>
      <clipPath id={`${id}-head`}><path d={head}/></clipPath>
      <clipPath id={`${id}-eye-left`}><path d={eye}/></clipPath>
      <clipPath id={`${id}-eye-right`}><path d={eye} transform={mirror}/></clipPath>
      <mask id={`${id}-complexion`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height={chartHeight}>
        <path d={head} fill="white"/>
        <path d={eye} fill="black" transform={eyeOffset}/><path d={eye} fill="black" transform={`${eyeOffset} ${mirror}`}/>
        <path d={lipUpper} fill="black"/><path d={lipLower} fill="black"/>
      </mask>
      <filter id={`${id}-feather`} x="-35%" y="-45%" width="170%" height="190%">
        <feGaussianBlur stdDeviation="2.4"/>
      </filter>
      <filter id={`${id}-diffuse`} x="-50%" y="-60%" width="200%" height="220%">
        <feGaussianBlur stdDeviation="5.1"/>
      </filter>
      {layers.map((layer, index) => layer.kind === "lip" ?
        <linearGradient id={`${id}-colour-${index}`} key={layer.stepId} x1="0" x2="0" y1="0" y2="100%">
          <stop stopColor={mix(layer.hex, "#37202C", .29)}/><stop offset="46%" stopColor={layer.hex}/>
          <stop offset="65%" stopColor={mix(layer.hex, "#FFE4CC", .17)}/><stop offset="100%" stopColor={mix(layer.hex, "#3E202D", .24)}/>
        </linearGradient> :
        <radialGradient id={`${id}-colour-${index}`} key={layer.stepId}>
          <stop stopColor={layer.hex} stopOpacity={layer.kind === "contour" ? ".7" : layer.kind === "blush" ? ".92" : "1"}/>
          <stop offset="58%" stopColor={layer.hex} stopOpacity={layer.kind === "contour" ? ".44" : ".62"}/>
          <stop offset="89%" stopColor={layer.hex} stopOpacity=".12"/>
          <stop offset="100%" stopColor={layer.hex} stopOpacity="0"/>
        </radialGradient>)}
    </defs>

    <g aria-hidden="true" className={styles.artwork}>
      {hairVisible && <path d={hairSilhouette} fill={`url(#${id}-hair)`} data-hair-illustration="true"/>}
      {pair(ear).map(({ path, transform }, index) => <g key={index} transform={transform}>
        <path d={path} fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".75" strokeOpacity=".5"/>
        <path d="M50 166C40 158 36 163 40 178C44 190 49 198 57 201C53 194 50 187 51 181C49 176 51 173 55 175C54 171 52 168 50 166Z" fill={warmth} opacity=".48"/>
        <path d="M49 167C44 165 43 171 46 178M53 185C49 188 52 194 56 196" fill="none" stroke={shade} strokeWidth=".85" strokeOpacity=".73"/>
        <path d="M37 166C36 172 38 178 41 182" fill="none" stroke={light} strokeWidth=".75" strokeOpacity=".85"/>
      </g>)}
      <path d={head} fill={`url(#${id}-skin)`} stroke={ink} strokeWidth=".74" strokeOpacity=".46"/>
      <g clipPath={`url(#${id}-head)`} mask={`url(#${id}-complexion)`}>
        <ellipse cx="153" cy="92" rx="82" ry="63" fill={`url(#${id}-light)`} opacity=".66"/>
        <ellipse cx="71" cy="136" rx="25" ry="60" transform="rotate(14 71 136)" fill={`url(#${id}-shade)`} opacity=".34"/>
        <ellipse cx="249" cy="135" rx="26" ry="61" transform="rotate(-14 249 135)" fill={`url(#${id}-shade)`} opacity=".56"/>
        <ellipse cx="100" cy="213" rx="34" ry="39" transform="rotate(-27 100 213)" fill={`url(#${id}-light)`} opacity=".66"/>
        <ellipse cx="219" cy="209" rx="31" ry="38" transform="rotate(27 219 209)" fill={`url(#${id}-light)`} opacity=".39"/>
        <ellipse cx="108" cy="197" rx="37" ry="14" transform="rotate(12 108 197)" fill={`url(#${id}-warm)`} opacity=".42"/>
        <ellipse cx="212" cy="197" rx="37" ry="14" transform="rotate(-12 212 197)" fill={`url(#${id}-warm)`} opacity=".45"/>
        <ellipse cx="84" cy="239" rx="28" ry="43" transform="rotate(-29 84 239)" fill={`url(#${id}-shade)`} opacity=".44"/>
        <ellipse cx="234" cy="240" rx="28" ry="43" transform="rotate(29 234 240)" fill={`url(#${id}-shade)`} opacity=".5"/>
        <ellipse cx="160" cy="308" rx="35" ry="19" fill={`url(#${id}-light)`} opacity=".6"/>
        <ellipse cx="150" cy="193" rx="8" ry="31" transform="rotate(9 150 193)" fill={`url(#${id}-shade)`} opacity=".53"/>
        <ellipse cx="171" cy="192" rx="9" ry="30" transform="rotate(-9 171 192)" fill={`url(#${id}-shade)`} opacity=".58"/>
        <ellipse cx="159" cy="199" rx="8" ry="29" fill={`url(#${id}-light)`} opacity=".74"/>
        <ellipse cx="160" cy="222" rx="17" ry="10" fill={`url(#${id}-warm)`} opacity=".62"/>
        <ellipse cx="160" cy="221" rx="11" ry="7" fill={`url(#${id}-light)`} opacity=".79"/>
        <ellipse cx="160" cy="241" rx="19" ry="9" fill={`url(#${id}-shade)`} opacity=".32"/>
        <ellipse cx="160" cy="287" rx="28" ry="8" fill={`url(#${id}-shade)`} opacity=".47"/>
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
        <path d="M151 183C150 195 149 204 146 211M169 185C170 195 172 206 175 212" strokeWidth=".59" opacity=".25"/>
        <path d="M145 217C140 221 140 227 145 229M175 217C179 221 180 226 175 229" strokeWidth=".72" opacity=".46"/>
        <path d="M152 226C155 227 157 230 160 230C163 230 165 227 168 226" strokeWidth=".8" opacity=".62"/>
        <path d={lipSeam} strokeWidth=".84" opacity=".66"/>
        <path d="M144 275C151 278 160 279 169 277M173 276L177 275" stroke={mix(lightLip, "#FBE6EB", .42)} strokeWidth=".86" opacity=".61"/>
      </g>
      {pair("M145 224C147 221 152 220 154 223C152 225 149 226 145 224Z").map(({ path, transform }, index) =>
        <path d={path} transform={transform} fill={ink} opacity=".74" key={index}/>)}
      <g transform={eyeOffset}>{[false, true].map((rightEye) => {
        const centre = rightEye ? 207.8 : 112.2;
        const transform = rightEye ? mirror : undefined;
        return <g key={String(rightEye)}>
          <ellipse cx={centre} cy="129" rx="31" ry="8.5" fill={`url(#${id}-shade)`} opacity=".37"/>
          <path d={brow} transform={transform} fill={`url(#${id}-brow)`}/>
          <path d={browHairs} transform={transform} fill="none" stroke={mix(hair, ink, .3)} strokeWidth=".56" opacity=".65"/>
          <path d="M79 141C93 128 109 124 124 132C133 135 141 143 145 150" transform={transform}
            fill="none" stroke={ink} strokeWidth=".69" opacity=".43"/>
          <path d={eye} transform={transform} fill={`url(#${id}-sclera)`}/>
          <g clipPath={`url(#${id}-eye-${rightEye ? "right" : "left"})`}>
            <circle cx={centre} cy="154.5" r="13.2" fill={`url(#${id}-iris)`} stroke={mix(iris, "#2B1C2A", .65)} strokeWidth=".9"/>
            <path d={irisFibres} transform={`translate(${centre} 154.5)`} fill="none" stroke={mix(iris, "#F8D2B5", .48)} strokeOpacity=".59" strokeWidth=".45"/>
            <circle cx={centre} cy="154.5" r="4.8" fill="#221924"/>
            <path d={eye} transform={transform} fill={`url(#${id}-lid-shadow)`}/>
            <ellipse cx={centre - 3.8} cy="149.9" rx="2.25" ry="1.65" transform={`rotate(-20 ${centre - 3.8} 149.9)`} fill="#FFFAF5" opacity=".95"/>
            <circle cx={centre + 3.9} cy="160.4" r=".85" fill="#FDE7EF" opacity=".78"/>
            <path d="M141 156L146 159L140 163" transform={transform} fill="#C4858D" opacity=".55"/>
          </g>
          <path d={upperLash} transform={transform} fill="none" stroke={mix(hair, "#211725", .61)} strokeWidth="1.72"/>
          <path d={naturalLashes} transform={transform} fill="none" stroke={mix(hair, "#291E32", .53)} strokeWidth=".92" opacity=".86"/>
          <path d={lowerLash} transform={transform} fill="none" stroke={ink} strokeWidth=".69" opacity=".61"/>
          <path d="M82 159C91 170 104 174 116 172C125 171 135 166 141 162" transform={transform}
            fill="none" stroke={warmth} strokeWidth=".83" opacity=".55"/>
        </g>;
      })}</g>
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
