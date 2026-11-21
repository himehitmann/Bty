"use client";

import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import type { MakeupPlacement } from "@/lib/makeup-placements";
import type { FaceZone } from "@/lib/model";
import { boundStudioAnchor, studioPlacementBounds, type StudioAnchor, type StudioPlacementMode } from "@/lib/studio-advanced";
import { eye, head, lip, mirror, pair, pigmentShapes, placementShapes, portraitHeight, single, zoneGeometry, type Shape } from "./face-chart-geometry";
import { FacePortrait, mix } from "./face-chart-portrait";
import styles from "./face-chart.module.css";

type HairArea = "scalp" | "lengths" | "ends";
type Application = { kind: "care" | "makeup" | "hair"; hairArea?: HairArea; massage?: boolean };

const zoneNames = {
  visage: ["Visage", "Face"], front: ["Front", "Forehead"], joues: ["Joues", "Cheeks"], yeux: ["Yeux", "Eyes"],
  levres: ["Lèvres", "Lips"], menton: ["Menton", "Chin"], cheveux: ["Cheveux", "Hair"],
} satisfies Record<FaceZone, [string, string]>;
const guideZones: FaceZone[] = ["visage", "cheveux", "front", "joues", "yeux", "levres", "menton"];
const hairGeometry = {
  scalp: single("M63 104C82 59 118 33 160 29C202 33 238 59 257 104"),
  lengths: pair("M42 136C43 168 47 188 44 214C41 237 40 246 38 263"),
  ends: pair("M38 270C34 292 34 312 40 325C47 319 54 316 63 315"),
} satisfies Record<HairArea, Shape[]>;

function tone(value: string | number | undefined, fallback: string) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

