"use client";

import type { StaticImageData } from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, ListChecks, ScanLine, ShoppingBag, SwatchBook } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import studioArt from "@/public/images/navier-carousel-studio.webp";
import routineArt from "@/public/images/navier-carousel-routine.webp";
import listsArt from "@/public/images/navier-carousel-listes.webp";
import type { Routine, State } from "@/lib/model";
import styles from "./home-discovery.module.css";

type DiscoveryRoute = "studio" | "routines" | "listes" | "catalogue" | "vanity" | "tutoriels";
type Copy = readonly [string, string];
type Slide = {
  route: "studio" | "routines" | "listes";
  art: StaticImageData | string;
  name: Copy;
  title: Copy;
  description: Copy;
  action: Copy;
};

const slides: readonly Slide[] = [
  {
    route: "studio",
    art: studioArt,
    name: ["Simulation maquillage", "Makeup simulator"],
    title: ["Simule un maquillage", "Try a makeup look"],
    description: ["Essaie tes teintes sur un visage interactif.", "Try your shades on an interactive face chart."],
    action: ["Ouvrir le studio", "Open the studio"],
  },
  {
    route: "routines",
    art: routineArt,
    name: ["Mes routines", "My routines"],
    title: ["Compose ta routine", "Build your routine"],
    description: ["Prépare et suis tes gestes, étape par étape.", "Plan and follow your routine, step by step."],
    action: ["Ouvrir mes routines", "Open my routines"],
  },
  {
    route: "listes",
    art: listsArt,
    name: ["Mes listes", "My lists"],
    title: ["Crée tes listes", "Create your lists"],
    description: ["Retrouve tes favoris et prépare tes prochains achats.", "Find your favourites and plan your next purchases."],
    action: ["Ouvrir mes listes", "Open my lists"],
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
      const count = getComputedStyle(track).getPropertyValue("--slides-visible").trim() === "2" ? 2 : 1;
      setVisible(count);
      setActive(Math.min(nearestSlide(track), slides.length - count));
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
    if (event.target !== event.currentTarget) return;
    switch (event.key) {
      case "ArrowLeft": moveSlide(-1); break;
      case "ArrowRight": moveSlide(1); break;
      case "Home": selectSlide(0); break;
      case "End": selectSlide(lastPage); break;
      default: return;
    }
    event.preventDefault();
  }

  return (
    <div className={styles.home}>
      <section className={styles.discovery} aria-labelledby="home-discovery-title" aria-roledescription={t("carrousel", "carousel")}>
        <h1 id="home-discovery-title">{t("Maquillage, routines et listes", "Makeup, routines and lists")}</h1>
        <div className={styles.carousel}>
          <div className={styles.rail} ref={rail} onScroll={observeSlide} onKeyDown={handleKeys} tabIndex={0}
            role="group" aria-label={t("Outils à découvrir", "Tools to explore")}>
            {slides.map(({ route, name, title, description, action, art }, index) => (
              <article key={route} className={styles.slide} data-theme={route}
                data-preview={index === current + visible ? "true" : undefined}
                aria-roledescription={t("diapositive", "slide")}
                aria-label={t(`${t(...name)}, ${index + 1} sur ${slides.length}`, `${t(...name)}, ${index + 1} of ${slides.length}`)}>
                <div className={styles.slideCopy}>
                  <h2>{t(...title)}</h2>
                  <p>{t(...description)}</p>
                  <button type="button" className={styles.slideAction} tabIndex={index >= current && index < current + visible ? 0 : -1}
                    onClick={() => onNavigate(route)}>{t(...action)}</button>
                </div>
                <div className={styles.artwork} aria-hidden="true">
                  <img alt="" src={typeof art === "string" ? art : art.src} decoding="async"
                    fetchPriority={index === 0 ? "high" : "low"}/>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.carouselControls}>
            <div className={styles.dots} role="group" aria-label={t("Choisir un outil", "Choose a tool")}>
              {slides.slice(0, lastPage + 1).map(({ route, name }, index) => {
                const firstName = t(...name);
                const lastName = t(...slides[index + visible - 1].name);
                const label = visible === 1 ? t(`Afficher ${firstName}`, `Show ${firstName}`)
                  : t(`Afficher ${firstName} et ${lastName}`, `Show ${firstName} and ${lastName}`);
                return <button key={route} type="button" aria-current={index === current ? "true" : undefined}
                  aria-label={label} onClick={() => selectSlide(index)}><span aria-hidden="true"/></button>;
              })}
            </div>
            <div className={styles.arrows}>
              <button type="button" disabled={current === 0} aria-label={t("Carte précédente", "Previous slide")} onClick={() => moveSlide(-1)}><ChevronLeft size={21} strokeWidth={1.8} aria-hidden="true"/></button>
              <button type="button" disabled={current === lastPage} aria-label={t("Carte suivante", "Next slide")} onClick={() => moveSlide(1)}><ChevronRight size={21} strokeWidth={1.8} aria-hidden="true"/></button>
            </div>
            <span className={styles.announcement} aria-live="polite">
              {visible === 1 ? t(...slides[current].name)
                : t(`Cartes ${current + 1} à ${current + visible}`, `Slides ${current + 1} to ${current + visible}`)}
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
