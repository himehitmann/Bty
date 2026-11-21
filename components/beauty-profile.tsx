"use client";

import { Check, UserRound } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import { preferenceSchema, profileNameLimit, routineFocusOptions, type Preferences, type Product, type Routine } from "@/lib/model";
import { routineFocusLabels } from "@/lib/skin-observations";
import { defaultStudioPortrait, studioSkinTones, type StudioPortrait } from "@/lib/studio-looks";
import { portraitHeight } from "./face-chart-geometry";
import { FacePortrait } from "./face-chart-portrait";
import { ProfileCheckbox, ProfileFields, RoutineCoach } from "./profile-coach";
import { SkinObservations } from "./skin-observations";
import styles from "./beauty-profile.module.css";

const profileSchema = preferenceSchema.pick({
  displayName: true, studioPortrait: true, skinFeel: true, skinConcerns: true, undertone: true,
  fragranceFree: true, sensitive: true, avoid: true, routineFocus: true,
});

function PortraitFields({ value, onEdit }: { value?: StudioPortrait; onEdit: () => void }) {
  const { t, formatNumber } = useLocale();
  const id = useId();
  const [enabled, setEnabled] = useState(Boolean(value));
  const [portrait, setPortrait] = useState(value ?? defaultStudioPortrait);

  return <fieldset className={styles.group}>
    <legend>{t("Visage du Studio", "Studio portrait")}</legend>
    <label className="check-field">
      <input type="checkbox" name="useStudioPortrait" checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)}/>
      <span>{t("Personnaliser mon visage", "Customise my portrait")}</span>
    </label>
    {enabled && <div className={styles.portraitEditor}>
      <div className={styles.portraitFrame} aria-hidden="true">
        <svg viewBox={`0 0 320 ${portraitHeight}`} focusable="false">
          <FacePortrait id={id} skin={portrait.skinTone} iris={portrait.iris} hair={portrait.hair} hairVisible={portrait.showHair}>{null}</FacePortrait>
        </svg>
      </div>
      <div className={styles.portraitFields}>
        <fieldset className={styles.toneField}>
          <legend>{t("Carnation", "Skin tone")}</legend>
          <div className={styles.tones}>
            {studioSkinTones.map((tone, index) => {
              const number = formatNumber(index + 1);
              return <button type="button" key={tone} aria-pressed={portrait.skinTone === tone}
                aria-label={t(`Carnation ${number}`, `Skin tone ${number}`)}
                onClick={() => { setPortrait((current) => ({ ...current, skinTone: tone })); onEdit(); }}>
                <span style={{ backgroundColor: tone }}/>
              </button>;
            })}
          </div>
        </fieldset>
        <div className={styles.colours}>
          <label>{t("Carnation libre", "Custom skin tone")}
            <input name="studioSkin" type="color" value={portrait.skinTone} onChange={(event) => {
              const skinTone = event.currentTarget.value.toUpperCase();
              setPortrait((current) => ({ ...current, skinTone }));
            }}/>
          </label>
          <label>{t("Couleur des yeux", "Eye colour")}
            <input name="studioIris" type="color" value={portrait.iris} onChange={(event) => {
              const iris = event.currentTarget.value.toUpperCase();
              setPortrait((current) => ({ ...current, iris }));
            }}/>
          </label>
          <label>{t("Couleur des cheveux", "Hair colour")}
            <input name="studioHair" type="color" value={portrait.hair} onChange={(event) => {
              const hair = event.currentTarget.value.toUpperCase();
              setPortrait((current) => ({ ...current, hair }));
            }}/>
          </label>
        </div>
        <label className="check-field">
          <input name="studioShowHair" type="checkbox" checked={portrait.showHair} onChange={(event) => {
            const showHair = event.currentTarget.checked;
            setPortrait((current) => ({ ...current, showHair }));
          }}/>
          <span>{t("Afficher les cheveux", "Show hair")}</span>
        </label>
      </div>
    </div>}
    <p className="muted">{t("Ce visage sert de base aux nouveaux looks du Studio. Tu peux l’ajuster pour chaque look.", "New looks in the Studio start with this portrait. You can adjust it for each look.")}</p>
  </fieldset>;
}

