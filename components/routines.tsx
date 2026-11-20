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
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { analyzeRoutine } from "@/lib/analysis";
import { defaultApplicationZone, faceMakeupLayers, makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import { emptyState, type FaceZone, type PaletteColor, type Preferences, type Product, type Routine, type RoutineStep } from "@/lib/model";
import styles from "./routines.module.css";

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

const zonePaths: Record<FaceZone, string[]> = {
  visage: ["M65 122C65 75 91 53 130 53S195 75 195 122V155C195 197 166 233 130 239C94 233 65 197 65 155Z"],
  cheveux: ["M59 122C43 153 43 190 49 227C34 224 29 207 30 175L35 119C34 62 70 30 123 30C176 24 226 60 226 120L230 177C230 207 224 226 210 230C214 187 216 153 201 122C199 88 186 67 166 57C157 86 109 95 72 99C65 102 62 110 59 122Z"],
  front: ["M90 96C117 91 147 88 166 76C174 86 180 98 181 110C161 123 99 123 80 113C81 107 85 101 90 96Z"],
  yeux: ["M77 134C89 123 110 125 122 136C111 150 87 150 77 134Z", "M138 136C150 125 171 123 183 134C173 150 149 150 138 136Z"],
  joues: ["M74 157C85 149 106 153 113 166C111 181 95 185 81 176C77 171 74 165 74 157Z", "M147 166C154 153 175 149 186 157C186 165 183 171 179 176C165 185 149 181 147 166Z"],
  levres: ["M108 195C115 193 122 185 130 191C138 185 145 193 152 195C145 204 138 206 130 206C122 206 115 204 108 195Z"],
  menton: ["M112 215C121 210 139 210 148 215C146 223 137 228 130 228C123 228 114 223 112 215Z"],
};

const eyeMakeupPaths = {
  eyeshadow: [
    "M76 132C86 119 106 118 122 136C108 129 90 128 76 132Z",
    "M138 136C154 118 174 119 184 132C170 128 152 129 138 136Z",
  ],
  eyeliner: [
    "M74 127L82 134C92 129 108 129 119 136",
    "M141 136C152 129 168 129 178 134L186 127",
  ],
  mascara: [
    "M84 133L79 126M91 131L88 123M99 130L98 122M107 131L108 124",
    "M153 131L152 124M161 130L162 122M169 131L172 123M176 133L181 126",
  ],
};
const complexionPath = [...zonePaths.visage, ...zonePaths.yeux, ...zonePaths.levres].join(" ");

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
                        applicationsPerWeek: undefined,
                      });
                    }}>
                      {!products.some((product) => product.id === step.productId) && <option value={step.productId}>{t("Produit retiré du vanity", "Product removed from vanity")}</option>}
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand && ` · ${product.brand}`}</option>)}
                    </select>
                  </label>
                  <label>
                    {t("Zone d’application", "Application area")}
                    <select value={step.zone} onChange={(event) => updateStep(step.id, { zone: event.target.value as FaceZone })}>
                      {faceZones.map((zone) => <option key={zone} value={zone}>{t(...zones[zone])}</option>)}
                    </select>
                  </label>
                </div>
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

