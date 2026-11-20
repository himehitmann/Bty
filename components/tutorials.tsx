"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, CirclePlus, Moon, Sparkles, Sun, Waves } from "lucide-react";
import type { FaceZone, Product, Routine } from "@/lib/model";
import styles from "./tutorials.module.css";

type TutorialStep = {
  id: string;
  title: string;
  category: Product["category"];
  zone: FaceZone;
  match: RegExp;
  note: string;
};

type Tutorial = {
  id: string;
  title: string;
  description: string;
  period: Routine["period"];
  theme: "peach" | "rose" | "lilac" | "sage";
  Icon: typeof Sun;
  steps: TutorialStep[];
};

const tutorials: Tutorial[] = [
  {
    id: "morning",
    title: "L’essentiel du matin",
    description: "Hydrater et finir par la protection solaire.",
    period: "matin",
    theme: "peach",
    Icon: Sun,
    steps: [
      {
        id: "hydrate",
        title: "Hydratant",
        category: "soin",
        zone: "visage",
        match: /\b(hydratant\w*|moisturi[sz]\w*|water cream|moisture cream)\b/,
        note: "Applique l’hydratant sur le visage en suivant les indications du produit.",
      },
      {
        id: "sunscreen",
        title: "Protection solaire",
        category: "soin",
        zone: "visage",
        match: /\b(spf\s*\d*|fps\s*\d*|solaire|sunscreen|sun cream|sun stick|sun fluid)\b/,
        note: "Applique la protection solaire en dernière étape de soin. Respecte les quantités et la fréquence indiquées sur l’emballage.",
      },
    ],
  },
  {
    id: "makeup",
    title: "Un teint frais",
    description: "Unifier le teint, rosir les joues et ajouter une touche de couleur.",
    period: "libre",
    theme: "rose",
    Icon: Sparkles,
    steps: [
      {
        id: "base",
        title: "Base de teint",
        category: "maquillage",
        zone: "visage",
        match: /\b(fond de teint|foundation|skin tint|tinted moisturiser|tinted moisturizer|bb cream|bb creme|cc cream|cc creme|serum teinte)\b/,
        note: "Dépose une fine couche sur les zones à unifier, puis estompe vers l’extérieur du visage.",
      },
      {
        id: "blush",
        title: "Blush",
        category: "maquillage",
        zone: "joues",
        match: /\b(blush|fard a joues|cheek tint)\b/,
        note: "Dépose une petite quantité sur les pommettes et estompe par touches légères.",
      },
      {
        id: "lips",
        title: "Couleur pour les lèvres",
        category: "maquillage",
        zone: "levres",
        match: /\b(rouge a levres|baume teinte|lipstick|lip tint|lip gloss|gloss|lip oil|huile a levres)\b/,
        note: "Applique la couleur au centre des lèvres puis répartis-la vers les coins.",
      },
    ],
  },
  {
    id: "evening",
    title: "Le rituel du soir",
    description: "Retirer le maquillage, nettoyer la peau et terminer par l’hydratation.",
    period: "soir",
    theme: "lilac",
    Icon: Moon,
    steps: [
      {
        id: "remove",
        title: "Démaquillant",
        category: "soin",
        zone: "visage",
        match: /\b(demaquillant\w*|micellaire|micellar|makeup remover|cleansing oil|cleansing balm)\b/,
        note: "Retire le maquillage selon le mode d’emploi. Utilise le produit autour des yeux uniquement si l’étiquette le prévoit.",
      },
      {
        id: "cleanse",
        title: "Nettoyant visage",
        category: "soin",
        zone: "visage",
        match: /\b(nettoyant\w*|cleanser|face wash|gel lavant|cleansing gel|cleansing foam)\b/,
        note: "Utilise le nettoyant comme indiqué, puis rince s’il est prévu pour être rincé.",
      },
      {
        id: "hydrate",
        title: "Hydratant",
        category: "soin",
        zone: "visage",
        match: /\b(hydratant\w*|moisturi[sz]\w*|night cream|creme de nuit)\b/,
        note: "Termine par ton hydratant habituel sur le visage.",
      },
    ],
  },
  {
    id: "hair",
    title: "Le soin des longueurs",
    description: "Organiser le lavage et les soins de tes cheveux.",
    period: "libre",
    theme: "sage",
    Icon: Waves,
    steps: [
      {
        id: "shampoo",
        title: "Shampooing",
        category: "cheveux",
        zone: "cheveux",
        match: /\b(shamp(?:oo|ooing|oing))\b/,
        note: "Applique le shampooing selon les indications du produit, puis rince.",
      },
      {
        id: "condition",
        title: "Après-shampooing ou masque",
        category: "cheveux",
        zone: "cheveux",
        match: /\b(apres shamp(?:oo|ooing|oing)|conditioner|masque|mask)\b/,
        note: "Répartis le soin sur les zones indiquées sur l’étiquette. Respecte le temps de pose et les consignes de rinçage.",
      },
      {
        id: "finish",
        title: "Soin sans rinçage",
        category: "cheveux",
        zone: "cheveux",
        match: /\b(sans rincage|leave in|hair oil|huile capillaire|serum capillaire)\b/,
        note: "Applique le soin sans rinçage sur les longueurs, sur cheveux humides ou secs selon les indications du produit.",
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
  const name = normalizeName(product.name);
  if (product.category !== step.category || !step.match.test(name)) return false;

  if (step.id === "hydrate") return !/\b(spf\d*|fps\d*|solaire|sunscreen|serum|nettoyant|cleanser|body|corps)\b/.test(name);
  if (step.id === "cleanse") return !/\b(demaquillant\w*|micellaire|micellar|oil cleanser|balm cleanser)\b/.test(name);
  if (step.id === "shampoo") return !/\b(apres|dry|sec)\b/.test(name);
  if (step.id === "condition") return !/\b(leave in|sans rincage)\b/.test(name);

  return true;
}

type TutorialCardProps = {
  tutorial: Tutorial;
  products: Product[];
  onCreateRoutine: (routine: Routine) => boolean;
};

function TutorialCard({ tutorial, products, onCreateRoutine }: TutorialCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const panelId = useId();
  const sortedProducts = [...products].sort((first, second) =>
    first.name.localeCompare(second.name, "fr") || first.id.localeCompare(second.id),
  );

  // Reserve explicit choices before matching the remaining steps in tutorial order.
  const usedIds = new Set(Object.values(selections).filter(Boolean));
  const selectedSteps = tutorial.steps.map((step) => {
    const chosenId = selections[step.id];
    const available = sortedProducts.filter((product) => product.category === step.category);
    const chosen = chosenId === ""
      ? undefined
      : available.find((product) => product.id === chosenId)
        ?? available.find((product) => !usedIds.has(product.id) && matchesProduct(step, product));
    if (chosen) usedIds.add(chosen.id);

    return { step, available, chosen };
  });
  const selectedCount = selectedSteps.filter(({ chosen }) => chosen).length;
  const Icon = tutorial.Icon;

  function createRoutine() {
    const steps = selectedSteps.flatMap(({ step, chosen }) => chosen ? [{
      id: crypto.randomUUID(),
      productId: chosen.id,
      zone: step.zone,
      note: step.note,
    }] : []);

    if (!steps.length) return;

    const createdRoutine = onCreateRoutine({
      id: crypto.randomUUID(),
      name: tutorial.title,
      period: tutorial.period,
      steps,
    });
    if (createdRoutine) setCreated(true);
  }

  return (
    <article className={styles.card} data-theme={tutorial.theme} aria-labelledby={`${panelId}-title`}>
      <div className={styles.cardTop}>
        <span className={styles.icon}><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span>
        <p className={styles.stepCount}>{tutorial.steps.length} étapes</p>
      </div>
      <h2 id={`${panelId}-title`}>{tutorial.title}</h2>
      <p className={styles.description}>{tutorial.description}</p>
      <div className={styles.cardAction}>
        <span className={styles.matchCount}>{selectedCount} étape{selectedCount > 1 ? "s" : ""} avec ton vanity</span>
        <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Replier" : "Adapter"}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div id={panelId} hidden={!expanded} className={styles.panel}>
        <p className={styles.help}>
          La suggestion se base sur le nom du produit. Tu peux choisir un autre produit de la même catégorie si son usage correspond.
        </p>
        <ol className={styles.steps}>
          {selectedSteps.map(({ step, available, chosen }) => {
            const assignedElsewhere = new Set(selectedSteps
              .filter((other) => other.step.id !== step.id)
              .map((other) => other.chosen?.id));
            const options = available.filter((product) => !assignedElsewhere.has(product.id));

            return (
              <li className={styles.step} key={step.id}>
                <label className={styles.stepTitle} htmlFor={`${panelId}-${step.id}`}>{step.title}</label>
                <p className={styles.stepNote} id={`${panelId}-${step.id}-note`}>{step.note}</p>
                <div className={styles.select}>
                  <select
                    id={`${panelId}-${step.id}`}
                    aria-describedby={`${panelId}-${step.id}-note`}
                    value={chosen?.id ?? ""}
                    disabled={!options.length}
                    onChange={(event) => {
                      const choice = event.target.value;
                      setSelections((current) => ({ ...current, [step.id]: choice }));
                      setCreated(false);
                    }}
                  >
                    <option value="">{options.length ? "Aucun produit sélectionné" : "Aucun produit disponible"}</option>
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
        </ol>
        <button className="button button-primary" type="button" disabled={selectedCount === 0 || created} onClick={createRoutine}>
          {created ? <Check size={17} aria-hidden="true" /> : <CirclePlus size={17} aria-hidden="true" />}
          {created ? "Routine créée" : `Créer ma routine (${selectedCount})`}
        </button>
        <p className={styles.status} role="status">
          {created ? "Routine ajoutée à Mes routines." : selectedCount < tutorial.steps.length ? "La routine inclura les étapes avec un produit sélectionné." : ""}
        </p>
      </div>
    </article>
  );
}

export function Tutorials({ products, onCreateRoutine }: {
  products: Product[];
  onCreateRoutine: (routine: Routine) => boolean;
}) {
  const heading = useId();

  return (
    <section className={styles.section} aria-labelledby={heading}>
      <div className={styles.intro}>
        <h1 id={heading}>Tutoriels</h1>
        <p>Choisis un tutoriel, puis adapte chaque étape aux produits de ton vanity.</p>
      </div>
      <div className={styles.grid}>
        {tutorials.map((tutorial) => (
          <TutorialCard key={tutorial.id} tutorial={tutorial} products={products} onCreateRoutine={onCreateRoutine} />
        ))}
      </div>
    </section>
  );
}
