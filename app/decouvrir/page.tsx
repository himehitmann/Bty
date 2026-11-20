import { Blend, CalendarDays, Layers3, ScanBarcode } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-shell";
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
    title: "Comprends ton vanity",
    description: "Retrouve un produit par code-barres, ajoute-le à ta collection et consulte la liste d’ingrédients avec sa source et ses limites.",
  },
  {
    icon: CalendarDays,
    title: "Garde les dates en vue",
    description: "Note quand tu ouvres un produit et la durée indiquée sur son emballage pour retrouver le repère au bon moment.",
  },
  {
    icon: Layers3,
    title: "Compose à partir de ce que tu as",
    description: "Organise chaque geste, visualise les zones sur le Face Chart et choisis un tutoriel adapté à tes produits.",
  },
  {
    icon: Blend,
    title: "Retrouve une nuance",
    description: "Prélève une couleur depuis une photo et conserve-la dans ta palette pour la retrouver plus tard.",
  },
];

export default function DiscoverPage() {
  return (
    <div className={styles.site}>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <SiteHeader />
      <main id="contenu">
        <section className={styles.hero} aria-labelledby="discover-title">
          <div className={styles.heroCopy}>
            <h1 id="discover-title">Les rituels qui te ressemblent.</h1>
            <p>Réunis tes produits, compose tes routines et retrouve les teintes que tu aimes. Tout commence avec ce que tu possèdes déjà.</p>
            <div className={styles.actions}>
              <Link href="/" className={styles.primary}>Ouvrir mon espace</Link>
              <Link href="/installer" className={styles.secondary}>Installer Navier</Link>
            </div>
          </div>
          <div className={styles.heroFrame}>
            <Image
              src="/images/royal-vanity.webp"
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 94vw, 53vw"
            />
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div className={styles.featureLead}>
            <h2 id="features-title">De ta coiffeuse à tes routines.</h2>
            <p>Prends soin de ta collection avec des repères concrets pour choisir quoi utiliser, quand et dans quel ordre.</p>
            <Link href="/#vanity" className={styles.quietLink}>Découvrir le vanity</Link>
          </div>
          <ul className={styles.featureList}>
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <span className={styles.featureIcon}><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title">Un espace qui te suit.</h2>
            <p>Ouvre Navier dans ton navigateur ou ajoute son icône à ton écran d’accueil. L’espace local fonctionne sans compte.</p>
          </div>
          <Link href="/installer" className={styles.secondary}>Voir le guide d’installation</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
