"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, LockKeyhole } from "lucide-react";
import { billingPlans, type BillingInterval } from "@/lib/billing-plans";
import type { BillingStatus } from "@/lib/billing-client";
import { useLocale } from "@/lib/i18n";
import styles from "./plans.module.css";

const essentials = [
  ["Vanity, catalogue et compositions INCI", "Beauty collection, catalogue and ingredient lists"],
  ["Routines guidées et Face Chart", "Guided routines and Face Chart"],
  ["Pipette photo, teintes et tutoriels", "Photo colour picker, shades and tutorials"],
  ["Synchronisation du vanity et des routines avec un compte", "Account sync for your collection and routines"],
] as const;

const plusBenefits = [
  ["Journal personnel de tolérance et d’usage", "Personal journal for product use and skin comfort"],
  ["Historique des observations par produit", "Find your observations by product"],
  ["Tes observations restent consultables après l’arrêt de Plus", "Keep access to your observations after cancelling Plus"],
] as const;

type Props = {
  signedIn: boolean;
  billing: BillingStatus;
  onSignIn: () => void;
};

export function Plans({ signedIn, billing, onSignIn }: Props) {
  const { t, locale, formatNumber } = useLocale();
  const euros = (amount: number) => formatNumber(amount / 100, { style: "currency", currency: "EUR" });
  const annualSavings = euros(12 * billingPlans.monthly.amount - billingPlans.yearly.amount);
  const [busy, setBusy] = useState<BillingInterval | "portal" | null>(null);
  const [returnState, setReturnState] = useState<"success" | "cancel" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = new URL(location.href);
    const result = url.searchParams.get("billing");
    if (result !== "success" && result !== "cancel") return;
    setReturnState(result);
    url.searchParams.delete("billing");
    history.replaceState(history.state, "", url);
  }, []);

  useEffect(() => {
    if (returnState !== "success" || billing.plus || !signedIn) return;
    const timers = [1_000, 3_000, 7_000].map((delay) => window.setTimeout(() => { void billing.refresh(); }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [returnState, billing.plus, billing.refresh, signedIn]);

  async function openStripe(action: BillingInterval | "portal") {
    if (!signedIn) {
      onSignIn();
      return;
    }
    setBusy(action);
    setError("");
    try {
      const portal = action === "portal";
      const response = await fetch(`/api/billing/${portal ? "portal" : "checkout"}`,
        portal ? { method: "POST" } : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interval: action }),
        });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") {
        setError(locale === "fr" && typeof result.error === "string" ? result.error : t("Cette opération n’a pas pu aboutir.", "This operation could not be completed."));
        return;
      }
      const destination = new URL(result.url);
      const expectedHost = portal ? "billing.stripe.com" : "checkout.stripe.com";
      if (destination.origin !== `https://${expectedHost}` || destination.username || destination.password) throw new Error("Unexpected Stripe URL.");
      location.assign(destination.href);
    } catch {
      setError(t("Cette opération n’a pas pu aboutir. Réessaie dans un instant.", "This operation could not be completed. Try again in a moment."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{t("Offres Navier", "Navier plans")}</p>
        <h1>{t("Un vanity, à ton rythme.", "Your beauty routine, at your pace.")}</h1>
        <p>{t("Organise tes produits et tes routines gratuitement. Ajoute un journal personnel si tu veux suivre tes observations au fil du temps.", "Organise your products and routines for free. Add a personal journal to track your observations over time.")}</p>
      </div>

      {returnState === "success" && (
        <p className={styles.notice} role="status">{billing.plus ? t("Navier Plus est actif sur ton compte.", "Navier Plus is active on your account.") : t("Nous vérifions la confirmation de Stripe. Tu peux actualiser le statut dans un instant.", "We’re checking Stripe’s confirmation. You can refresh the status in a moment.")}</p>
      )}
      {returnState === "cancel" && <p className={styles.notice} role="status">{t("Tu es revenu de la page de paiement Stripe.", "You returned from Stripe checkout.")}</p>}

      <div className={styles.cards}>
        <section className={styles.card} aria-labelledby="navier-free-title">
          <div className={styles.cardTop}>
            <h2 id="navier-free-title">{t("Essentiel", "Essential")}</h2>
            <span className={styles.badge}>{t("Gratuit", "Free")}</span>
          </div>
          <p>{t("Tout ce qu’il faut pour organiser et suivre tes rituels.", "Everything you need to organise and follow your routines.")}</p>
          <ul>{essentials.map((item) => <li key={item[0]}><Check size={17} aria-hidden="true" />{t(item[0], item[1])}</li>)}</ul>
        </section>

        <section className={`${styles.card} ${styles.plus}`} aria-labelledby="navier-plus-title">
          <div className={styles.cardTop}>
            <h2 id="navier-plus-title">Navier Plus</h2>
            {billing.plus && <span className={styles.badge}>{t("Actif", "Active")}</span>}
          </div>
          <p>{t("Observe comment tes habitudes beauté évoluent avec un journal daté.", "See how your beauty habits evolve with a dated journal.")}</p>
          <ul>{plusBenefits.map((item) => <li key={item[0]}><Check size={17} aria-hidden="true" />{t(item[0], item[1])}</li>)}</ul>

          <div className={styles.choices}>
            {(["monthly", "yearly"] as const).map((interval) => (
              <div key={interval} className={styles.choice}>
                <div><strong>{euros(billingPlans[interval].amount)}</strong> <span>{interval === "monthly" ? t("par mois", "per month") : t("par an", "per year")}</span></div>
                <small>{interval === "monthly" ? t("Paiement mensuel", "Billed monthly") : t(`Paiement annuel · ${annualSavings} d’économie sur 12 mois`, `Billed yearly · save ${annualSavings} over 12 months`)}</small>
                {!billing.plus && <button type="button" className="button button-primary"
                  disabled={Boolean(busy) || billing.loading || !billing.available}
                  onClick={() => void openStripe(interval)}>
                  {busy === interval ? t("Ouverture…", "Opening…") : interval === "monthly" ? t("Choisir le mensuel", "Choose monthly") : t("Choisir l’annuel", "Choose yearly")}
                </button>}
              </div>
            ))}
          </div>

          {billing.manageable && (
            <button type="button" className="button button-secondary" disabled={Boolean(busy) || !billing.available}
              onClick={() => void openStripe("portal")}>
              <CreditCard size={17} aria-hidden="true" /> {busy === "portal" ? t("Ouverture…", "Opening…") : t("Gérer mon abonnement", "Manage my subscription")}
            </button>
          )}
          {billing.loading ? <p role="status" className={styles.note}>{t("Vérification de l’offre…", "Checking your plan…")}</p>
            : !billing.available && <p className={styles.note}><LockKeyhole size={15} aria-hidden="true" /> {t("Le paiement n’est pas activé sur cette version de Navier.", "Payments are unavailable in this version of Navier.")}</p>}
          {billing.mode === "test" && <p className={styles.note}>{t("Mode test Stripe. Les paiements de cet environnement sont simulés.", "Stripe test mode. Payments in this environment are simulated.")}</p>}
          {(billing.error || returnState === "success" && !billing.plus) &&
            <button type="button" className="button button-secondary" onClick={() => void billing.refresh()}>{t("Actualiser le statut", "Refresh status")}</button>}
          {error && <p className={styles.notice} role="alert">{error}</p>}
          <p className={styles.note}>{t("Renouvellement automatique. Annulation depuis le portail Stripe. Le montant final est présenté avant la confirmation du paiement.", "Renews automatically. Cancel in the Stripe portal. The final total is shown before you confirm payment.")}</p>
        </section>
      </div>
    </div>
  );
}
