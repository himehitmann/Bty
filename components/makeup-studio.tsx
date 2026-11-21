"use client";

import { Camera, CircleX, Crosshair, Palette as PaletteIcon, RotateCcw, SlidersHorizontal, SwatchBook } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import { findMakeupPlacement, getMakeupPlacements } from "@/lib/makeup-placements";
import type { MakeupStylePreset } from "@/lib/makeup-styles";
import type { FaceZone, PaletteColor, Product } from "@/lib/model";
import { getStudioAnchor, setStudioAnchor, shadowZones, type StudioAnchor, type StudioShadowZone, type StudioSide } from "@/lib/studio-advanced";
import {
  defaultStudioPortrait, editableStudioLayers, studioAreas, studioLookLimits, studioSkinTones, studioToolsByArea,
  type SavedStudioLook, type StudioArea, type StudioLayer, type StudioLookSnapshot, type StudioPlacements, type StudioPortrait, type StudioSetting, type StudioTool,
} from "@/lib/studio-looks";
import { FaceChart } from "./face-chart";
import { StudioLookLibrary } from "./studio-look-library";
import { StudioPlacementEditor, StudioShadowZonePicker, studioShadowLabel } from "./studio-placements";
import { ProductShades, SwatchComparison, type ProductShade, type Swatch } from "./studio-shades";
import styles from "./makeup-studio.module.css";

type StudioTab = "look" | "photo";
type PreviewMode = "look" | "bare";
type PigmentKind = PigmentLayer["kind"];
type StudioSelection = { area: StudioArea; tool: StudioTool };
type StudioTrialRequest = { product: Product };
type PendingProduct = { id: string; selection: StudioSelection; shadowZone?: StudioShadowZone };
export type StudioDraft = {
  snapshot: StudioLookSnapshot;
  selection: StudioSelection;
  previewMode: PreviewMode;
  activeLookId?: string;
  guideVisible: boolean;
  pendingProduct?: PendingProduct;
  side: StudioSide;
  shadowZone: StudioShadowZone;
  handledTrial?: StudioTrialRequest;
  unassignedTrial?: string;
};
type Labels = [french: string, english: string];
type Shade = { hex: string; label: Labels };

const tabs = ["look", "photo"] as const;
const noTrialProducts: Product[] = [];
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
  eyeshadow: ["Fard", "Eye shadow"], eyeliner: ["Eyeliner", "Eyeliner"], mascara: ["Mascara", "Mascara"],
  brow: ["Sourcils", "Brows"], lip: ["Rouge à lèvres", "Lip colour"],
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
  brow: eyeLinerShades,
};
const toolIntensity: Partial<Record<PigmentKind, number>> = { contour: 39, bronzer: 44, highlighter: 59, eyeliner: 96, mascara: 96, powder: 27 };

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

function productShadeId(productId: string, variantId?: string) {
  return JSON.stringify([productId, variantId ?? null]);
}