export function BeautyProfile({ preferences, products, onSave, onCreate }: {
  preferences: Preferences;
  products: Product[];
  onSave: (profile: Partial<ReturnType<typeof profileSchema.parse>>) => boolean;
  onCreate: (routine: Routine) => boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  const [notice, setNotice] = useState<"saved" | "invalid" | "failed">();
  const [routineRequest, setRoutineRequest] = useState(0);
  const coach = useRef<HTMLDivElement>(null);
  const profile = profileSchema.parse(preferences);
  const initials = profile.displayName?.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const studioPortrait = values.has("useStudioPortrait") ? {
      skinTone: String(values.get("studioSkin")).toUpperCase(),
      iris: String(values.get("studioIris")).toUpperCase(),
      hair: String(values.get("studioHair")).toUpperCase(),
      showHair: values.has("studioShowHair"),
    } : undefined;
    const result = profileSchema.safeParse({
      displayName: String(values.get("displayName") ?? "").trim() || undefined,
      studioPortrait,
      skinFeel: values.get("skinFeel") || undefined,
      skinConcerns: values.getAll("skinConcerns"),
      routineFocus: values.get("routineFocus") || undefined,
      undertone: values.get("undertone") || undefined,
      fragranceFree: values.has("fragranceFree"),
      sensitive: values.has("sensitive"),
      avoid: values.get("avoid"),
    });
    if (!result.success) {
      setNotice("invalid");
      return;
    }
    setNotice(onSave(result.data) ? "saved" : "failed");
  }

  return <section aria-labelledby={`${id}-title`}>
    <header className={`page-heading ${styles.heading}`}>
      <div>
        <h1 id={`${id}-title`}>{t("Profil beauté", "Beauty profile")}</h1>
        <p>{t("Garde tes observations et tes préférences à portée de main pour préparer tes routines.", "Keep your observations and preferences handy when you plan your routines.")}</p>
      </div>
      {profile.displayName && <div className={styles.identity}>
        <span className={styles.initials} aria-hidden="true">{initials || <UserRound size={20}/>}</span>
        <bdi>{profile.displayName}</bdi>
      </div>}
    </header>
    <SkinObservations preferences={preferences} onSave={(observations) => {
      const saved = onSave(observations);
      if (saved) setNotice(undefined);
      return saved;
    }} onOpenRoutine={() => {
      setRoutineRequest((request) => request + 1);
      requestAnimationFrame(() => coach.current?.focus());
    }}/>
    <div className={styles.layout}>
      <form className={`dashboard-card stacked-form ${styles.profileForm}`} aria-labelledby={`${id}-form`} onSubmit={submit}
        onChange={() => { if (notice) setNotice(undefined); }}>
        <div className={styles.fields}>
          <div className={styles.intro}>
            <h2 id={`${id}-form`}>{t("Mes préférences beauté", "My beauty preferences")}</h2>
            <p className="muted">{t("Renseigne seulement ce que tu souhaites garder dans ton profil.", "Fill in only what you’d like to keep in your profile.")}</p>
          </div>
          <label>{t("Prénom ou pseudo", "First name or nickname")}
            <input key={profile.displayName ?? ""} name="displayName" autoComplete="nickname" dir="auto" maxLength={profileNameLimit} defaultValue={profile.displayName ?? ""}/>
          </label>
          <fieldset className={styles.group}>
            <legend>{t("Peau et sous-ton", "Skin and undertone")}</legend>
            <ProfileFields preferences={preferences}/>
            <label>{t("Priorité de ma routine", "My routine priority")}
              <select key={profile.routineFocus ?? ""} name="routineFocus" defaultValue={profile.routineFocus ?? ""}>
                <option value="">{t("Aucune priorité", "No priority")}</option>
                {routineFocusOptions.map((value) => <option key={value} value={value}>{t(...routineFocusLabels[value])}</option>)}
              </select>
            </label>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>{t("Tolérance et ingrédients", "Tolerance and ingredients")}</legend>
            <ProfileCheckbox key={`sensitive-${preferences.sensitive}`} name="sensitive" checked={preferences.sensitive} label={t("Ma peau réagit facilement", "My skin reacts easily")}/>
            <ProfileCheckbox key={`fragrance-${preferences.fragranceFree}`} name="fragranceFree" checked={preferences.fragranceFree} label={t("Je préfère éviter le parfum", "I prefer to avoid fragrance")}/>
            <label>{t("Ingrédients à éviter", "Ingredients to avoid")}
              <textarea key={preferences.avoid} name="avoid" maxLength={600} rows={3} defaultValue={preferences.avoid}
                aria-describedby={`${id}-avoid-help`} placeholder={t("Ex. Parfum, Limonene", "E.g. Parfum, Limonene")}/>
            </label>
            <small id={`${id}-avoid-help`} className="muted">{t("Sépare les noms par des virgules.", "Separate names with commas.")}</small>
          </fieldset>
          <PortraitFields key={JSON.stringify(profile.studioPortrait)} value={profile.studioPortrait} onEdit={() => setNotice(undefined)}/>
        </div>
        <div className={styles.actions}>
          <button className="button button-primary" type="submit">{t("Enregistrer le profil", "Save profile")}</button>
          <p className={styles.success} role="status">{notice === "saved" && <><Check size={16} aria-hidden="true"/>{t("Profil enregistré.", "Profile saved.")}</>}</p>
        </div>
        {notice === "invalid" && <p className="form-error" role="alert">{t("Vérifie les valeurs du profil.", "Check the profile entries.")}</p>}
        {notice === "failed" && <p className="form-error" role="alert">{t("Le profil n’a pas pu être enregistré.", "The profile couldn’t be saved.")}</p>}
      </form>
      <div className={styles.coach} ref={coach} tabIndex={-1} role="group" aria-label={t("Préparer ma routine", "Build my routine")}>
        <RoutineCoach preferences={preferences} products={products} onCreate={onCreate} openRequest={routineRequest}/>
      </div>
    </div>
  </section>;
}
