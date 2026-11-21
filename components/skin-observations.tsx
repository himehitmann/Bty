"use client";

import { ArrowRight, Check, ClipboardList } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { preferenceSchema, routineFocusOptions, skinConcerns, skinFeels, type Preferences } from "@/lib/model";
import { routineFocusLabels } from "@/lib/skin-observations";
import styles from "./skin-observations.module.css";

const observationSchema = preferenceSchema.pick({ skinFeel: true, skinConcerns: true, routineFocus: true, sensitive: true }).partial();
type Observations = ReturnType<typeof observationSchema.parse>;
type Feel = NonNullable<Preferences["skinFeel"]>;
type Concern = (typeof skinConcerns)[number];
type Focus = NonNullable<Preferences["routineFocus"]>;
type Step = "feel" | "concerns" | "reactions" | "focus" | "review" | "saved";

const questions = ["feel", "concerns", "reactions", "focus"] as const;
const feelLabels = {
  seche: ["Elle tiraille facilement", "It often feels tight"],
  brillante: ["Elle brille facilement", "It often looks shiny"],
  mixte: ["Ça varie selon les zones", "It varies by area"],
  equilibree: ["Elle reste plutôt stable", "It usually feels balanced"],
  incertaine: ["Je ne sais pas encore", "I’m still unsure"],
} satisfies Record<Feel, [string, string]>;
const concernLabels = {
  tiraillements: ["Tiraillements", "Tightness"],
  brillance: ["Brillance", "Shine"],
  rougeurs: ["Rougeurs", "Redness"],
  imperfections: ["Imperfections", "Blemishes"],
  texture: ["Texture irrégulière", "Uneven texture"],
} satisfies Record<Concern, [string, string]>;

