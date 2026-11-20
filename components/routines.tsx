"use client";

import {
  Aperture,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  Moon,
  Pencil,
  Play,
  Plus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { analyzeRoutine } from "@/lib/analysis";
import { defaultApplicationZone, faceMakeupLayers, makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import { findMakeupPlacement, getMakeupPlacements } from "@/lib/makeup-placements";
import { emptyState, hairApplicationAreas, type FaceZone, type PaletteColor, type Preferences, type Product, type Routine, type RoutineStep } from "@/lib/model";
import { FaceChart } from "./face-chart";
import styles from "./routines.module.css";

export { FaceChart } from "./face-chart";

const periods = {
  matin: { label: ["Matin", "Morning"], icon: Sun },
  soir: { label: ["Soir", "Evening"], icon: Moon },
  libre: { label: ["À tout moment", "Any time"], icon: Clock3 },
} satisfies Record<Routine["period"], { label: [string, string]; icon: typeof Sun }>;

const zones = {
  visage: ["Visage", "Face"],
  front: ["Front", "Forehead"],
  joues: ["Joues", "Cheeks"],
  yeux: ["Yeux", "Eyes"],
  levres: ["Lèvres", "Lips"],
  menton: ["Menton", "Chin"],
  cheveux: ["Cheveux", "Hair"],
} satisfies Record<FaceZone, [string, string]>;

const faceZones = Object.keys(zones) as FaceZone[];
const hairAreas = {
  scalp: ["Cuir chevelu", "Scalp"],
  lengths: ["Longueurs", "Lengths"],
  ends: ["Pointes", "Ends"],
} satisfies Record<(typeof hairApplicationAreas)[number], [string, string]>;

interface RoutinesProps {
  products: Product[];
  routines: Routine[];
  palette?: PaletteColor[];
  preferences?: Preferences;
  onChange: (routines: Routine[]) => boolean;
  onComplete?: (routine: Routine) => boolean;
  startRoutineId?: string;
  onStartGuide?: (id: string) => void;
  onExitGuide?: () => void;
}

export function Routines({ products, routines, palette = emptyState.palette, preferences = emptyState.preferences, onChange, onComplete, startRoutineId, onStartGuide, onExitGuide }: RoutinesProps) {
  const { t } = useLocale();
  const [draft, setDraft] = useState<Routine | null>(null);
  const [guideId, setGuideId] = useState<string | undefined>(undefined);
  const [dismissedStartId, setDismissedStartId] = useState<string | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const requestedGuide = startRoutineId === dismissedStartId ? undefined : startRoutineId;
  const activeRoutineId = onStartGuide ? startRoutineId : requestedGuide ?? guideId;
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId);

  function leaveGuide() {
    setGuideId(undefined);
    setDismissedStartId(startRoutineId);
    onExitGuide?.();
  }

  function saveRoutine(routine: Routine) {
    const existing = routines.some((item) => item.id === routine.id);
    if (onChange(existing ? routines.map((item) => item.id === routine.id ? routine : item) : [...routines, routine])) {
      setDraft(null);
    }
  }

  if (activeRoutine?.steps.length) {
    return <RoutineGuide key={activeRoutine.id} routine={activeRoutine} products={products} palette={palette} preferences={preferences} onExit={leaveGuide} onComplete={onComplete} />;
  }

  if (draft) {
    return <RoutineEditor initial={draft} products={products} palette={palette} preferences={preferences} onSave={saveRoutine} onCancel={() => setDraft(null)} />;
  }

  return (
    <section className={styles.page} aria-labelledby="routines-title">
      <div className={styles.heading}>
        <div>
          <h1 id="routines-title" className={styles.title}>{t("Mes routines", "My routines")}</h1>
          <p className={styles.subtitle}>{t("Organise tes gestes et retrouve leur ordre au quotidien.", "Organize your steps and follow them day to day.")}</p>
        </div>
        <button type="button" className="button button-primary" disabled={routines.length >= 100} onClick={() => {
          setDraft({ id: crypto.randomUUID(), name: "", period: "libre", steps: [] });
        }}>
          <Plus size={18} aria-hidden="true" /> {t("Créer une routine", "Create a routine")}
        </button>
      </div>
      {routines.length >= 100 && <p className={styles.formHint}>{t("Ton espace peut contenir jusqu’à 100 routines.", "Your workspace can hold up to 100 routines.")}</p>}

      {routines.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Layers3 aria-hidden="true" size={24} /></div>
          <h2>{t("Ta première routine", "Your first routine")}</h2>
          <p>{products.length
            ? t("Choisis les produits à utiliser et place-les dans l’ordre qui te convient.", "Choose your products and arrange them in the order you use them.")
            : t("Ajoute des produits à ton vanity pour pouvoir les utiliser dans une routine.", "Add products to your vanity to use them in a routine.")}</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {routines.map((routine) => {
            const { label, icon: PeriodIcon } = periods[routine.period];
            return (
              <li className={styles.card} key={routine.id}>
                <div className={styles.cardHeader}>
                  <span className={styles.periodLabel}><PeriodIcon size={16} strokeWidth={1.7} aria-hidden="true" />{t(...label)}</span>
                </div>
                <h2>{routine.name}</h2>
                <p className={styles.stepCount}>{routine.steps.length} {routine.steps.length === 1 ? t("étape", "step") : t("étapes", "steps")}</p>
                {routine.steps.length > 0 && (
                  <ol className={styles.previewSteps}>
                    {routine.steps.slice(0, 3).map((step) => (
                      <li key={step.id}>{products.find((product) => product.id === step.productId)?.name ?? t("Produit retiré du vanity", "Product removed from vanity")}</li>
                    ))}
                  </ol>
                )}
                {pendingDelete === routine.id ? (
                  <div className={styles.confirm}>
                    <p>{t("Supprimer cette routine ?", "Delete this routine?")}</p>
                    <div className={styles.actions}>
                      <button type="button" className="button button-secondary" onClick={() => setPendingDelete(null)}>{t("Annuler", "Cancel")}</button>
                      <button type="button" className={`${styles.danger} button button-secondary`} onClick={() => {
                        if (onChange(routines.filter((item) => item.id !== routine.id))) setPendingDelete(null);
                      }}>{t("Supprimer", "Delete")}</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    <button type="button" className="button button-primary" disabled={routine.steps.length === 0} onClick={() => {
                      if (onStartGuide) onStartGuide(routine.id);
                      else setGuideId(routine.id);
                    }}><Play size={16} aria-hidden="true" /> {t("Lancer", "Start")}</button>
                    <button type="button" className={styles.iconButton} aria-label={t(`Modifier ${routine.name}`, `Edit ${routine.name}`)} onClick={() => setDraft(routine)}><Pencil size={18} aria-hidden="true" /></button>
                    <button type="button" className={styles.iconButton} aria-label={t(`Supprimer ${routine.name}`, `Delete ${routine.name}`)} onClick={() => setPendingDelete(routine.id)}><Trash2 size={18} aria-hidden="true" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RoutineEditor({ initial, products, palette, preferences, onSave, onCancel }: {
  initial: Routine;
  products: Product[];
  palette: PaletteColor[];
  preferences: Preferences;
  onSave: (routine: Routine) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useLocale();
  const [routine, setRoutine] = useState(initial);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  function updateStep(stepId: string, change: Partial<RoutineStep>) {
    setRoutine((current) => ({
      ...current,
      steps: current.steps.map((step) => step.id === stepId ? { ...step, ...change } : step),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setRoutine((current) => {
      const steps = [...current.steps];
      const step = steps[index];
      const neighbor = steps[index + direction];
      if (!step || !neighbor) return current;
      steps[index] = neighbor;
      steps[index + direction] = step;
      return { ...current, steps };
    });
  }

  function addStep() {
    const firstProduct = products[0];
    if (!firstProduct) return;
    setRoutine((current) => ({
      ...current,
      steps: [...current.steps, {
        id: crypto.randomUUID(),
        productId: firstProduct.id,
        zone: defaultApplicationZone(firstProduct),
        note: "",
      }],
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = routine.name.trim();
    if (name) onSave({ ...routine, name, steps: routine.steps.map((step) => ({ ...step, note: step.note.trim() })) });
  }

  return (
    <section className={styles.page} aria-labelledby={`${id}-title`}>
      <div className={styles.heading}>
        <div>
          <h1 id={`${id}-title`} ref={heading} tabIndex={-1} className={styles.title}>{initial.name ? t("Modifier la routine", "Edit routine") : t("Nouvelle routine", "New routine")}</h1>
          <p className={styles.subtitle}>{t("Compose ton rituel avec les produits de ton vanity.", "Build a routine with the products in your vanity.")}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onCancel}><X size={18} aria-hidden="true" /> {t("Annuler", "Cancel")}</button>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fields}>
          <label>
            {t("Nom de la routine", "Routine name")}
            <input required maxLength={140} value={routine.name} onChange={(event) => setRoutine({ ...routine, name: event.target.value })} placeholder={t("Ex. Mon rituel du soir", "E.g. My evening routine")} />
          </label>
          <label>
            {t("Moment", "Time of day")}
            <select value={routine.period} onChange={(event) => setRoutine({ ...routine, period: event.target.value as Routine["period"] })}>
              {Object.entries(periods).map(([value, period]) => <option key={value} value={value}>{t(...period.label)}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.editorHeading}>
          <h2>{t("Étapes", "Steps")}</h2>
          <button type="button" className="button button-secondary" onClick={addStep} disabled={products.length === 0 || routine.steps.length >= 40}><Plus size={17} aria-hidden="true" /> {t("Ajouter une étape", "Add a step")}</button>
        </div>
        {!routine.steps.length && <p className={styles.formHint}>{products.length ? t("Ajoute une étape pour commencer.", "Add a step to get started.") : t("Ajoute d’abord un produit à ton vanity.", "Add a product to your vanity first.")}</p>}
        <ol className={styles.editorSteps}>
          {routine.steps.map((step, index) => {
            const product = products.find((item) => item.id === step.productId);
            const appearance = makeupAppearance(product, step, palette);
            const canChooseSwatch = appearance.effect === "tinted" || appearance.effect === "no-shade" || appearance.effect === "wrong-zone";
            const kind = product?.category === "maquillage" ? product.makeupKind : undefined;
            const placements = getMakeupPlacements(kind);
            const placement = findMakeupPlacement(kind, step.placement);

            return (
              <li key={step.id} className={styles.editorStep}>
                <div className={styles.editorStepHeader}>
                  <strong>{t("Étape", "Step")} {index + 1}</strong>
                  <div className={styles.actions}>
                    <button type="button" className={styles.iconButton} disabled={index === 0} onClick={() => moveStep(index, -1)} aria-label={t(`Monter l’étape ${index + 1}`, `Move step ${index + 1} up`)}><ArrowUp size={17} aria-hidden="true" /></button>
                    <button type="button" className={styles.iconButton} disabled={index === routine.steps.length - 1} onClick={() => moveStep(index, 1)} aria-label={t(`Descendre l’étape ${index + 1}`, `Move step ${index + 1} down`)}><ArrowDown size={17} aria-hidden="true" /></button>
                    <button type="button" className={styles.iconButton} onClick={() => setRoutine((current) => ({ ...current, steps: current.steps.filter((item) => item.id !== step.id) }))} aria-label={t(`Retirer l’étape ${index + 1}`, `Remove step ${index + 1}`)}><Trash2 size={17} aria-hidden="true" /></button>
                  </div>
                </div>
                <div className={styles.fields}>
                  <label>
                    {t("Produit", "Product")}
                    <select value={step.productId} onChange={(event) => {
                      const product = products.find((item) => item.id === event.target.value);
                      if (!product) return;
                      updateStep(step.id, {
                        productId: product.id,
                        zone: defaultApplicationZone(product, step.zone),
                        swatchId: undefined,
                        placement: product.category === "maquillage" ? findMakeupPlacement(product.makeupKind, step.placement)?.id : undefined,
                        applicationsPerWeek: undefined,
                        hairArea: product.category === "cheveux" ? step.hairArea : undefined,
                        massage: product.category === "cheveux" ? step.massage : undefined,
                      });
                    }}>
                      {!products.some((product) => product.id === step.productId) && <option value={step.productId}>{t("Produit retiré du vanity", "Product removed from vanity")}</option>}
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand && ` · ${product.brand}`}</option>)}
                    </select>
                  </label>
                  <label>
                    {t("Zone d’application", "Application area")}
                    <select value={step.zone} disabled={Boolean(placement)}
                      onChange={(event) => updateStep(step.id, { zone: event.target.value as FaceZone })}>
                      {faceZones.map((zone) => <option key={zone} value={zone}>{t(...zones[zone])}</option>)}
                    </select>
                  </label>
                </div>
                {placements.length > 0 && <label>
                  {t("Placement du maquillage", "Makeup placement")}
                  <select value={placement?.id ?? ""} onChange={(event) =>
                    updateStep(step.id, { placement: findMakeupPlacement(kind, event.target.value)?.id })}>
                    <option value="">{t("Suivre la zone choisie", "Use the selected area")}</option>
                    {placements.map((option) => <option key={option.id} value={option.id}>{t(...option.label)}</option>)}
                  </select>
                  {placement && <span className={styles.optional}>{t(...placement.description)}</span>}
                </label>}
                <div className={styles.fields}>
                  <label>
                    <span>{t("Fréquence par semaine", "Weekly frequency")} <span className={styles.optional}>{t("(facultative)", "(optional)")}</span></span>
                    <select value={step.applicationsPerWeek ?? ""} onChange={(event) => updateStep(step.id, {
                      applicationsPerWeek: event.target.value ? Number(event.target.value) : undefined,
                    })}>
                      <option value="">{t("Selon la notice", "Follow product instructions")}</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{t(`${count} fois par semaine`, `${count} ${count === 1 ? "time" : "times"} per week`)}</option>)}
                    </select>
                  </label>
                  {canChooseSwatch && palette.length > 0 && (
                    <label>
                      <span>{t("Teinte du Face Chart", "Face Chart shade")} <span className={styles.optional}>{t("(facultative)", "(optional)")}</span></span>
                      <select value={step.swatchId ?? ""} onChange={(event) => updateStep(step.id, { swatchId: event.target.value || undefined })}>
                        <option value="">{product?.shadeHex ? t("Teinte de la fiche", "Product shade") : t("Aucune teinte choisie", "No shade selected")}</option>
                        {step.swatchId && !palette.some((color) => color.id === step.swatchId) && (
                          <option value={step.swatchId}>{t("Teinte retirée de la palette", "Shade removed from palette")}</option>
                        )}
                        {palette.map((color) => <option key={color.id} value={color.id}>{color.name} · {color.hex.toUpperCase()}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <label>
                  {t("Consigne", "Note")} <span className={styles.optional}>{t("(facultative)", "(optional)")}</span>
                  <textarea rows={2} maxLength={800} value={step.note} onChange={(event) => updateStep(step.id, { note: event.target.value })} placeholder={t("Ex. Appliquer en fine couche.", "E.g. Apply a thin layer.")} />
                </label>
                <details className={styles.stepSetup} open={Boolean(step.tool || step.hairArea || step.massage) || undefined}>
                  <summary>{t("Outil et geste", "Tool and technique")}</summary>
                  <div className={styles.fields}>
                    <label>
                      {t("Outil ou accessoire", "Tool or accessory")}
                      <input maxLength={120} value={step.tool ?? ""}
                        placeholder={t("Ex. Pinceau, brosse ou diffuseur", "E.g. Brush or diffuser")}
                        onChange={(event) => updateStep(step.id, { tool: event.target.value || undefined })}/>
                    </label>
                    {product?.category === "cheveux" && <label>
                      {t("Partie des cheveux", "Hair area")}
                      <select value={step.hairArea ?? ""} onChange={(event) => {
                        const area = hairApplicationAreas.find((choice) => choice === event.target.value);
                        updateStep(step.id, { hairArea: area, zone: "cheveux" });
                      }}>
                        <option value="">{t("Non précisée", "Unspecified")}</option>
                        {hairApplicationAreas.map((area) => <option key={area} value={area}>{t(...hairAreas[area])}</option>)}
                      </select>
                    </label>}
                  </div>
                  {product?.category === "cheveux" && <label className={styles.massageOption}>
                    <input type="checkbox" checked={Boolean(step.massage)}
                      onChange={(event) => updateStep(step.id, { massage: event.target.checked || undefined })}/>
                    {t("Inclure un massage à cette étape", "Include a massage in this step")}
                  </label>}
                </details>
              </li>
            );
          })}
        </ol>
        <Vigilance notes={analyzeRoutine(routine, products, preferences, locale)} />
        <div className={styles.formActions}>
          <button type="button" className="button button-secondary" onClick={onCancel}>{t("Annuler", "Cancel")}</button>
          <button type="submit" className="button button-primary" disabled={!routine.name.trim()}><Check size={18} aria-hidden="true" /> {t("Enregistrer", "Save")}</button>
        </div>
      </form>
    </section>
  );
}

function Vigilance({ notes }: { notes: string[] }) {
  const { t } = useLocale();
  if (!notes.length) return null;
  return (
    <details className={styles.watch}>
      <summary>{t("Points de vigilance", "Things to check")} ({notes.length})</summary>
      <ul>{notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul>
      <p>{t("Ces repères reposent sur les listes INCI disponibles et les préférences de ton profil.", "These notes use the available ingredient lists and your profile preferences.")}</p>
    </details>
  );
}

const previewMessages = {
  none: ["Zone d’application indiquée par le contour.", "The outline marks where to apply the product."],
  unknown: ["Renseigne un type et un effet de maquillage dans le vanity pour afficher une teinte.", "Add a makeup type and finish in the vanity to preview a shade."],
  transparent: ["Fini transparent. Le contour indique où l’appliquer.", "Transparent finish. The outline marks where to apply it."],
  mattifying: ["Fini matifiant représenté sans pigment supplémentaire.", "Matte finish shown without added pigment."],
  "wrong-zone": ["Aperçu indisponible pour ce type de maquillage sur cette zone.", "This makeup type has no preview for the selected area."],
  "no-shade": ["Sélectionne une teinte dans la fiche produit ou dans cette étape pour voir la couleur.", "Choose a shade in the product details or in this step to preview it."],
} satisfies Record<string, [string, string]>;

function MakeupLegend({ layers }: { layers: PigmentLayer[] }) {
  const { t } = useLocale();
  if (!layers.length) return null;
  return (
    <details className={styles.makeupLegend}>
      <summary>{t("Teintes visibles", "Visible shades")} ({layers.length})</summary>
      <ul>
        {layers.map(({ stepId, kind, placement, name, hex, productName, zone }) => {
          const label = findMakeupPlacement(kind, placement)?.label ?? zones[zone];
          return <li key={stepId}>
            <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><circle cx={8} cy={8} r={6} fill={hex} /></svg>
            <span>{productName} · {t(...label)} · {name}</span>
          </li>;
        })}
      </ul>
      <p>{t("Aperçu indicatif du placement des couleurs. Le rendu réel varie selon le produit, la carnation et la lumière.", "The preview shows color placement. The finished look depends on the product, skin tone and lighting.")}</p>
    </details>
  );
}

function RoutineGuide({ routine, products, palette, preferences, onExit, onComplete }: {
  routine: Routine;
  products: Product[];
  palette: PaletteColor[];
  preferences: Preferences;
  onExit: () => void;
  onComplete?: (routine: Routine) => boolean;
}) {
  const { t, locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [zone, setZone] = useState<FaceZone | null>(null);
  const [finished, setFinished] = useState(false);
  const [showPlacement, setShowPlacement] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = routine.steps[index];
  const last = index === routine.steps.length - 1;
  const selectedZone = zone ?? step?.zone ?? "visage";
  const product = products.find((item) => item.id === step?.productId);
  const layers = faceMakeupLayers(routine.steps, products, palette, index);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [finished]);

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setFurthest((previous) => Math.max(previous, nextIndex));
    setZone(null);
  }

  if (finished) {
    return (
      <section className={styles.complete} aria-labelledby="routine-complete-title">
        <div className={styles.emptyIcon}><Check size={29} aria-hidden="true" /></div>
        <h1 id="routine-complete-title" ref={heading} tabIndex={-1} className={styles.title}>{t("Routine terminée", "Routine complete")}</h1>
        <p role="status">{t(`Tu as suivi toutes les étapes de « ${routine.name} ».`, `You finished every step of “${routine.name}”.`)}</p>
        {layers.length > 0 && (
          <div className={styles.chartPanel}>
            <h2 className={styles.chartTitle}>{t("Aperçu final du Face Chart", "Final Face Chart preview")}</h2>
            <FaceChart selected={selectedZone} layers={layers} onSelect={setZone} />
            <MakeupLegend layers={layers} />
          </div>
        )}
        <button type="button" className="button button-primary" onClick={onExit}>{t("Revenir aux routines", "Back to routines")}</button>
      </section>
    );
  }

  if (!step) return null;
  const preview = makeupAppearance(product, step, palette);
  const instructions = product?.usageInstructions;
  const instructionSource = instructions?.source === "packaging" ? t("Emballage", "Packaging") : instructions?.source === "manufacturer" ? t("Fabricant", "Manufacturer") : "Open Beauty Facts";
  const frequency = step.applicationsPerWeek;
  const isHairStep = product?.category === "cheveux" && step.zone === "cheveux";
  const kind = product?.category === "maquillage" ? product.makeupKind : undefined;
  const placement = findMakeupPlacement(kind, step.placement);
  const mattePlacement = kind === "powder" && (preview.effect === "transparent" || preview.effect === "mattifying") ? placement?.id : undefined;
  const applicationLabel = placement ? t(...placement.label) : isHairStep && step.hairArea ? t(...hairAreas[step.hairArea]) : t(...zones[step.zone]);

  return (
    <section className={styles.page} aria-labelledby="routine-guide-title">
      <button type="button" className={`${styles.backButton} button button-secondary`} onClick={onExit}><ChevronLeft size={17} aria-hidden="true" /> {t("Mes routines", "My routines")}</button>
      <div className={styles.heading}>
        <div>
          <h1 id="routine-guide-title" ref={heading} tabIndex={-1} className={styles.title}>{routine.name}</h1>
          <p className={styles.subtitle}>{t("Applique tes produits à ton rythme.", "Use your products at your own pace.")}</p>
        </div>
      </div>
      <Vigilance notes={analyzeRoutine(routine, products, preferences, locale)} />
      <div className={styles.guide}>
        <div className={styles.guidePanel}>
          <div className={styles.progressText}>
            <span>{t(`Étape ${index + 1} sur ${routine.steps.length}`, `Step ${index + 1} of ${routine.steps.length}`)}</span>
            <span className={styles.zonePill}>{applicationLabel}</span>
          </div>
          <progress className={styles.progress} value={index + 1} max={routine.steps.length} aria-label={t("Progression de la routine", "Routine progress")} />
          <div className={styles.stepDetails} aria-live="polite" aria-atomic="true">
            {product?.brand && <p className={styles.productBrand}>{product.brand}</p>}
            <h2>{product?.name ?? t("Produit retiré du vanity", "Product removed from vanity")}</h2>
            {step.tool && <p><strong>{t("Outil", "Tool")}</strong> · {step.tool}</p>}
            {isHairStep && step.massage && <p>{t("Massage prévu à cette étape.", "Massage included in this step.")}</p>}
            {(step.note || !instructions) && (
              <p>{step.note || (product
                ? t("Suis les consignes d’application inscrites sur le produit.", "Follow the directions on the product packaging.")
                : t("Tu peux passer à l’étape suivante ou mettre à jour ta routine.", "Skip to the next step or edit your routine."))}</p>
            )}
            {instructions && (
              <details className={styles.instructions} open={!step.note || undefined}>
                <summary>{t("Consignes du produit", "Product directions")} · {instructionSource}</summary>
                <p>{instructions.text}</p>
                {"url" in instructions && <a href={instructions.url} target="_blank" rel="noreferrer">{t("Voir la source", "View source")}</a>}
              </details>
            )}
            <p className={styles.frequency}><strong>{t("Fréquence", "Frequency")}</strong> · {frequency ? t(`${frequency} fois par semaine`, `${frequency} ${frequency === 1 ? "time" : "times"} per week`) : t("selon la notice", "follow product instructions")}</p>
          </div>
          <ol className={styles.guideSteps} aria-label={t("Étapes de la routine", "Routine steps")}>
            {routine.steps.map((item, itemIndex) => (
              <li key={item.id}>
                <button type="button" disabled={itemIndex > furthest} aria-current={itemIndex === index ? "step" : undefined} onClick={() => goTo(itemIndex)}>
                  <span className={styles.guideStepNumber}>{itemIndex + 1}</span>
                  {products.find((candidate) => candidate.id === item.productId)?.name ?? t("Produit retiré", "Product removed")}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.guideActions}>
            <button type="button" className="button button-secondary" disabled={index === 0} onClick={() => goTo(index - 1)}><ChevronLeft size={17} aria-hidden="true" /> {t("Précédente", "Previous")}</button>
            <button type="button" className="button button-primary" onClick={() => {
              if (!last) {
                goTo(index + 1);
                return;
              }
              if (onComplete?.(routine) === false) return;
              setFinished(true);
            }}>{last ? <Check size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}{last ? t("Terminer", "Finish") : t("Suivante", "Next")}</button>
          </div>
        </div>
        <div className={styles.chartPanel}>
          <div className={styles.chartTitle}><Aperture size={17} aria-hidden="true" /> Face Chart</div>
          <FaceChart selected={selectedZone} layers={layers} onSelect={setZone}
            placementGuide={showPlacement ? placement?.id : undefined} mattePlacement={mattePlacement}
            application={selectedZone === step.zone
              ? isHairStep ? { kind: "hair", hairArea: step.hairArea, massage: step.massage }
                : product?.category === "soin" ? { kind: "care" } : undefined
              : undefined}/>
          <p className={styles.chartSelection} aria-live="polite">{selectedZone === step.zone ? applicationLabel : t(...zones[selectedZone])}</p>
          <p className={styles.chartHint} aria-live="polite">
            {preview.effect === "tinted" ? `${applicationLabel} · ${preview.name}` : t(...previewMessages[preview.effect])}
          </p>
          {placement && <>
            <p className={styles.chartHint}>{t(...placement.description)}</p>
            <button type="button" className="button button-secondary" aria-pressed={showPlacement}
              onClick={() => setShowPlacement(!showPlacement)}>{t("Guide de placement", "Placement guide")}</button>
          </>}
          <div className={styles.zoneControls} aria-label={t("Zones d’application", "Application areas")} role="group">
            {faceZones.map((item) => <button type="button" key={item} aria-pressed={item === selectedZone} onClick={() => setZone(item)}>{t(...zones[item])}</button>)}
          </div>
          <MakeupLegend layers={layers} />
        </div>
      </div>
    </section>
  );
}
