"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Circle, Droplet, ListChecks, ScanLine, ShoppingBag, Sun, SwatchBook } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { Routine, State } from "@/lib/model";
import styles from "./home-discovery.module.css";

type DiscoveryRoute = "studio" | "routines" | "listes" | "catalogue" | "vanity" | "tutoriels";
type Copy = readonly [string, string];
type Slide = {
  route: "studio" | "routines" | "listes" | "catalogue";
  name: Copy;
  title: Copy;
  description: Copy;
  action: Copy;
};

const slides: readonly Slide[] = [
  {
    route: "studio",
    name: ["Simulation maquillage", "Makeup simulator"],
    title: ["Simule un maquillage", "Try a makeup look"],
    description: ["Place un blush ou un rouge à lèvres sur le visage interactif et vois les couleurs ensemble.", "Place blush or lipstick on the interactive face chart and see how the colors look together."],
    action: ["Ouvrir le studio", "Open the studio"],
  },
  {
    route: "routines",
    name: ["Mes routines", "My routines"],
    title: ["Compose ta routine", "Build your routine"],
    description: ["Choisis les produits que tu utilises et organise tes gestes dans l’ordre qui te convient.", "Choose the products you use and arrange the steps in an order that works for you."],
    action: ["Ouvrir mes routines", "Open my routines"],
  },
  {
    route: "listes",
    name: ["Mes listes", "My lists"],
    title: ["Crée tes listes", "Create your lists"],
    description: ["Garde tes favoris, tes achats à prévoir et les raisons de tes déceptions.", "Keep your favourites, planned purchases and the reasons for your disappointments."],
    action: ["Ouvrir mes listes", "Open my lists"],
  },
  {
    route: "catalogue",
    name: ["Catalogue", "Catalog"],
    title: ["Retrouve un produit", "Find a product"],
    description: ["Cherche par nom, marque ou code-barres et ajoute le produit à ta collection.", "Search by name, brand or barcode and save products to your collection."],
    action: ["Voir le catalogue", "Open the catalog"],
  },
];

const shortcuts = [
  { route: "studio", label: ["Simuler un look", "Try a look"], icon: SwatchBook },
  { route: "routines", label: ["Mes routines", "My routines"], icon: ListChecks },
  { route: "listes", label: ["Mes listes", "My lists"], icon: Check },
  { route: "catalogue", label: ["Catalogue", "Catalog"], icon: ScanLine },
  { route: "vanity", label: ["Mes produits", "My products"], icon: ShoppingBag },
  { route: "tutoriels", label: ["Tutoriels", "Tutorials"], icon: BookOpen },
] satisfies ReadonlyArray<{ route: DiscoveryRoute; label: Copy; icon: typeof ScanLine }>;

interface HomeDiscoveryProps {
  state: State;
  onNavigate: (route: DiscoveryRoute) => void;
  onProduct: (id: string) => void;
  onRoutine: (routine: Routine) => void;
}

function ShadeArt() {
  return (
    <div className={styles.shadeArt} aria-hidden="true">
      <div className={styles.faceCard}>
        <svg className={styles.faceSketch} viewBox="0 0 152 168" fill="none">
          <path d="M43 119c-1 19-9 28-22 34m88-34c1 19 9 28 22 34" stroke="#372746" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M34 72c-3-20 2-36 14-44 8-7 18-10 28-10 17 0 30 7 38 19 6 9 7 22 4 35l-3 24c-3 20-17 41-33 49-4 2-8 2-12 0-16-8-30-29-33-49l-3-24Z" fill="#fcf0ef" stroke="#372746" strokeWidth="1.5" />
          <path d="M32 76c-5-8-8-20-6-31C30 26 49 11 70 11c14 0 22 3 29 8 14 2 25 11 27 25 3 13-2 23-8 31l-3-19c-7-4-13-11-16-19C87 49 61 56 37 57l-5 19Z" fill="#d7c6ef" stroke="#372746" strokeWidth="1.35" strokeLinejoin="round" />
          <path d="M42 69c-6-4-10 1-9 8 1 8 4 13 9 13m68-21c6-4 10 1 9 8-1 8-4 13-9 13" stroke="#372746" strokeWidth="1.45" strokeLinecap="round" />
          <ellipse cx="52" cy="93" rx="11" ry="6" fill="#d37598" opacity=".7" transform="rotate(15 52 93)" />
          <ellipse cx="100" cy="93" rx="11" ry="6" fill="#d37598" opacity=".7" transform="rotate(-15 100 93)" />
          <path d="M45 67c7-4 15-4 21-1m20 0c6-3 14-3 21 1M46 77c7 5 14 5 20 0m20 0c6 5 13 5 20 0M75 80c1 7-2 13-3 17 2 3 6 3 9 2" stroke="#372746" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M65 115c4-1 6-4 10-2 4-2 7 1 12 2-5 6-8 7-11 7-4 0-7-2-11-7Z" fill="#a64872" />
        </svg>
      </div>
      <span className={styles.swatches}><i/><i/><i/></span>
    </div>
  );
}

function RoutineArt() {
  const { t } = useLocale();
  return (
    <ol className={styles.routineArt} aria-hidden="true">
      <li><Droplet size={19} /><strong>{t("Nettoyer", "Cleanse")}</strong><Check size={14}/></li>
      <li><Droplet size={19} fill="currentColor" fillOpacity={.14} /><strong>{t("Hydrater", "Moisturize")}</strong><Check size={14}/></li>
      <li><Sun size={19} /><strong>{t("Protéger", "Protect")}</strong><Circle size={13}/></li>
    </ol>
  );
}

