"use client";

import { Check } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import { preferenceSchema, type Preferences, type Product, type Routine } from "@/lib/model";
import { ProfileCheckbox, ProfileFields, RoutineCoach } from "./profile-coach";
import styles from "./beauty-profile.module.css";

export function BeautyProfile({ preferences, products, onSave, onCreate }: {
  preferences: Preferences;
  products: Product[];
  onSave: (preferences: Preferences) => boolean;
  onCreate: (routine: Routine) => boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  const [notice, setNotice] = useState<"saved" | "invalid" | "failed">();
  const { locale: _locale, ...criteria } = preferences;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const result = preferenceSchema.safeParse({
      ...preferences,
      skinFeel: values.get("skinFeel") || undefined,
      skinConcerns: values.getAll("skinConcerns"),
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
    <header className="page-heading">
      <div>
        <h1 id={`${id}-title`}>{t("Profil beauté", "Beauty profile")}</h1>
        <p>{t("Garde tes observations et tes préférences à portée de main pour préparer tes routines.", "Keep your observations and preferences handy when you plan your routines.")}</p>
      </div>
    </header>
    <div className={styles.layout}>
      <form className={`dashboard-card stacked-form ${styles.profileForm}`} aria-labelledby={`${id}-form`} onSubmit={submit}
        onChange={() => { if (notice) setNotice(undefined); }}>
        <div className={styles.intro}>
          <h2 id={`${id}-form`}>{t("Peau et sous-ton", "Skin and undertone")}</h2>
          <p className="muted">{t("Renseigne seulement ce que tu souhaites garder dans ton profil.", "Fill in only what you’d like to keep in your profile.")}</p>
        </div>
        <div key={JSON.stringify(criteria)} className={styles.fields}>
          <ProfileFields preferences={preferences}/>
          <fieldset className={styles.ingredientPreferences}>
            <legend>{t("Tolérance et ingrédients", "Tolerance and ingredients")}</legend>
            <ProfileCheckbox name="sensitive" checked={preferences.sensitive} label={t("Ma peau réagit facilement", "My skin reacts easily")}/>
            <ProfileCheckbox name="fragranceFree" checked={preferences.fragranceFree} label={t("Je préfère éviter le parfum", "I prefer to avoid fragrance")}/>
            <label>{t("Ingrédients à éviter", "Ingredients to avoid")}
              <textarea name="avoid" maxLength={600} rows={3} defaultValue={preferences.avoid}
                aria-describedby={`${id}-avoid-help`} placeholder={t("Ex. Parfum, Limonene", "E.g. Parfum, Limonene")}/>
            </label>
            <small id={`${id}-avoid-help`} className="muted">{t("Sépare les noms par des virgules.", "Separate names with commas.")}</small>
          </fieldset>
        </div>
        <div className={styles.actions}>
          <button className="button button-primary" type="submit">{t("Enregistrer le profil", "Save profile")}</button>
          <p className={styles.success} role="status">{notice === "saved" && <><Check size={16} aria-hidden="true"/>{t("Profil enregistré.", "Profile saved.")}</>}</p>
        </div>
        {notice === "invalid" && <p className="form-error" role="alert">{t("Vérifie les valeurs du profil.", "Check the profile entries.")}</p>}
        {notice === "failed" && <p className="form-error" role="alert">{t("Le profil n’a pas pu être enregistré.", "The profile couldn’t be saved.")}</p>}
      </form>
      <div className={styles.coach}>
        <RoutineCoach preferences={preferences} products={products} onCreate={onCreate}/>
      </div>
    </div>
  </section>;
}
