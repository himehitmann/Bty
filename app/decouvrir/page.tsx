import { Blend, CalendarDays, Layers3, ScanBarcode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-shell";
import { Localized } from "@/lib/i18n";
import styles from "./site.module.css";

export const metadata: Metadata = {
  title: "Découvrir Navier — Ton espace beauté",
  description: "Organise ton vanity, suis les dates d’ouverture et compose tes rituels avec les produits que tu as déjà.",
  openGraph: {
    title: "Navier — Les rituels qui te ressemblent",
    description: "Un espace pour ton vanity, tes routines et les teintes que tu aimes.",
    locale: "fr_FR",
    type: "website",
  },
};

const features = [
  {
    icon: ScanBarcode,
    title: ["Comprends ton vanity", "Know your beauty collection"],
    description: ["Retrouve un produit par code-barres, ajoute-le à ta collection et consulte la liste d’ingrédients avec sa source et ses limites.", "Find a product by barcode, add it to your collection and see its ingredients with their source and limitations."],
  },
  {
    icon: CalendarDays,
    title: ["Garde les dates en vue", "Keep track of dates"],
    description: ["Note quand tu ouvres un produit et la durée indiquée sur son emballage pour retrouver le repère au bon moment.", "Record when you open a product and the period on its packaging so you can check it when it matters."],
  },
  {
    icon: Layers3,
    title: ["Compose à partir de ce que tu as", "Build on what you already own"],
    description: ["Organise chaque geste, visualise les zones sur le Face Chart et choisis un tutoriel adapté à tes produits.", "Organise each step, see application areas on the Face Chart and pick a tutorial that fits your products."],
  },
  {
    icon: Blend,
    title: ["Retrouve une nuance", "Find that shade again"],
    description: ["Prélève une couleur depuis une photo et conserve-la dans ta palette pour la retrouver plus tard.", "Pick a colour from a photo and save it in your palette for later."],
  },
];

export default function DiscoverPage() {
  return (
    <div className={styles.site}>
      <a href="#contenu" className="skip-link"><Localized fr="Aller au contenu" en="Skip to content"/></a>
      <SiteHeader />
      <main id="contenu">
        <section className={styles.hero} aria-labelledby="discover-title">
          <div className={styles.heroCopy}>
            <h1 id="discover-title"><Localized fr="Les rituels qui te ressemblent." en="Beauty routines that feel like you."/></h1>
            <p><Localized fr="Réunis tes produits, compose tes routines et retrouve les teintes que tu aimes. Tout commence avec ce que tu possèdes déjà." en="Bring your products together, build your routines and find the shades you love. It starts with what you already own."/></p>
            <div className={styles.actions}>
              <Link href="/" className={styles.primary}><Localized fr="Ouvrir mon espace" en="Open my workspace"/></Link>
              <Link href="/installer" className={styles.secondary}><Localized fr="Installer Navier" en="Install Navier"/></Link>
            </div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div className={styles.featureLead}>
            <h2 id="features-title"><Localized fr="De ta coiffeuse à tes routines." en="From your dressing table to your routines."/></h2>
            <p><Localized fr="Prends soin de ta collection avec des repères concrets pour choisir quoi utiliser, quand et dans quel ordre." en="Look after your collection with practical guidance on what to use, when and in which order."/></p>
            <Link href="/#vanity" className={styles.quietLink}><Localized fr="Découvrir le vanity" en="Explore the beauty collection"/></Link>
          </div>
          <ul className={styles.featureList}>
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title[0]}>
                <span className={styles.featureIcon}><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span>
                <div>
                  <h3><Localized fr={title[0]} en={title[1]}/></h3>
                  <p><Localized fr={description[0]} en={description[1]}/></p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title"><Localized fr="Un espace qui te suit." en="A beauty space that goes with you."/></h2>
            <p><Localized fr="Ouvre Navier dans ton navigateur ou ajoute son icône à ton écran d’accueil. L’espace local fonctionne sans compte." en="Open Navier in your browser or add its icon to your home screen. Your local workspace works without an account."/></p>
          </div>
          <Link href="/installer" className={styles.secondary}><Localized fr="Voir le guide d’installation" en="See the installation guide"/></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
