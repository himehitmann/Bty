import Link from "next/link";
import styles from "./site.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/decouvrir" aria-label="Navier, accueil du site" className={styles.wordmark}>
          <span>NAVIER</span>
        </Link>
        <nav aria-label="Navigation du site" className={styles.nav}>
          <Link href="/installer">Installer</Link>
          <Link href="/#offres">Offres</Link>
          <Link href="/" className={styles.navAction}>Mon espace</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Link href="/decouvrir" className={styles.footerMark}>NAVIER</Link>
        <nav aria-label="Liens de pied de page" className={styles.footerLinks}>
          <Link href="/installer">Guide d’installation</Link>
          <Link href="/#offres">Offres</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
