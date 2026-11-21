"use client";

import { useEffect, useId, useState } from "react";
import { analyzeProduct } from "@/lib/analysis";
import { useLocale } from "@/lib/i18n";
import { skinConcerns, skinFeels, undertones, type Preferences, type Product, type Routine } from "@/lib/model";
import styles from "./beauty-profile.module.css";

const feels = { seche: ["Tiraille facilement", "Often feels tight"], brillante: ["Brille facilement", "Often looks shiny"], mixte: ["Variable selon les zones", "Varies by area"], equilibree: ["Plutôt stable", "Usually feels balanced"], incertaine: ["Je ne sais pas", "I’m not sure"] } as const;
const concerns = { tiraillements: ["Tiraillements", "Tightness"], brillance: ["Brillance", "Shine"], rougeurs: ["Rougeurs", "Redness"], imperfections: ["Imperfections", "Blemishes"], texture: ["Texture irrégulière", "Uneven texture"] } as const;
const tones = { froid: ["Froid", "Cool"], chaud: ["Chaud", "Warm"], neutre: ["Neutre", "Neutral"], olive: ["Olive", "Olive"], incertain: ["À explorer", "Not sure yet"] } as const;

export function ProfileCheckbox({ name, value, checked, label }: {
  name: string; value?: string; checked?: boolean; label: string;
}) {
  return <label className="check-field">
    <span className={styles.checkbox}>
      <input type="checkbox" name={name} value={value} defaultChecked={checked}/>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <polyline points="5.5,10.5 8.5,13.5 14.5,6.5" pathLength="1"/>
      </svg>
    </span>
    <span>{label}</span>
  </label>;
}

export function ProfileFields({ preferences }: { preferences: Preferences }) {
  const { t } = useLocale();
  return <>
    <label>{t("Comment ta peau se sent habituellement", "How your skin usually feels")}
      <select key={preferences.skinFeel ?? ""} name="skinFeel" defaultValue={preferences.skinFeel ?? ""}>
        <option value="">{t("Non renseigné", "Not specified")}</option>
        {skinFeels.map((value) => <option key={value} value={value}>{t(feels[value][0], feels[value][1])}</option>)}
      </select>
    </label>
    <fieldset className="profile-checklist" key={[...(preferences.skinConcerns ?? [])].sort().join(",")}>
      <legend>{t("Ce que tu observes sur ta peau", "What you notice about your skin")}</legend>
      {skinConcerns.map((value) => <ProfileCheckbox key={value} name="skinConcerns" value={value}
        checked={preferences.skinConcerns?.includes(value)} label={t(concerns[value][0], concerns[value][1])}/>)}
    </fieldset>
    <label>{t("Sous-ton de teint, selon ton observation", "Undertone, based on what you notice")}
      <select key={preferences.undertone ?? ""} name="undertone" defaultValue={preferences.undertone ?? ""}>
        <option value="">{t("Non renseigné", "Not specified")}</option>
        {undertones.map((value) => <option key={value} value={value}>{t(tones[value][0], tones[value][1])}</option>)}
      </select>
    </label>
    <details className="profile-help">
      <summary>{t("Comment comparer deux sous-tons", "How to compare two undertones")}</summary>
      <p>{t("En lumière du jour indirecte, compare deux échantillons de profondeur proche sur la mâchoire. Laisse-les se poser selon la notice et regarde la transition avec le cou. Essaie une référence neutre en cas de doute. Une photo, les veines ou les bijoux donnent des indices variables.", "In indirect daylight, compare two shades of a similar depth on your jawline. Let them settle as directed and look at the transition to your neck. Try a neutral shade if you’re unsure. Photos, veins and jewellery can give variable clues.")}</p>
    </details>
  </>;
}

const searchable = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");
const spfPattern = /\b(?:spf|fps)(?:\b|\d)/;
const sunscreenPattern = /\b(?:solaire|sunscreen|sunblock|sun protection|protector solar|proteccion solar|protezione solare|crema solare)\b/;
const afterSunPattern = /\b(?:apres[- ]+solaire|apres[- ]+soleil|after[- ]*sun|doposole)\b/;

