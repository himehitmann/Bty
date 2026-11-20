"use client";

import {
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
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { analyzeRoutine } from "@/lib/analysis";
import { emptyState, type FaceZone, type Preferences, type Product, type Routine, type RoutineStep } from "@/lib/model";
import styles from "./routines.module.css";

const periods = {
  matin: { label: "Matin", icon: Sun },
  soir: { label: "Soir", icon: Moon },
  libre: { label: "À tout moment", icon: Clock3 },
} satisfies Record<Routine["period"], { label: string; icon: typeof Sun }>;

const zones = {
  visage: "Visage",
  front: "Front",
  joues: "Joues",
  yeux: "Yeux",
  levres: "Lèvres",
  menton: "Menton",
  cheveux: "Cheveux",
} satisfies Record<FaceZone, string>;

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

interface RoutinesProps {
  products: Product[];
  routines: Routine[];
  preferences?: Preferences;
  onChange: (routines: Routine[]) => void;
  onComplete?: (routine: Routine) => void;
  startRoutineId?: string;
  onStartGuide?: (id: string) => void;
  onExitGuide?: () => void;
}

export function Routines({ products, routines, preferences = emptyState.preferences, onChange, onComplete, startRoutineId, onStartGuide, onExitGuide }: RoutinesProps) {
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
    onChange(existing ? routines.map((item) => item.id === routine.id ? routine : item) : [...routines, routine]);
    setDraft(null);
  }

  if (activeRoutine?.steps.length) {
    return <RoutineGuide key={activeRoutine.id} routine={activeRoutine} products={products} preferences={preferences} onExit={leaveGuide} onComplete={onComplete} />;
  }

  if (draft) {
    return <RoutineEditor initial={draft} products={products} preferences={preferences} onSave={saveRoutine} onCancel={() => setDraft(null)} />;
  }

  return (
    <section className={styles.page} aria-labelledby="routines-title">
      <div className={styles.heading}>
        <div>
          <h1 id="routines-title" className={styles.title}>Mes routines</h1>
          <p className={styles.subtitle}>Organise tes gestes et retrouve leur ordre au quotidien.</p>
        </div>
        <button type="button" className="button button-primary" disabled={routines.length >= 100} onClick={() => {
          setDraft({ id: crypto.randomUUID(), name: "", period: "libre", steps: [] });
        }}>
          <Plus size={18} aria-hidden="true" /> Créer une routine
        </button>
      </div>
      {routines.length >= 100 && <p className={styles.formHint}>Ton espace peut contenir jusqu’à 100 routines.</p>}

      {routines.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Layers3 aria-hidden="true" size={24} /></div>
          <h2>Ton premier rituel</h2>
          <p>{products.length ? "Choisis les produits à utiliser et place-les dans l’ordre qui te convient." : "Ajoute des produits à ton vanity pour pouvoir les utiliser dans une routine."}</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {routines.map((routine) => {
            const { label, icon: PeriodIcon } = periods[routine.period];
            return (
              <li className={styles.card} key={routine.id}>
                <div className={styles.cardHeader}>
                  <div className={styles.periodIcon} data-period={routine.period}><PeriodIcon size={22} aria-hidden="true" /></div>
                  <span className={styles.periodLabel}>{label}</span>
                </div>
                <h2>{routine.name}</h2>
                <p className={styles.stepCount}>{routine.steps.length} étape{routine.steps.length > 1 ? "s" : ""}</p>
                {routine.steps.length > 0 && (
                  <ol className={styles.previewSteps}>
                    {routine.steps.slice(0, 3).map((step) => (
                      <li key={step.id}>{products.find((product) => product.id === step.productId)?.name ?? "Produit retiré du vanity"}</li>
                    ))}
                  </ol>
                )}
                {pendingDelete === routine.id ? (
                  <div className={styles.confirm}>
                    <p>Supprimer cette routine ?</p>
                    <div className={styles.actions}>
                      <button type="button" className="button button-secondary" onClick={() => setPendingDelete(null)}>Annuler</button>
                      <button type="button" className={`${styles.danger} button button-secondary`} onClick={() => {
                        onChange(routines.filter((item) => item.id !== routine.id));
                        setPendingDelete(null);
                      }}>Supprimer</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    <button type="button" className="button button-primary" disabled={routine.steps.length === 0} onClick={() => {
                      if (onStartGuide) onStartGuide(routine.id);
                      else setGuideId(routine.id);
                    }}><Play size={16} aria-hidden="true" /> Lancer</button>
                    <button type="button" className={styles.iconButton} aria-label={`Modifier ${routine.name}`} onClick={() => setDraft(routine)}><Pencil size={18} aria-hidden="true" /></button>
                    <button type="button" className={styles.iconButton} aria-label={`Supprimer ${routine.name}`} onClick={() => setPendingDelete(routine.id)}><Trash2 size={18} aria-hidden="true" /></button>
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

function RoutineEditor({ initial, products, preferences, onSave, onCancel }: {
  initial: Routine;
  products: Product[];
  preferences: Preferences;
  onSave: (routine: Routine) => void;
  onCancel: () => void;
}) {
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
        zone: firstProduct.category === "cheveux" ? "cheveux" : "visage",
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
          <h1 id={`${id}-title`} ref={heading} tabIndex={-1} className={styles.title}>{initial.name ? "Modifier la routine" : "Nouvelle routine"}</h1>
          <p className={styles.subtitle}>Compose ton rituel avec les produits de ton vanity.</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onCancel}><X size={18} aria-hidden="true" /> Annuler</button>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fields}>
          <label>
            Nom de la routine
            <input required maxLength={140} value={routine.name} onChange={(event) => setRoutine({ ...routine, name: event.target.value })} placeholder="Ex. Mon rituel du soir" />
          </label>
          <label>
            Moment
            <select value={routine.period} onChange={(event) => setRoutine({ ...routine, period: event.target.value as Routine["period"] })}>
              {Object.entries(periods).map(([value, period]) => <option key={value} value={value}>{period.label}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.editorHeading}>
          <h2>Étapes</h2>
          <button type="button" className="button button-secondary" onClick={addStep} disabled={products.length === 0 || routine.steps.length >= 40}><Plus size={17} aria-hidden="true" /> Ajouter une étape</button>
        </div>
        {!routine.steps.length && <p className={styles.formHint}>{products.length ? "Ajoute une étape pour commencer." : "Ajoute d’abord un produit à ton vanity."}</p>}
        <ol className={styles.editorSteps}>
          {routine.steps.map((step, index) => (
            <li key={step.id} className={styles.editorStep}>
              <div className={styles.editorStepHeader}>
                <strong>Étape {index + 1}</strong>
                <div className={styles.actions}>
                  <button type="button" className={styles.iconButton} disabled={index === 0} onClick={() => moveStep(index, -1)} aria-label={`Monter l’étape ${index + 1}`}><ArrowUp size={17} aria-hidden="true" /></button>
                  <button type="button" className={styles.iconButton} disabled={index === routine.steps.length - 1} onClick={() => moveStep(index, 1)} aria-label={`Descendre l’étape ${index + 1}`}><ArrowDown size={17} aria-hidden="true" /></button>
                  <button type="button" className={styles.iconButton} onClick={() => setRoutine((current) => ({ ...current, steps: current.steps.filter((item) => item.id !== step.id) }))} aria-label={`Retirer l’étape ${index + 1}`}><Trash2 size={17} aria-hidden="true" /></button>
                </div>
              </div>
              <div className={styles.fields}>
                <label>
                  Produit
                  <select value={step.productId} onChange={(event) => {
                    const product = products.find((item) => item.id === event.target.value);
                    if (!product) return;
                    updateStep(step.id, {
                      productId: product.id,
                      zone: product.category === "cheveux" ? "cheveux" : step.zone === "cheveux" ? "visage" : step.zone,
                    });
                  }}>
                    {!products.some((product) => product.id === step.productId) && <option value={step.productId}>Produit retiré du vanity</option>}
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.brand && ` · ${product.brand}`}</option>)}
                  </select>
                </label>
                <label>
                  Zone d’application
                  <select value={step.zone} onChange={(event) => updateStep(step.id, { zone: event.target.value as FaceZone })}>
                    {faceZones.map((zone) => <option key={zone} value={zone}>{zones[zone]}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Consigne <span className={styles.optional}>(facultative)</span>
                <textarea rows={2} maxLength={800} value={step.note} onChange={(event) => updateStep(step.id, { note: event.target.value })} placeholder="Ex. Appliquer en fine couche." />
              </label>
            </li>
          ))}
        </ol>
        <Vigilance notes={analyzeRoutine(routine, products, preferences)} />
        <div className={styles.formActions}>
          <button type="button" className="button button-secondary" onClick={onCancel}>Annuler</button>
          <button type="submit" className="button button-primary" disabled={!routine.name.trim()}><Check size={18} aria-hidden="true" /> Enregistrer</button>
        </div>
      </form>
    </section>
  );
}

function Vigilance({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <details className={styles.watch}>
      <summary>Points de vigilance ({notes.length})</summary>
      <ul>{notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul>
      <p>Ces repères reposent sur les listes INCI disponibles et les préférences de ton profil.</p>
    </details>
  );
}

function FaceChart({ selected, onSelect }: { selected: FaceZone; onSelect: (zone: FaceZone) => void }) {
  const id = useId();

  function activate(event: KeyboardEvent<SVGGElement>, zone: FaceZone) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(zone);
  }

  function region(zone: FaceZone) {
    return (
      <g key={zone} className={styles.faceZone} data-active={zone === selected} data-zone={zone} role="button" tabIndex={0}
        aria-label={zones[zone]} aria-pressed={zone === selected}
        onClick={() => onSelect(zone)} onKeyDown={(event) => activate(event, zone)}>
        {zonePaths[zone].map((path) => <path key={path} d={path} />)}
      </g>
    );
  }

  return (
    <svg className={styles.face} viewBox="0 0 260 302" role="group" aria-labelledby={id}>
      <title id={id}>Carte interactive des zones du visage</title>
      <path d="M87 205C88 236 85 252 60 263L19 285H241L200 263C175 252 172 236 173 205" className={styles.silhouette} />
      <path d="M68 139C51 126 49 150 56 165C58 170 63 173 68 172M192 139C209 126 211 150 204 165C202 170 197 173 192 172" className={styles.silhouette} />
      {region("visage")}
      {region("cheveux")}
      {faceZones.filter((zone) => zone !== "visage" && zone !== "cheveux").map(region)}
      <g className={styles.faceDetails} aria-hidden="true">
        <path d="M61 99C73 62 110 43 145 45M163 46C188 55 203 75 210 103M42 180C41 193 42 208 47 217M218 179C220 194 218 208 213 218" />
        <path d="M80 123C93 115 111 116 120 122M140 122C149 116 167 115 180 123" />
        <path d="M82 136C93 130 105 130 115 137M145 137C155 130 167 130 178 136" />
        <circle cx="99" cy="137" r="3" />
        <circle cx="161" cy="137" r="3" />
        <path d="M129 143C128 155 120 165 124 172C128 176 135 174 137 171M107 195C119 198 129 194 130 196C131 194 141 198 153 195" />
        <path d="M96 254C108 260 119 263 130 263C141 263 152 260 164 254" />
      </g>
    </svg>
  );
}

function RoutineGuide({ routine, products, preferences, onExit, onComplete }: {
  routine: Routine;
  products: Product[];
  preferences: Preferences;
  onExit: () => void;
  onComplete?: (routine: Routine) => void;
}) {
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [zone, setZone] = useState<FaceZone | null>(null);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = routine.steps[index];
  const last = index === routine.steps.length - 1;
  const selectedZone = zone ?? step?.zone ?? "visage";
  const product = products.find((item) => item.id === step?.productId);

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
        <h1 id="routine-complete-title" ref={heading} tabIndex={-1} className={styles.title}>Routine terminée</h1>
        <p role="status">Tu as suivi toutes les étapes de « {routine.name} ».</p>
        <button type="button" className="button button-primary" onClick={onExit}>Revenir aux routines</button>
      </section>
    );
  }

  if (!step) return null;

  return (
    <section className={styles.page} aria-labelledby="routine-guide-title">
      <button type="button" className={`${styles.backButton} button button-secondary`} onClick={onExit}><ChevronLeft size={17} aria-hidden="true" /> Mes routines</button>
      <div className={styles.heading}>
        <div>
          <h1 id="routine-guide-title" ref={heading} tabIndex={-1} className={styles.title}>{routine.name}</h1>
          <p className={styles.subtitle}>Applique tes produits à ton rythme.</p>
        </div>
      </div>
      <Vigilance notes={analyzeRoutine(routine, products, preferences)} />
      <div className={styles.guide}>
        <div className={styles.guidePanel}>
          <div className={styles.progressText}>
            <span>Étape {index + 1} sur {routine.steps.length}</span>
            <span className={styles.zonePill}>{zones[step.zone]}</span>
          </div>
          <progress className={styles.progress} value={index + 1} max={routine.steps.length} aria-label="Progression de la routine" />
          <div className={styles.stepDetails} aria-live="polite" aria-atomic="true">
            {product?.brand && <p className={styles.productBrand}>{product.brand}</p>}
            <h2>{product?.name ?? "Produit retiré du vanity"}</h2>
            <p>{step.note || (product ? "Suis les consignes d’application inscrites sur le produit." : "Tu peux passer à l’étape suivante ou mettre à jour ta routine.")}</p>
          </div>
          <ol className={styles.guideSteps} aria-label="Étapes de la routine">
            {routine.steps.map((item, itemIndex) => (
              <li key={item.id}>
                <button type="button" disabled={itemIndex > furthest} aria-current={itemIndex === index ? "step" : undefined} onClick={() => goTo(itemIndex)}>
                  <span className={styles.guideStepNumber}>{itemIndex + 1}</span>
                  {products.find((candidate) => candidate.id === item.productId)?.name ?? "Produit retiré"}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.guideActions}>
            <button type="button" className="button button-secondary" disabled={index === 0} onClick={() => goTo(index - 1)}><ChevronLeft size={17} aria-hidden="true" /> Précédente</button>
            <button type="button" className="button button-primary" onClick={() => {
              if (!last) {
                goTo(index + 1);
                return;
              }
              onComplete?.(routine);
              setFinished(true);
            }}>{last ? <Check size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}{last ? "Terminer" : "Suivante"}</button>
          </div>
        </div>
        <div className={styles.chartPanel}>
          <div className={styles.chartTitle}><Sparkles size={17} aria-hidden="true" /> Face Chart</div>
          <FaceChart selected={selectedZone} onSelect={setZone} />
          <p className={styles.chartSelection} aria-live="polite">{zones[selectedZone]}</p>
          <div className={styles.zoneControls} aria-label="Zones d’application" role="group">
            {faceZones.map((item) => <button type="button" key={item} aria-pressed={item === selectedZone} onClick={() => setZone(item)}>{zones[item]}</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
