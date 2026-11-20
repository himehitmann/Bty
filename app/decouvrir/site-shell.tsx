"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import styles from "./site.module.css";

export function SiteHeader() {
  const { t } = useLocale();
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/decouvrir" aria-label={t("Navier, accueil du site", "Navier home page")} className={styles.wordmark}>
          <span>NAVIER</span>
        </Link>
        <nav aria-label={t("Navigation du site", "Site navigation")} className={styles.nav}>
          <Link href="/installer">{t("Installer", "Install")}</Link>
          <Link href="/#offres">{t("Offres", "Plans")}</Link>
          <Link href="/" className={styles.navAction}>{t("Mon espace", "My workspace")}</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Link href="/decouvrir" className={styles.footerMark}>NAVIER</Link>
        <nav aria-label={t("Liens de pied de page", "Footer links")} className={styles.footerLinks}>
          <Link href="/installer">{t("Guide d’installation", "Installation guide")}</Link>
          <Link href="/#offres">{t("Offres", "Plans")}</Link>
          <Link href="/confidentialite">{t("Confidentialité", "Privacy")}</Link>
        </nav>
      </div>
    </footer>
  );
}
