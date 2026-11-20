import type { Metadata } from "next";
import Link from "next/link";
import { Localized } from "@/lib/i18n";

export const metadata: Metadata = { title: "Confidentialité — Navier" };

export default function PrivacyPage() {
  return <main className="main-content privacy-page">
    <Link href="/"><Localized fr="Revenir à Navier" en="Back to Navier"/></Link>
    <h1><Localized fr="Confidentialité et données" en="Privacy and data"/></h1>
    <section><h2><Localized fr="Espace local" en="Local workspace"/></h2><p><Localized fr="Les produits, routines, listes, palettes et préférences sont enregistrés dans ton navigateur. L’application web peut conserver des ressources pour une ouverture hors connexion." en="Products, routines, lists, palettes and settings are saved in your browser. The web app can keep resources so you can reopen it offline."/></p></section>
    <section><h2><Localized fr="Compte et synchronisation" en="Account and sync"/></h2><p><Localized fr="Si tu choisis de créer un compte, Supabase gère la connexion et conserve tes données synchronisées. Les photos que tu choisis d’enregistrer sont placées dans un stockage privé. Le journal utilise un espace privé distinct, accessible à son propriétaire." en="If you create an account, Supabase manages sign-in and stores your synced data. Photos you choose to save are kept in private storage. The journal uses a separate private space accessible to its owner."/></p></section>
    <section><h2><Localized fr="Catalogue et paiement" en="Catalogue and payments"/></h2><p><Localized fr="Les recherches que tu lances par nom, marque ou code-barres peuvent être envoyées à Open Beauty Facts. Le fichier portable peut contacter directement ce service. Ton navigateur charge les photos disponibles depuis les serveurs d’images du catalogue. Si tu t’abonnes à Plus, Stripe traite le paiement et communique le statut de l’abonnement à Navier." en="Submitted product searches by name, brand or barcode may be sent to Open Beauty Facts. The portable file can contact this service directly. Your browser loads available product photos from the catalogue’s image servers. If you subscribe to Plus, Stripe processes the payment and sends the subscription status to Navier."/></p></section>
    <section><h2><Localized fr="Exporter tes données" en="Export your data"/></h2><p><Localized fr="Tu peux télécharger l’export de ton espace depuis les préférences et exporter tes entrées depuis le journal. L’export de l’espace contient les teintes sans les photos associées." en="You can download your workspace export from settings and export entries from the journal. The workspace export contains your shades without their linked photos."/></p></section>
  </main>;
}
