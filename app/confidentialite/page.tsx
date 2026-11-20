import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confidentialité — Navier" };

export default function PrivacyPage() {
  return <main className="main-content privacy-page">
    <Link href="/">Revenir à Navier</Link>
    <h1>Confidentialité et données</h1>
    <section><h2>Espace local</h2><p>Les produits, routines, teintes et préférences sont enregistrés dans le stockage de ton navigateur. Le service worker conserve les ressources de l’application pour les rouvrir hors connexion.</p></section>
    <section><h2>Compte et synchronisation</h2><p>Si tu choisis de créer un compte, Supabase gère la connexion et conserve tes données synchronisées. Les photos que tu choisis d’enregistrer sont placées dans un stockage privé. Le journal utilise un espace privé distinct, accessible à son propriétaire.</p></section>
    <section><h2>Catalogue et paiement</h2><p>Les recherches par nom ou code-barres peuvent être transmises à Open Beauty Facts. Les images de ce catalogue peuvent être chargées depuis leurs serveurs. Si tu t’abonnes à Plus, Stripe traite le paiement sur son site. Navier reçoit le statut de l’abonnement pour activer l’accès.</p></section>
    <section><h2>Exporter tes données</h2><p>Tu peux télécharger l’export de ton espace depuis les préférences et exporter tes entrées depuis le journal. L’export de l’espace contient les teintes sans les photos associées.</p></section>
  </main>;
}
