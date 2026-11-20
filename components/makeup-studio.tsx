"use client";

import { Camera, CircleX, Palette as PaletteIcon, RotateCcw, SlidersHorizontal, SwatchBook } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { defaultApplicationZone, makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import type { FaceZone, PaletteColor, Product } from "@/lib/model";
import { FaceChart } from "./routines";
import styles from "./makeup-studio.module.css";

type StudioTab = "look" | "photo";
type StudioArea = "visage" | "joues" | "yeux" | "levres";
type StudioTool = PigmentLayer["kind"];
type Labels = [french: string, english: string];
type Shade = { hex: string; label: Labels };
type StudioLayer = {
  name: string;
  hex: string;
  intensity: number;
  mix?: { hex: string; amount: number };
  productId?: string;
};
type Look = Partial<Record<StudioArea, Partial<Record<StudioTool, StudioLayer>>>>;

const studioAreas = ["visage", "joues", "yeux", "levres"] as const;
const tabs = ["look", "photo"] as const;
const areas = {
  visage: { label: ["Teint", "Complexion"], kind: "foundation", tools: ["foundation", "concealer", "powder"], intensity: 38, shades: [
    { hex: "#F6DCCA", label: ["Ivoire", "Ivory"] }, { hex: "#E2B395", label: ["Beige doré", "Golden beige"] },
    { hex: "#C58C64", label: ["Miel", "Honey"] }, { hex: "#9C664F", label: ["Ambre", "Amber"] },
    { hex: "#744D3E", label: ["Châtaigne", "Chestnut"] }, { hex: "#57382E", label: ["Cacao", "Cocoa"] },
  ] },
  joues: { label: ["Joues", "Cheeks"], kind: "blush", tools: ["bronzer", "blush", "highlighter"], intensity: 66, shades: [
    { hex: "#DC8E9D", label: ["Rose poudré", "Dusty rose"] }, { hex: "#EC967F", label: ["Pêche", "Peach"] },
    { hex: "#D25D6F", label: ["Framboise", "Raspberry"] }, { hex: "#A55169", label: ["Bois de rose", "Rosewood"] },
    { hex: "#AE6352", label: ["Terracotta", "Terracotta"] }, { hex: "#784760", label: ["Prune", "Plum"] },
  ] },
  yeux: { label: ["Yeux", "Eyes"], kind: "eyeshadow", tools: ["eyeshadow", "eyeliner", "mascara"], intensity: 72, shades: [
    { hex: "#B8927F", label: ["Taupe rosé", "Rosy taupe"] }, { hex: "#AA85B7", label: ["Mauve", "Mauve"] },
    { hex: "#B97C62", label: ["Cuivre", "Copper"] }, { hex: "#6C786B", label: ["Sauge", "Sage"] },
    { hex: "#707199", label: ["Iris", "Iris"] }, { hex: "#513746", label: ["Aubergine", "Aubergine"] },
  ] },
  levres: { label: ["Lèvres", "Lips"], kind: "lip", tools: ["lip"], intensity: 88, shades: [
    { hex: "#C38788", label: ["Nude rosé", "Rosy nude"] }, { hex: "#D16C6D", label: ["Corail", "Coral"] },
    { hex: "#B84455", label: ["Rouge velours", "Velvet red"] }, { hex: "#A46056", label: ["Brique", "Brick"] },
    { hex: "#8D3F5D", label: ["Baie", "Berry"] }, { hex: "#60384B", label: ["Mûre", "Blackberry"] },
  ] },
} satisfies Record<StudioArea, { label: Labels; kind: StudioTool; tools: StudioTool[]; intensity: number; shades: Shade[] }>;

const toolLabels = {
  foundation: ["Fond de teint", "Foundation"], concealer: ["Correcteur", "Concealer"], powder: ["Poudre teintée", "Tinted powder"],
  bronzer: ["Bronzer", "Bronzer"], blush: ["Blush", "Blush"], highlighter: ["Enlumineur", "Highlighter"],
  eyeshadow: ["Fard", "Eye shadow"], eyeliner: ["Eyeliner", "Eyeliner"], mascara: ["Mascara", "Mascara"], lip: ["Rouge à lèvres", "Lip colour"],
} satisfies Record<StudioTool, Labels>;

const eyeLinerShades: Shade[] = [
  { hex: "#312630", label: ["Noir doux", "Soft black"] }, { hex: "#634438", label: ["Brun", "Brown"] },
  { hex: "#48334C", label: ["Prune", "Plum"] }, { hex: "#41566C", label: ["Ardoise", "Slate"] },
];
const toolShades: Partial<Record<StudioTool, Shade[]>> = {
  bronzer: areas.visage.shades,
  highlighter: [
    { hex: "#FFF6E1", label: ["Perle", "Pearl"] }, { hex: "#F9DDB7", label: ["Champagne", "Champagne"] },
    { hex: "#F5C4CA", label: ["Rose nacré", "Pearl pink"] }, { hex: "#E5A879", label: ["Or rosé", "Rose gold"] },
  ],
  eyeliner: eyeLinerShades,
  mascara: eyeLinerShades,
};
const toolIntensity: Partial<Record<StudioTool, number>> = { bronzer: 44, highlighter: 59, eyeliner: 96, mascara: 96, powder: 27 };

const skinTones: Shade[] = [
  { hex: "#F8E2D3", label: ["Très claire", "Very light"] },
  { hex: "#EBC5B0", label: ["Claire", "Light"] },
  { hex: "#D7A385", label: ["Dorée", "Golden"] },
  { hex: "#B78263", label: ["Ambrée", "Amber"] },
  { hex: "#945C46", label: ["Brune", "Brown"] },
  { hex: "#714733", label: ["Profonde", "Deep"] },
  { hex: "#513329", label: ["Très profonde", "Very deep"] },
];

const hexPattern = /^#[\da-f]{6}$/i;

function isStudioArea(zone: FaceZone): zone is StudioArea {
  return studioAreas.some((area) => area === zone);
}

function colourChannels(hex: string): [number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function blendedHex(base: string, mix: NonNullable<StudioLayer["mix"]>) {
  const second = colourChannels(mix.hex);
  const fraction = mix.amount / 100;
  return `#${colourChannels(base).map((component, index) =>
    Math.round(component * (1 - fraction) + second[index] * fraction).toString(16).padStart(2, "0")
  ).join("")}`.toUpperCase();
}

function productPigment(product: Product) {
  const preferredZone = defaultApplicationZone(product);
  const zone = isStudioArea(preferredZone) ? preferredZone : "visage";
  const appearance = makeupAppearance(product, { id: product.id, productId: product.id, zone, note: "" }, []);
  return appearance.effect === "tinted" ? { product, zone, appearance } : null;
}

function ColourField({ label, hex, onChange }: { label: string; hex: string; onChange: (hex: string) => void }) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(hex);
  const inputId = useId();

  useEffect(() => { setDraft(hex); }, [hex]);

  return <form className={styles.colourField} onSubmit={(event) => {
    event.preventDefault();
    if (hexPattern.test(draft)) onChange(draft.toUpperCase());
  }}>
    <label htmlFor={inputId}>{label}</label>
    <div className={styles.colourInputs}>
      <input type="color" aria-label={t(`Choisir · ${label}`, `Pick · ${label}`)} value={hex} onChange={(event) => onChange(event.target.value.toUpperCase())}/>
      <input id={inputId} type="text" value={draft} pattern="#[0-9a-fA-F]{6}" required maxLength={7}
        title={t("Utilise un code de six chiffres ou lettres, par exemple #B4789D.", "Use a six-digit hex code such as #B4789D.")}
        onChange={(event) => setDraft(event.target.value)} autoCapitalize="off" spellCheck={false}/>
      <button type="submit" className={styles.apply}>{t("Appliquer", "Apply")}</button>
    </div>
  </form>;
}

export function MakeupStudio({ products, palette, paletteEditor, initialTab = "look" }: {
  products: Product[];
  palette: PaletteColor[];
  paletteEditor: ReactNode;
  initialTab?: StudioTab;
}) {
  const { t, formatNumber } = useLocale();
  const id = useId();
  const lookTab = useRef<HTMLButtonElement>(null);
  const photoTab = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [{ area, tool }, setSelection] = useState<{ area: StudioArea; tool: StudioTool }>({ area: "joues", tool: "blush" });
  const [skinTone, setSkinTone] = useState(skinTones[2].hex);
  const [iris, setIris] = useState("#543A35");
  const [hair, setHair] = useState("#473342");
  const [look, setLook] = useState<Look>({});
  const owned = products.flatMap((product) => {
    const pigment = productPigment(product);
    return pigment ? [pigment] : [];
  });
  const ownedById = new Map(owned.map((entry) => [entry.product.id, entry]));
  const areaConfig = areas[area];
  const shades = toolShades[tool] ?? areaConfig.shades;
  const current = look[area]?.[tool];
  const active = current?.productId && !ownedById.has(current.productId) ? undefined : current;
  const recentColor = palette[0];
  const layers: PigmentLayer[] = studioAreas.flatMap((zone) => areas[zone].tools.flatMap((kind) => {
    const layer = look[zone]?.[kind];
    if (!layer || (layer.productId && !ownedById.has(layer.productId))) return [];
    return [{ effect: "tinted" as const, kind, hex: layer.mix ? blendedHex(layer.hex, layer.mix) : layer.hex,
      name: layer.name, productName: layer.name, opacity: layer.intensity / 100, stepId: `${zone}-${kind}`, zone }];
  }));
  const [red, green, blue] = colourChannels(skinTone);
  const darkTone = red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128;
  const toneStyle = {
    "--face-skin": skinTone,
    "--face-outline": "#594352",
    "--face-hair": hair,
    "--face-hair-outline": "#302443",
    "--face-iris": iris,
    "--face-iris-outline": darkTone ? "#F6DBCE" : "#483147",
    "--face-details": darkTone ? "#F6DBCE" : "#483147",
    "--face-active": darkTone ? "#F3D1D8" : "#603683",
    "--face-hover": darkTone ? "#F5DCFC" : "#4C2D6B",
  } as CSSProperties;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "look" : event.key === "End" ? "photo" : tab === "look" ? "photo" : "look";
    setTab(next);
    (next === "look" ? lookTab : photoTab).current?.focus();
  }

  function applyVirtual(hex: string, name: string) {
    if (!hexPattern.test(hex)) return;
    setLook((previous) => {
      const prior = previous[area]?.[tool];
      return { ...previous, [area]: { ...previous[area], [tool]: { hex, name, mix: prior?.mix,
        intensity: prior?.intensity ?? toolIntensity[tool] ?? areaConfig.intensity } } };
    });
  }

  function applyOwned(id: string) {
    const ownedProduct = ownedById.get(id);
    if (!ownedProduct) return;
    const { appearance, product, zone } = ownedProduct;
    setLook((previous) => ({ ...previous, [zone]: { ...previous[zone], [appearance.kind]: { hex: appearance.hex, name: product.name,
      productId: product.id, intensity: Math.round(appearance.opacity * 100) } } }));
    setSelection({ area: zone, tool: appearance.kind });
  }

  function updateLayer(change: Partial<StudioLayer>) {
    setLook((previous) => {
      const layer = previous[area]?.[tool];
      return layer ? { ...previous, [area]: { ...previous[area], [tool]: { ...layer, ...change } } } : previous;
    });
  }

  function selectArea(zone: StudioArea) {
    if (zone !== area) setSelection({ area: zone, tool: areas[zone].kind });
  }

  function applyFromPhoto(color: PaletteColor) {
    applyVirtual(color.hex, color.name);
    setTab("look");
    requestAnimationFrame(() => preview.current?.focus());
  }

  return <section className={styles.studio} aria-labelledby={`${id}-title`}>
    <header className={styles.header}>
      <h1 id={`${id}-title`}>{t("Studio maquillage", "Makeup studio")}</h1>
      <p>{t("Compose un look sur le visage illustré et essaie les teintes qui t’inspirent.", "Create a look on the illustrated face and try the shades that inspire you.")}</p>
    </header>
    <div className={styles.tabs} role="tablist" aria-label={t("Studio maquillage", "Makeup studio")}>
      {tabs.map((option) => {
        const isLook = option === "look";
        const Icon = isLook ? PaletteIcon : Camera;
        return <button type="button" key={option} id={`${id}-tab-${option}`} ref={isLook ? lookTab : photoTab}
          role="tab" aria-selected={tab === option} aria-controls={`${id}-panel-${option}`} tabIndex={tab === option ? 0 : -1}
          onClick={() => setTab(option)} onKeyDown={changeTab}>
          <Icon size={17} aria-hidden="true"/>{isLook ? t("Créer un look", "Create a look") : t("Teintes d’une photo", "Shades from a photo")}
        </button>;
      })}
    </div>

    <div className={styles.tabPanel} role="tabpanel" id={`${id}-panel-look`} aria-labelledby={`${id}-tab-look`} hidden={tab !== "look"}>
      <div className={styles.workspace}>
        <section className={styles.preview} aria-labelledby={`${id}-preview`}>
          <h2 id={`${id}-preview`} tabIndex={-1} ref={preview}>Face Chart</h2>
          <FaceChart selected={area} availableZones={studioAreas} layers={layers} className={styles.face} style={toneStyle}
            onSelect={(zone) => { if (isStudioArea(zone)) selectArea(zone); }}/>
          <fieldset className={styles.skinTones}>
            <legend>{t("Carnation de l’illustration", "Illustrated skin tone")}</legend>
            {skinTones.map((tone) => <button type="button" key={tone.hex} className={styles.skinTone}
              style={{ "--swatch": tone.hex } as CSSProperties} aria-pressed={skinTone === tone.hex}
              aria-label={t(...tone.label)} title={t(...tone.label)} onClick={() => setSkinTone(tone.hex)}/>)}
            <input type="color" className={styles.customSkinTone} aria-label={t("Choisir une carnation personnalisée", "Choose a custom skin tone")}
              title={t("Carnation personnalisée", "Custom skin tone")} value={skinTone} onChange={(event) => setSkinTone(event.target.value.toUpperCase())}/>
          </fieldset>
          <details className={styles.portraitOptions}>
            <summary>{t("Couleurs des yeux et des cheveux", "Eye and hair colours")}</summary>
            <div>
              <label>{t("Yeux", "Eyes")}<input type="color" value={iris} onChange={(event) => setIris(event.target.value)}/></label>
              <label>{t("Cheveux", "Hair")}<input type="color" value={hair} onChange={(event) => setHair(event.target.value)}/></label>
            </div>
          </details>
          {layers.length > 0 && <ul className={styles.layerList} aria-label={t("Couches du look", "Look layers")}>
            {layers.map((layer) => <li key={layer.stepId}>
              <button type="button" aria-pressed={layer.zone === area && layer.kind === tool} onClick={() => {
                if (isStudioArea(layer.zone)) setSelection({ area: layer.zone, tool: layer.kind });
              }} title={layer.name}>
                <span style={{ backgroundColor: layer.hex }} aria-hidden="true"/>{t(...toolLabels[layer.kind])}
              </button>
            </li>)}
          </ul>}
          <p className={styles.hint}>{t("Le rendu réel dépend du produit, de la carnation et de la lumière.", "The finished look depends on the product, skin tone and lighting.")}</p>
        </section>

        <section className={styles.controls} aria-label={t("Commandes du look", "Look controls")}>
          <div className={styles.zones} role="group" aria-label={t("Zone à maquiller", "Makeup area")}>
            {studioAreas.map((zone) => <button type="button" key={zone} aria-pressed={area === zone} onClick={() => selectArea(zone)}>
              {t(...areas[zone].label)}
            </button>)}
          </div>
          {areaConfig.tools.length > 1 && <div className={styles.tools} role="group" aria-label={t("Type de maquillage", "Makeup type")}>
            {areaConfig.tools.map((kind) => <button type="button" key={kind} aria-pressed={tool === kind}
              onClick={() => setSelection({ area, tool: kind })}>{t(...toolLabels[kind])}</button>)}
          </div>}
          <fieldset className={styles.swatches}>
            <legend>{t("Teintes du studio", "Studio shades")}</legend>
            {shades.map((shade) => <button type="button" key={shade.hex} className={styles.shade}
              aria-pressed={active?.hex.toUpperCase() === shade.hex && !active?.productId}
              onClick={() => applyVirtual(shade.hex, t(...shade.label))}>
              <span style={{ "--swatch": shade.hex } as CSSProperties} aria-hidden="true"/>
              <small>{t(...shade.label)}</small>
            </button>)}
          </fieldset>
          <ColourField label={t("Couleur personnalisée", "Custom colour")} hex={active?.hex ?? shades[0].hex}
            onChange={(hex) => applyVirtual(hex, hex)}/>

          <div className={styles.shadeSources}>
            {owned.length > 0 && <label><span>{t("Maquillage de mon vanity", "Makeup from my vanity")}</span>
              <select value={active?.productId ?? ""} onChange={(event) => applyOwned(event.target.value)}>
                <option value="" disabled>{t("Choisir un produit teinté", "Choose a tinted product")}</option>
                {owned.map(({ product }) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}
              </select>
            </label>}
            {palette.length > 0 && <label><span>{t("Mes teintes enregistrées", "My saved shades")}</span>
              <select value="" onChange={(event) => {
                const color = palette.find((item) => item.id === event.target.value);
                if (color) applyVirtual(color.hex, color.name);
              }}>
                <option value="" disabled>{t("Appliquer une teinte à cette zone", "Apply a saved shade to this area")}</option>
                {palette.map((color) => <option key={color.id} value={color.id}>{color.name} · {color.hex.toUpperCase()}</option>)}
              </select>
            </label>}
            {palette.length === 0 && <button type="button" className={styles.photoShortcut} onClick={() => {
              setTab("photo");
              photoTab.current?.focus();
            }}><SwatchBook size={16} aria-hidden="true"/>{t("Prélever une teinte sur une photo", "Sample a shade from a photo")}</button>}
          </div>

          {active && <div className={styles.adjustments}>
            <p className={styles.activeShade} role="status">{active.name} · {active.mix ? blendedHex(active.hex, active.mix) : active.hex.toUpperCase()}</p>
            <label className={styles.range}>
              <span>{t("Intensité", "Intensity")} <output>{formatNumber(active.intensity)} %</output></span>
              <input type="range" min={0} max={100} value={active.intensity} aria-label={t("Intensité", "Intensity")}
                onChange={(event) => updateLayer({ intensity: Number(event.target.value) })}/>
            </label>
            <button type="button" className={styles.mixToggle} aria-pressed={Boolean(active.mix)} onClick={() => updateLayer({
              mix: active.mix ? undefined : { hex: shades[1].hex, amount: 50 },
            })}><SlidersHorizontal size={16} aria-hidden="true"/>{t("Mélanger deux teintes", "Mix two shades")}</button>
            {active.mix && <div className={styles.mixControls}>
              <ColourField label={t("Seconde teinte", "Second shade")} hex={active.mix.hex}
                onChange={(hex) => updateLayer({ mix: { hex, amount: active.mix?.amount ?? 50 } })}/>
              <label className={styles.range}>
                <span>{t("Part de la seconde teinte", "Second shade proportion")} <output>{formatNumber(active.mix.amount)} %</output></span>
                <input type="range" min={0} max={100} value={active.mix.amount} aria-label={t("Part de la seconde teinte", "Second shade proportion")}
                  onChange={(event) => updateLayer({ mix: { hex: active.mix?.hex ?? shades[1].hex, amount: Number(event.target.value) } })}/>
              </label>
            </div>}
          </div>}
          <div className={styles.actions}>
            {active && layers.filter((layer) => layer.zone === area).length > 1 && <button type="button" className="button button-secondary"
              onClick={() => setLook((previous) => ({ ...previous, [area]: { ...previous[area], [tool]: undefined } }))}>
              <CircleX size={16} aria-hidden="true"/>{t("Effacer la couche", "Clear layer")}
            </button>}
            <button type="button" className="button button-secondary" disabled={!layers.some((layer) => layer.zone === area)}
              onClick={() => setLook((previous) => ({ ...previous, [area]: undefined }))}>
              <CircleX size={16} aria-hidden="true"/>{t("Effacer la zone", "Clear area")}
            </button>
            <button type="button" className="button button-secondary" disabled={!layers.length} onClick={() => setLook({})}>
              <RotateCcw size={16} aria-hidden="true"/>{t("Effacer le look", "Clear look")}
            </button>
          </div>
        </section>
      </div>
    </div>

    <div className={styles.tabPanel} role="tabpanel" id={`${id}-panel-photo`} aria-labelledby={`${id}-tab-photo`} hidden={tab !== "photo"}>
      <div className={styles.photoIntro}>
        <p>{t("Enregistre une teinte prélevée sur une photo, puis essaie-la sur le Face Chart.", "Save a shade sampled from a photo, then try it on the Face Chart.")}</p>
        {recentColor && <button type="button" className="button button-primary" onClick={() => applyFromPhoto(recentColor)}>
          {t(`Essayer « ${recentColor.name} »`, `Try “${recentColor.name}”`)} · {t(...toolLabels[tool])}
        </button>}
      </div>
      {paletteEditor}
    </div>
  </section>;
}
