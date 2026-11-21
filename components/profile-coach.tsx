"use client";

import { useState } from "react";
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
      <select name="skinFeel" defaultValue={preferences.skinFeel ?? ""}>
        <option value="">{t("Non renseigné", "Not specified")}</option>
        {skinFeels.map((value) => <option key={value} value={value}>{t(feels[value][0], feels[value][1])}</option>)}
      </select>
    </label>
    <fieldset className="profile-checklist">
      <legend>{t("Ce que tu observes sur ta peau", "What you notice about your skin")}</legend>
      {skinConcerns.map((value) => <ProfileCheckbox key={value} name="skinConcerns" value={value}
        checked={preferences.skinConcerns?.includes(value)} label={t(concerns[value][0], concerns[value][1])}/>)}
    </fieldset>
    <label>{t("Sous-ton de teint, selon ton observation", "Undertone, based on what you notice")}
      <select name="undertone" defaultValue={preferences.undertone ?? ""}>
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

const steps = [
  { id: "cleanse", label: ["Nettoyer", "Cleanse"], match: /nettoy|cleanser/, note: ["Utilise-le en premier si ce nettoyage fait partie de ta routine. Suis la notice pour le rinçage.", "Use it first if cleansing is part of your routine. Follow the label’s rinsing instructions."] },
  { id: "moisturise", label: ["Hydrater", "Moisturise"], match: /hydrat|moisturi/, note: ["Utilise après le nettoyage selon la notice.", "Apply after cleansing as directed on the label."] },
  { id: "protect", label: ["Protéger du soleil le matin", "Apply sun protection in the morning"], match: /\bspf\b|\bfps\b|solaire|sunscreen/, note: ["Suis la notice pour la quantité et la fréquence de réapplication. Utilise-le en dernière étape de soin avant le maquillage.", "Follow the label for how much to use and when to reapply. Make it the final skincare step before makeup."] },
] as const;

export function RoutineCoach({ preferences, products, onCreate }: {
  preferences: Preferences; products: Product[]; onCreate: (routine: Routine) => boolean;
}) {
  const { t, locale } = useLocale();
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const focusComfort = preferences.skinFeel === "seche" || preferences.skinConcerns?.includes("tiraillements");
  const focusShine = preferences.skinFeel === "brillante" || preferences.skinConcerns?.includes("brillance");
  const focusReactive = preferences.sensitive || preferences.skinConcerns?.includes("rougeurs");
  const filtered = products.filter((product) => product.category === "soin");
  const selections = steps.map((step) => {
    const candidates = filtered.filter((product) => step.match.test(searchable(product.name)));
    const selection = picked[step.id] ?? "";
    return { ...step, candidates, product: candidates.find((item) => item.id === selection) };
  });
  const selectionCount = selections.filter(({ product }) => product).length;
  function create() {
    const selectedSteps = selections.flatMap(({ product, note }) => product
      ? [{ id: crypto.randomUUID(), productId: product.id, zone: "visage" as const, note: t(note[0], note[1]) }] : []);
    if (selectedSteps.length) onCreate({ id: crypto.randomUUID(), name: t("Ma routine du matin", "My morning beauty routine"), period: "matin", steps: selectedSteps });
  }
  return <section className="dashboard-card profile-coach" aria-labelledby="profile-coach-title">
    <h2 id="profile-coach-title">{t("Préparer une routine avec mes produits", "Build a routine from my collection")}</h2>
    <p>{focusReactive ? t("Si ta peau réagit facilement, garde les gestes que tu connais et observe un changement à la fois.", "If your skin reacts easily, stick to familiar steps and observe one change at a time.")
      : focusComfort ? t("Si tu observes des tiraillements, commence par repérer un hydratant dont tu connais déjà la façon de l’utiliser.", "If your skin feels tight, start by picking a moisturiser you already know how to use.")
      : focusShine ? t("Si la brillance te gêne, observe quand elle apparaît avant de multiplier les étapes.", "If shine bothers you, note when it appears before adding more steps.")
      : t("Commence par quelques gestes que tu peux reconnaître sur tes produits.", "Start with a few steps you can identify from your product labels.")}</p>
    <p className="muted">{t("Les suggestions se basent sur les noms des produits que tu possèdes. Confirme leur rôle sur l’emballage. Renseigne la fréquence dans ta routine à partir de la notice ou de tes habitudes.", "Suggestions are based on the names of products you own. Confirm their purpose on the packaging and set a frequency using the label or your usual routine.")}</p>
    <button type="button" className="button button-secondary" aria-expanded={show} onClick={() => setShow(!show)}>{show ? t("Replier les suggestions", "Hide suggestions") : t("Voir une trame du matin", "See a morning routine outline")}</button>
    {show && <div className="stacked-form">
      {selections.map(({ id, label, candidates, product }) => <div key={id}>
        <label>{t(label[0], label[1])}
          <select value={picked[id] ?? ""} onChange={(event) => setPicked((current) => ({ ...current, [id]: event.target.value }))} disabled={!candidates.length}>
            <option value="">{candidates.length ? t("Choisir dans ma trousse", "Choose from my collection") : t("Aucun produit identifié", "No matching products")}</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {product && analyzeProduct(product, preferences, locale).map((note) => <p className="muted" key={note}>{note}</p>)}
      </div>)}
      <p className="muted">{t("N’ajoute pas un exfoliant ou un rétinoïde sur la seule base d’une observation de peau. Vérifie la notice de chaque produit avant de les superposer.", "Check each product’s directions before layering. An observation alone cannot establish whether an exfoliant or retinoid suits your routine.")}</p>
      <button className="button button-primary" type="button" disabled={!selectionCount} onClick={create}>{t("Créer la routine", "Create routine")} ({selectionCount})</button>
    </div>}
  </section>;
}
