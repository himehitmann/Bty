"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Brush, Check, ChevronDown, Droplet, ExternalLink, Moon, Plus, Sun } from "lucide-react";
import { makeupAppearance, type PigmentLayer } from "@/lib/face-makeup";
import { useLocale } from "@/lib/i18n";
import type { MakeupPlacement } from "@/lib/makeup-placements";
import type { MakeupStylePreset } from "@/lib/makeup-styles";
import type { FaceZone, Product, Routine } from "@/lib/model";
import { defaultStudioPortrait, type StudioLookSnapshot, type StudioPortrait } from "@/lib/studio-looks";
import { FaceChart } from "./face-chart";
import styles from "./tutorials.module.css";

type TutorialCopy = [string, string];
const makeupAreas = { foundation: "visage", blush: "joues", lip: "levres" } as const;
type StarterMakeup = { kind: keyof typeof makeupAreas; placement?: MakeupPlacement };

type TutorialStep = {
  id: string;
  title: TutorialCopy;
  category: Product["category"];
  zone: FaceZone;
  match: RegExp;
  note: TutorialCopy;
  makeup?: StarterMakeup;
};

type Tutorial = {
  id: string;
  title: TutorialCopy;
  description: TutorialCopy;
  period: Routine["period"];
  Icon: typeof Sun;
  steps: TutorialStep[];
};

