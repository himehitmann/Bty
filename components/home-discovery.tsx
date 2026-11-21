"use client";

import { BookOpen, ChevronRight, ScanLine, ShoppingBag, Sparkles, UserRound } from "lucide-react";
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
};

const features: readonly Feature[] = [
  {
    route: "routines",
    title: ["Compose tes routines", "Build your routines"],
    description: ["Ordonne tes gestes de soin, de maquillage ou de coiffage, puis suis-les étape par étape.", "Put your skincare, makeup or hair steps in order and follow them one at a time."],
  },
  {
    route: "listes",
    title: ["Crée tes listes", "Create your lists"],
    description: ["Garde tes favoris, tes envies d’achat et les produits que tu ne rachèterais pas.", "Keep track of your favourites, what you want to buy and what you wouldn’t buy again."],
  },
  {
    route: "studio",
    title: ["Simule un maquillage", "Try a makeup look"],
    description: ["Superpose tes teintes sur un visage interactif et enregistre les looks que tu veux refaire.", "Layer your shades on an interactive face and save the looks you want to recreate."],
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
    <g transform="rotate(9 132 115)">
      <path d="M104 92c0-10 6-17 15-21l5-3V55h38v13l5 3c9 4 15 11 15 21v76a13 13 0 0 1-13 13h-52a13 13 0 0 1-13-13Z" fill="var(--art-secondary)"/>
      <rect x="119" y="45" width="48" height="20" rx="5" fill="var(--art-depth)"/>
      <path d="M135 45V32a8 8 0 0 1 16 0v13" fill="var(--art-primary)"/>
      <path d="M125 111h35m-35 12h27" fill="none"/>
    </g>
    <g transform="rotate(-11 72 121)">
      <path d="M41 73V56h44v17M55 56V40h38l11 10H81v6" fill="var(--art-depth)"/>
      <rect x="20" y="72" width="87" height="120" rx="19" fill="var(--art-primary)"/>
      <path d="M63 101c-13 17-16 23-16 29a16 16 0 1 0 32 0c0-6-4-12-16-29Z" fill="none"/>
      <path d="M40 159h47" fill="none"/>
    </g>
    <g transform="rotate(6 185 167)">
      <path d="M149 160v20a14 14 0 0 0 14 14h49a14 14 0 0 0 14-14v-20Z" fill="var(--art-primary)"/>
      <rect x="144" y="141" width="87" height="22" rx="8" fill="var(--art-depth)"/>
      <path d="M173 178h28" fill="none"/>
    </g>
  </g>;
}

function ListsArt() {
  return <g>
    <g transform="rotate(-11 95 111)">
      <rect x="20" y="31" width="147" height="161" rx="19" fill="var(--art-depth)"/>
      <rect x="32" y="44" width="123" height="135" rx="12" fill="var(--art-primary)"/>
      <path d="M67 40v-9a9 9 0 0 1 9-9h35a9 9 0 0 1 9 9v9Z" fill="var(--art-secondary)"/>
      <path d="m54 73 8 9 14-17m17 10h42M54 107l8 9 14-17m17 10h34M54 141l8 9 14-17m17 10h42" fill="none"/>
    </g>
    <g transform="rotate(11 176 148)">
      <rect x="135" y="112" width="91" height="76" rx="19" fill="var(--art-secondary)"/>
      <path d="M181 168c-7-5-24-15-24-27 0-7 5-12 11-12 6 0 10 3 13 8 2-5 6-8 12-8 7 0 11 5 11 12 0 12-17 22-23 27Z" fill="var(--art-depth)"/>
    </g>
  </g>;
}

function StudioArt() {
  return <g>
    <g transform="rotate(-8 96 109)">
      <rect x="26" y="29" width="144" height="99" rx="49" fill="var(--art-primary)"/>
      <rect x="37" y="40" width="122" height="77" rx="38" fill="var(--art-secondary)"/>
      <path d="m108 90 25-25m-17 31 18-18" fill="none"/>
      <path d="M61 138v-13h74v13" fill="var(--art-depth)"/>
      <rect x="14" y="134" width="166" height="54" rx="23" fill="var(--art-depth)"/>
      <ellipse cx="97" cy="159" rx="62" ry="16" fill="var(--art-primary)"/>
    </g>
    <g transform="rotate(20 196 116)">
      <path d="M172 83c-4-17 5-33 24-45 19 12 28 28 24 45l-9 17h-30Z" fill="var(--art-primary)"/>
      <path d="M181 100h30v17h-30Z" fill="var(--art-secondary)"/>
      <path d="M187 117v66a9 9 0 0 0 18 0v-66Z" fill="var(--art-depth)"/>
      <path d="M195 58q-10 11-9 23" fill="none"/>
    </g>
  </g>;
}

function FeatureArt({ route }: { route: FeatureRoute }) {
  return <svg className={styles.artwork} viewBox="0 0 242 214" aria-hidden="true" focusable="false"
    fill="none" stroke="#fff" strokeOpacity=".64" strokeWidth="3.3" strokeLinejoin="round" strokeLinecap="round">
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
          {features.map(({ route, title, description }) => (
            <article key={route} className={styles.feature} data-theme={route}>
              <a className={styles.featureLink} href={`#${route}`}
                onClick={(event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onNavigate(route);
                }}>
                <div className={styles.featureCopy}>
                  <h2>{t(...title)}</h2>
                  <p>{t(...description)}</p>
                </div>
                <FeatureArt route={route}/>
              </a>
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