function FaceChart({ selected, layers, onSelect }: { selected: FaceZone; layers: PigmentLayer[]; onSelect: (zone: FaceZone) => void }) {
  const { t } = useLocale();
  const id = useId();

  function activate(event: KeyboardEvent<SVGGElement>, zone: FaceZone) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(zone);
  }

  function region(zone: FaceZone) {
    return (
      <g key={zone} className={styles.faceZone} data-active={zone === selected} data-zone={zone} role="button" tabIndex={0}
        aria-label={t(...zones[zone])} aria-pressed={zone === selected}
        onClick={() => onSelect(zone)} onKeyDown={(event) => activate(event, zone)}>
        {zonePaths[zone].map((path) => <path key={path} d={path} />)}
      </g>
    );
  }

  return (
    <svg className={styles.face} viewBox="0 0 260 302" role="group" aria-labelledby={id}>
      <title id={id}>{t("Carte interactive des zones du visage", "Interactive face chart")}</title>
      <defs>
        {layers.map((layer, index) => (
          <radialGradient key={layer.stepId} id={`${id}-pigment-${index}`}>
            <stop offset="15%" stopColor={layer.hex} stopOpacity={layer.opacity} />
            <stop offset="72%" stopColor={layer.hex} stopOpacity={layer.opacity * 0.72} />
            <stop offset="100%" stopColor={layer.hex} stopOpacity={layer.opacity * 0.08} />
          </radialGradient>
        ))}
      </defs>
      <path d="M87 205C88 236 85 252 60 263L19 285H241L200 263C175 252 172 236 173 205" className={styles.silhouette} />
      <path d="M68 139C51 126 49 150 56 165C58 170 63 173 68 172M192 139C209 126 211 150 204 165C202 170 197 173 192 172" className={styles.silhouette} />
      <path d={zonePaths.visage[0]} className={styles.silhouette} />
      <path d={zonePaths.cheveux[0]} className={styles.hair} />
      <g className={styles.pigments} aria-hidden="true">
        {layers.map((layer, index) => {
          const { kind, zone, opacity, hex, stepId } = layer;
          const paths = kind === "eyeliner" || kind === "mascara" || kind === "eyeshadow"
            ? eyeMakeupPaths[kind]
            : zone === "visage" ? [complexionPath] : zonePaths[zone];
          const isLine = kind === "eyeliner" || kind === "mascara";
          const isSoft = kind === "blush" || kind === "bronzer" || kind === "highlighter";
          const fill = isSoft ? `url(#${id}-pigment-${index})` : hex;
          return (
            <g key={stepId} data-pigment={kind} data-zone={zone}>
              {paths.map((path) => (
                <path key={path} d={path} opacity={isSoft ? 1 : opacity}
                  fill={isLine ? "none" : fill} fillRule={zone === "visage" ? "evenodd" : undefined}
                  stroke={isLine ? hex : "none"} strokeWidth={kind === "eyeliner" ? 3 : 2} />
              ))}
            </g>
          );
        })}
      </g>
      <g className={styles.faceDetails} aria-hidden="true">
        <path d="M61 99C73 62 110 43 145 45M163 46C188 55 203 75 210 103M42 180C41 193 42 208 47 217M218 179C220 194 218 208 213 218" />
        <path d="M80 123C93 115 111 116 120 122M140 122C149 116 167 115 180 123" />
        <path d="M82 136C93 130 105 130 115 137M145 137C155 130 167 130 178 136" />
        <circle cx="99" cy="137" r="3" />
        <circle cx="161" cy="137" r="3" />
        <path d="M129 143C128 155 120 165 124 172C128 176 135 174 137 171M107 195C119 198 129 194 130 196C131 194 141 198 153 195" />
        <path d="M96 254C108 260 119 263 130 263C141 263 152 260 164 254" />
      </g>
      {region("visage")}
      {region("cheveux")}
      {faceZones.filter((zone) => zone !== "visage" && zone !== "cheveux").map(region)}
    </svg>
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
        {layers.map(({ stepId, name, hex, productName, zone }) => (
          <li key={stepId}>
            <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><circle cx={8} cy={8} r={6} fill={hex} /></svg>
            <span>{productName} · {t(...zones[zone])} · {name}</span>
          </li>
        ))}
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
            <span className={styles.zonePill}>{t(...zones[step.zone])}</span>
          </div>
          <progress className={styles.progress} value={index + 1} max={routine.steps.length} aria-label={t("Progression de la routine", "Routine progress")} />
          <div className={styles.stepDetails} aria-live="polite" aria-atomic="true">
            {product?.brand && <p className={styles.productBrand}>{product.brand}</p>}
            <h2>{product?.name ?? t("Produit retiré du vanity", "Product removed from vanity")}</h2>
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
          <FaceChart selected={selectedZone} layers={layers} onSelect={setZone} />
          <p className={styles.chartSelection} aria-live="polite">{t(...zones[selectedZone])}</p>
          <p className={styles.chartHint} aria-live="polite">
            {preview.effect === "tinted" ? `${t(...zones[step.zone])} · ${preview.name}` : t(...previewMessages[preview.effect])}
          </p>
          <div className={styles.zoneControls} aria-label={t("Zones d’application", "Application areas")} role="group">
            {faceZones.map((item) => <button type="button" key={item} aria-pressed={item === selectedZone} onClick={() => setZone(item)}>{t(...zones[item])}</button>)}
          </div>
          <MakeupLegend layers={layers} />
        </div>
      </div>
    </section>
  );
}