const steps = [
  {
    id: "cleanse", label: ["Nettoyer", "Cleanse"],
    verify: ["L’emballage indique que ce produit nettoie le visage.", "The label says this product cleanses the face."],
    note: ["Utilise-le en premier si ce nettoyage fait partie de ta routine. Suis la notice pour le rinçage.", "Use it first if cleansing is part of your routine. Follow the label’s rinsing instructions."],
  },
  {
    id: "moisturise", label: ["Hydrater", "Moisturise"],
    verify: ["L’emballage indique que ce produit hydrate le visage.", "The label says this product moisturises the face."],
    note: ["Utilise après le nettoyage selon la notice.", "Apply after cleansing as directed on the label."],
  },
  {
    id: "protect", label: ["Protéger du soleil le matin", "Apply sun protection in the morning"],
    verify: ["L’emballage indique une protection solaire pour le visage.", "The label specifies sun protection for the face."],
    note: ["Suis la notice pour la quantité et la fréquence de réapplication. Utilise-le en dernière étape de soin avant le maquillage.", "Follow the label for how much to use and when to reapply. Make it the final skincare step before makeup."],
  },
] as const;

type StepKind = (typeof steps)[number]["id"];
type Period = "matin" | "soir";
type Choices = Partial<Record<StepKind, { id: string; confirmed: boolean }>>;

function guessRole(product: Product): StepKind | undefined {
  const name = searchable(product.name);
  if (spfPattern.test(name) || (sunscreenPattern.test(name) && !afterSunPattern.test(name))) return "protect";
  if (/nettoy|cleanser|face wash|limpiador|detergente/.test(name)) return "cleanse";
  if (/hydrat|hidrat|idrat|moisturi/.test(name)) return "moisturise";
}