function ListArt() {
  const { t } = useLocale();
  return (
    <div className={styles.listArt} aria-hidden="true">
      <div className={styles.listPaper}>
        <div className={styles.paperTitle}><ShoppingBag size={17}/><strong>{t("Mes achats", "My shopping")}</strong></div>
        <div><Check size={15}/><span>{t("À retrouver", "Find again")}</span></div>
        <div><Circle size={12}/><span>{t("À essayer", "Try next")}</span></div>
      </div>
    </div>
  );
}

function CatalogArt() {
  return (
    <div className={styles.catalogArt} aria-hidden="true">
      <div className={styles.catalogPaper}>
        <ScanLine size={18}/>
        <span/>
      </div>
      <div className={styles.catalogProduct}><Droplet size={22} strokeWidth={1.35}/></div>
    </div>
  );
}

const artwork = { studio: ShadeArt, routines: RoutineArt, listes: ListArt, catalogue: CatalogArt };

function nearestSlide(track: HTMLDivElement) {
  const start = track.getBoundingClientRect().left;
  let nearest = 0;
  let distance = Infinity;
  Array.from(track.children).forEach((card, index) => {
    const delta = Math.abs(card.getBoundingClientRect().left - start);
    if (delta < distance) {
      nearest = index;
      distance = delta;
    }
  });
  return nearest;
}

export function HomeDiscovery({ state, onNavigate, onProduct, onRoutine }: HomeDiscoveryProps) {
  const { t } = useLocale();
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(1);
  const lastPage = slides.length - visible;
  const current = Math.min(active, lastPage);
  const savedProducts = state.products.slice(0, 3);
  const savedRoutines = state.routines.slice(0, 3);
  const savedLists = (state.lists ?? []).slice(0, 3);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const sessions = state.completed.filter(({ at }) => Date.parse(at) >= weekStart.getTime()).length;

  useEffect(() => {
    const track = rail.current;
    if (!track) return;
    function measure() {
      if (!track) return;
      const columns = Number(getComputedStyle(track).getPropertyValue("--slides-visible"));
      setVisible(columns >= 1 && columns <= slides.length ? columns : 1);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function selectSlide(index: number) {
    const track = rail.current;
    const card = track?.children[index];
    if (!track || !card) return;
    const offset = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({ left: track.scrollLeft + offset });
  }

  function moveSlide(direction: -1 | 1) {
    const track = rail.current;
    if (track) selectSlide(Math.max(0, Math.min(lastPage, nearestSlide(track) + direction)));
  }

  function observeSlide() {
    const track = rail.current;
    if (track) setActive(nearestSlide(track));
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    moveSlide(event.key === "ArrowLeft" ? -1 : 1);
  }

  return (
    <div className={styles.home}>
      <section className={styles.discovery} aria-labelledby="home-discovery-title" aria-roledescription={t("carrousel", "carousel")}>
        <h1 id="home-discovery-title">{t("Maquillage, routines et listes", "Makeup, routines and lists")}</h1>
        <div className={styles.carousel}>
          <div className={styles.rail} ref={rail} onScroll={observeSlide} onKeyDown={handleKeys} tabIndex={0}
            role="group" aria-label={t("Outils à découvrir", "Tools to explore")}>
            {slides.map(({ route, name, title, description, action }, index) => {
              const Artwork = artwork[route];
              return (
                <article key={route} className={styles.slide} data-theme={route}
                  aria-roledescription={t("diapositive", "slide")}
                  aria-label={t(`${t(...name)}, ${index + 1} sur ${slides.length}`, `${t(...name)}, ${index + 1} of ${slides.length}`)}>
                  <div className={styles.slideCopy}>
                    <h2>{t(...title)}</h2>
                    <p>{t(...description)}</p>
                    <button type="button" className={styles.slideAction} tabIndex={index >= current && index < current + visible ? 0 : -1}
                      onClick={() => onNavigate(route)}>{t(...action)}</button>
                  </div>
                  <div className={styles.artwork}><Artwork/></div>
                </article>
              );
            })}
          </div>
          <div className={styles.carouselControls}>
            <div className={styles.dots} role="group" aria-label={t("Choisir un outil", "Choose a tool")}>
              {slides.slice(0, lastPage + 1).map(({ route, name }, index) => {
                const lastName = slides[index + visible - 1].name;
                const label = visible === 1 ? t(`Afficher ${name[0]}`, `Show ${name[1]}`) :
                  t(`Afficher de ${name[0]} à ${lastName[0]}`, `Show ${name[1]} through ${lastName[1]}`);
                return <button key={route} type="button" aria-current={index === current ? "true" : undefined}
                  aria-label={label} onClick={() => selectSlide(index)}><span aria-hidden="true"/></button>;
              })}
            </div>
            <div className={styles.arrows}>
              <button type="button" disabled={current === 0} aria-label={t("Carte précédente", "Previous slide")} onClick={() => moveSlide(-1)}><ChevronLeft size={21} strokeWidth={1.8} aria-hidden="true"/></button>
              <button type="button" disabled={current === lastPage} aria-label={t("Carte suivante", "Next slide")} onClick={() => moveSlide(1)}><ChevronRight size={21} strokeWidth={1.8} aria-hidden="true"/></button>
            </div>
            <span className={styles.announcement} aria-live="polite">
              {visible === 1 ? t(...slides[current].name) : t(`Cartes ${current + 1} à ${current + visible}`, `Slides ${current + 1} to ${current + visible}`)}
            </span>
          </div>
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
                <h2 id="home-saved-products">{t("Mes produits", "My products")}</h2>
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