function productShades(products: Product[], group: ProductShade["group"]): ProductShade[] {
  return products.flatMap((product) => {
    if (product.category !== "maquillage" || product.makeupEffect === "transparent" || product.makeupEffect === "mattifying" || isSettingPowder(product)) return [];
    const tool = product.makeupKind;
    const area = studioAreas.find((zone) => studioToolsByArea[zone].some((item) => item === tool));
    const base = { product, group, selection: area && tool !== undefined && tool !== "other" ? { area, tool } : undefined };
    const variants = product.variants ?? [];
    const selected = variants.find((variant) => variant.id === product.selectedVariantId);
    const options = selected && group === "owned" ? [selected] : variants;
    if (options.length) return options.map((variant) => ({ ...base,
      id: productShadeId(product.id, variant.id),
      label: variant.id === selected?.id && product.name.endsWith(` · ${variant.name}`) ? product.name : `${product.name} · ${variant.name}`,
      hex: variant.shadeHex ?? (variant.id === selected?.id ? product.shadeHex : undefined),
      variantId: variant.id, approximate: variant.shadeApproximate === true,
    }));
    return [{ ...base, id: productShadeId(product.id, product.selectedVariantId), label: product.name,
      hex: product.shadeHex, variantId: product.selectedVariantId,
      approximate: Boolean(product.source === "manufacturer" && product.selectedVariantId && product.shadeHex),
    }];
  });
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

export function MakeupStudio({ products, trialProducts = noTrialProducts, trialRequest, preset, palette, paletteEditor,
  savedLooks, onChangeLooks, draft, onDraftChange, defaultPortrait, initialTab = "look" }: {
  products: Product[];
  trialProducts?: Product[];
  trialRequest?: StudioTrialRequest;
  preset?: MakeupStylePreset;
  palette: PaletteColor[];
  paletteEditor: ReactNode;
  savedLooks: readonly SavedStudioLook[];
  onChangeLooks: (apply: (current: SavedStudioLook[]) => SavedStudioLook[]) => boolean;
  draft?: StudioDraft;
  onDraftChange?: (draft: StudioDraft) => void;
  defaultPortrait?: StudioPortrait;
  initialTab?: StudioTab;
}) {
  const { t, locale, formatNumber } = useLocale();
  const id = useId();
  const lookTab = useRef<HTMLButtonElement>(null);
  const photoTab = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const placementTrigger = useRef<HTMLButtonElement>(null);
  const shadowZonePicker = useRef<HTMLSelectElement>(null);
  const loadedPreset = useRef<MakeupStylePreset | undefined>(undefined);
  const hadDraft = useRef(Boolean(draft));
  const initialPortrait = useRef(draft?.snapshot.portrait ?? defaultPortrait ?? defaultStudioPortrait);
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [previewMode, setPreviewMode] = useState<PreviewMode>(draft?.previewMode ?? "look");
  const [{ area, tool }, setSelection] = useState<StudioSelection>(draft?.selection ?? { area: "joues", tool: "blush" });
  const [portraitStyle, setPortraitStyle] = useState(initialPortrait.current);
  const { skinTone, iris, hair, showHair } = portraitStyle;
  const [{ layers: look, eyeshadows }, setStudioLayers] = useState(() => editableStudioLayers(draft?.snapshot));
  const [shadowZone, setShadowZone] = useState<StudioShadowZone>(draft?.shadowZone ?? "whole");
  const [placements, setPlacements] = useState<StudioPlacements>(draft?.snapshot.placements ?? {});
  const [activeLookId, setActiveLookId] = useState(draft?.activeLookId);
  const [guideVisible, setGuideVisible] = useState(draft?.guideVisible ?? false);
  const [setting, setSetting] = useState<StudioSetting | null>(draft?.snapshot.setting ?? null);
  const [pendingProduct, setPendingProduct] = useState(draft?.pendingProduct);
  const [side, setSide] = useState<StudioSide>(draft?.side ?? "left");
  const [handledTrial, setHandledTrial] = useState(draft?.handledTrial);
  const [unassignedTrial, setUnassignedTrial] = useState(draft?.unassignedTrial);
  const [positioningTool, setPositioningTool] = useState<"blush" | "brow">();
  const { shadesByProduct, settingPowders } = useMemo(() => {
    const ownedIds = new Set(products.map(({ id }) => id));
    const trials = [...new Map(trialProducts.filter(({ id }) => !ownedIds.has(id)).map((product) => [product.id, product])).values()];
    return {
      shadesByProduct: [...productShades(products, "owned"), ...productShades(trials, "trial")],
      settingPowders: [...products, ...trials].filter(isSettingPowder),
    };
  }, [products, trialProducts]);
  const settingProduct = setting?.productId ? settingPowders.find((product) => product.id === setting.productId) : undefined;
  const settingApplied = setting !== null;
  const isSetting = tool === "setting-powder";
  const isShadow = tool === "eyeshadow";
  const areaConfig = areas[area];
  const shades = (!isSetting ? toolShades[tool] : undefined) ?? areaConfig.shades;
  const active = isShadow ? eyeshadows[shadowZone] : !isSetting ? look[area]?.[tool] : undefined;
  const pendingHere = pendingProduct?.selection.area === area && pendingProduct.selection.tool === tool &&
    (!isShadow || pendingProduct.shadowZone === shadowZone);
  const selectedProduct = shadesByProduct.find((choice) => choice.id === (pendingHere ? pendingProduct.id
    : active?.productId ? productShadeId(active.productId, active.variantId) : undefined));
  const productWithoutShade = selectedProduct?.hex ? undefined : selectedProduct;
  const recentColor = palette[0];
  const photoTool = isSetting ? "powder" : tool;
  const currentPlacement = selectedPlacement(tool, placements);
  const mattePlacement = settingApplied ? selectedPlacement("setting-powder", placements)?.id : undefined;
  const showLook = previewMode === "look";
  const showGuide = showLook && guideVisible;
  const positioning = showLook && active !== undefined && positioningTool === tool;
  const placementMode = positioning && positioningTool ? {
    tool: positioningTool, side, anchor: getStudioAnchor(positioningTool, side, active.details, currentPlacement?.id),
  } : undefined;
  const layers: PigmentLayer[] = studioAreas.flatMap((zone) => areas[zone].tools.flatMap((kind) => {
    if (kind === "setting-powder") return [];
    if (kind === "eyeshadow") return shadowZones.flatMap((shadow) => {
      const layer = eyeshadows[shadow];
      return layer ? [chartPigment(layer, zone, kind, shadow)] : [];
    });
    const layer = look[zone]?.[kind];
    return layer ? [chartPigment(layer, zone, kind)] : [];
  }));
  const hasLook = layers.length > 0 || settingApplied;
  const canUseProfilePortrait = defaultPortrait && (showHair !== defaultPortrait.showHair ||
    skinTone.toUpperCase() !== defaultPortrait.skinTone.toUpperCase() || iris.toUpperCase() !== defaultPortrait.iris.toUpperCase() ||
    hair.toUpperCase() !== defaultPortrait.hair.toUpperCase());
  const currentHex = active?.mix ? blendedHex(active.hex, active.mix) : active?.hex;
  const swatchChoices: Swatch[] = [
    ...shadesByProduct.flatMap((choice) => choice.hex ? [{
      id: choice.id, label: choice.label, hex: choice.hex, group: choice.group, approximate: choice.approximate,
      apply: () => applyProduct(choice),
    }] : []),
    ...palette.map((color) => ({ id: `palette:${color.id}`, label: color.collection ? `${color.collection} · ${color.name}` : color.name,
      hex: color.hex, group: "palette" as const, apply: () => applyVirtual(color.hex, color.name, photoTool, color.id),
    })),
    ...(active && currentHex ? [{ id: "current", hex: currentHex, label: t("Couleur actuelle", "Current colour"),
      group: "custom" as const, approximate: active.approximate, apply: () => setPreviewMode("look"),
    }] : []),
  ];
  const toneStyle = {
    "--face-skin": skinTone,
    "--face-hair": hair,
    "--face-iris": iris,
  } as CSSProperties;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useLayoutEffect(() => {
    if (!onDraftChange) return;
    // An unedited visit leaves room for later profile changes to seed the Studio.
    if (!hadDraft.current && !hasLook && !pendingProduct && !handledTrial && shadowZone === "whole" &&
      portraitStyle === initialPortrait.current && !Object.keys(placements).length) return;
    hadDraft.current = true;
    onDraftChange({
      snapshot: { portrait: portraitStyle, layers: look, eyeshadows, placements, setting },
      selection: { area, tool }, previewMode, activeLookId, guideVisible, pendingProduct, side, shadowZone, handledTrial, unassignedTrial,
    });
  }, [onDraftChange, hasLook, portraitStyle, look, eyeshadows, placements, setting, area, tool, previewMode, activeLookId,
    guideVisible, pendingProduct, side, shadowZone, handledTrial, unassignedTrial]);

  useEffect(() => {
    const panel = previewPanel.current;
    if (!panel) return;
    const header = panel.closest(".app-shell")?.querySelector<HTMLElement>(".workspace-header");
    const fitPreview = () => {
      const headerHeight = header && getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0;
      const gap = 2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      panel.dataset.sticky = String(panel.offsetHeight + headerHeight + gap <= window.innerHeight);
    };
    fitPreview();
    const observer = new ResizeObserver(fitPreview);
    observer.observe(panel);
    if (header) observer.observe(header);
    window.addEventListener("resize", fitPreview);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitPreview);
    };
  }, []);

  useEffect(() => {
    if (!trialRequest || handledTrial === trialRequest) return;
    setHandledTrial(trialRequest);
    setUnassignedTrial(undefined);
    const { product } = trialRequest;
    if (isSettingPowder(product)) {
      setSelection({ area: "visage", tool: "setting-powder" });
      setPositioningTool(undefined);
      applySetting(product.id);
    } else {
      const choices = shadesByProduct.filter((choice) => choice.product.id === product.id);
      const choice = choices.find(({ variantId }) => variantId === product.selectedVariantId) ?? (choices.length === 1 ? choices[0] : undefined);
      if (choice?.selection) applyProduct(choice);
      else if (choices.length) setUnassignedTrial(product.name);
    }
  }, [trialRequest, handledTrial]);

  useEffect(() => {
    if (!preset || loadedPreset.current === preset) return;
    loadedPreset.current = preset;
    openSnapshot(preset.snapshot);
  }, [preset]);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "look" : event.key === "End" ? "photo" : tab === "look" ? "photo" : "look";
    setTab(next);
    (next === "look" ? lookTab : photoTab).current?.focus();
  }

  function chartPigment(layer: StudioLayer, zone: StudioArea, kind: PigmentKind, shadow?: StudioShadowZone): PigmentLayer {
    return {
      effect: "tinted", kind, zone,
      hex: layer.mix ? blendedHex(layer.hex, layer.mix) : layer.hex,
      name: layer.name, productName: layer.name, opacity: layer.intensity / 100,
      stepId: shadow ? `${zone}-${kind}-${shadow}` : `${zone}-${kind}`,
      placement: selectedPlacement(kind, placements)?.id,
      details: shadow ? { ...layer.details, shadow: { zone: shadow } } : layer.details,
    };
  }

  function editPigment(zone: StudioArea, kind: PigmentKind, edit: (before?: StudioLayer) => StudioLayer | undefined) {
    setStudioLayers((previous) => {
      if (kind === "eyeshadow") {
        const next = edit(previous.eyeshadows[shadowZone]);
        const updated = { ...previous.eyeshadows };
        if (next) updated[shadowZone] = next;
        else delete updated[shadowZone];
        return { ...previous, eyeshadows: updated };
      }
      const layers = previous.layers;
      return { ...previous, layers: { ...layers, [zone]: { ...layers[zone], [kind]: edit(layers[zone]?.[kind]) } } };
    });
  }

  function applyVirtual(hex: string, name: string, pigmentTool: StudioTool = tool, swatchId?: string, product?: ProductShade) {
    if (pigmentTool === "setting-powder" || !hexPattern.test(hex)) return;
    setPendingProduct(undefined);
    setPreviewMode("look");
    editPigment(area, pigmentTool, (prior) => ({ hex, name: product?.label.slice(0, 140) ?? name,
      productId: product?.product.id, variantId: product?.variantId, swatchId, details: prior?.details,
      intensity: prior?.intensity ?? toolIntensity[pigmentTool] ?? areaConfig.intensity }));
  }

  function applyProduct(choice?: ProductShade) {
    setUnassignedTrial(undefined);
    if (!choice) {
      setPendingProduct(undefined);
      if (active?.productId) updateLayer({ productId: undefined, variantId: undefined, approximate: undefined, name: active.hex });
      return;
    }
    const selection = choice.selection ?? { area, tool: tool === "setting-powder" ? "powder" : tool };
    const { area: zone, tool: pigment } = selection;
    if (pigment !== tool) setPositioningTool(undefined);
    setSelection(selection);
    setPreviewMode("look");
    if (!choice.hex || !hexPattern.test(choice.hex)) {
      setPendingProduct({ id: choice.id, selection, shadowZone: pigment === "eyeshadow" ? shadowZone : undefined });
      return;
    }
    setPendingProduct(undefined);
    const hex = choice.hex.toUpperCase();
    const appearance = makeupAppearance({ ...choice.product, makeupEffect: "tinted", shadeHex: hex }, {
      id: choice.product.id, productId: choice.product.id, zone, note: "",
    }, []);
    editPigment(zone, pigment, (prior) => ({
      hex, name: choice.label.slice(0, 140), productId: choice.product.id, variantId: choice.variantId, approximate: choice.approximate,
      intensity: prior?.intensity ?? (appearance.effect === "tinted" ? Math.round(appearance.opacity * 100) : toolIntensity[pigment] ?? areas[zone].intensity),
      details: prior?.details,
    }));
  }

  function updateLayer(change: Partial<StudioLayer>) {
    if (tool === "setting-powder") return;
    setPreviewMode("look");
    editPigment(area, tool, (layer) => layer ? { ...layer, ...change } : undefined);
  }

  function selectArea(zone: StudioArea) {
    if (zone === area) return;
    setSelection({ area: zone, tool: areas[zone].kind });
    setPositioningTool(undefined);
  }

  function placeAnchor(anchor: StudioAnchor) {
    if (positioningTool && active) updateLayer({ details: setStudioAnchor(active.details, positioningTool, side, anchor) });
  }

  function togglePositioning(value: boolean, byPointer: boolean) {
    setPositioningTool(value && (tool === "blush" || tool === "brow") ? tool : undefined);
    if (!value) return;
    setPreviewMode("look");
    if (!byPointer) return;
    requestAnimationFrame(() => {
      if (!portrait.current || !previewPanel.current) return;
      const { top, bottom } = portrait.current.getBoundingClientRect();
      const header = previewPanel.current.closest(".app-shell")?.querySelector<HTMLElement>(".workspace-header");
      const covered = header && getComputedStyle(header).position === "sticky" ? header.getBoundingClientRect().bottom : 0;
      if (top >= covered && bottom <= window.innerHeight) return;
      previewPanel.current.scrollIntoView({ block: "start" });
      preview.current?.focus({ preventScroll: true });
    });
  }

  function finishPositioning() {
    setPositioningTool(undefined);
    requestAnimationFrame(() => placementTrigger.current?.focus());
  }

  function applySetting(productId?: string) {
    setPreviewMode("look");
    setSetting(productId ? { productId } : {});
  }

  function applyFromPhoto(color: PaletteColor) {
    applyVirtual(color.hex, color.name, photoTool, color.id, productWithoutShade);
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
        portrait: portraitStyle,
        layers: look,
        eyeshadows: Object.keys(eyeshadows).length ? eyeshadows : undefined,
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

  function openSnapshot(snapshot: StudioLookSnapshot, id?: string) {
    const restored = editableStudioLayers(snapshot);
    const firstShadow = shadowZones.find((zone) => restored.eyeshadows[zone]);
    const selection = studioAreas.flatMap((zone) => studioToolsByArea[zone].filter((kind) =>
      kind !== "setting-powder" && (kind === "eyeshadow" ? firstShadow : restored.layers[zone]?.[kind])).map((kind) => ({ area: zone, tool: kind })))[0];
    setSetting(snapshot.setting);
    setPortraitStyle(snapshot.portrait);
    setStudioLayers(restored);
    setShadowZone(firstShadow ?? "whole");
    setPlacements(snapshot.placements);
    setSelection(selection ?? (snapshot.setting ? { area: "visage", tool: "setting-powder" } : { area: "joues", tool: "blush" }));
    setGuideVisible(false);
    setPreviewMode("look");
    setActiveLookId(id);
    setPendingProduct(undefined);
    setUnassignedTrial(undefined);
    setPositioningTool(undefined);
    setTab("look");
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
      <p>{t("Compose ton look avec les produits de ta trousse, les teintes du catalogue ou les couleurs prélevées sur tes photos.", "Build a look with your makeup bag, catalogue shades or colours sampled from your photos.")}</p>
    </header>
    <div className={styles.tabs} role="tablist" aria-label={t("Studio maquillage", "Makeup studio")}>
      {tabs.map((option) => {
        const isLook = option === "look";
        const Icon = isLook ? PaletteIcon : Camera;
        return <button type="button" key={option} id={`${id}-tab-${option}`} ref={isLook ? lookTab : photoTab}
          role="tab" aria-selected={tab === option} aria-controls={`${id}-panel-${option}`} tabIndex={tab === option ? 0 : -1}
          onClick={() => setTab(option)} onKeyDown={changeTab}>
          <Icon size={17} aria-hidden="true"/>{isLook ? t("Créer un look", "Create a look") : t("Prélever une teinte", "Sample a shade")}
        </button>;
      })}
    </div>

    <div className={styles.tabPanel} role="tabpanel" id={`${id}-panel-look`} aria-labelledby={`${id}-tab-look`} hidden={tab !== "look"}>
      <StudioLookLibrary looks={savedLooks} activeId={activeLookId} canSave={hasLook} onSave={saveLook}
        onOpen={({ id, snapshot }) => openSnapshot(snapshot, id)} onDelete={deleteLook}/>
      <div className={styles.workspace}>
        <section className={styles.preview} aria-labelledby={`${id}-preview`} ref={previewPanel}>
          <div className={styles.previewHeader}>
            <h2 id={`${id}-preview`} tabIndex={-1} ref={preview}>Face Chart</h2>
            {(currentPlacement || positioning) && <div className={styles.previewActions}>
              {currentPlacement && <button type="button" className={styles.guideToggle} aria-pressed={showGuide} aria-controls={`${id}-portrait`}
                onClick={() => {
                  setGuideVisible(!showGuide);
                  setPreviewMode("look");
                }}><Crosshair size={16} aria-hidden="true"/>{t("Guide de placement", "Placement guide")}</button>}
              {positioning && <button type="button" className={styles.guideToggle} onClick={finishPositioning}>
                {t("Terminer le placement", "Finish placement")}
              </button>}
            </div>}
          </div>
          <div className={styles.comparison} role="group" aria-label={t("Aperçu du visage", "Face preview")}>
            <button type="button" aria-pressed={!showLook} aria-controls={`${id}-portrait`} onClick={() => { setPreviewMode("bare"); setPositioningTool(undefined); }}>
              {t("Visage nu", "Bare face")}
            </button>
            <button type="button" aria-pressed={showLook} aria-controls={`${id}-portrait`} onClick={() => setPreviewMode("look")}>
              {t("Look maquillé", "Makeup look")}
            </button>
          </div>
          <div id={`${id}-portrait`} className={styles.portrait} ref={portrait}>
            <FaceChart selected={area} availableZones={studioAreas} layers={showLook ? layers : []} className={styles.face} style={toneStyle}
              placementGuide={showGuide ? currentPlacement?.id : undefined} mattePlacement={showLook ? mattePlacement : undefined} showHair={showHair}
              placementMode={placementMode} onPlace={placementMode ? placeAnchor : undefined}
              onSelect={(zone) => { if (isStudioArea(zone)) selectArea(zone); }}/>
          </div>
          <fieldset className={styles.skinTones}>
            <legend>{t("Carnation de l’illustration", "Illustrated skin tone")}</legend>
            {studioSkinTones.map((tone, index) => {
              const number = formatNumber(index + 1);
              const label = t(`Carnation ${number} · ${tone}`, `Skin tone ${number} · ${tone}`);
              return <button type="button" key={tone} className={styles.skinTone}
                style={{ "--swatch": tone } as CSSProperties} aria-pressed={skinTone === tone}
                aria-label={label} title={label} onClick={() => setPortraitStyle({ ...portraitStyle, skinTone: tone })}/>;
            })}
            <input type="color" className={styles.customSkinTone} aria-label={t("Choisir une carnation personnalisée", "Choose a custom skin tone")}
              title={t("Carnation personnalisée", "Custom skin tone")} value={skinTone}
              onChange={(event) => setPortraitStyle({ ...portraitStyle, skinTone: event.target.value.toUpperCase() })}/>
            <output className={styles.skinValue}>{skinTone.toUpperCase()}</output>
          </fieldset>
          <details className={styles.portraitOptions}>
            <summary>{t("Couleurs des yeux et des cheveux", "Eye and hair colours")}</summary>
            <div>
              <label>{t("Yeux", "Eyes")}<input type="color" value={iris}
                onChange={(event) => setPortraitStyle({ ...portraitStyle, iris: event.target.value })}/></label>
              <label><input type="checkbox" checked={showHair} onChange={(event) => setPortraitStyle({ ...portraitStyle, showHair: event.target.checked })}/>{t("Afficher les cheveux", "Show hair")}</label>
              {showHair && <label>{t("Cheveux", "Hair")}<input type="color" value={hair}
                onChange={(event) => setPortraitStyle({ ...portraitStyle, hair: event.target.value })}/></label>}
              {defaultPortrait && canUseProfilePortrait && <button type="button" className="button button-secondary" onClick={(event) => {
                event.currentTarget.closest("details")?.querySelector("summary")?.focus();
                setPortraitStyle(defaultPortrait);
              }}>{t("Utiliser le visage de mon profil", "Use my profile portrait")}</button>}
            </div>
          </details>
          {(layers.length > 0 || settingApplied) && <ul className={styles.layerList} aria-label={t("Couches du look", "Look layers")}>
            {layers.map((layer) => {
              const shadow = layer.kind === "eyeshadow" ? layer.details?.shadow?.zone : undefined;
              return <li key={layer.stepId}>
                <button type="button" aria-pressed={layer.zone === area && layer.kind === tool && (!shadow || shadow === shadowZone)} onClick={() => {
                  if (!isStudioArea(layer.zone)) return;
                  if (layer.kind !== tool) setPositioningTool(undefined);
                  if (shadow) setShadowZone(shadow);
                  setSelection({ area: layer.zone, tool: layer.kind });
                  setPreviewMode("look");
                }} title={layer.name}>
                  <span style={{ backgroundColor: layer.hex }} aria-hidden="true"/>{t(...toolLabels[layer.kind])}
                  {shadow && ` · ${studioShadowLabel(shadow, locale)}`}
                </button>
              </li>;
            })}
            {settingApplied && <li><button type="button" aria-pressed={isSetting} onClick={() => {
              setPositioningTool(undefined);
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
              onClick={() => { setSelection({ area, tool: kind }); setPositioningTool(undefined); }}>{t(...toolLabels[kind])}</button>)}
          </div>}
          {isShadow && <div className={styles.shadowZones}>
            <StudioShadowZonePicker selected={shadowZone} layers={eyeshadows} onSelect={setShadowZone} selectRef={shadowZonePicker} hintId={`${id}-shadow-hint`}/>
            <p id={`${id}-shadow-hint`} className={styles.sourceHint}>{t("Choisis une zone, puis applique une teinte. Les fards se superposent.", "Choose an area, then apply a shade. Eye shadows layer on top of each other.")}</p>
          </div>}
          {!isSetting && <ProductShades choices={shadesByProduct} value={selectedProduct?.id} onSelect={applyProduct}/>}
          {unassignedTrial && <p className={styles.sourceHint} role="status">{t(
            `Pour essayer « ${unassignedTrial} », choisis le type de maquillage, puis sélectionne le produit.`,
            `To try “${unassignedTrial}”, choose the makeup type, then select the product.`,
          )}</p>}
          {currentPlacement && <fieldset className={styles.placementPanel}>
            <legend>{t("Placement", "Placement")}</legend>
            <div className={styles.placements}>
              {getMakeupPlacements(placementKind(tool)).map((option) => <button type="button" key={option.id}
                aria-pressed={option.id === currentPlacement.id} onClick={() => {
                  setPreviewMode("look");
                  setPlacements((previous) => ({ ...previous, [tool]: option.id }));
                  if (tool === "blush" && active?.details?.blush) updateLayer({ details: { ...active.details, blush: undefined } });
                  if (isSetting && !settingApplied) setGuideVisible(true);
                }}>{t(option.label[0], option.label[1])}</button>)}
            </div>
            <p aria-live="polite">{t(currentPlacement.description[0], currentPlacement.description[1])}</p>
          </fieldset>}
          {isSetting ? <div className={styles.settingPanel}>
            <p>{t("Trace les zones à fixer pour visualiser leur emplacement.", "Mark where you’d set your makeup to see those areas outlined.")}</p>
            {settingPowders.length > 0 && <label>{t("Choisir une poudre translucide", "Choose a translucent powder")}
              <select value={settingProduct?.id ?? ""} onChange={(event) => {
                const product = settingPowders.find((item) => item.id === event.target.value);
                applySetting(product?.id);
              }}>
                <option value="">{t("Poudre de simulation", "Sample powder")}</option>
                {settingPowders.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}
              </select>
            </label>}
            {settingApplied ? <p role="status" className={styles.settingStatus}>
              {settingProduct?.name ? t(`${settingProduct.name} · poudrage tracé`, `${settingProduct.name} · setting areas marked`)
                : t("Poudrage tracé sur l’illustration.", "Setting areas are marked on the illustration.")}
            </p> : <button type="button" className="button button-primary" onClick={() => applySetting()}>
              {t("Tracer le poudrage", "Mark setting areas")}
            </button>}
          </div> : <>
          <div className={styles.shadeSources}>
            {palette.length > 0 && <SavedShades palette={palette} selected={active?.swatchId}
              onSelect={(color) => applyVirtual(color.hex, color.name, tool, color.id, productWithoutShade)}/>}
            {palette.length === 0 && <button type="button" className={styles.photoShortcut} onClick={() => {
              setTab("photo");
              photoTab.current?.focus();
            }}><SwatchBook size={16} aria-hidden="true"/>{t("Prélever une teinte sur une photo", "Sample a shade from a photo")}</button>}
          </div>
          <ColourField key={isShadow ? shadowZone : undefined} label={t("Couleur personnalisée", "Custom colour")} hex={active?.hex ?? shades[0].hex}
            onChange={(hex) => applyVirtual(hex, hex, tool, undefined, productWithoutShade)}/>
          <details className={styles.exampleShades}>
            <summary>{t("Couleurs d’exemple", "Example colours")}</summary>
            <div className={styles.swatches}>
              {shades.map((shade) => <button type="button" key={shade.hex} className={styles.shade}
                aria-pressed={active?.hex.toUpperCase() === shade.hex && !active?.productId && !active?.swatchId}
                onClick={() => applyVirtual(shade.hex, t(...shade.label))}>
                <span style={{ "--swatch": shade.hex } as CSSProperties} aria-hidden="true"/>
                <small>{t(...shade.label)}</small>
              </button>)}
            </div>
          </details>

          <SwatchComparison choices={swatchChoices} skinTone={skinTone}/>

          {active && <div className={styles.adjustments}>
            <p className={styles.activeShade} role="status">{active.name} · {currentHex?.toUpperCase()}
              {active.approximate && <small> · {t("Aperçu approximatif", "Approximate preview")}</small>}
            </p>
            <StudioPlacementEditor tool={tool} details={active.details} placement={currentPlacement?.id}
              onChange={(details) => updateLayer({ details })} side={side} onSideChange={setSide} positioning={positioning}
              placementTrigger={placementTrigger} portraitId={`${id}-portrait`} onPositioningChange={togglePositioning}/>
            <label className={styles.range}>
              <span>{t("Intensité", "Intensity")} <output>{formatNumber(active.intensity)} %</output></span>
              <input type="range" min={0} max={100} value={active.intensity} aria-label={t("Intensité", "Intensity")}
                onChange={(event) => updateLayer({ intensity: Number(event.target.value) })}/>
            </label>
            <button type="button" className={styles.mixToggle} aria-pressed={Boolean(active.mix)} onClick={() => updateLayer({
              mix: active.mix ? undefined : { hex: shades[1].hex, amount: 50 },
            })}><SlidersHorizontal size={16} aria-hidden="true"/>{t("Mélanger deux teintes", "Mix two shades")}</button>
            {active.mix && <div className={styles.mixControls}>
              <ColourField key={isShadow ? shadowZone : undefined} label={t("Seconde teinte", "Second shade")} hex={active.mix.hex}
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
                setPendingProduct(undefined);
                setPositioningTool(undefined);
                if (isSetting) setSetting(null);
                else editPigment(area, tool, () => undefined);
                if (isShadow) shadowZonePicker.current?.focus();
              }}>
              <CircleX size={16} aria-hidden="true"/>{isShadow ? t("Effacer le fard de cette zone", "Clear eye shadow in this area") : t("Effacer la couche", "Clear layer")}
            </button>}
            <button type="button" className="button button-secondary" disabled={!layers.some((layer) => layer.zone === area) && !(area === "visage" && settingApplied)}
              onClick={() => {
                setPreviewMode("look");
                setPendingProduct(undefined);
                setPositioningTool(undefined);
                setStudioLayers((previous) => ({
                  layers: { ...previous.layers, [area]: undefined }, eyeshadows: area === "yeux" ? {} : previous.eyeshadows,
                }));
                if (area === "visage") setSetting(null);
              }}>
              <CircleX size={16} aria-hidden="true"/>{area === "yeux" ? t("Effacer le maquillage des yeux", "Clear all eye makeup") : t("Effacer la zone", "Clear area")}
            </button>
            <button type="button" className="button button-secondary" disabled={!hasLook} onClick={() => {
              setPreviewMode("look");
              setPendingProduct(undefined);
              setPositioningTool(undefined);
              setStudioLayers({ layers: {}, eyeshadows: {} });
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
        <p>{t("Photographie par exemple ta palette près d’une fenêtre. Ouvre la photo, touche un fard avec la pipette, puis enregistre la couleur pour l’essayer ou la comparer dans le Studio.", "For example, photograph your palette near a window. Open the photo, tap a shade with the eyedropper and save it to try or compare in the studio.")}</p>
        {recentColor && <button type="button" className="button button-primary" onClick={() => applyFromPhoto(recentColor)}>
          {t(`Essayer « ${recentColor.name} »`, `Try “${recentColor.name}”`)} · {t(...toolLabels[photoTool])}
        </button>}
      </div>
      {paletteEditor}
    </div>
  </section>;
}
