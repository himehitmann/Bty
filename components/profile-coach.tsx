"use client";

import { useState } from "react";
import { analyzeProduct } from "@/lib/analysis";
import { skinConcerns, skinFeels, undertones, type Preferences, type Product, type Routine } from "@/lib/model";

const feels = { seche: "Tiraille facilement", brillante: "Brille facilement", mixte: "Variable selon les zones", equilibree: "Plutôt stable", incertaine: "Je ne sais pas" };
const concerns = { tiraillements: "Tiraillements", brillance: "Brillance", rougeurs: "Rougeurs", imperfections: "Imperfections", texture: "Texture irrégulière" };
const tones = { froid: "Froid", chaud: "Chaud", neutre: "Neutre", olive: "Olive", incertain: "À explorer" };

export function ProfileFields({ preferences }: { preferences: Preferences }) {
  return <>
    <label>Comment ta peau se sent habituellement
      <select name="skinFeel" defaultValue={preferences.skinFeel ?? ""}>
        <option value="">Non renseigné</option>
        {skinFeels.map((value) => <option key={value} value={value}>{feels[value]}</option>)}
      </select>
    </label>
    <fieldset className="profile-checklist">
      <legend>Ce que tu observes sur ta peau</legend>
      {skinConcerns.map((value) => <label className="check-field" key={value}>
        <input type="checkbox" name="skinConcerns" value={value} defaultChecked={preferences.skinConcerns?.includes(value)}/><span>{concerns[value]}</span>
      </label>)}
    </fieldset>
    <label>Sous-ton de teint, selon ton observation
      <select name="undertone" defaultValue={preferences.undertone ?? ""}>
        <option value="">Non renseigné</option>
        {undertones.map((value) => <option key={value} value={value}>{tones[value]}</option>)}
      </select>
    </label>
    <details className="profile-help">
      <summary>Comment comparer deux sous-tons</summary>
      <p>En lumière du jour indirecte, compare deux échantillons de profondeur proche sur la mâchoire. Laisse-les se poser selon la notice et regarde la transition avec le cou. Essaie une référence neutre en cas de doute. Une photo, les veines ou les bijoux donnent des indices variables.</p>
    </details>
  </>;
}

const searchable = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");

const steps = [
  { label: "Nettoyer", match: /nettoy|cleanser/, note: "Utilise-le en premier si ce nettoyage fait partie de ta routine. Suis la notice pour le rinçage." },
  { label: "Hydrater", match: /hydrat|moisturi/, note: "Utilise après le nettoyage selon la notice." },
  { label: "Protéger du soleil le matin", match: /\bspf\b|\bfps\b|solaire|sunscreen/, note: "Suis la notice pour la quantité et la fréquence de réapplication. Utilise-le en dernière étape de soin avant le maquillage." },
] as const;

export function RoutineCoach({ preferences, products, onCreate }: {
  preferences: Preferences; products: Product[]; onCreate: (routine: Routine) => boolean;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const focusComfort = preferences.skinFeel === "seche" || preferences.skinConcerns?.includes("tiraillements");
  const focusShine = preferences.skinFeel === "brillante" || preferences.skinConcerns?.includes("brillance");
  const focusReactive = preferences.sensitive || preferences.skinConcerns?.includes("rougeurs");
  const filtered = products.filter((product) => product.category === "soin");
  const selections = steps.map((step) => {
    const candidates = filtered.filter((product) => step.match.test(searchable(product.name)));
    const selection = picked[step.label] ?? "";
    return { ...step, candidates, product: candidates.find((item) => item.id === selection) };
  });
  const selectionCount = selections.filter(({ product }) => product).length;
  function create() {
    const selectedSteps = selections.flatMap(({ product, note }) => product
      ? [{ id: crypto.randomUUID(), productId: product.id, zone: "visage" as const, note }] : []);
    if (selectedSteps.length) onCreate({ id: crypto.randomUUID(), name: "Mon matin avec mon vanity", period: "matin", steps: selectedSteps });
  }
  return <section className="dashboard-card profile-coach" aria-labelledby="profile-coach-title">
    <h2 id="profile-coach-title">Préparer une routine avec mon vanity</h2>
    <p>{focusReactive ? "Si ta peau réagit facilement, garde les gestes que tu connais et observe un changement à la fois."
      : focusComfort ? "Si tu observes des tiraillements, commence par repérer un hydratant dont tu connais déjà la façon de l’utiliser."
      : focusShine ? "Si la brillance te gêne, observe quand elle apparaît avant de multiplier les étapes."
      : "Commence par quelques gestes que tu peux reconnaître sur tes produits."}</p>
    <p className="muted">Les suggestions se basent sur les noms des produits que tu possèdes. Confirme leur rôle sur l’emballage. Renseigne la fréquence dans ta routine à partir de la notice ou de tes habitudes.</p>
    <button type="button" className="button button-secondary" aria-expanded={show} onClick={() => setShow(!show)}>{show ? "Replier les suggestions" : "Voir une trame du matin"}</button>
    {show && <div className="stacked-form">
      {selections.map(({ label, candidates, product }) => <div key={label}>
        <label>{label}
          <select value={picked[label] ?? ""} onChange={(event) => setPicked((current) => ({ ...current, [label]: event.target.value }))} disabled={!candidates.length}>
            <option value="">{candidates.length ? "Choisir dans mon vanity" : "Aucun produit identifié"}</option>
            {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {product && analyzeProduct(product, preferences).map((note) => <p className="muted" key={note}>{note}</p>)}
      </div>)}
      <p className="muted">N’ajoute pas un exfoliant ou un rétinoïde sur la seule base d’une observation de peau. Vérifie la notice de chaque produit avant de les superposer.</p>
      <button className="button button-primary" type="button" disabled={!selectionCount} onClick={create}>Créer la routine ({selectionCount})</button>
    </div>}
  </section>;
}
