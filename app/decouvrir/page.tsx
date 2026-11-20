import { Brush, ClipboardList, Layers3, ScanBarcode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-shell";
import { Localized } from "@/lib/i18n";
import styles from "./site.module.css";

export const metadata: Metadata = {
  title: "Découvrir Navier — Studio maquillage, routines et listes",
  description: "Essaie des couleurs sur un visage illustré, organise tes routines et classe tes produits beauté.",
  openGraph: {
    title: "Navier — Les rituels qui te ressemblent",
    description: "Simulation maquillage, routines guidées et listes beauté personnelles.",
    locale: "fr_FR",
    type: "website",
  },
};

const features = [
  {
    icon: Brush,
    title: ["Simuler un maquillage", "Try a makeup look"],
    description: ["Choisis une carnation, superpose les teintes et vois où les appliquer sur le Face Chart interactif.", "Choose a skin tone, layer your shades and see where to apply them on the interactive face chart."],
  },
  {
    icon: Layers3,
    title: ["Suivre une routine", "Follow a routine"],
    description: ["Ordonne tes gestes de soin, de maquillage ou de coiffage. Retrouve les produits, les outils et les zones au fil des étapes.", "Arrange your skincare, makeup or hair steps. See the products, tools and application areas as you go."],
  },
  {
    icon: ClipboardList,
    title: ["Faire des listes", "Make lists"],
    description: ["Garde tes favoris, tes achats à prévoir et les raisons de tes déceptions au même endroit.", "Keep favourites, planned purchases and the reasons behind disappointments together."],
  },
  {
    icon: ScanBarcode,
    title: ["Retrouver un produit", "Find a product"],
    description: ["Cherche par nom, marque ou code-barres. Consulte les informations disponibles et ajoute tes propres notes.", "Search by name, brand or barcode. See the available product information and add your own notes."],
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
            <h1 id="discover-title"><Localized fr="Ton studio maquillage et tes routines beauté" en="Your makeup studio and beauty routines"/></h1>
            <p><Localized fr="Essaie un look, organise les gestes de ta routine et garde une trace des produits que tu veux racheter." en="Try a look, organise your routine and remember which products you want to buy again."/></p>
            <div className={styles.actions}>
              <Link href="/#studio" className={styles.primary}><Localized fr="Essayer le simulateur" en="Try the simulator"/></Link>
              <Link href="/installer" className={styles.secondary}><Localized fr="Installer Navier" en="Install Navier"/></Link>
            </div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div className={styles.featureLead}>
            <h2 id="features-title"><Localized fr="Les outils de Navier" en="Navier’s tools"/></h2>
            <Link href="/" className={styles.quietLink}><Localized fr="Ouvrir Navier" en="Open Navier"/></Link>
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
