"use client";

import { Camera, CircleX, Crosshair, Palette as PaletteIcon, RotateCcw, SlidersHorizontal, SwatchBook } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { defaultApplicationZone, makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import { findMakeupPlacement, getMakeupPlacements } from "@/lib/makeup-placements";
import type { FaceZone, PaletteColor, Product } from "@/lib/model";
import {
  studioAreas, studioLookLimits, studioToolsByArea,
  type SavedStudioLook, type StudioArea, type StudioLayer, type StudioLookLayers, type StudioPlacements, type StudioSetting, type StudioTool,
} from "@/lib/studio-looks";
import { FaceChart } from "./face-chart";
import { StudioLookLibrary } from "./studio-look-library";
import styles from "./makeup-studio.module.css";

type StudioTab = "look" | "photo";
type PreviewMode = "look" | "bare";
type PigmentKind = PigmentLayer["kind"];
type StudioSelection = { area: StudioArea; tool: StudioTool };
type Labels = [french: string, english: string];
type Shade = { hex: string; label: Labels };

const tabs = ["look", "photo"] as const;
const areas = {
  visage: { label: ["Teint", "Complexion"], kind: "foundation", tools: studioToolsByArea.visage, intensity: 38, shades: [
    { hex: "#F6DCCA", label: ["Ivoire", "Ivory"] }, { hex: "#E2B395", label: ["Beige doré", "Golden beige"] },
    { hex: "#C58C64", label: ["Miel", "Honey"] }, { hex: "#9C664F", label: ["Ambre", "Amber"] },
    { hex: "#744D3E", label: ["Châtaigne", "Chestnut"] }, { hex: "#57382E", label: ["Cacao", "Cocoa"] },
  ] },
  joues: { label: ["Joues", "Cheeks"], kind: "blush", tools: studioToolsByArea.joues, intensity: 66, shades: [
    { hex: "#DC8E9D", label: ["Rose poudré", "Dusty rose"] }, { hex: "#EC967F", label: ["Pêche", "Peach"] },
    { hex: "#D25D6F", label: ["Framboise", "Raspberry"] }, { hex: "#A55169", label: ["Bois de rose", "Rosewood"] },
    { hex: "#AE6352", label: ["Terracotta", "Terracotta"] }, { hex: "#784760", label: ["Prune", "Plum"] },
  ] },
  yeux: { label: ["Yeux", "Eyes"], kind: "eyeshadow", tools: studioToolsByArea.yeux, intensity: 72, shades: [
    { hex: "#B8927F", label: ["Taupe rosé", "Rosy taupe"] }, { hex: "#AA85B7", label: ["Mauve", "Mauve"] },
    { hex: "#B97C62", label: ["Cuivre", "Copper"] }, { hex: "#6C786B", label: ["Sauge", "Sage"] },
    { hex: "#707199", label: ["Iris", "Iris"] }, { hex: "#513746", label: ["Aubergine", "Aubergine"] },
  ] },
  levres: { label: ["Lèvres", "Lips"], kind: "lip", tools: studioToolsByArea.levres, intensity: 88, shades: [
    { hex: "#C38788", label: ["Nude rosé", "Rosy nude"] }, { hex: "#D16C6D", label: ["Corail", "Coral"] },
    { hex: "#B84455", label: ["Rouge velours", "Velvet red"] }, { hex: "#A46056", label: ["Brique", "Brick"] },
    { hex: "#8D3F5D", label: ["Baie", "Berry"] }, { hex: "#60384B", label: ["Mûre", "Blackberry"] },
  ] },
} satisfies Record<StudioArea, { label: Labels; kind: StudioTool; tools: readonly StudioTool[]; intensity: number; shades: Shade[] }>;

const toolLabels = {
  foundation: ["Fond de teint", "Foundation"], concealer: ["Correcteur", "Concealer"], powder: ["Poudre teintée", "Tinted powder"],
  "setting-powder": ["Poudre translucide", "Translucent powder"], contour: ["Contour", "Contour"],
  bronzer: ["Bronzer", "Bronzer"], blush: ["Blush", "Blush"], highlighter: ["Enlumineur", "Highlighter"],
  eyeshadow: ["Fard", "Eye shadow"], eyeliner: ["Eyeliner", "Eyeliner"], mascara: ["Mascara", "Mascara"], lip: ["Rouge à lèvres", "Lip colour"],
} satisfies Record<StudioTool, Labels>;

const eyeLinerShades: Shade[] = [
  { hex: "#312630", label: ["Noir doux", "Soft black"] }, { hex: "#634438", label: ["Brun", "Brown"] },
  { hex: "#48334C", label: ["Prune", "Plum"] }, { hex: "#41566C", label: ["Ardoise", "Slate"] },
];
const toolShades: Partial<Record<PigmentKind, Shade[]>> = {
  contour: [
    { hex: "#BD9E8C", label: ["Beige froid", "Cool beige"] }, { hex: "#A27C6B", label: ["Taupe", "Taupe"] },
    { hex: "#805A4F", label: ["Moka", "Mocha"] }, { hex: "#5C3C35", label: ["Brun profond", "Deep brown"] },
  ],
  bronzer: areas.visage.shades,
  highlighter: [
    { hex: "#FFF6E1", label: ["Perle", "Pearl"] }, { hex: "#F9DDB7", label: ["Champagne", "Champagne"] },
    { hex: "#F5C4CA", label: ["Rose nacré", "Pearl pink"] }, { hex: "#E5A879", label: ["Or rosé", "Rose gold"] },
  ],
  eyeliner: eyeLinerShades,
  mascara: eyeLinerShades,
};
const toolIntensity: Partial<Record<PigmentKind, number>> = { contour: 39, bronzer: 44, highlighter: 59, eyeliner: 96, mascara: 96, powder: 27 };

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

function placementKind(tool: StudioTool) {
  return tool === "setting-powder" ? "powder" : tool;
}

function selectedPlacement(tool: StudioTool, choices: StudioPlacements) {
  const kind = placementKind(tool);
  const saved = choices[tool];
  return (saved ? findMakeupPlacement(kind, saved) : undefined) ?? getMakeupPlacements(kind)[0];
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

function isSettingPowder(product: Product) {
  if (product.category !== "maquillage" || product.makeupKind !== "powder") return false;
  const { effect } = makeupAppearance(product, { id: product.id, productId: product.id, zone: "visage", note: "" }, []);
  return effect === "transparent" || effect === "mattifying";
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

function SavedShades({ palette, selected, onSelect }: { palette: PaletteColor[]; selected?: string; onSelect: (color: PaletteColor) => void }) {
  const { t } = useLocale();
  const [collection, setCollection] = useState<string | null | undefined>();
  const collections = new Map<string | null, PaletteColor[]>();
  for (const color of palette) {
    const name = color.collection ?? null;
    const group = collections.get(name);
    if (group) group.push(color);
    else collections.set(name, [color]);
  }
  const groups = [...collections.entries()];
  const chooseGroup = groups.length > 3;
  const index = Math.max(0, groups.findIndex(([name]) => name === collection));
  const visible = chooseGroup ? groups.slice(index, index + 1) : groups;
  const groupLabel = (name: string | null) => name ?? t("Teintes sans palette", "Unsorted shades");
  const groupKey = (name: string | null) => name === null ? "ungrouped" : `collection:${name}`;

  return <fieldset className={styles.savedShades}>
    <legend>{t("Mes teintes enregistrées", "My saved shades")}</legend>
    {chooseGroup && <label>{t("Palette à afficher", "Palette to show")}
      <select value={index} onChange={(event) => {
        const selectedGroup = groups[Number(event.target.value)];
        if (selectedGroup) setCollection(selectedGroup[0]);
      }}>
        {groups.map(([name], position) => <option value={position} key={groupKey(name)}>{groupLabel(name)}</option>)}
      </select>
    </label>}
    {visible.map(([name, colors]) => <div key={groupKey(name)} className={styles.savedGroup} role="group" aria-label={groupLabel(name)}>
      {!chooseGroup && <h3>{groupLabel(name)}</h3>}
      <div className={styles.savedChips}>
        {colors.map((color) => <button type="button" className={styles.savedChip} key={color.id}
          aria-pressed={selected === color.id} title={`${color.name} · ${color.hex}`}
          aria-label={t(`Appliquer ${color.name} · ${color.hex}`, `Apply ${color.name} · ${color.hex}`)} onClick={() => onSelect(color)}>
          <span style={{ "--swatch": color.hex } as CSSProperties} aria-hidden="true"/>
          <small>{color.name}</small>
        </button>)}
      </div>
    </div>)}
  </fieldset>;
}

export function MakeupStudio({ products, palette, paletteEditor, savedLooks, onChangeLooks, initialTab = "look" }: {
  products: Product[];
  palette: PaletteColor[];
  paletteEditor: ReactNode;
  savedLooks: readonly SavedStudioLook[];
  onChangeLooks: (apply: (current: SavedStudioLook[]) => SavedStudioLook[]) => boolean;
  initialTab?: StudioTab;
}) {
  const { t, formatNumber } = useLocale();
  const id = useId();
  const lookTab = useRef<HTMLButtonElement>(null);
  const photoTab = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("look");
  const [{ area, tool }, setSelection] = useState<StudioSelection>({ area: "joues", tool: "blush" });
  const [skinTone, setSkinTone] = useState(skinTones[1].hex);
  const [iris, setIris] = useState("#5A4359");
  const [hair, setHair] = useState("#473342");
  const [showHair, setShowHair] = useState(false);
  const [look, setLook] = useState<StudioLookLayers>({});
  const [placements, setPlacements] = useState<StudioPlacements>({});
  const [activeLookId, setActiveLookId] = useState<string>();
  const [guideVisible, setGuideVisible] = useState(false);
  const [setting, setSetting] = useState<StudioSetting | null>(null);
  const owned = products.flatMap((product) => {
    const pigment = productPigment(product);
    return pigment ? [pigment] : [];
  });
  const ownedById = new Map(owned.map((entry) => [entry.product.id, entry]));
  const ownedSettingPowders = products.filter(isSettingPowder);
  const settingProduct = setting?.productId ? ownedSettingPowders.find((product) => product.id === setting.productId) : undefined;
  const settingApplied = Boolean(setting && (!setting.productId || settingProduct));
  const isSetting = tool === "setting-powder";
  const areaConfig = areas[area];
  const shades = (!isSetting ? toolShades[tool] : undefined) ?? areaConfig.shades;
  const current = !isSetting ? look[area]?.[tool] : undefined;
  const active = current?.productId && !ownedById.has(current.productId) ? undefined : current;
  const recentColor = palette[0];
  const photoTool = isSetting ? "powder" : tool;
  const currentPlacement = selectedPlacement(tool, placements);
  const mattePlacement = settingApplied ? selectedPlacement("setting-powder", placements)?.id : undefined;
  const showLook = previewMode === "look";
  const showGuide = showLook && guideVisible;
  const layers: PigmentLayer[] = studioAreas.flatMap((zone) => areas[zone].tools.flatMap((kind) => {
    if (kind === "setting-powder") return [];
    const layer = look[zone]?.[kind];
    if (!layer || (layer.productId && !ownedById.has(layer.productId))) return [];
    return [{ effect: "tinted" as const, kind, hex: layer.mix ? blendedHex(layer.hex, layer.mix) : layer.hex,
      name: layer.name, productName: layer.name, opacity: layer.intensity / 100, stepId: `${zone}-${kind}`, zone,
      placement: selectedPlacement(kind, placements)?.id }];
  }));
  const hasLook = layers.length > 0 || settingApplied;
  const toneStyle = {
    "--face-skin": skinTone,
    "--face-hair": hair,
    "--face-iris": iris,
  } as CSSProperties;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "look" : event.key === "End" ? "photo" : tab === "look" ? "photo" : "look";
    setTab(next);
    (next === "look" ? lookTab : photoTab).current?.focus();
  }

  function applyVirtual(hex: string, name: string, pigmentTool: StudioTool = tool, swatchId?: string) {
    if (pigmentTool === "setting-powder" || !hexPattern.test(hex)) return;
    setPreviewMode("look");
    setLook((previous) => {
      const prior = previous[area]?.[pigmentTool];
      return { ...previous, [area]: { ...previous[area], [pigmentTool]: { hex, name, swatchId, mix: prior?.mix,
        intensity: prior?.intensity ?? toolIntensity[pigmentTool] ?? areaConfig.intensity } } };
    });
  }

  function applyOwned(id: string) {
    const ownedProduct = ownedById.get(id);
    if (!ownedProduct) return;
    const { appearance, product, zone } = ownedProduct;
    setPreviewMode("look");
    setLook((previous) => ({ ...previous, [zone]: { ...previous[zone], [appearance.kind]: { hex: appearance.hex, name: product.name,
      productId: product.id, intensity: Math.round(appearance.opacity * 100) } } }));
    setSelection({ area: zone, tool: appearance.kind });
  }

  function updateLayer(change: Partial<StudioLayer>) {
    if (tool === "setting-powder") return;
    setPreviewMode("look");
    setLook((previous) => {
      const layer = previous[area]?.[tool];
      return layer ? { ...previous, [area]: { ...previous[area], [tool]: { ...layer, ...change } } } : previous;
    });
  }

  function selectArea(zone: StudioArea) {
    if (zone !== area) setSelection({ area: zone, tool: areas[zone].kind });
  }

  function applySetting(productId?: string) {
    setPreviewMode("look");
    setSetting(productId ? { productId } : {});
  }

  function applyFromPhoto(color: PaletteColor) {
    applyVirtual(color.hex, color.name, photoTool, color.id);
    if (photoTool !== tool) setSelection({ area, tool: photoTool });
    setTab("look");
    requestAnimationFrame(() => preview.current?.focus());
  }

  function saveLook(name: string, existingId?: string) {
    if (!hasLook) return false;
    const savedPlacements = { ...placements };
    for (const { kind, placement } of layers) if (placement) savedPlacements[kind] = placement;
    if (mattePlacement) savedPlacements["setting-powder"] = mattePlacement;
    const item: SavedStudioLook = {
      id: existingId ?? crypto.randomUUID(),
      name,
      updatedAt: new Date().toISOString(),
      snapshot: {
        portrait: { skinTone, iris, hair, showHair },
        layers: look,
        placements: savedPlacements,
        setting: settingApplied ? setting : null,
      },
    };
    let changed = false;
    const applied = onChangeLooks((current) => {
      if (existingId ? !current.some(({ id }) => id === existingId) : current.length >= studioLookLimits.looks) return current;
      changed = true;
      return [item, ...current.filter(({ id }) => id !== item.id)];
    });
    if (!applied || !changed) return false;
    setActiveLookId(item.id);
    return true;
  }

  function openLook({ id, snapshot }: SavedStudioLook) {
    const restored: StudioLookLayers = {};
    let selection: StudioSelection | undefined;
    for (const zone of studioAreas) {
      const zoneLayers = snapshot.layers[zone];
      if (!zoneLayers) continue;
      for (const kind of studioToolsByArea[zone]) {
        if (kind === "setting-powder") continue;
        const layer = zoneLayers[kind];
        if (!layer) continue;
        const ownedLayer = layer.productId ? ownedById.get(layer.productId) : undefined;
        const swatch = palette.find((color) => color.id === layer.swatchId && color.hex.toUpperCase() === layer.hex.toUpperCase());
        restored[zone] = { ...restored[zone], [kind]: {
          ...layer,
          productId: ownedLayer?.zone === zone && ownedLayer.appearance.kind === kind ? layer.productId : undefined,
          swatchId: swatch?.id,
        } };
        selection ??= { area: zone, tool: kind };
      }
    }
    const { skinTone: savedSkin, iris: savedIris, hair: savedHair, showHair: savedShowHair } = snapshot.portrait;
    const powderId = snapshot.setting?.productId;
    setSetting(snapshot.setting && (ownedSettingPowders.some(({ id }) => id === powderId) ? snapshot.setting : {}));
    setSkinTone(savedSkin);
    setIris(savedIris);
    setHair(savedHair);
    setShowHair(savedShowHair);
    setLook(restored);
    setPlacements(snapshot.placements);
    setSelection(selection ?? { area: "visage", tool: "setting-powder" });
    setGuideVisible(false);
    setPreviewMode("look");
    setActiveLookId(id);
    requestAnimationFrame(() => preview.current?.focus());
  }

  function deleteLook(id: string) {
    const applied = onChangeLooks((current) => current.filter((look) => look.id !== id));
    if (applied && activeLookId === id) setActiveLookId(undefined);
    return applied;
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
      <StudioLookLibrary looks={savedLooks} activeId={activeLookId} canSave={hasLook} onSave={saveLook} onOpen={openLook} onDelete={deleteLook}/>
      <div className={styles.workspace}>
        <section className={styles.preview} aria-labelledby={`${id}-preview`}>
          <div className={styles.previewHeader}>
            <h2 id={`${id}-preview`} tabIndex={-1} ref={preview}>Face Chart</h2>
            {currentPlacement && <button type="button" className={styles.guideToggle} aria-pressed={showGuide} aria-controls={`${id}-portrait`}
              onClick={() => {
                setGuideVisible(!showGuide);
                setPreviewMode("look");
              }}><Crosshair size={16} aria-hidden="true"/>{t("Guide de placement", "Placement guide")}</button>}
          </div>
          <div className={styles.comparison} role="group" aria-label={t("Aperçu du visage", "Face preview")}>
            <button type="button" aria-pressed={!showLook} aria-controls={`${id}-portrait`} onClick={() => setPreviewMode("bare")}>
              {t("Visage nu", "Bare face")}
            </button>
            <button type="button" aria-pressed={showLook} aria-controls={`${id}-portrait`} onClick={() => setPreviewMode("look")}>
              {t("Look maquillé", "Makeup look")}
            </button>
          </div>
          <div id={`${id}-portrait`} className={styles.portrait}>
            <FaceChart selected={area} availableZones={studioAreas} layers={showLook ? layers : []} className={styles.face} style={toneStyle}
              placementGuide={showGuide ? currentPlacement?.id : undefined} mattePlacement={showLook ? mattePlacement : undefined} showHair={showHair}
              onSelect={(zone) => { if (isStudioArea(zone)) selectArea(zone); }}/>
          </div>
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
              <label><input type="checkbox" checked={showHair} onChange={(event) => setShowHair(event.target.checked)}/>{t("Afficher les cheveux", "Show hair")}</label>
              {showHair && <label>{t("Cheveux", "Hair")}<input type="color" value={hair} onChange={(event) => setHair(event.target.value)}/></label>}
            </div>
          </details>
          {(layers.length > 0 || settingApplied) && <ul className={styles.layerList} aria-label={t("Couches du look", "Look layers")}>
            {layers.map((layer) => <li key={layer.stepId}>
              <button type="button" aria-pressed={layer.zone === area && layer.kind === tool} onClick={() => {
                if (!isStudioArea(layer.zone)) return;
                setSelection({ area: layer.zone, tool: layer.kind });
                setPreviewMode("look");
              }} title={layer.name}>
                <span style={{ backgroundColor: layer.hex }} aria-hidden="true"/>{t(...toolLabels[layer.kind])}
              </button>
            </li>)}
            {settingApplied && <li><button type="button" aria-pressed={isSetting} onClick={() => {
              setSelection({ area: "visage", tool: "setting-powder" });
              setPreviewMode("look");
            }}>
              <span className={styles.settingMarker} aria-hidden="true"/>{t(...toolLabels["setting-powder"])}
            </button></li>}
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
          {currentPlacement && <fieldset className={styles.placementPanel}>
            <legend>{t("Placement", "Placement")}</legend>
            <div className={styles.placements}>
              {getMakeupPlacements(placementKind(tool)).map((option) => <button type="button" key={option.id}
                aria-pressed={option.id === currentPlacement.id} onClick={() => {
                  setPreviewMode("look");
                  setPlacements((previous) => ({ ...previous, [tool]: option.id }));
                  if (isSetting && !settingApplied) setGuideVisible(true);
                }}>{t(option.label[0], option.label[1])}</button>)}
            </div>
            <p aria-live="polite">{t(currentPlacement.description[0], currentPlacement.description[1])}</p>
          </fieldset>}
          {isSetting ? <div className={styles.settingPanel}>
            <p>{t("Trace les zones à fixer pour visualiser leur emplacement.", "Mark where you’d set your makeup to see those areas outlined.")}</p>
            {ownedSettingPowders.length > 0 && <label>{t("Poudre translucide de mon vanity", "Translucent powder from my vanity")}
              <select value={settingProduct?.id ?? ""} onChange={(event) => {
                const product = ownedSettingPowders.find((item) => item.id === event.target.value);
                applySetting(product?.id);
              }}>
                <option value="">{t("Poudre de simulation", "Sample powder")}</option>
                {ownedSettingPowders.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}
              </select>
            </label>}
            {settingApplied ? <p role="status" className={styles.settingStatus}>
              {settingProduct?.name ? t(`${settingProduct.name} · poudrage tracé`, `${settingProduct.name} · setting areas marked`)
                : t("Poudrage tracé sur l’illustration.", "Setting areas are marked on the illustration.")}
            </p> : <button type="button" className="button button-primary" onClick={() => applySetting()}>
              {t("Tracer le poudrage", "Mark setting areas")}
            </button>}
          </div> : <>
          <fieldset className={styles.swatches}>
            <legend>{t("Teintes du studio", "Studio shades")}</legend>
            {shades.map((shade) => <button type="button" key={shade.hex} className={styles.shade}
              aria-pressed={active?.hex.toUpperCase() === shade.hex && !active?.productId && !active?.swatchId}
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
            {palette.length > 0 && <SavedShades palette={palette} selected={active?.swatchId}
              onSelect={(color) => applyVirtual(color.hex, color.name, tool, color.id)}/>}
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
          </>}
          <div className={styles.actions}>
            {(active || isSetting && settingApplied) && <button type="button" className="button button-secondary"
              onClick={() => {
                setPreviewMode("look");
                if (isSetting) setSetting(null);
                else setLook((previous) => ({ ...previous, [area]: { ...previous[area], [tool]: undefined } }));
              }}>
              <CircleX size={16} aria-hidden="true"/>{t("Effacer la couche", "Clear layer")}
            </button>}
            <button type="button" className="button button-secondary" disabled={!layers.some((layer) => layer.zone === area) && !(area === "visage" && settingApplied)}
              onClick={() => {
                setPreviewMode("look");
                setLook((previous) => ({ ...previous, [area]: undefined }));
                if (area === "visage") setSetting(null);
              }}>
              <CircleX size={16} aria-hidden="true"/>{t("Effacer la zone", "Clear area")}
            </button>
            <button type="button" className="button button-secondary" disabled={!hasLook} onClick={() => {
              setPreviewMode("look");
              setLook({});
              setSetting(null);
            }}>
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
          {t(`Essayer « ${recentColor.name} »`, `Try “${recentColor.name}”`)} · {t(...toolLabels[photoTool])}
        </button>}
      </div>
      {paletteEditor}
    </div>
  </section>;
}