const tutorials: Tutorial[] = [
  {
    id: "morning",
    title: ["L’essentiel du matin", "Morning essentials"],
    description: ["Hydrater et finir par la protection solaire.", "Moisturize and finish with sunscreen."],
    period: "matin",
    Icon: Sun,
    steps: [
      {
        id: "hydrate",
        title: ["Hydratant", "Moisturizer"],
        category: "soin",
        zone: "visage",
        match: /\b(hydratant\w*|moisturi[sz]\w*|water cream|moisture cream)\b/,
        note: ["Applique l’hydratant sur le visage en suivant les indications du produit.", "Apply moisturizer to your face as directed on the packaging."],
      },
      {
        id: "sunscreen",
        title: ["Protection solaire", "Sunscreen"],
        category: "soin",
        zone: "visage",
        match: /\b(spf\s*\d*|fps\s*\d*|solaire|sunscreen|sun cream|sun stick|sun fluid)\b/,
        note: ["Applique la protection solaire en dernière étape de soin. Respecte les quantités et la fréquence indiquées sur l’emballage.", "Apply sunscreen as the last skincare step. Follow the amount and frequency on the packaging."],
      },
    ],
  },
  {
    id: "makeup",
    title: ["Un teint frais", "A fresh complexion"],
    description: ["Unifier le teint, rosir les joues et ajouter une touche de couleur.", "Even out your complexion, add blush and finish with a touch of color."],
    period: "libre",
    Icon: Brush,
    steps: [
      {
        id: "base",
        title: ["Base de teint", "Base makeup"],
        category: "maquillage",
        zone: "visage",
        match: /\b(fond de teint|foundation|skin tint|tinted moisturiser|tinted moisturizer|bb cream|bb creme|cc cream|cc creme|serum teinte|base de maquillaje|fondotinta|crema colorata)\b/,
        note: ["Dépose une fine couche sur les zones à unifier, puis estompe vers l’extérieur du visage.", "Apply a thin layer where you want to even out your complexion, then blend outward."],
        makeup: { kind: "foundation" },
      },
      {
        id: "blush",
        title: ["Blush", "Blush"],
        category: "maquillage",
        zone: "joues",
        match: /\b(blush|fard a joues|cheek tint|colorete|rubor|fard per guance)\b/,
        note: ["Dépose un peu de blush sur le bombé des joues et estompe les bords par touches légères.", "Tap a little blush onto the apples of your cheeks and blend the edges gently."],
        makeup: { kind: "blush", placement: "blush-apples" },
      },
      {
        id: "lips",
        title: ["Couleur pour les lèvres", "Lip color"],
        category: "maquillage",
        zone: "levres",
        match: /\b(rouge a levres|baume teinte|lipstick|lip tint|lip gloss|gloss|lip oil|huile a levres|pintalabios|labial|rossetto|lucidalabbra|balsamo labbra)\b/,
        note: ["Applique la couleur au centre des lèvres puis répartis-la vers les coins.", "Apply color to the center of the lips and spread it toward the corners."],
        makeup: { kind: "lip" },
      },
    ],
  },
  {
    id: "evening",
    title: ["Le rituel du soir", "Evening routine"],
    description: ["Retirer le maquillage, nettoyer la peau et terminer par l’hydratation.", "Remove makeup, cleanse and finish with moisturizer."],
    period: "soir",
    Icon: Moon,
    steps: [
      {
        id: "remove",
        title: ["Démaquillant", "Makeup remover"],
        category: "soin",
        zone: "visage",
        match: /\b(demaquillant\w*|micellaire|micellar|makeup remover|cleansing oil|cleansing balm)\b/,
        note: ["Retire le maquillage selon le mode d’emploi. Utilise le produit autour des yeux uniquement si l’étiquette le prévoit.", "Remove makeup as directed. Use the product around your eyes only if the label says it is intended for that area."],
      },
      {
        id: "cleanse",
        title: ["Nettoyant visage", "Face cleanser"],
        category: "soin",
        zone: "visage",
        match: /\b(nettoyant\w*|cleanser|face wash|gel lavant|cleansing gel|cleansing foam)\b/,
        note: ["Utilise le nettoyant comme indiqué, puis rince s’il est prévu pour être rincé.", "Use the cleanser as directed and rinse if the label calls for it."],
      },
      {
        id: "hydrate",
        title: ["Hydratant", "Moisturizer"],
        category: "soin",
        zone: "visage",
        match: /\b(hydratant\w*|moisturi[sz]\w*|night cream|creme de nuit)\b/,
        note: ["Termine par ton hydratant habituel sur le visage.", "Finish by applying your usual face moisturizer."],
      },
    ],
  },
  {
    id: "hair",
    title: ["Le soin des longueurs", "Hair wash and care"],
    description: ["Organiser le lavage et les soins de tes cheveux.", "Arrange the steps for washing and conditioning your hair."],
    period: "libre",
    Icon: Droplet,
    steps: [
      {
        id: "shampoo",
        title: ["Shampooing", "Shampoo"],
        category: "cheveux",
        zone: "cheveux",
        match: /\b(shamp(?:oo|ooing|oing))\b/,
        note: ["Applique le shampooing selon les indications du produit, puis rince.", "Apply and rinse out the shampoo as directed."],
      },
      {
        id: "condition",
        title: ["Après-shampooing ou masque", "Conditioner or hair mask"],
        category: "cheveux",
        zone: "cheveux",
        match: /\b(apres shamp(?:oo|ooing|oing)|conditioner|masque|mask)\b/,
        note: ["Répartis le soin sur les zones indiquées sur l’étiquette. Respecte le temps de pose et les consignes de rinçage.", "Apply the product where the label directs and follow the timing and rinsing instructions."],
      },
      {
        id: "finish",
        title: ["Soin sans rinçage", "Leave-in treatment"],
        category: "cheveux",
        zone: "cheveux",
        match: /\b(sans rincage|leave in|hair oil|huile capillaire|serum capillaire)\b/,
        note: ["Applique le soin sans rinçage sur les longueurs, sur cheveux humides ou secs selon les indications du produit.", "Apply the leave-in treatment to the lengths of your hair, damp or dry as directed."],
      },
    ],
  },
];

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesProduct(step: TutorialStep, product: Product) {
  if (product.category !== step.category) return false;
  if (step.makeup && product.makeupKind && product.makeupKind !== "other") return product.makeupKind === step.makeup.kind;
  const name = normalizeName(product.name);
  if (!step.match.test(name)) return false;

  if (step.id === "hydrate") return !/\b(spf\d*|fps\d*|solaire|sunscreen|serum|nettoyant|cleanser|body|corps)\b/.test(name);
  if (step.id === "cleanse") return !/\b(demaquillant\w*|micellaire|micellar|oil cleanser|balm cleanser)\b/.test(name);
  if (step.id === "shampoo") return !/\b(apres|dry|sec)\b/.test(name);
  if (step.id === "condition") return !/\b(leave in|sans rincage)\b/.test(name);

  return true;
}

