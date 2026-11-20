"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, LockKeyhole, Sparkles } from "lucide-react";
import { billingPlans, type BillingInterval } from "@/lib/billing-plans";
import type { BillingStatus } from "@/lib/billing-client";
import styles from "./plans.module.css";

const essentials = [
  "Vanity, catalogue et compositions INCI",
  "Routines guidées et Face Chart",
  "Pipette photo, teintes et tutoriels",
  "Synchronisation du vanity et des routines avec un compte",
];

const plusBenefits = [
  "Journal personnel de tolérance et d’usage",
  "Historique des observations par produit",
  "Tes observations restent consultables après l’arrêt de Plus",
];

type Props = {
  signedIn: boolean;
  billing: BillingStatus;
  onSignIn: () => void;
};

export function Plans({ signedIn, billing, onSignIn }: Props) {
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
        setError(typeof result.error === "string" ? result.error : "Cette opération n’a pas pu aboutir.");
        return;
      }
      const destination = new URL(result.url);
      const expectedHost = portal ? "billing.stripe.com" : "checkout.stripe.com";
      if (destination.origin !== `https://${expectedHost}` || destination.username || destination.password) throw new Error("Unexpected Stripe URL.");
      location.assign(destination.href);
    } catch {
      setError("Cette opération n’a pas pu aboutir. Réessaie dans un instant.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Offres Navier</p>
        <h1>Un vanity, à ton rythme.</h1>
        <p>Organise tes produits et tes routines gratuitement. Ajoute un journal personnel si tu veux suivre tes observations au fil du temps.</p>
      </div>

      {returnState === "success" && (
        <p className={styles.notice} role="status">{billing.plus ? "Navier Plus est actif sur ton compte." : "Nous vérifions la confirmation de Stripe. Tu peux actualiser le statut dans un instant."}</p>
      )}
      {returnState === "cancel" && <p className={styles.notice} role="status">Tu es revenu de la page de paiement Stripe.</p>}

      <div className={styles.cards}>
        <section className={styles.card} aria-labelledby="navier-free-title">
          <div className={styles.cardTop}>
            <h2 id="navier-free-title">Essentiel</h2>
            <span className={styles.badge}>Gratuit</span>
          </div>
          <p>Tout ce qu’il faut pour organiser et suivre tes rituels.</p>
          <ul>{essentials.map((item) => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
        </section>

        <section className={`${styles.card} ${styles.plus}`} aria-labelledby="navier-plus-title">
          <div className={styles.cardTop}>
            <h2 id="navier-plus-title"><Sparkles size={20} aria-hidden="true" /> Navier Plus</h2>
            {billing.plus && <span className={styles.badge}>Actif</span>}
          </div>
          <p>Observe comment tes habitudes beauté évoluent avec un journal daté.</p>
          <ul>{plusBenefits.map((item) => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>

          <div className={styles.choices}>
            {(["monthly", "yearly"] as const).map((interval) => (
              <div key={interval} className={styles.choice}>
                <div><strong>{billingPlans[interval].label}</strong> <span>{billingPlans[interval].period}</span></div>
                <small>{interval === "monthly" ? "Paiement mensuel" : "Paiement annuel · 17,89 € d’économie sur 12 mois"}</small>
                {!billing.plus && <button type="button" className="button button-primary"
                  disabled={Boolean(busy) || billing.loading || !billing.available}
                  onClick={() => void openStripe(interval)}>
                  {busy === interval ? "Ouverture…" : interval === "monthly" ? "Choisir le mensuel" : "Choisir l’annuel"}
                </button>}
              </div>
            ))}
          </div>

          {billing.manageable && (
            <button type="button" className="button button-secondary" disabled={Boolean(busy) || !billing.available}
              onClick={() => void openStripe("portal")}>
              <CreditCard size={17} aria-hidden="true" /> {busy === "portal" ? "Ouverture…" : "Gérer mon abonnement"}
            </button>
          )}
          {billing.loading ? <p role="status" className={styles.note}>Vérification de l’offre…</p>
            : !billing.available && <p className={styles.note}><LockKeyhole size={15} aria-hidden="true" /> Le paiement n’est pas activé sur cette version de Navier.</p>}
          {billing.mode === "test" && <p className={styles.note}>Mode test Stripe. Les paiements de cet environnement sont simulés.</p>}
          {(billing.error || returnState === "success" && !billing.plus) &&
            <button type="button" className="button button-secondary" onClick={() => void billing.refresh()}>Actualiser le statut</button>}
          {error && <p className={styles.notice} role="alert">{error}</p>}
          <p className={styles.note}>Renouvellement automatique. Annulation depuis le portail Stripe. Le montant final est présenté avant la confirmation du paiement.</p>
        </section>
      </div>
    </div>
  );
}
