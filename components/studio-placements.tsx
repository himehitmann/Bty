"use client";

import { FlipHorizontal2, MousePointer2, RotateCcw } from "lucide-react";
import type { Ref } from "react";
import { useLocale, type Locale } from "@/lib/i18n";
import type { MakeupPlacement } from "@/lib/makeup-placements";
import {
  browShapes, getStudioAnchor, linerStyles, mirrorStudioAnchor, setStudioAnchor, shadowZones, studioPlacementBounds,
  type StudioAnchor, type StudioPlacementDetails, type StudioPositionTool, type StudioSide,
} from "@/lib/studio-advanced";
import styles from "./studio-placements.module.css";

type Copy = readonly [fr: string, en: string, es: string, it: string];
const languageIndex = { fr: 0, en: 1, es: 2, it: 3 } satisfies Record<Locale, number>;

const linerLabels = {
  classic: ["Classique", "Classic", "Clásico", "Classico"],
  winged: ["Virgule relevée", "Winged", "Ala ascendente", "Ala all'insù"],
  puppy: ["Virgule descendante", "Downturned wing", "Ala descendente", "Ala all'ingiù"],
  graphic: ["Double trait", "Graphic double line", "Doble línea gráfica", "Doppia linea grafica"],
} satisfies Record<(typeof linerStyles)[number], Copy>;

const shadowLabels = {
  lid: ["Paupière mobile", "Mobile lid", "Párpado móvil", "Palpebra mobile"],
  crease: ["Creux de paupière", "Crease", "Cuenca del ojo", "Piega della palpebra"],
  outer: ["Coin externe", "Outer corner", "Esquina exterior", "Angolo esterno"],
  inner: ["Coin interne", "Inner corner", "Esquina interior", "Angolo interno"],
  lower: ["Ras des cils inférieurs", "Lower lash line", "Línea inferior de pestañas", "Rima ciliare inferiore"],
  whole: ["Ensemble de la paupière", "Whole lid", "Párpado completo", "Intera palpebra"],
} satisfies Record<(typeof shadowZones)[number], Copy>;

const browLabels = {
  natural: ["Naturel", "Natural", "Natural", "Naturale"],
  arched: ["Arqué", "Arched", "Arqueado", "Arcuato"],
  straight: ["Droit", "Straight", "Recto", "Dritto"],
  soft: ["Arrondi", "Soft curve", "Curva suave", "Curva morbida"],
} satisfies Record<(typeof browShapes)[number], Copy>;

interface StudioPlacementEditorProps {
  tool: string;
  details?: StudioPlacementDetails;
  placement?: MakeupPlacement;
  onChange: (details: StudioPlacementDetails | undefined) => void;
  side: StudioSide;
  onSideChange: (side: StudioSide) => void;
  positioning: boolean;
  placementTrigger: Ref<HTMLButtonElement>;
  portraitId: string;
  onPositioningChange: (positioning: boolean, byPointer: boolean) => void;
}

