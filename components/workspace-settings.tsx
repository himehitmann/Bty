"use client";

import { ArrowRight, Download, Monitor, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useId, useState, type MouseEventHandler } from "react";
import type { BillingStatus } from "@/lib/billing-client";
import { useLocale } from "@/lib/i18n";
import { isLocale, localeOptions, type Locale } from "@/lib/locale";
import type { State } from "@/lib/model";
import type { MotionPreference } from "@/lib/motion-preference";
import type { useWorkspaceState } from "@/lib/use-workspace";
import styles from "./workspace-settings.module.css";

type WorkspaceSettingsProps = {
  state: State;
  portable: boolean;
  account: "local" | "guest" | "signed-in";
  sync: ReturnType<typeof useWorkspaceState>["sync"];
  billing: Pick<BillingStatus, "available" | "plus" | "loading" | "error" | "mode">;
  motion: MotionPreference;
  onLanguageChange: (locale: Locale) => void;
  onMotionChange: (motion: MotionPreference) => void;
  onOpenAccount: () => void;
  onOpenPlans: MouseEventHandler<HTMLAnchorElement>;
  onOpenProfile: MouseEventHandler<HTMLAnchorElement>;
  onRetrySync: () => void;
  onReviewSyncConflict: () => void;
};

function exportWorkspace(state: State) {
  const palette = state.palette.map(({ id, hex, name, collection }) => ({ id, hex, name, collection }));
  const exported = { version: 1, exportedAt: new Date().toISOString(), ...state, palette };
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }));
  let requested = false;
  try {
    anchor.href = url;
    anchor.download = "navier-data.json";
    document.body.append(anchor);
    anchor.click();
    requested = true;
  } finally {
    anchor.remove();
    if (requested) window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    else URL.revokeObjectURL(url);
  }
}

