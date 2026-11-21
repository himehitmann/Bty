"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, CreditCard, Info, Layers3 } from "lucide-react";
import { billingPlans, type BillingInterval } from "@/lib/billing-plans";
import type { BillingStatus } from "@/lib/billing-client";
import { useLocale } from "@/lib/i18n";
import styles from "./plans.module.css";

const essentials = [
  ["Ma trousse, catalogue et compositions INCI", "My collection, catalogue and ingredient lists"],
  ["Routines guidées et simulation maquillage", "Guided routines and makeup simulator"],
  ["Listes beauté, looks enregistrés, teintes photo et tutoriels", "Beauty lists, saved looks, shades from photos and tutorials"],
  ["Synchronisation des produits et routines avec un compte", "Account sync for your collection and routines"],
] as const;

const plusBenefits = [
  ["Écris et modifie tes observations du jour", "Write and edit your daily observations"],
  ["Retrouve ton historique par produit ou routine", "Search your history by product or routine"],
  ["Compare tes observations sur les deux dernières semaines", "Compare your observations over the past two weeks"],
] as const;

type BillingAction = BillingInterval | "portal";
type Props = {
  signedIn: boolean;
  billing: BillingStatus;
  onSignIn: () => void;
};

export function Plans({ signedIn, billing, onSignIn }: Props) {
  const { t, locale, formatNumber } = useLocale();
  const euros = (amount: number) => formatNumber(amount / 100, {
    style: "currency", currency: "EUR", minimumFractionDigits: amount === 0 ? 0 : 2,
  });
  const annualSavings = 12 * billingPlans.monthly.amount - billingPlans.yearly.amount;
  const [busy, setBusy] = useState<BillingAction | "status" | null>(null);
  const [returnState, setReturnState] = useState<"success" | "cancel" | null>(null);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const active = signedIn && billing.plus;
  const pendingConfirmation = returnState === "success" && signedIn && !active;
  const paymentsReady = billing.available && !billing.loading && !billing.error;
  const canChoose = signedIn && !active && !pendingConfirmation && paymentsReady;
  const canManage = signedIn && billing.manageable && paymentsReady;

  useEffect(() => {
    const url = new URL(location.href);
    const result = url.searchParams.get("billing");
    if (result !== "success" && result !== "cancel") return;
    setReturnState(result);
    url.searchParams.delete("billing");
    history.replaceState(history.state, "", url);
  }, []);

  useEffect(() => {
    if (!pendingConfirmation) return;
    const timers = [1_000, 3_000, 7_000].map((delay) => window.setTimeout(() => { void billing.refresh(); }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pendingConfirmation, billing.refresh]);

  useEffect(() => () => request.current?.abort(), []);

  async function openStripe(action: BillingAction) {
    const portal = action === "portal";
    if (busy || request.current || (portal ? !canManage : !canChoose)) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/billing/${portal ? "portal" : "checkout"}`, {
        method: "POST",
        signal: controller.signal,
        ...(portal ? {} : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interval: action }),
        }),
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || typeof result?.url !== "string") {
        setError(locale === "fr" && typeof result?.error === "string" ? result.error
          : t("Cette opération n’a pas pu aboutir.", "This operation could not be completed."));
        return;
      }
      const destination = new URL(result.url);
      const expectedHost = portal ? "billing.stripe.com" : "checkout.stripe.com";
      if (destination.origin !== `https://${expectedHost}` || destination.username || destination.password) throw new Error("Unexpected Stripe URL.");
      location.assign(destination.href);
    } catch {
      if (!controller.signal.aborted) setError(t("Cette opération n’a pas pu aboutir. Réessaie dans un instant.", "This operation could not be completed. Try again in a moment."));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function refreshStatus() {
    if (busy) return;
    setBusy("status");
    setError("");
    try {
      await billing.refresh();
    } catch {
      setError(t("Le statut des offres est momentanément indisponible.", "Plan status is temporarily unavailable."));
    } finally {
      setBusy(null);
    }
  }

  const returnNotice = returnState === "cancel"
    ? t("Tu es revenu de la page de paiement Stripe.", "You returned from Stripe checkout.")
    : returnState === "success"
      ? active ? t("Navier Plus est actif sur ton compte.", "Navier Plus is active on your account.")
        : signedIn ? t("Confirmation de l’accès Plus en attente. Actualise le statut pour vérifier l’activation.", "Plus access is awaiting confirmation. Refresh the status to check activation.")
          : t("Connecte-toi pour vérifier si Plus est actif sur ton compte.", "Sign in to check whether Plus is active on your account.")
      : "";
  const availabilityNotice = billing.loading
    ? t("Vérification de l’offre…", "Checking your plan…")
    : billing.error
      ? t("Le statut des offres est momentanément indisponible.", "Plan status is temporarily unavailable.")
      : !billing.available
        ? t("Le paiement n’est pas activé sur cette version de Navier.", "Payments are unavailable in this version of Navier.")
        : "";

  return (
    <div className={styles.shell}>
      <header className={styles.heading}>
        <h1>{t("Offres Navier", "Navier plans")}</h1>
        <p>{t("Les outils d’Essentiel sont gratuits. Navier Plus ajoute le journal beauté pour garder une trace de tes observations.", "Essential tools are free. Navier Plus adds a beauty journal to keep track of your observations.")}</p>
      </header>

      {(returnNotice || availabilityNotice || billing.mode === "test") && (
        <div className={styles.notice}>
          <Info size={19} strokeWidth={1.7} aria-hidden="true"/>
          <div className={styles.noticeContent}>
            <div role="status">
              {returnNotice && <p>{returnNotice}</p>}
              {availabilityNotice && <p>{availabilityNotice}</p>}
              {billing.mode === "test" && <p>{t("Mode test Stripe. Aucun paiement réel.", "Stripe test mode. No real payments.")}</p>}
            </div>
            {(billing.error || pendingConfirmation) && <div className={styles.noticeActions}>
              <button type="button" className="button button-secondary" disabled={Boolean(busy)} onClick={() => void refreshStatus()}>
                {busy === "status" ? t("Actualisation…", "Refreshing…") : t("Actualiser le statut", "Refresh status")}
              </button>
              {pendingConfirmation && <button type="button" className="button button-secondary" disabled={Boolean(busy)} onClick={() => setReturnState(null)}>
                {t("Revoir les formules", "See plans again")}
              </button>}
            </div>}
          </div>
        </div>
      )}

      <div className={styles.cards}>
        <section className={styles.card} aria-labelledby="navier-free-title">
          <header className={styles.cardTop}>
            <Layers3 size={24} strokeWidth={1.6} aria-hidden="true"/>
            <h2 id="navier-free-title">{t("Essentiel", "Essential")}</h2>
          </header>
          <p className={styles.freePrice}><strong>{euros(0)}</strong></p>
          <ul className={styles.benefits}>{essentials.map(([fr, en]) => <li key={fr}><Check size={17} aria-hidden="true"/>{t(fr, en)}</li>)}</ul>
        </section>

        <section className={styles.card + " " + styles.plus} aria-labelledby="navier-plus-title">
          <header className={styles.cardTop}>
            <BookOpen size={24} strokeWidth={1.6} aria-hidden="true"/>
            <h2 id="navier-plus-title">Navier Plus</h2>
            {active && <span className={styles.badge}>{t("Actif", "Active")}</span>}
          </header>
          <p className={styles.inclusion}>{t("Tout Essentiel, avec le journal beauté privé.", "Everything in Essential, with a private beauty journal.")}</p>
          {!active && <ul className={styles.choices} aria-label={t("Fréquences de facturation", "Billing periods")}>
            {(["monthly", "yearly"] as const).map((interval) => {
              const monthly = interval === "monthly";
              return <li key={interval} className={styles.choice}>
                <h3>{monthly ? t("Mensuel", "Monthly") : t("Annuel", "Yearly")}</h3>
                <p className={styles.price}><strong>{euros(billingPlans[interval].amount)}</strong>
                  <span>{monthly ? t("par mois", "per month") : t("par an", "per year")}</span>
                </p>
                {!monthly && annualSavings > 0 && <p className={styles.note}>{t(
                  `${euros(annualSavings)} d’économie par rapport à 12 mensualités.`,
                  `Save ${euros(annualSavings)} compared with 12 monthly payments.`,
                )}</p>}
                {signedIn && <button type="button" className="button button-primary"
                  disabled={Boolean(busy) || !canChoose} onClick={() => void openStripe(interval)}>
                  {busy === interval ? t("Ouverture…", "Opening…") : monthly ? t("Choisir le mensuel", "Choose monthly") : t("Choisir l’annuel", "Choose yearly")}
                </button>}
              </li>;
            })}
          </ul>}

          {!signedIn && paymentsReady && <button type="button" className="button button-primary" onClick={onSignIn}>
            {t("Se connecter pour continuer", "Sign in to continue")}
          </button>}
          {signedIn && billing.manageable && <button type="button" className="button button-secondary"
            disabled={Boolean(busy) || !canManage} onClick={() => void openStripe("portal")}>
            <CreditCard size={17} strokeWidth={1.7} aria-hidden="true"/>{busy === "portal" ? t("Ouverture…", "Opening…") : t("Gérer mon abonnement", "Manage my subscription")}
          </button>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <ul className={styles.benefits}>{plusBenefits.map(([fr, en]) => <li key={fr}><Check size={17} aria-hidden="true"/>{t(fr, en)}</li>)}</ul>
          <p className={styles.note}>{t("Après la fin de Plus, tu peux toujours consulter, exporter ou supprimer tes observations.", "After Plus ends, you can still read, export or delete your observations.")}</p>
          <p className={styles.terms}>{t("L’abonnement se renouvelle automatiquement selon la fréquence choisie. Le portail Stripe permet de le gérer ou de l’annuler. Stripe affiche le total avant confirmation.", "The subscription renews automatically at the chosen frequency. Manage or cancel it in the Stripe portal. Stripe shows the total before confirmation.")}</p>
        </section>
      </div>
    </div>
  );
}