export function FaceChart({ selected, layers, onSelect, availableZones, className, style, application, placementGuide, mattePlacement, showHair, placementMode, onPlace }: {
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
  placementMode?: StudioPlacementMode;
  onPlace?: (anchor: StudioAnchor) => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const pointer = useRef<number | null>(null);
  const design = style as (CSSProperties & Record<string, string | number | undefined>) | undefined;
  const skin = tone(design?.["--face-skin"], "#EBC5B0");
  const iris = tone(design?.["--face-iris"], "#5A4359");
  const hair = tone(design?.["--face-hair"], "#60443C");
  const hairVisible = showHair || application?.kind === "hair" || (!availableZones && selected === "cheveux");
  const targets = availableZones ?? guideZones;
  const markings = application?.kind === "hair" ? (application.hairArea ? hairGeometry[application.hairArea] : zoneGeometry.cheveux)
    : application ? zoneGeometry[selected] : [];
  const guidedLayer = placementGuide && layers.find((layer) => layer.placement === placementGuide && layer.kind === "blush");
  const guideShapes = guidedLayer ? pigmentShapes(guidedLayer) : placementGuide ? placementShapes[placementGuide] : [];
  const editing = Boolean(placementMode && onPlace);
  const placementBounds = editing && placementMode ? studioPlacementBounds(placementMode.tool, placementMode.side) : undefined;

  useEffect(() => { pointer.current = null; }, [placementMode?.tool, placementMode?.side]);

  function activate(event: KeyboardEvent<SVGGElement>, zone: FaceZone) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(zone);
  }

  function placeAt(event: PointerEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix || !placementMode || !onPlace) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (!Number.isFinite(local.x) || !Number.isFinite(local.y)) return;
    onPlace(boundStudioAnchor(placementMode.tool, placementMode.side, { x: local.x / 320, y: local.y / portraitHeight }));
  }

  function beginPlacement(event: PointerEvent<SVGRectElement>) {
    if (event.button !== 0 || pointer.current !== null) return;
    event.preventDefault();
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    placeAt(event);
  }

  function endPlacement(event: PointerEvent<SVGRectElement>) {
    if (pointer.current === event.pointerId) pointer.current = null;
  }

  return <svg className={className ? `${styles.face} ${className}` : styles.face} style={style} data-placing={editing}
    viewBox={`0 0 320 ${portraitHeight}`} role="group" aria-labelledby={`${id}-title`}>
    <title id={`${id}-title`}>{t("Carte interactive des zones du visage", "Interactive face chart")}</title>
    <defs>
      <clipPath id={`${id}-head`}><path d={head}/></clipPath>
      <mask id={`${id}-complexion`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height={portraitHeight}>
        <path d={head} fill="white"/>
        <path d={eye} fill="black"/><path d={eye} fill="black" transform={mirror}/>
        <path d={lip} fill="black"/>
      </mask>
      <filter id={`${id}-feather`} x="-40%" y="-50%" width="180%" height="200%">
        <feGaussianBlur stdDeviation="2.25"/>
      </filter>
      <filter id={`${id}-diffuse`} x="-55%" y="-65%" width="210%" height="230%">
        <feGaussianBlur stdDeviation="5.4"/>
      </filter>
      {layers.map((layer, index) => layer.kind === "lip" ?
        <radialGradient id={`${id}-colour-${index}`} key={layer.stepId} cx="50%" cy="50%" r="62%">
          <stop stopColor={mix(layer.hex, "#512236", .17)}/>
          <stop offset="49%" stopColor={layer.hex}/>
          <stop offset="76%" stopColor={layer.hex} stopOpacity=".63"/>
          <stop offset="100%" stopColor={layer.hex} stopOpacity=".11"/>
        </radialGradient> :
        <radialGradient id={`${id}-colour-${index}`} key={layer.stepId}>
          <stop stopColor={layer.hex} stopOpacity={layer.kind === "contour" ? ".79" : "1"}/>
          <stop offset="51%" stopColor={layer.hex} stopOpacity={layer.kind === "contour" ? ".5" : ".66"}/>
          <stop offset="86%" stopColor={layer.hex} stopOpacity=".16"/>
          <stop offset="100%" stopColor={layer.hex} stopOpacity="0"/>
        </radialGradient>)}
    </defs>
    <g aria-hidden="true" className={styles.artwork}>
      <FacePortrait id={id} skin={skin} iris={iris} hair={hair} hairVisible={hairVisible}
        hideBrows={layers.some((layer) => layer.kind === "brow" && layer.opacity > 0)}>
        <g clipPath={`url(#${id}-head)`}>
          {layers.map((layer, index) => {
            const isStroke = layer.kind === "mascara";
            const isLine = isStroke || layer.kind === "eyeliner";
            const isLip = layer.kind === "lip";
            const isBrow = layer.kind === "brow";
            const blend = layer.kind === "contour" || layer.kind === "bronzer" ? "multiply" : undefined;
            const filter = blend || layer.kind === "blush" ? "diffuse" : "feather";
            return <g key={layer.stepId} data-pigment={layer.kind} data-zone={layer.zone} data-placement={layer.placement}
              data-liner-style={layer.kind === "eyeliner" ? layer.details?.liner?.style : undefined}
              data-shadow-zone={layer.kind === "eyeshadow" ? layer.details?.shadow?.zone : undefined}
              data-brow-shape={isBrow ? layer.details?.brow?.shape ?? "natural" : undefined}
              opacity={layer.opacity} style={{ mixBlendMode: blend }}
              filter={isLine || isLip || isBrow ? undefined : `url(#${id}-${filter})`}
              mask={isLine || isLip || isBrow ? undefined : `url(#${id}-complexion)`}>
              {pigmentShapes(layer).map(({ path, transform }, shapeIndex) =>
                <path d={path} transform={transform} key={shapeIndex}
                  fill={isStroke ? "none" : isLine ? layer.hex : `url(#${id}-colour-${index})`}
                  stroke={isStroke ? layer.hex : undefined} strokeWidth={isStroke ? "1.38" : undefined}/>)}
            </g>;
          })}
          {mattePlacement && <g data-matte-placement={mattePlacement} style={{ mixBlendMode: "luminosity" }} opacity=".065"
            filter={`url(#${id}-feather)`} mask={`url(#${id}-complexion)`}>
            {placementShapes[mattePlacement].map(({ path, transform }, index) =>
              <path key={index} d={path} transform={transform} fill="#999"/>)}
          </g>}
        </g>
      </FacePortrait>
    </g>
    {placementGuide && <g className={styles.placementGuide} data-placement-guide={placementGuide} aria-hidden="true">
      {guideShapes.map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
    </g>}
    {application && <g className={styles.applicationMarking} data-application={application.kind} data-hair-area={application.hairArea}
      key={`${application.kind}-${application.hairArea ?? selected}`} aria-hidden="true">
      {markings.map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
      {application.kind === "hair" && application.massage && <path className={styles.massageArrows}
        d="M113 63c-9 1-13-7-8-13 5-5 14-2 15 5m-6-3 6 4 3-5m78 4c1-7 10-10 15-5 5 6 1 14-8 13m1-5-4 5 6 2"/>}
    </g>}
    {!editing && targets.filter((zone) => zone !== "cheveux" || hairVisible).map((zone) => {
      const highlight = !availableZones && !application && !placementGuide && zone === selected;
      return <g className={styles.faceZone} role="button" tabIndex={0} key={zone} data-zone={zone} data-active={selected === zone}
        data-highlight={highlight} data-guided={application?.kind === "care" && selected === zone}
        aria-label={t(...zoneNames[zone])} aria-pressed={selected === zone}
        onClick={() => onSelect(zone)} onKeyDown={(event) => activate(event, zone)}>
        {zoneGeometry[zone].map(({ path, transform }, index) => <path d={path} transform={transform} key={index}/>)}
      </g>;
    })}
    {editing && placementMode && placementBounds && <g aria-hidden="true">
      <rect className={styles.placementBounds} x={placementBounds.minX * 320} y={placementBounds.minY * portraitHeight}
        width={(placementBounds.maxX - placementBounds.minX) * 320} height={(placementBounds.maxY - placementBounds.minY) * portraitHeight} rx="8"/>
      <circle className={styles.placementMarker} data-studio-placement-marker={placementMode.tool} data-side={placementMode.side}
        cx={placementMode.anchor.x * 320} cy={placementMode.anchor.y * portraitHeight} r="5.6"/>
      <rect width="320" height={portraitHeight} fill="transparent" className={styles.placementTarget} data-studio-placement-target="true"
        onPointerDown={beginPlacement} onPointerMove={(event) => { if (pointer.current === event.pointerId) placeAt(event); }}
        onPointerUp={(event) => {
          if (pointer.current === event.pointerId) placeAt(event);
          endPlacement(event);
        }} onPointerCancel={endPlacement} onLostPointerCapture={endPlacement}/>
    </g>}
  </svg>;
}
