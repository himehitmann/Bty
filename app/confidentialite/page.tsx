import type { Metadata } from "next";
import Link from "next/link";
import { Localized } from "@/lib/i18n";

export const metadata: Metadata = { title: "Confidentialité — Navier" };

export default function PrivacyPage() {
  return <main className="main-content privacy-page">
    <Link href="/"><Localized fr="Revenir à Navier" en="Back to Navier"/></Link>
    <h1><Localized fr="Confidentialité et données" en="Privacy and data"/></h1>
    <section><h2><Localized fr="Espace local" en="Local workspace"/></h2><p><Localized fr="Les produits, routines, teintes et préférences sont enregistrés dans le stockage de ton navigateur. Le service worker conserve les ressources de l’application pour les rouvrir hors connexion." en="Products, routines, shades and settings are saved in your browser’s storage. The service worker keeps the app’s resources so you can reopen them offline."/></p></section>
    <section><h2><Localized fr="Compte et synchronisation" en="Account and sync"/></h2><p><Localized fr="Si tu choisis de créer un compte, Supabase gère la connexion et conserve tes données synchronisées. Les photos que tu choisis d’enregistrer sont placées dans un stockage privé. Le journal utilise un espace privé distinct, accessible à son propriétaire." en="If you create an account, Supabase manages sign-in and stores your synced data. Photos you choose to save are kept in private storage. The journal uses a separate private space accessible to its owner."/></p></section>
    <section><h2><Localized fr="Catalogue et paiement" en="Catalogue and payments"/></h2><p><Localized fr="Les recherches par nom ou code-barres peuvent être transmises à Open Beauty Facts. Les images de ce catalogue peuvent être chargées depuis leurs serveurs. Si tu t’abonnes à Plus, Stripe traite le paiement sur son site. Navier reçoit le statut de l’abonnement pour activer l’accès." en="Product searches by name or barcode may be sent to Open Beauty Facts. Catalogue images may be loaded from their servers. If you subscribe to Plus, Stripe processes the payment on its own site. Navier receives the subscription status to enable access."/></p></section>
    <section><h2><Localized fr="Exporter tes données" en="Export your data"/></h2><p><Localized fr="Tu peux télécharger l’export de ton espace depuis les préférences et exporter tes entrées depuis le journal. L’export de l’espace contient les teintes sans les photos associées." en="You can download your workspace export from settings and export entries from the journal. The workspace export contains your shades without their linked photos."/></p></section>
  </main>;
}
