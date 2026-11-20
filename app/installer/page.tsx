import { Monitor, Smartphone, TabletSmartphone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstallControl } from "@/components/install-control";
import { SiteFooter, SiteHeader } from "../decouvrir/site-shell";
import site from "../decouvrir/site.module.css";
import styles from "./installer.module.css";

export const metadata: Metadata = {
  title: "Installer Navier — Guide par appareil",
  description: "Ajoute Navier à l’écran d’accueil de ton appareil ou utilise ton espace beauté dans ton navigateur.",
};

const guides = [
  {
    icon: Smartphone,
    title: "iPhone et iPad",
    steps: [
      <>Ouvre cette page dans <strong>Safari</strong>.</>,
      <>Ouvre <strong>Partager</strong> puis choisis <strong>Sur l’écran d’accueil</strong>.</>,
      <>Active <strong>Ouvrir comme app web</strong> si cette option apparaît, puis touche <strong>Ajouter</strong>.</>,
    ],
  },
  {
    icon: TabletSmartphone,
    title: "Android",
    steps: [
      <>Ouvre cette page dans <strong>Chrome</strong>.</>,
      <>Dans le menu <strong>⋮</strong>, touche <strong>Ajouter à l’écran d’accueil</strong> ou <strong>Installer l’application</strong>.</>,
      <>Valide pour retrouver Navier parmi tes applications.</>,
    ],
  },
  {
    icon: Monitor,
    title: "Ordinateur",
    steps: [
      <>Avec <strong>Chrome</strong> ou <strong>Edge</strong>, cherche l’icône d’installation dans la barre d’adresse.</>,
      <>Tu peux aussi ouvrir le menu du navigateur et chercher <strong>Installer Navier</strong> ou <strong>Applications</strong>.</>,
      <>Dans <strong>Safari</strong> sur macOS, utilise <strong>Fichier</strong> puis <strong>Ajouter au Dock</strong> si l’option est disponible.</>,
    ],
  },
];

export default function InstallerPage() {
  return (
    <div className={site.site}>
      <a href="#installation" className="skip-link">Aller au contenu</a>
      <SiteHeader />
      <main id="installation">
        <section className={styles.hero} aria-labelledby="installer-title">
          <div className={styles.intro}>
            <Image src="/icons/navier-192.png" alt="" width={100} height={100} className={styles.appIcon} unoptimized />
            <h1 id="installer-title">Installe Navier.</h1>
            <p className={styles.description}>Ajoute ton espace beauté à l’écran d’accueil et retrouve-le comme une application.</p>
            <InstallControl className={styles.installControl} />
            <Link href="/" className={site.quietLink}>Ouvrir Navier dans le navigateur</Link>
          </div>
        </section>

        <section className={styles.guides} aria-labelledby="guides-title">
          <h2 id="guides-title">Sur ton appareil</h2>
          <div className={styles.guideGrid}>
            {guides.map(({ icon: Icon, title, steps }) => (
              <article className={styles.guide} key={title}>
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                <h3>{title}</h3>
                <ol>
                  {steps.map((step, index) => <li key={index}>{step}</li>)}
                </ol>
              </article>
            ))}
          </div>
          <p className={styles.note}>Après une première ouverture en ligne, ton espace local et les outils déjà chargés restent accessibles hors connexion. La recherche externe et la synchronisation utilisent Internet.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
