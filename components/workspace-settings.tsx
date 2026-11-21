"use client";

import { ArrowRight, Download, Monitor, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useId, type MouseEventHandler } from "react";
import { useLocale } from "@/lib/i18n";
import { isLocale, localeOptions, type Locale } from "@/lib/locale";
import type { State } from "@/lib/model";
import type { MotionPreference } from "@/lib/motion-preference";
import styles from "./workspace-settings.module.css";

type WorkspaceSettingsProps = {
  state: State;
  portable: boolean;
  account: "local" | "guest" | "signed-in";
  motion: MotionPreference;
  onLanguageChange: (locale: Locale) => void;
  onMotionChange: (motion: MotionPreference) => void;
  onOpenAccount: () => void;
  onOpenProfile: MouseEventHandler<HTMLAnchorElement>;
};

function exportWorkspace(state: State) {
  const palette = state.palette.map(({ id, hex, name, collection }) => ({ id, hex, name, collection }));
  const exported = { version: 1, exportedAt: new Date().toISOString(), ...state, palette };
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "navier-data.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkspaceSettings({
  state, portable, account, motion, onLanguageChange, onMotionChange, onOpenAccount, onOpenProfile,
}: WorkspaceSettingsProps) {
  const { t, locale } = useLocale();
  const id = useId();
  const accountDescription = {
    local: t("Cet espace est enregistré dans ce navigateur.", "This workspace is stored in this browser."),
    guest: t("Connecte-toi pour accéder à ton espace en ligne sur tes appareils.", "Sign in to access your online workspace across your devices."),
    "signed-in": t("Tu es connecté à ton compte Navier. Tu peux gérer ta session ici.", "You’re signed in to your Navier account. You can manage your session here."),
  }[account];

  return <section className={styles.settings} aria-labelledby={`${id}-title`}>
    <h1 id={`${id}-title`}>{t("Paramètres", "Settings")}</h1>
    <div className={styles.panels}>
      <section className={styles.panel} aria-labelledby={`${id}-interface`}>
        <h2 id={`${id}-interface`}><Monitor size={21} strokeWidth={1.7} aria-hidden="true"/>{t("Interface", "Interface")}</h2>
        <label className={styles.field}>
          <span>{t("Langue de l’interface", "Interface language")}</span>
          <select value={locale} onChange={(event) => {
            if (isLocale(event.target.value)) onLanguageChange(event.target.value);
          }}>
            {localeOptions.map(({ value, name }) => <option key={value} value={value} lang={value}>{name}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t("Animations", "Animations")}</span>
          <select value={motion} aria-describedby={`${id}-motion-help`} onChange={(event) => {
            onMotionChange(event.target.value === "reduce" ? "reduce" : "system");
          }}>
            <option value="system">{t("Suivre l’appareil", "Use device setting")}</option>
            <option value="reduce">{t("Réduire les animations", "Reduce motion")}</option>
          </select>
        </label>
        <p id={`${id}-motion-help`} className={styles.note}>{t("Le réglage des animations s’applique à ce navigateur.", "The motion setting applies to this browser.")}</p>
      </section>

      <section className={styles.panel} aria-labelledby={`${id}-account`}>
        <h2 id={`${id}-account`}><UserRound size={21} strokeWidth={1.7} aria-hidden="true"/>{t("Compte", "Account")}</h2>
        <p>{accountDescription}</p>
        {account !== "local" && <button className="button button-secondary" type="button" onClick={onOpenAccount}>
          {account === "signed-in" ? t("Gérer mon compte", "Manage my account") : t("Se connecter", "Sign in")}
        </button>}
      </section>

      <section className={styles.panel} aria-labelledby={`${id}-data`}>
        <h2 id={`${id}-data`}><ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true"/>{t("Mes données", "My data")}</h2>
        <p>{t("Le fichier inclut les produits, routines, listes, looks, teintes et préférences.", "The file includes products, routines, lists, looks, shades and preferences.")}</p>
        <button className="button button-secondary" type="button" onClick={() => exportWorkspace(state)}>
          <Download size={17} strokeWidth={1.7} aria-hidden="true"/>{t("Exporter mon espace", "Export my workspace")}
        </button>
        {portable
          ? <p className={styles.note}>{t("Garde le fichier Navier au même endroit et utilise le même navigateur pour retrouver tes données.", "Keep the Navier file in the same place and use the same browser to find your data.")}</p>
          : <div className={styles.links}>
            <a href="/confidentialite">{t("Confidentialité", "Privacy")}</a>
            <a href="/installer">{t("Installer Navier", "Install Navier")}</a>
          </div>}
      </section>

      <section className={styles.panel} aria-labelledby={`${id}-profile`}>
        <h2 id={`${id}-profile`}><Sparkles size={21} strokeWidth={1.7} aria-hidden="true"/>{t("Profil beauté", "Beauty profile")}</h2>
        <p>{t("Retrouve tes préférences de peau et les ingrédients que tu souhaites éviter.", "Find your skin preferences and the ingredients you wish to avoid.")}</p>
        <a className="button button-secondary" href="#profile" onClick={onOpenProfile}>
          {t("Ouvrir le profil beauté", "Open beauty profile")}<ArrowRight size={17} strokeWidth={1.7} aria-hidden="true"/>
        </a>
      </section>
    </div>
  </section>;
}