export function WorkspaceSettings({
  state, portable, account, sync, billing, motion, onLanguageChange, onMotionChange, onOpenAccount, onOpenPlans,
  onOpenProfile, onRetrySync, onReviewSyncConflict,
}: WorkspaceSettingsProps) {
  const { t, locale } = useLocale();
  const id = useId();
  const [download, setDownload] = useState<"requested" | "error">();
  const signedIn = account === "signed-in";
  const accountStatus = {
    local: t("Espace local", "Local workspace"),
    guest: t("Mode invité", "Guest mode"),
    "signed-in": t("Session ouverte", "Signed in"),
  }[account];
  const accountDescription = {
    local: t("Ton espace local est lié à ce navigateur.", "Your local workspace belongs to this browser."),
    guest: t("Cet espace invité reste sur cet appareil. Connecte-toi pour ouvrir ton espace en ligne.", "This guest workspace stays on this device. Sign in to open your online workspace."),
    "signed-in": t("Ton compte et ton espace invité ont chacun leurs données. Tu retrouves l’espace invité après déconnexion.", "Your account and guest workspace keep separate data. You can return to the guest workspace after signing out."),
  }[account];
  const syncStatus = {
    loading: t("Chargement", "Loading"),
    local: t("Sur cet appareil", "On this device"),
    saving: t("Enregistrement", "Saving"),
    synced: t("Synchronisé", "Synced"),
    error: t("Synchronisation indisponible", "Sync unavailable"),
    conflict: t("Conflit de synchronisation", "Sync conflict"),
  }[sync];
  const planStatus = billing.loading ? t("Vérification de l’offre…", "Checking your plan…")
    : billing.error ? t("Statut de l’offre indisponible", "Plan status unavailable")
    : billing.plus ? t("Navier Plus actif", "Navier Plus active")
    : t("Essentiel", "Essential");

  function requestDownload() {
    try {
      exportWorkspace(state);
      setDownload("requested");
    } catch {
      setDownload("error");
    }
  }

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
        <dl className={styles.statusList}>
          <div>
            <dt>{t("Session", "Session")}</dt>
            <dd><span className={styles.badge} data-tone={signedIn ? "success" : "neutral"}>{accountStatus}</span></dd>
          </div>
          {signedIn && <div>
            <dt>{t("Synchronisation", "Synchronisation")}</dt>
            <dd><span className={styles.badge} role="status" data-tone={sync === "conflict" || sync === "error" ? "attention" : sync === "synced" ? "success" : "neutral"}>{syncStatus}</span></dd>
          </div>}
          {!portable && <div>
            <dt>{t("Offre", "Plan")}</dt>
            <dd>
              <span className={styles.badge} role="status" data-tone={billing.error ? "attention" : billing.plus ? "success" : "neutral"}>{planStatus}</span>
              {billing.mode === "test" && <span className={styles.badge} data-tone="attention">{t("Mode test Stripe", "Stripe test mode")}</span>}
            </dd>
          </div>}
        </dl>
        <p>{accountDescription}</p>
        {signedIn && sync === "error" && <p className={styles.note}>{t("Tu peux exporter la version affichée pendant une interruption de la synchronisation.", "You can export the version on screen while sync is unavailable.")}</p>}
        {signedIn && sync === "conflict" && <p className={styles.note}>{t("Une autre version existe en ligne. Tu peux exporter les données affichées avant de choisir la version en ligne.", "Another version exists online. You can export the version on screen before choosing the online version.")}</p>}
        {!portable && !billing.loading && !billing.error && !billing.available && <p className={styles.note}>{t("Le paiement n’est pas activé sur cette version de Navier.", "Payments are unavailable in this version of Navier.")}</p>}
        {(!portable || account !== "local") && <div className={styles.actions}>
          {account !== "local" && <button className="button button-secondary" type="button" onClick={onOpenAccount}>
            {signedIn ? t("Gérer mon compte", "Manage my account") : t("Se connecter", "Sign in")}
          </button>}
          {signedIn && sync === "error" && <button className="button button-secondary" type="button" onClick={onRetrySync}>{t("Réessayer la synchronisation", "Retry sync")}</button>}
          {signedIn && sync === "conflict" && <button className="button button-secondary" type="button" onClick={onReviewSyncConflict}>{t("Examiner le conflit", "Review sync conflict")}</button>}
          {!portable && <a className="button button-secondary" href="#offres" onClick={onOpenPlans}>
            {t("Offres et abonnement", "Plans and subscription")}<ArrowRight size={17} strokeWidth={1.7} aria-hidden="true"/>
          </a>}
        </div>}
      </section>

      <section className={styles.panel} aria-labelledby={`${id}-data`}>
        <h2 id={`${id}-data`}><ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true"/>{t("Mes données", "My data")}</h2>
        <p>{t("Le fichier inclut les produits, routines, listes, looks, teintes et préférences.", "The file includes products, routines, lists, looks, shades and preferences.")}</p>
        <p id={`${id}-export-help`} className={styles.note}>{t("Le JSON contient tes données personnelles. Les teintes y figurent sous forme de couleurs et les photos restent à leur emplacement.", "The JSON file contains your personal data. It records shades as colours and leaves photos where they are stored.")}</p>
        <div className={styles.exportBlock}>
          <button className="button button-secondary" type="button" aria-describedby={`${id}-export-help`} onClick={requestDownload}>
            <Download size={17} strokeWidth={1.7} aria-hidden="true"/>{t("Exporter mon espace", "Export my workspace")}
          </button>
          <p className={styles.feedback} role="status" data-tone="success">{download === "requested" && t("Téléchargement demandé.", "Download requested.")}</p>
          <p className={styles.feedback} role="alert" data-tone="attention">{download === "error" &&
            t("Le fichier n’a pas pu être préparé. Réessaie.", "The file could not be prepared. Try again.")}</p>
        </div>
        {portable
          ? <details className={styles.privacy}>
            <summary>{t("Confidentialité dans cette version", "Privacy in this version")}</summary>
            <p>{t("Garde le fichier Navier au même endroit et utilise le même navigateur pour retrouver tes données.", "Keep the Navier file in the same place and use the same browser to find your data.")}</p>
            <p>{t("Tes recherches de produits peuvent être envoyées à Open Beauty Facts. Les images du catalogue sont chargées depuis leurs sites d’origine.", "Product searches may be sent to Open Beauty Facts. Catalogue images are loaded from their original sites.")}</p>
          </details>
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