export function SkinObservations({ preferences, onSave, onOpenRoutine }: {
  preferences: Preferences;
  onSave: (observations: Observations) => boolean;
  onOpenRoutine: () => void;
}) {
  const { t, formatNumber } = useLocale();
  const id = useId();
  const [step, setStep] = useState<Step>();
  const [feel, setFeel] = useState<Feel>();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [reactivity, setReactivity] = useState<"keep" | "yes" | "no">("keep");
  const [focus, setFocus] = useState<Focus>();
  const [failed, setFailed] = useState(false);
  const initial = useRef<Observations>({});
  const title = useRef<HTMLHeadingElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (step) title.current?.focus(); }, [step]);

  function start() {
    initial.current = {
      skinFeel: preferences.skinFeel, skinConcerns: preferences.skinConcerns,
      sensitive: preferences.sensitive, routineFocus: preferences.routineFocus,
    };
    setFeel(preferences.skinFeel);
    setConcerns(preferences.skinConcerns ?? []);
    setReactivity(preferences.sensitive ? "yes" : "keep");
    setFocus(preferences.routineFocus);
    setFailed(false);
    setStep("feel");
  }

  function close() {
    setStep(undefined);
    requestAnimationFrame(() => startButton.current?.focus());
  }

  const nextObservations: Observations = {};
  if (feel !== initial.current.skinFeel) nextObservations.skinFeel = feel;
  if (concerns.length !== (initial.current.skinConcerns?.length ?? 0) ||
    concerns.some((value) => !initial.current.skinConcerns?.includes(value))) nextObservations.skinConcerns = concerns;
  if (reactivity !== "keep" && (reactivity === "yes") !== initial.current.sensitive) nextObservations.sensitive = reactivity === "yes";
  if (focus !== initial.current.routineFocus) nextObservations.routineFocus = focus;
  const changed = Object.keys(nextObservations).length > 0;

  function save() {
    const valid = observationSchema.safeParse(nextObservations);
    if (!valid.success || !onSave(valid.data)) { setFailed(true); return; }
    setFailed(false);
    setStep("saved");
  }

  const questionIndex = questions.findIndex((question) => question === step);
  const heading = {
    feel: t("Comment se sent ta peau au quotidien ?", "How does your skin usually feel?"),
    concerns: t("Qu’est-ce que tu observes en ce moment ?", "What are you noticing lately?"),
    reactions: t("Ta peau réagit-elle facilement après un soin ?", "Does your skin react easily after using a product?"),
    focus: t("Quelle priorité donner à ta routine ?", "What would you like to prioritise in your routine?"),
    review: t("Tes observations", "Your observations"),
    saved: t("Observations enregistrées", "Observations saved"),
  };
  const unordered = t("Non renseigné", "Not specified");

  return <section className={styles.panel} aria-labelledby={`${id}-title`}>
    {!step ? <div className={styles.intro}>
      <div className={styles.introTitle}>
        <span className={styles.introIcon}><ClipboardList size={21} strokeWidth={1.7} aria-hidden="true"/></span>
        <div><h2 id={`${id}-title`}>{t("Mes observations de peau", "My skin observations")}</h2>
          <p>{t("Fais le point sur ton ressenti pour préparer une routine avec ta trousse.", "Reflect on how your skin feels and plan a routine with your collection.")}</p>
        </div>
      </div>
      <button ref={startButton} type="button" className="button button-secondary" onClick={start}>
        {t("Faire le point sur ma peau", "Check in on my skin")}<ArrowRight size={17} aria-hidden="true"/>
      </button>
    </div> : <>
      {questionIndex >= 0 && <p className={styles.progress}>
        {t(`Question ${formatNumber(questionIndex + 1)} sur ${formatNumber(questions.length)}`,
          `Question ${formatNumber(questionIndex + 1)} of ${formatNumber(questions.length)}`)}
      </p>}
      <h2 id={`${id}-title`} ref={title} tabIndex={-1}>{step === "saved" && <Check size={21} aria-hidden="true"/>}{heading[step]}</h2>
      {step === "feel" && <fieldset className={styles.choices} aria-labelledby={`${id}-title`}>
        <legend className="sr-only">{heading.feel}</legend>
        {skinFeels.map((value) => <label key={value}>
          <input type="radio" name={`${id}-feel`} checked={feel === value} onChange={() => setFeel(value)}/>
          <span>{t(...feelLabels[value])}</span>
        </label>)}
        <label><input type="radio" name={`${id}-feel`} checked={!feel} onChange={() => setFeel(undefined)}/>
          <span>{t("Laisser sans réponse", "Leave unanswered")}</span></label>
      </fieldset>}
      {step === "concerns" && <>
        <p className="muted">{t("Tu peux cocher plusieurs réponses.", "You can choose more than one.")}</p>
        <fieldset className={styles.choices} aria-labelledby={`${id}-title`}>
          <legend className="sr-only">{heading.concerns}</legend>
          {skinConcerns.map((value) => <label key={value}>
            <input type="checkbox" checked={concerns.includes(value)} onChange={(event) => {
              const checked = event.currentTarget.checked;
              setConcerns((current) => checked ? [...current, value] : current.filter((item) => item !== value));
            }}/><span>{t(...concernLabels[value])}</span>
          </label>)}
        </fieldset>
      </>}
      {step === "reactions" && <fieldset className={styles.choices} aria-labelledby={`${id}-title`}>
        <legend className="sr-only">{heading.reactions}</legend>
        <label><input type="radio" name={`${id}-reactivity`} checked={reactivity === "yes"} onChange={() => setReactivity("yes")}/>
          <span>{t("Oui, j’observe parfois de l’inconfort", "Yes, I sometimes notice discomfort")}</span></label>
        <label><input type="radio" name={`${id}-reactivity`} checked={reactivity === "no"} onChange={() => setReactivity("no")}/>
          <span>{t("Pas que j’aie remarqué", "Not that I’ve noticed")}</span></label>
        <label><input type="radio" name={`${id}-reactivity`} checked={reactivity === "keep"} onChange={() => setReactivity("keep")}/>
          <span>{t("Garder mon réglage actuel", "Keep my current setting")}</span></label>
      </fieldset>}
      {step === "focus" && <fieldset className={styles.choices} aria-labelledby={`${id}-title`}>
        <legend className="sr-only">{heading.focus}</legend>
        {routineFocusOptions.map((value) => <label key={value}>
          <input type="radio" name={`${id}-focus`} checked={focus === value} onChange={() => setFocus(value)}/>
          <span>{t(...routineFocusLabels[value])}</span>
        </label>)}
        <label><input type="radio" name={`${id}-focus`} checked={!focus} onChange={() => setFocus(undefined)}/>
          <span>{t("Aucune priorité", "No priority")}</span></label>
      </fieldset>}
      {step === "review" && <>
        <dl className={styles.review}>
          <div><dt>{t("Ressenti", "How it feels")}</dt><dd>{feel ? t(...feelLabels[feel]) : unordered}</dd></div>
          <div><dt>{t("Observations", "Observations")}</dt><dd>{concerns.length ? concerns.map((value) => t(...concernLabels[value])).join(", ") : unordered}</dd></div>
          <div><dt>{t("Réactivité", "Reactivity")}</dt><dd>{reactivity === "keep" ? t("Réglage actuel conservé", "Current setting kept")
            : reactivity === "yes" ? t("Inconfort observé", "Discomfort noticed") : t("Aucun inconfort remarqué", "No discomfort noticed")}</dd></div>
          <div><dt>{t("Priorité", "Priority")}</dt><dd>{focus ? t(...routineFocusLabels[focus]) : unordered}</dd></div>
        </dl>
        <p className="muted">{t("Ce récapitulatif reprend tes réponses. Tu peux les modifier à tout moment dans ton profil.", "This summary reflects your answers. You can change them in your profile at any time.")}</p>
        {failed && <p className="form-error" role="alert">{t("Les observations n’ont pas pu être enregistrées. Tu peux réessayer.", "Your observations couldn’t be saved. You can try again.")}</p>}
      </>}
      {step === "saved" && <p>{t("Utilise tes observations pour choisir une trame du matin ou du soir à partir des soins de ta trousse.",
        "Use your observations to build a morning or evening routine from your collection.")}</p>}
      <div className={styles.actions}>
        {(questionIndex > 0 || step === "review") && <button className="button button-secondary" type="button" onClick={() => {
          setFailed(false);
          setStep(step === "review" ? "focus" : questions[questionIndex - 1]);
        }}>{t("Précédent", "Previous")}</button>}
        {questionIndex >= 0 && <button type="button" className="button button-primary" onClick={() => setStep(questions[questionIndex + 1] ?? "review")}>
          {step === "focus" ? t("Vérifier mes réponses", "Review my answers") : t("Continuer", "Continue")}
        </button>}
        {step === "review" && changed && <button type="button" className="button button-primary" onClick={save}>{t("Enregistrer mes observations", "Save my observations")}</button>}
        {(step === "saved" || step === "review" && !changed) && <button type="button" className="button button-primary" onClick={() => {
          setStep(undefined);
          onOpenRoutine();
        }}>{t("Préparer ma routine", "Build my routine")}<ArrowRight size={17} aria-hidden="true"/></button>}
        <button type="button" className="text-button" onClick={close}>{step === "saved" ? t("Fermer", "Close") : t("Annuler", "Cancel")}</button>
      </div>
    </>}
  </section>;
}