export function StudioPlacementEditor({ tool, details, placement, onChange, side, onSideChange, positioning, placementTrigger, portraitId, onPositioningChange }: StudioPlacementEditorProps) {
  const { locale, formatNumber } = useLocale();
  const text = (copy: Copy) => copy[languageIndex[locale]];

  if (tool === "eyeliner") return <label className={styles.field}>
    <span>{text(["Forme du trait", "Liner shape", "Forma del delineado", "Forma dell'eyeliner"])}</span>
    <select value={details?.liner?.style ?? "winged"} onChange={(event) => {
      const style = linerStyles.find((option) => option === event.target.value);
      if (style) onChange({ ...details, liner: { style } });
    }}>
      {linerStyles.map((style) => <option key={style} value={style}>{text(linerLabels[style])}</option>)}
    </select>
  </label>;

  if (tool === "eyeshadow") return <label className={styles.field}>
    <span>{text(["Zone du fard", "Eyeshadow area", "Zona de la sombra", "Zona dell'ombretto"])}</span>
    <select value={details?.shadow?.zone ?? "whole"} onChange={(event) => {
      const zone = shadowZones.find((option) => option === event.target.value);
      if (zone) onChange({ ...details, shadow: { zone } });
    }}>
      {shadowZones.map((zone) => <option key={zone} value={zone}>{text(shadowLabels[zone])}</option>)}
    </select>
  </label>;

  if (tool !== "blush" && tool !== "brow") return null;
  const editable: StudioPositionTool = tool;
  const anchor = getStudioAnchor(editable, side, details, placement);
  const bounds = studioPlacementBounds(editable, side);
  const brow = details?.brow;
  const selected = details?.[editable];
  const hasPosition = Boolean(selected?.left || selected?.right);
  const percent = (value: number) => formatNumber(value, { style: "percent", maximumFractionDigits: 1 });

  function setAnchor(change: Partial<StudioAnchor>) {
    onChange(setStudioAnchor(details, editable, side, { ...anchor, ...change }));
  }

  function resetPosition() {
    const restored = { ...details };
    if (editable === "blush") delete restored.blush;
    else if (restored.brow) restored.brow = { shape: restored.brow.shape, thickness: restored.brow.thickness, arch: restored.brow.arch };
    onChange(Object.keys(restored).length ? restored : undefined);
  }

  return <fieldset className={styles.editor}>
    <legend>{editable === "brow"
      ? text(["Dessin des sourcils", "Brow design", "Diseño de cejas", "Disegno delle sopracciglia"])
      : text(["Position du blush", "Blush placement", "Posición del rubor", "Posizione del blush"])}</legend>

    {editable === "brow" && <>
      <label className={styles.field}>
        <span>{text(["Forme", "Shape", "Forma", "Forma"])}</span>
        <select value={brow?.shape ?? "natural"} onChange={(event) => {
          const shape = browShapes.find((option) => option === event.target.value);
          if (shape) onChange({ ...details, brow: { ...brow, shape } });
        }}>
          {browShapes.map((shape) => <option key={shape} value={shape}>{text(browLabels[shape])}</option>)}
        </select>
      </label>
      <div className={styles.adjustments}>
        <label className={styles.range}>
          <span>{text(["Épaisseur", "Thickness", "Grosor", "Spessore"])} <span className={styles.value} aria-hidden="true">{percent(brow?.thickness ?? 0.5)}</span></span>
          <input type="range" min={0} max={1} step={0.01} value={brow?.thickness ?? 0.5} aria-valuetext={percent(brow?.thickness ?? 0.5)} onChange={(event) => {
            onChange({ ...details, brow: { shape: "natural", ...brow, thickness: Number(event.target.value) } });
          }}/>
        </label>
        <label className={styles.range}>
          <span>{text(["Courbure", "Arch", "Arco", "Curvatura"])} <span className={styles.value} aria-hidden="true">{percent(brow?.arch ?? 0.5)}</span></span>
          <input type="range" min={0} max={1} step={0.01} value={brow?.arch ?? 0.5} aria-valuetext={percent(brow?.arch ?? 0.5)} onChange={(event) => {
            onChange({ ...details, brow: { shape: "natural", ...brow, arch: Number(event.target.value) } });
          }}/>
        </label>
      </div>
    </>}

    <div className={styles.buttons} role="group" aria-label={text(["Côté de l’image", "Side of the image", "Lado de la imagen", "Lato dell'immagine"])}>
      <button type="button" aria-pressed={side === "left"} onClick={() => onSideChange("left")}>
        {text(["Gauche", "Left", "Izquierda", "Sinistra"])}
      </button>
      <button type="button" aria-pressed={side === "right"} onClick={() => onSideChange("right")}>
        {text(["Droite", "Right", "Derecha", "Destra"])}
      </button>
    </div>

    <div className={styles.buttons}>
      <button type="button" ref={placementTrigger} aria-pressed={positioning} aria-controls={portraitId}
        onClick={(event) => onPositioningChange(!positioning, event.detail > 0)}>
        <MousePointer2 size={15} aria-hidden="true"/>{text(["Placer sur le visage", "Place on face", "Colocar en el rostro", "Posiziona sul viso"])}
      </button>
      <button type="button" onClick={() => onChange(mirrorStudioAnchor(details, editable, side, placement))}>
        <FlipHorizontal2 size={16} aria-hidden="true"/>{text(["Reproduire en miroir", "Mirror to other side", "Reflejar al otro lado", "Specchia sull'altro lato"])}
      </button>
    </div>
    {positioning && <p role="status" className={styles.hint}>{text([
      "Clique ou fais glisser le repère sur le visage. Les curseurs sont utilisables au clavier.",
      "Click or drag the marker on the face. The sliders also work with the keyboard.",
      "Haz clic o arrastra el marcador en el rostro. Los controles también funcionan con el teclado.",
      "Fai clic o trascina il riferimento sul viso. I cursori funzionano anche con la tastiera.",
    ])}</p>}

    <div className={styles.adjustments}>
      <label className={styles.range}>
        <span>{text(["Horizontal", "Horizontal", "Horizontal", "Orizzontale"])} <span className={styles.value} aria-hidden="true">{percent(anchor.x)}</span></span>
        <input type="range" min={bounds.minX} max={bounds.maxX} step={0.001} value={anchor.x} aria-valuetext={percent(anchor.x)}
          onChange={(event) => setAnchor({ x: Number(event.target.value) })}/>
      </label>
      <label className={styles.range}>
        <span>{text(["Vertical", "Vertical", "Vertical", "Verticale"])} <span className={styles.value} aria-hidden="true">{percent(anchor.y)}</span></span>
        <input type="range" min={bounds.minY} max={bounds.maxY} step={0.001} value={anchor.y} aria-valuetext={percent(anchor.y)}
          onChange={(event) => setAnchor({ y: Number(event.target.value) })}/>
      </label>
    </div>
    {hasPosition && <button type="button" className={styles.reset} onClick={resetPosition}>
      <RotateCcw size={15} aria-hidden="true"/>{text(["Réinitialiser la position", "Reset position", "Restablecer posición", "Reimposta posizione"])}
    </button>}
  </fieldset>;
}
