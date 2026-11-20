import { Monitor, Smartphone, TabletSmartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InstallControl } from "@/components/install-control";
import { Localized } from "@/lib/i18n";
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
    title: ["iPhone et iPad", "iPhone and iPad"],
    steps: [
      <Localized fr={<>Ouvre cette page dans <strong>Safari</strong>.</>} en={<>Open this page in <strong>Safari</strong>.</>}/>,
      <Localized fr={<>Ouvre <strong>Partager</strong> puis choisis <strong>Sur l’écran d’accueil</strong>.</>} en={<>Open <strong>Share</strong> and select <strong>Add to Home Screen</strong>.</>}/>,
      <Localized fr={<>Active <strong>Ouvrir comme app web</strong> si cette option apparaît, puis touche <strong>Ajouter</strong>.</>} en={<>Turn on <strong>Open as Web App</strong> if prompted, then tap <strong>Add</strong>.</>}/>,
    ],
  },
  {
    icon: TabletSmartphone,
    title: ["Android", "Android"],
    steps: [
      <Localized fr={<>Ouvre cette page dans <strong>Chrome</strong>.</>} en={<>Open this page in <strong>Chrome</strong>.</>}/>,
      <Localized fr={<>Dans le menu <strong>⋮</strong>, touche <strong>Ajouter à l’écran d’accueil</strong> ou <strong>Installer l’application</strong>.</>} en={<>In the <strong>⋮</strong> menu, tap <strong>Add to Home Screen</strong> or <strong>Install app</strong>.</>}/>,
      <Localized fr={<>Valide pour retrouver Navier parmi tes applications.</>} en={<>Confirm to find Navier among your apps.</>}/>,
    ],
  },
  {
    icon: Monitor,
    title: ["Ordinateur", "Desktop"],
    steps: [
      <Localized fr={<>Avec <strong>Chrome</strong> ou <strong>Edge</strong>, cherche l’icône d’installation dans la barre d’adresse.</>} en={<>In <strong>Chrome</strong> or <strong>Edge</strong>, look for the install icon in the address bar.</>}/>,
      <Localized fr={<>Tu peux aussi ouvrir le menu du navigateur et chercher <strong>Installer Navier</strong> ou <strong>Applications</strong>.</>} en={<>You can also open the browser menu and look for <strong>Install Navier</strong> or <strong>Apps</strong>.</>}/>,
      <Localized fr={<>Dans <strong>Safari</strong> sur macOS, utilise <strong>Fichier</strong> puis <strong>Ajouter au Dock</strong> si l’option est disponible.</>} en={<>In <strong>Safari</strong> on macOS, choose <strong>File</strong> and then <strong>Add to Dock</strong> if available.</>}/>,
    ],
  },
];

export default function InstallerPage() {
  return (
    <div className={site.site}>
      <a href="#installation" className="skip-link"><Localized fr="Aller au contenu" en="Skip to content"/></a>
      <SiteHeader />
      <main id="installation">
        <section className={styles.hero} aria-labelledby="installer-title">
          <div className={styles.intro}>
            <h1 id="installer-title"><Localized fr="Installe Navier." en="Install Navier."/></h1>
            <p className={styles.description}><Localized fr="Ajoute ton espace beauté à l’écran d’accueil et retrouve-le comme une application." en="Add your beauty workspace to your home screen and open it like an app."/></p>
            <InstallControl className={styles.installControl} />
            <Link href="/" className={site.quietLink}><Localized fr="Ouvrir Navier dans le navigateur" en="Open Navier in your browser"/></Link>
          </div>
        </section>

        <section className={styles.guides} aria-labelledby="guides-title">
          <h2 id="guides-title"><Localized fr="Sur ton appareil" en="On your device"/></h2>
          <div className={styles.guideGrid}>
            {guides.map(({ icon: Icon, title, steps }) => (
              <article className={styles.guide} key={title[0]}>
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                <h3><Localized fr={title[0]} en={title[1]}/></h3>
                <ol>
                  {steps.map((step, index) => <li key={index}>{step}</li>)}
                </ol>
              </article>
            ))}
          </div>
          <p className={styles.note}><Localized fr="Après une première ouverture en ligne, ton espace local et les outils déjà chargés restent accessibles hors connexion. La recherche externe et la synchronisation utilisent Internet." en="After you first open Navier online, your local workspace and tools you have loaded stay available offline. External search and sync require an internet connection."/></p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
