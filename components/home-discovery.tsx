"use client";

import { ArrowRight, BookOpen, ChevronRight, ScanLine, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { Routine, State } from "@/lib/model";
import styles from "./home-discovery.module.css";

type FeatureRoute = "routines" | "listes" | "studio";
type DiscoveryRoute = FeatureRoute | "styles" | "profile" | "catalogue" | "vanity" | "tutoriels";
type Copy = readonly [string, string];
type Feature = {
  route: FeatureRoute;
  title: Copy;
  description: Copy;
  action: Copy;
};

const features: readonly Feature[] = [
  {
    route: "routines",
    title: ["Compose tes routines", "Build your routines"],
    description: ["Ordonne tes gestes de soin, de maquillage ou de coiffage, puis suis-les étape par étape.", "Put your skincare, makeup or hair steps in order and follow them one at a time."],
    action: ["Ouvrir mes routines", "Open my routines"],
  },
  {
    route: "listes",
    title: ["Crée tes listes", "Create your lists"],
    description: ["Garde tes favoris, tes envies d’achat et les produits que tu ne rachèterais pas.", "Keep track of your favourites, what you want to buy and what you wouldn’t buy again."],
    action: ["Ouvrir mes listes", "Open my lists"],
  },
  {
    route: "studio",
    title: ["Simule un maquillage", "Try a makeup look"],
    description: ["Superpose tes teintes sur un visage interactif et enregistre les looks que tu veux refaire.", "Layer your shades on an interactive face and save the looks you want to recreate."],
    action: ["Ouvrir le studio", "Open the studio"],
  },
];

const shortcuts = [
  { route: "styles", label: ["Styles de maquillage", "Makeup styles"], icon: Sparkles },
  { route: "profile", label: ["Profil beauté", "Beauty profile"], icon: UserRound },
  { route: "catalogue", label: ["Catalogue", "Catalogue"], icon: ScanLine },
  { route: "vanity", label: ["Ma trousse", "My collection"], icon: ShoppingBag },
  { route: "tutoriels", label: ["Tutoriels", "Tutorials"], icon: BookOpen },
] satisfies ReadonlyArray<{ route: DiscoveryRoute; label: Copy; icon: typeof ScanLine }>;

interface HomeDiscoveryProps {
  state: State;
  onNavigate: (route: DiscoveryRoute) => void;
  onProduct: (id: string) => void;
  onRoutine: (routine: Routine) => void;
}

function RoutineArt() {
  return <g>
    <rect x="70" y="68" width="65" height="79" rx="12"/>
    <path d="M86 68V56h33v12m-16-12V39h26l10 7"/>
    <path d="M103 88c-10 13-12 17-12 22a12 12 0 0 0 24 0c0-5-3-9-12-22Z"/>
    <path d="M157 89c0-7 4-12 11-14l5-3v-8h28v8l5 3c7 2 11 7 11 14v47a11 11 0 0 1-11 11h-38a11 11 0 0 1-11-11Z"/>
    <rect x="170" y="50" width="34" height="14" rx="3"/>
    <path d="M181 50V39a6 6 0 0 1 12 0v11m-20 63h28"/>
    <rect x="237" y="104" width="56" height="17" rx="5"/>
    <path d="M241 121v17a9 9 0 0 0 9 9h30a9 9 0 0 0 9-9v-17"/>
  </g>;
}

function ListsArt() {
  return <g>
    <g transform="rotate(-8 141 90)">
      <rect x="92" y="34" width="103" height="113" rx="12"/>
      <path d="M128 34v-5a6 6 0 0 1 6-6h19a6 6 0 0 1 6 6v5M110 62l5 6 9-12m12 7h38m-64 27 5 6 9-12m12 7h30m-56 27 5 6 9-12m12 7h33"/>
    </g>
    <path d="M243 120c-7-6-30-20-30-36 0-9 6-16 15-16 7 0 12 4 15 10 3-6 8-10 15-10 9 0 15 7 15 16 0 16-23 30-30 36Z"/>
  </g>;
}

function StudioArt() {
  return <g>
    <rect x="83" y="103" width="126" height="45" rx="17"/>
    <ellipse cx="146" cy="125" rx="43" ry="12"/>
    <path d="M123 103v-8m46 8v-8"/>
    <rect x="95" y="27" width="102" height="69" rx="33"/>
    <rect x="105" y="37" width="82" height="49" rx="24"/>
    <path d="m152 72 20-20m-14 23 13-13" strokeWidth="3"/>
    <g transform="rotate(20 252 87)">
      <path d="M236 63c-3-12 4-23 16-32 12 9 19 20 16 32l-6 13h-20Z"/>
      <path d="M242 76h20v12h-20zm4 12v51a6 6 0 0 0 12 0V88"/>
    </g>
  </g>;
}

function FeatureArt({ route }: { route: FeatureRoute }) {
  return <svg className={styles.artwork} viewBox="0 0 340 160" aria-hidden="true" focusable="false"
    fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round">
    {route === "routines" && <RoutineArt/>}
    {route === "listes" && <ListsArt/>}
    {route === "studio" && <StudioArt/>}
  </svg>;
}

export function HomeDiscovery({ state, onNavigate, onProduct, onRoutine }: HomeDiscoveryProps) {
  const { t } = useLocale();
  const savedProducts = state.products.slice(0, 3);
  const savedRoutines = state.routines.slice(0, 3);
  const savedLists = (state.lists ?? []).slice(0, 3);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const sessions = state.completed.filter(({ at }) => Date.parse(at) >= weekStart.getTime()).length;

  return (
    <div className={styles.home}>
      <section className={styles.discovery} aria-labelledby="home-discovery-title">
        <header className={styles.intro}>
          <h1 id="home-discovery-title">{t("Tes produits, tes routines et tes looks", "Your products, routines and makeup looks")}</h1>
          <p>{t("Organise les produits que tu possèdes, prépare tes routines et teste des maquillages sur un visage interactif.",
            "Organise the products you own, plan your routines and try makeup looks on an interactive face.")}</p>
        </header>
        <div className={styles.featureGrid}>
          {features.map(({ route, title, description, action }) => (
            <article key={route} className={styles.feature} data-theme={route} aria-labelledby={`home-feature-${route}`}>
              <div className={styles.featureCopy}>
                <h2 id={`home-feature-${route}`}>{t(...title)}</h2>
                <p>{t(...description)}</p>
              </div>
              <FeatureArt route={route}/>
              <button type="button" className={styles.featureAction} onClick={() => onNavigate(route)}>
                {t(...action)} <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true"/>
              </button>
            </article>
          ))}
        </div>
      </section>

      <nav className={styles.shortcuts} aria-label={t("Accès rapides", "Shortcuts")}>
        {shortcuts.map(({ route, label, icon: Icon }) => (
          <button className={styles.shortcut} data-route={route} type="button" key={route} onClick={() => onNavigate(route)}>
            <span><Icon size={23} strokeWidth={1.6} aria-hidden="true"/></span>
            {t(...label)}
          </button>
        ))}
      </nav>

      {(savedProducts.length > 0 || savedRoutines.length > 0 || savedLists.length > 0 || sessions > 0) && (
        <div className={styles.saved}>
          {savedProducts.length > 0 && (
            <section aria-labelledby="home-saved-products">
              <div className={styles.savedHeading}>
                <h2 id="home-saved-products">{t("Ma trousse", "My collection")}</h2>
                <button type="button" onClick={() => onNavigate("vanity")}>{t("Tout voir", "View all")}</button>
              </div>
              <ul>
                {savedProducts.map((product) => (
                  <li key={product.id}>
                    <button type="button" onClick={() => onProduct(product.id)}>
                      <span><strong>{product.name}</strong>{product.brand && <small>{product.brand}</small>}</span>
                      <ChevronRight size={17} aria-hidden="true"/>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(savedRoutines.length > 0 || sessions > 0) && (
            <section aria-labelledby="home-saved-routines">
              <div className={styles.savedHeading}>
                <h2 id="home-saved-routines">{t("Mes routines", "My routines")}</h2>
                <button type="button" onClick={() => onNavigate("routines")}>{t("Tout voir", "View all")}</button>
              </div>
              {sessions > 0 && <p className={styles.savedCount}>{sessions === 1 ? t("1 routine terminée ces 7 derniers jours", "1 routine completed in the last 7 days") :
                t(`${sessions} routines terminées ces 7 derniers jours`, `${sessions} routines completed in the last 7 days`)}</p>}
              <ul>
                {savedRoutines.map((routine) => (
                  <li key={routine.id}>
                    <button type="button" onClick={() => onRoutine(routine)}>
                      <span><strong>{routine.name}</strong><small>{routine.steps.length} {routine.steps.length === 1 ? t("étape", "step") : t("étapes", "steps")}</small></span>
                      <ChevronRight size={17} aria-hidden="true"/>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {savedLists.length > 0 && (
            <section aria-labelledby="home-saved-lists">
              <div className={styles.savedHeading}>
                <h2 id="home-saved-lists">{t("Mes listes", "My lists")}</h2>
                <button type="button" onClick={() => onNavigate("listes")}>{t("Tout voir", "View all")}</button>
              </div>
              <ul>
                {savedLists.map((list) => (
                  <li key={list.id}>
                    <div className={styles.savedListRow}>
                      <span><strong>{list.name}</strong><small>{list.items.length} {list.items.length === 1 ? t("élément", "item") : t("éléments", "items")}</small></span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