export function RoutineCoach({ preferences, products, onCreate, openRequest = 0 }: {
  preferences: Preferences; products: Product[]; onCreate: (routine: Routine) => boolean; openRequest?: number;
}) {
  const { t, locale } = useLocale();
  const id = useId();
  const [period, setPeriod] = useState<Period>("matin");
  const [picked, setPicked] = useState<Record<Period, Choices>>({ matin: {}, soir: {} });
  const [show, setShow] = useState(openRequest > 0);
  useEffect(() => { if (openRequest > 0) setShow(true); }, [openRequest]);

  const discomfort = preferences.skinFeel === "seche" || preferences.skinConcerns?.includes("tiraillements");
  const shine = preferences.skinFeel === "brillante" || preferences.skinConcerns?.includes("brillance");
  const focus = preferences.routineFocus ?? (discomfort ? "comfort" : shine ? "shine" : "simple");
  const focusReactive = preferences.sensitive || preferences.skinConcerns?.includes("rougeurs");
  const priority = focusReactive ? undefined : focus === "comfort" ? "moisturise" : focus === "shine" ? "cleanse" : undefined;
  const skincare = products.filter(({ category }) => category === "soin").map((product) => ({ product, role: guessRole(product) }));
  const periodPicks = picked[period];
  const selections = steps.filter((step) => period === "matin" || step.id !== "protect").map((step) => {
    const usedElsewhere = new Set(Object.entries(periodPicks).flatMap(([kind, choice]) => choice && kind !== step.id ? [choice.id] : []));
    const options = skincare.filter(({ product, role }) => !usedElsewhere.has(product.id) && (step.id === "protect" || role !== "protect"));
    const choice = periodPicks[step.id];
    const selection = options.find(({ product }) => product.id === choice?.id);
    const needsConfirmation = Boolean(selection && selection.role !== step.id);
    return { ...step, likely: options.filter(({ role }) => role === step.id), other: options.filter(({ role }) => role !== step.id),
      product: selection?.product, needsConfirmation, confirmed: !needsConfirmation || choice?.confirmed === true };
  });
  const selectionCount = selections.filter(({ product, confirmed }) => product && confirmed).length;
  const waitingForConfirmation = selections.some(({ confirmed }) => !confirmed);

  function pick(kind: StepKind, productId: string, confirmed = false) {
    setPicked((current) => ({ ...current, [period]: {
      ...current[period], [kind]: productId ? { id: productId, confirmed } : undefined,
    } }));
  }

  function create() {
    if (waitingForConfirmation) return;
    const selectedSteps = selections.flatMap(({ product, note }) => product
      ? [{ id: crypto.randomUUID(), productId: product.id, zone: "visage" as const, note: t(note[0], note[1]) }] : []);
    if (selectedSteps.length) onCreate({
      id: crypto.randomUUID(),
      name: period === "matin" ? t("Ma routine du matin", "My morning beauty routine") : t("Ma routine du soir", "My evening beauty routine"),
      period, steps: selectedSteps,
    });
  }
  return <section className="dashboard-card profile-coach" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{t("Préparer une routine avec mes produits", "Build a routine from my collection")}</h2>
    <p>{focusReactive ? t("Si ta peau réagit facilement, garde les gestes que tu connais et observe un changement à la fois.", "If your skin reacts easily, stick to familiar steps and observe one change at a time.")
      : focus === "comfort" ? t("Pour le confort, commence par repérer un hydratant que tu connais et suis sa notice.", "For comfort, start with a familiar moisturiser and follow its label.")
      : focus === "shine" ? t("Pour observer la brillance, garde un nettoyage doux que tu connais et note quand elle apparaît.", "To track shine, stick to a gentle cleanser you know and note when shine appears.")
      : t("Pour une routine simple, garde les étapes que tu souhaites suivre et laisse les autres vides.", "For a simple routine, keep the steps you want to follow and leave the rest blank.")}</p>
    <p className="muted">{t("Un nom reconnaissable donne une piste. Pour les autres produits, confirme leur usage sur l’emballage. Tu peux laisser des étapes vides.", "Recognisable names give a starting point. For other products, confirm their purpose on the packaging. You can leave steps blank.")}</p>
    <button type="button" className="button button-secondary" aria-expanded={show} aria-controls={show ? `${id}-choices` : undefined}
      onClick={() => setShow(!show)}>{show ? t("Replier les suggestions", "Hide suggestions") : t("Choisir une trame de routine", "Choose a routine outline")}</button>
    {show && <div className="stacked-form" id={`${id}-choices`}>
      <label>{t("Moment de la routine", "Routine time")}
        <select value={period} onChange={(event) => setPeriod(event.target.value === "soir" ? "soir" : "matin")}>
          <option value="matin">{t("Matin", "Morning")}</option>
          <option value="soir">{t("Soir", "Evening")}</option>
        </select>
      </label>
      {selections.map(({ id: kind, label, verify, likely, other, product, needsConfirmation, confirmed }) => <div key={kind}>
        <label htmlFor={`${id}-${kind}`}>
          {t(label[0], label[1])}
          <select id={`${id}-${kind}`} value={product?.id ?? ""} onChange={(event) => pick(kind, event.currentTarget.value)}
            disabled={!likely.length && !other.length} aria-describedby={priority === kind ? `${id}-priority` : undefined}>
            <option value="">{likely.length || other.length ? t("Choisir dans ma trousse", "Choose from my collection") : t("Aucun produit disponible pour cette étape", "No products available for this step")}</option>
            {likely.length > 0 && <optgroup label={t("Repérés par leur nom", "Suggested by name")}>
              {likely.map(({ product: item }) => <option key={item.id} value={item.id}>{item.name}{item.brand && ` · ${item.brand}`}</option>)}
            </optgroup>}
            {other.length > 0 && <optgroup label={t("Après vérification de l’emballage", "After checking the label")}>
              {other.map(({ product: item }) => <option key={item.id} value={item.id}>{item.name}{item.brand && ` · ${item.brand}`}</option>)}
            </optgroup>}
          </select>
        </label>
        {priority === kind && <p className="muted" id={`${id}-priority`}>{preferences.routineFocus
          ? t("Point de départ d’après ton quiz", "Starting point from your quiz")
          : t("Point de départ d’après ton profil", "Starting point from your profile")}</p>}
        {product && needsConfirmation && <label className="check-field">
          <input type="checkbox" checked={confirmed} onChange={(event) => pick(kind, product.id, event.currentTarget.checked)}/>{t(verify[0], verify[1])}
        </label>}
        {product && analyzeProduct(product, preferences, locale).map((note) => <p className="muted" key={note}>{note}</p>)}
      </div>)}
      {waitingForConfirmation && <p role="status" className="muted">{t("Confirme l’usage sur l’emballage ou retire le produit sélectionné.", "Confirm the product’s purpose on the label or clear the selection.")}</p>}
      <p className="muted">{t("N’ajoute pas un exfoliant ou un rétinoïde sur la seule base d’une observation de peau. Vérifie la notice de chaque produit avant de les superposer.", "Check each product’s directions before layering. An observation alone cannot establish whether an exfoliant or retinoid suits your routine.")}</p>
      <p><a className="text-button" href="https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget"
        target="_blank" rel="noreferrer">{t("Routine de base recommandée par l’AAD", "Basic routine guidance from the AAD")}</a></p>
      <button className="button button-primary" type="button" disabled={!selectionCount || waitingForConfirmation} onClick={create}>{t("Créer la routine", "Create routine")} ({selectionCount})</button>
    </div>}
  </section>;
}