function starterLayers(selections: { step: TutorialStep; chosen?: Product }[]) {
  return selections.flatMap(({ step, chosen }) => {
    const kind = step.makeup?.kind;
    if (!kind || !chosen || chosen.makeupKind !== kind) return [];
    const variant = chosen.variants?.find(({ id }) => id === chosen.selectedVariantId);
    const appearance = makeupAppearance({ ...chosen, shadeHex: variant?.shadeHex ?? chosen.shadeHex }, {
      id: step.id, productId: chosen.id, zone: step.zone, note: "", placement: step.makeup?.placement,
    }, []);
    if (appearance.effect !== "tinted") return [];
    return [{
      product: chosen, area: makeupAreas[kind],
      approximate: variant?.shadeApproximate ?? Boolean(chosen.source === "manufacturer" && chosen.selectedVariantId && chosen.shadeHex),
      pigment: { ...appearance, kind, stepId: step.id, productName: chosen.name, zone: step.zone } satisfies PigmentLayer,
    }];
  });
}

type TutorialCardProps = {
  tutorial: Tutorial;
  products: Product[];
  onCreateRoutine: (routine: Routine) => boolean;
  portrait: StudioPortrait;
  onTryMakeup?: (preset: MakeupStylePreset) => void;
};

function TutorialCard({ tutorial, products, onCreateRoutine, portrait, onTryMakeup }: TutorialCardProps) {
  const { t, locale, formatNumber } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const guideTitle = useRef<HTMLHeadingElement>(null);
  const focusStep = useRef(false);
  const panelId = useId();
  const sortedProducts = [...products].sort((first, second) =>
    first.name.localeCompare(second.name, locale) || first.id.localeCompare(second.id),
  );

  // Reserve explicit choices before matching the remaining steps in tutorial order.
  const usedIds = new Set(Object.values(selections).filter(Boolean));
  const selectedSteps = tutorial.steps.map((step) => {
    const chosenId = selections[step.id];
    const available = sortedProducts.filter((product) => step.makeup ? matchesProduct(step, product) : product.category === step.category);
    const chosen = chosenId === ""
      ? undefined
      : available.find((product) => product.id === chosenId)
        ?? available.find((product) => !usedIds.has(product.id) && matchesProduct(step, product));
    if (chosen) usedIds.add(chosen.id);

    return { step, available, chosen };
  });
  const selectedCount = selectedSteps.filter(({ chosen }) => chosen).length;
  const Icon = tutorial.Icon;
  const isWalkthrough = tutorial.id === "makeup";
  const activeStep = isWalkthrough ? selectedSteps[walkthroughStep] : undefined;
  const reviewing = isWalkthrough && !activeStep;
  const visibleSteps = isWalkthrough ? activeStep ? [activeStep] : [] : selectedSteps;
  const pigments = isWalkthrough && expanded ? starterLayers(selectedSteps.slice(0, walkthroughStep + 1)) : [];

  useLayoutEffect(() => {
    if (focusStep.current) {
      focusStep.current = false;
      guideTitle.current?.focus();
    }
  }, [walkthroughStep]);

  function navigateStep(next: number) {
    focusStep.current = true;
    setWalkthroughStep(next);
  }

  function chooseProduct(step: TutorialStep, productId: string) {
    setSelections((current) => ({ ...current, [step.id]: productId }));
    setCreated(false);
  }

  function tryMakeup() {
    if (!onTryMakeup || !pigments.length) return;
    const snapshot: StudioLookSnapshot = { portrait, layers: {}, placements: {}, setting: null };
    for (const { area, pigment, product, approximate } of pigments) {
      const { kind, hex, opacity, placement } = pigment;
      snapshot.layers[area] = { ...snapshot.layers[area], [kind]: {
        name: product.name, hex, intensity: Math.round(opacity * 100), productId: product.id,
        variantId: product.selectedVariantId, approximate,
      } };
      if (placement) snapshot.placements[kind] = placement;
    }
    onTryMakeup({ name: t(...tutorial.title), snapshot, apply: "merge" });
  }

  function createRoutine() {
    const steps = selectedSteps.flatMap(({ step, chosen }) => chosen ? [{
      id: crypto.randomUUID(),
      productId: chosen.id,
      zone: step.zone,
      note: t(...step.note),
      placement: step.makeup?.placement,
    }] : []);

    if (!steps.length) return;

    const createdRoutine = onCreateRoutine({
      id: crypto.randomUUID(),
      name: t(...tutorial.title),
      period: tutorial.period,
      steps,
    });
    if (createdRoutine) setCreated(true);
  }

  return (
    <article className={styles.card} aria-labelledby={`${panelId}-title`}>
      <div className={styles.cardTop}>
        <Icon className={styles.icon} size={21} strokeWidth={1.7} aria-hidden="true" />
        <p className={styles.stepCount}>{tutorial.steps.length} {t("étapes", "steps")}</p>
      </div>
      <h2 id={`${panelId}-title`}>{t(...tutorial.title)}</h2>
      <p className={styles.description}>{t(...tutorial.description)}</p>
      <div className={styles.cardAction}>
        <span className={styles.matchCount}>{selectedCount === 1 ? t("1 étape avec ton vanity", "1 step with your products") : t(`${selectedCount} étapes avec ton vanity`, `${selectedCount} steps with your products`)}</span>
        <button type="button" className={`${styles.expand} button button-secondary`} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
          {expanded ? t("Replier", "Collapse") : t("Adapter", "Customize")}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div id={panelId} hidden={!expanded} className={styles.panel}>
        <p className={styles.help}>
          {isWalkthrough ? t("Choisis dans ta trousse ou passe les gestes que tu souhaites garder pour plus tard.", "Choose from your collection or skip any steps you want to try later.")
            : t("La suggestion se base sur le nom du produit. Tu peux choisir un autre produit de la même catégorie si son usage correspond.", "Suggestions are based on product names. You can choose another product in the category if it serves the same purpose.")}
        </p>
        {isWalkthrough && expanded && <div className={styles.walkthrough}>
          <h3 ref={guideTitle} tabIndex={-1}>{activeStep
            ? t(`Étape ${formatNumber(walkthroughStep + 1)} sur ${formatNumber(selectedSteps.length)}`, `Step ${formatNumber(walkthroughStep + 1)} of ${formatNumber(selectedSteps.length)}`)
            : t("Récapitulatif du look", "Look summary")}</h3>
          <div className={styles.preview} aria-hidden="true">
            <FaceChart selected={activeStep?.step.zone ?? "visage"} availableZones={[]} onSelect={() => {}}
              layers={pigments.map(({ pigment }) => pigment)} showHair={portrait.showHair}
              placementGuide={activeStep?.step.makeup?.placement}
              application={activeStep && !activeStep.step.makeup?.placement ? { kind: "makeup" } : undefined}
              style={{ "--face-skin": portrait.skinTone, "--face-iris": portrait.iris, "--face-hair": portrait.hair } as CSSProperties}/>
          </div>
          <p className={styles.help}>{activeStep ? t("Le tracé indique la zone à maquiller.", "The outline shows where to apply the makeup.")
            : t("L’aperçu reprend les teintes numériques renseignées dans ta trousse.", "The preview uses digital shades recorded in your collection.")}</p>
        </div>}
        {visibleSteps.length > 0 && <ol className={styles.steps} data-walkthrough={isWalkthrough}>
          {visibleSteps.map(({ step, available, chosen }) => {
            const assignedElsewhere = new Set(selectedSteps
              .filter((other) => other.step.id !== step.id)
              .map((other) => other.chosen?.id));
            const options = available.filter((product) => !assignedElsewhere.has(product.id));

            return (
              <li className={styles.step} key={step.id}>
                <label className={styles.stepTitle} htmlFor={`${panelId}-${step.id}`}>{t(...step.title)}</label>
                <p className={styles.stepNote} id={`${panelId}-${step.id}-note`}>{t(...step.note)}</p>
                <div className={styles.select}>
                  <select
                    id={`${panelId}-${step.id}`}
                    aria-describedby={`${panelId}-${step.id}-note`}
                    value={chosen?.id ?? ""}
                    disabled={!options.length}
                    onChange={(event) => chooseProduct(step, event.target.value)}
                  >
                    <option value="">{options.length ? t("Aucun produit sélectionné", "No product selected") : t("Aucun produit disponible", "No product available")}</option>
                    {options.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.brand ? `${product.name} · ${product.brand}` : product.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ol>}
        {reviewing && <ul className={styles.review}>
          {selectedSteps.map(({ step, chosen }) => <li key={step.id}>
            <strong>{t(...step.title)}</strong><span>{chosen?.name ?? t("Étape passée", "Step skipped")}</span>
          </li>)}
        </ul>}
        {isWalkthrough && <div className={styles.guideActions}>
          <button className="button button-secondary" type="button" disabled={walkthroughStep === 0} onClick={() => navigateStep(walkthroughStep - 1)}>
            <ArrowLeft size={16} aria-hidden="true"/>{t("Précédent", "Previous")}
          </button>
          {activeStep && <>
            <button className="button button-secondary" type="button" onClick={() => {
              chooseProduct(activeStep.step, "");
              navigateStep(walkthroughStep + 1);
            }}>{t("Passer cette étape", "Skip this step")}</button>
            <button className="button button-primary" type="button" onClick={() => navigateStep(walkthroughStep + 1)}>
              {walkthroughStep === selectedSteps.length - 1 ? t("Voir le récapitulatif", "Review the look") : t("Suivant", "Next")}<ArrowRight size={16} aria-hidden="true"/>
            </button>
          </>}
        </div>}
        {(!isWalkthrough || reviewing) && <>
          {reviewing && onTryMakeup && pigments.length > 0 && <p className={styles.help}>{t("Le Studio remplace uniquement les couches correspondant à ces teintes.", "Studio replaces only the layers that match these shades.")}</p>}
          <div className={styles.guideActions}>
            {reviewing && onTryMakeup && pigments.length > 0 && <button className="button button-secondary" type="button" onClick={tryMakeup}>
              <Brush size={17} aria-hidden="true"/>{t("Essayer mes teintes dans le Studio", "Try my shades in Studio")}
            </button>}
            <button className="button button-primary" type="button" disabled={selectedCount === 0 || created} onClick={createRoutine}>
              {created ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
              {created ? t("Routine créée", "Routine created") : t(`Créer ma routine (${selectedCount})`, `Create my routine (${selectedCount})`)}
            </button>
          </div>
          <p className={styles.status} role="status">
            {created ? t("Routine ajoutée à Mes routines.", "Added to My routines.") : selectedCount < tutorial.steps.length ? t("La routine inclura les étapes avec un produit sélectionné.", "Your routine will include the steps with a selected product.") : ""}
          </p>
          {reviewing && <a className={styles.source} href="https://rcsgd.sa.ucsb.edu/resources/lgbtqia-informational-resources/makeup-101" target="_blank" rel="noreferrer">
            {t("Les bases du maquillage · UC Santa Barbara", "Makeup basics · UC Santa Barbara")}<ExternalLink size={15} aria-hidden="true"/>
          </a>}
        </>}
      </div>
    </article>
  );
}

export function Tutorials({ products, onCreateRoutine, portrait = defaultStudioPortrait, onTryMakeup }: {
  products: Product[];
  onCreateRoutine: (routine: Routine) => boolean;
  portrait?: StudioPortrait;
  onTryMakeup?: (preset: MakeupStylePreset) => void;
}) {
  const { t } = useLocale();
  const heading = useId();

  return (
    <section className={styles.section} aria-labelledby={heading}>
      <div className={styles.intro}>
        <h1 id={heading}>{t("Tutoriels", "Tutorials")}</h1>
        <p>{t("Choisis un tutoriel, puis adapte chaque étape aux produits de ton vanity.", "Choose a tutorial and tailor each step to the products in your vanity.")}</p>
      </div>
      <div className={styles.grid}>
        {tutorials.map((tutorial) => (
          <TutorialCard key={tutorial.id} tutorial={tutorial} products={products} onCreateRoutine={onCreateRoutine} portrait={portrait} onTryMakeup={onTryMakeup}/>
        ))}
      </div>
    </section>
  );
}
