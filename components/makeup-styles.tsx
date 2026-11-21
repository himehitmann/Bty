"use client";

import { ExternalLink } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { useLocale, type Locale } from "@/lib/i18n";
import { guidePortraits, makeupGuideStyles, makeMakeupStyleExample, type GuideCopy, type MakeupGuideStyle, type MakeupStyleCategory, type MakeupStylePreset } from "@/lib/makeup-styles";
import type { StudioLookSnapshot } from "@/lib/studio-looks";
import { FaceChart } from "./face-chart";
import styles from "./makeup-styles.module.css";

export type { MakeupStylePreset } from "@/lib/makeup-styles";

const localeIndices: Record<Locale, number> = { fr: 0, en: 1, es: 2, it: 3 };
const filters = [
  { id: "all", label: ["Tous", "All", "Todos", "Tutti"] },
  { id: "everyday", label: ["Quotidien", "Everyday", "Diario", "Quotidiano"] },
  { id: "evening", label: ["Soirée", "Evening", "Noche", "Serata"] },
  { id: "creative", label: ["Créatif", "Creative", "Creativo", "Creativo"] },
] as const satisfies ReadonlyArray<{ id: "all" | MakeupStyleCategory; label: GuideCopy }>;

function GuideCard({ style, portrait, language, onTry }: {
  style: MakeupGuideStyle;
  portrait: StudioLookSnapshot["portrait"];
  language: number;
  onTry?: (preset: MakeupStylePreset) => void;
}) {
  const id = useId();
  const { preset, pigments } = makeMakeupStyleExample(style, portrait, language);
  const faceStyle = {
    "--face-skin": portrait.skinTone,
    "--face-hair": portrait.hair,
    "--face-iris": portrait.iris,
  } as CSSProperties;

  return (
    <article className={styles.card} aria-labelledby={id}>
      <div className={styles.illustration} style={{ "--look-backdrop": style.backdrop } as CSSProperties}>
        <div className={styles.portrait} aria-hidden="true">
          <FaceChart selected="visage" availableZones={[]} onSelect={() => {}} layers={pigments}
            style={faceStyle} showHair={portrait.showHair} className={styles.chart}/>
        </div>
        <ul className={styles.swatches}
          aria-label={["Teintes de l’exemple", "Example shades", "Tonos del ejemplo", "Tonalità dell’esempio"][language]}>
          {style.layers.map(({ tool, hex, name: shade }) => (
            <li key={tool}>
              <span className={styles.swatch} style={{ backgroundColor: hex }} aria-hidden="true"/>
              {shade[language]}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.details}>
        <h2 id={id}>{preset.name}</h2>
        <p>{style.description[language]}</p>
        <details>
          <summary>{["Gestes et source", "Steps and source", "Pasos y fuente", "Passaggi e fonte"][language]}</summary>
          <ol>{style.steps.map((step) => <li key={step[1]}>{step[language]}</li>)}</ol>
          <p>
            {["Pour aller plus loin", "Further reading", "Para saber más", "Per approfondire"][language]}{" "}
            <a href={style.source.url} target="_blank" rel="noreferrer">
              {style.source.publication} <ExternalLink size={13} aria-hidden="true"/>
            </a>
          </p>
        </details>
        {onTry && (
          <button type="button" className="button button-secondary" onClick={() => onTry(preset)}>
            {["Essayer ce look dans le Studio", "Try this look in Studio", "Probar este look en el estudio", "Prova questo look nello studio"][language]}
          </button>
        )}
      </div>
    </article>
  );
}

export function MakeupStyles({ onTry }: { onTry?: (preset: MakeupStylePreset) => void }) {
  const { locale } = useLocale();
  const language = localeIndices[locale];
  const [category, setCategory] = useState<(typeof filters)[number]["id"]>("all");
  const [referenceTone, setReferenceTone] = useState("varied");
  const toneSelect = useId();
  const titleId = useId();
  const selectedPortrait = guidePortraits.find(({ portrait }) => portrait.skinTone === referenceTone)?.portrait;

  return (
    <section className={styles.guide} aria-labelledby={titleId}>
      <header className={styles.heading}>
        <h1 id={titleId}>{["Styles de maquillage", "Makeup styles", "Estilos de maquillaje", "Stili di trucco"][language]}</h1>
        <p>{[
          "Compare les placements et les teintes. Chaque exemple se décline sur la carnation de ton choix.",
          "Compare placements and shades. Preview any example on your choice of skin tone.",
          "Compara dónde se aplican los tonos. Prueba cualquier ejemplo en el tono de piel que elijas.",
          "Confronta le zone di applicazione e le tonalità. Prova ogni esempio sul tono di pelle che preferisci.",
        ][language]}</p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={["Filtrer les styles", "Filter styles", "Filtrar estilos", "Filtra gli stili"][language]}>
          {filters.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label[language]}</button>
          ))}
        </div>

        <div className={styles.tone}>
          <label htmlFor={toneSelect}>{["Carnation des exemples", "Preview skin tone", "Tono de piel de los ejemplos", "Tono di pelle degli esempi"][language]}</label>
          <select id={toneSelect} value={referenceTone} onChange={(event) => setReferenceTone(event.target.value)}>
            <option value="varied">{["Carnations variées", "Varied tones", "Tonos variados", "Carnagioni diverse"][language]}</option>
            {guidePortraits.map(({ label, portrait }) => <option key={portrait.skinTone} value={portrait.skinTone}>{label[language]}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        {makeupGuideStyles.map((style, index) => {
          if (category !== "all" && style.category !== category) return null;
          const reference = guidePortraits[index % guidePortraits.length].portrait;
          const portrait = selectedPortrait ? { ...reference, skinTone: selectedPortrait.skinTone } : reference;
          return <GuideCard key={style.id} style={style} portrait={portrait} language={language} onTry={onTry}/>;
        })}
      </div>
    </section>
  );
}
