"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowRight, BookOpen, CalendarCheck, ChevronRight, Download, House, Layers, ListChecks, LogIn, LogOut, Plus, Search, Settings, ShoppingBag, SwatchBook, X } from "lucide-react";
import { Catalog, Inventory, ProductEditor } from "./inventory";
import { Palette } from "./palette";
import { Routines } from "./routines";
import { Tutorials } from "./tutorials";
import { Journal } from "./journal";
import { Plans } from "./plans";
import { ProfileFields, RoutineCoach } from "./profile-coach";
import { useBillingStatus } from "@/lib/billing-client";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { categoryLabels, preferenceSchema, type Product, type Routine, type State } from "@/lib/model";
import { getPalettePhotoUrl, removePalettePhoto, uploadPalettePhoto } from "@/lib/supabase/browser";
import { useWorkspaceState } from "@/lib/use-workspace";

const navigation = [
  { id: "accueil", fr: "Accueil", en: "Home", icon: House },
  { id: "catalogue", fr: "Rechercher", en: "Find products", icon: Search },
  { id: "vanity", fr: "Mes produits", en: "My products", icon: ShoppingBag },
  { id: "routines", fr: "Mes routines", en: "My routines", icon: ListChecks },
  { id: "palette", fr: "Mes teintes", en: "My shades", icon: SwatchBook },
  { id: "tutoriels", fr: "Tutoriels", en: "Tutorials", icon: BookOpen },
  { id: "journal", fr: "Journal", en: "Journal", icon: CalendarCheck },
  { id: "preferences", fr: "Paramètres", en: "Settings", icon: Settings },
  { id: "offres", fr: "Offres", en: "Plans", icon: Layers },
] as const;
type View = (typeof navigation)[number]["id"];
type WorkspaceData = ReturnType<typeof useWorkspaceState>;

function readView(portable: boolean): View {
  const hash = location.hash.slice(1);
  const view = navigation.find((item) => item.id === hash)?.id ?? "accueil";
  return portable && (view === "journal" || view === "offres") ? "accueil" : view;
}

export function Workspace({ portable = false }: { portable?: boolean }) {
  const data = useWorkspaceState(portable);
  return <LocaleProvider locale={data.state.preferences.locale}><WorkspaceShell data={data} portable={portable}/></LocaleProvider>;
}

function WorkspaceShell({ data, portable }: { data: WorkspaceData; portable: boolean }) {
  const { t, locale } = useLocale();
  const { state, user, client, ready, update, sync, notice, setNotice } = data;
  const billing = useBillingStatus(user?.id, !portable);
  const [view, setView] = useState<View>("accueil");
  const [catalogue, setCatalogue] = useState({ query: "", revision: 0 });
  const [productEditor, setProductEditor] = useState<Product | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [guide, setGuide] = useState<string>();
  const [auth, setAuth] = useState(false);
  const accountDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);

  useEffect(() => {
    const onHistoryChange = () => {
      setView(readView(portable));
      setSelected(null);
      setGuide(undefined);
      setProductEditor(null);
    };
    onHistoryChange();
    window.addEventListener("popstate", onHistoryChange);
    window.addEventListener("hashchange", onHistoryChange);
    return () => {
      window.removeEventListener("popstate", onHistoryChange);
      window.removeEventListener("hashchange", onHistoryChange);
    };
  }, [portable]);

  useEffect(() => {
    if (portable || process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).then((registration) => {
      const assets = [
        ...Array.from(document.scripts, (script) => script.src),
        ...Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]"), (link) => link.href),
        ...performance.getEntriesByType("resource").map((entry) => entry.name),
      ].filter(Boolean);
      registration.active?.postMessage({ type: "WARM_SHELL", assets });
    }).catch(() => {});
  }, [portable]);

  useEffect(() => {
    if (auth && !accountDialog.current?.open) accountDialog.current?.showModal();
  }, [auth]);

  const activeAccount = user?.id;
  useEffect(() => {
    setSelected(null);
    setGuide(undefined);
    setProductEditor(null);
  }, [activeAccount]);

  function navigate(next: View, focus = true) {
    setView(next);
    setSelected(null);
    setProductEditor(null);
    setGuide(undefined);
    setNotice("");
    if (next !== readView(portable)) history.pushState(null, "", `#${next}`);
    window.scrollTo(0, 0);
    if (focus) requestAnimationFrame(() => content.current?.focus());
  }

  function navClick(event: MouseEvent<HTMLAnchorElement>, next: View) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(next);
  }

  function openCatalogue(query = "") {
    setCatalogue((current) => ({ query, revision: current.revision + 1 }));
    navigate("catalogue");
  }

  function saveProduct(product: Product) {
    const saved = update((previous) => ({
      ...previous,
      products: previous.products.some(({ id }) => id === product.id)
        ? previous.products.map((item) => item.id === product.id ? product : item)
        : [product, ...previous.products],
    }));
    if (saved) {
      if (productEditor) setSelected(product.id);
      setProductEditor(null);
      setNotice(t(`« ${product.name} » enregistré.`, `“${product.name}” saved.`));
    }
    return saved;
  }

  function removeProduct(id: string) {
    if (!update((previous) => ({
      ...previous,
      products: previous.products.filter((item) => item.id !== id),
      routines: previous.routines.map((routine) => ({ ...routine, steps: routine.steps.filter((step) => step.productId !== id) })),
    }))) return;
    setProductEditor(null);
    setSelected(null);
    setNotice(t("Produit supprimé.", "Product removed."));
  }

  function complete(routine: Routine) {
    const saved = update((previous) => ({
      ...previous,
      completed: [{ routineId: routine.id, at: new Date().toISOString() }, ...previous.completed].slice(0, 1000),
    }));
    if (saved) setNotice(t(`« ${routine.name} » terminée.`, `“${routine.name}” completed.`));
    return saved;
  }

  function createRoutine(routine: Routine) {
    if (state.routines.length >= 100) {
      setNotice(t("La limite de 100 routines est atteinte.", "The limit of 100 routines has been reached."));
      return false;
    }
    if (!update((previous) => ({ ...previous, routines: [...previous.routines, routine] }))) return false;
    navigate("routines");
    setNotice(t(`« ${routine.name} » ajoutée.`, `“${routine.name}” added.`));
    return true;
  }

  const label = (id: View) => {
    const item = navigation.find((entry) => entry.id === id)!;
    return t(item.fr, item.en);
  };
  const availableNavigation = portable ? navigation.filter(({ id }) => id !== "journal" && id !== "offres") : navigation;
  const status = {
    loading: t("Chargement", "Loading"),
    local: t("Sur cet appareil", "On this device"),
    saving: t("Enregistrement", "Saving"),
    synced: t("Synchronisé", "Synced"),
    error: t("Synchronisation indisponible", "Sync unavailable"),
    conflict: t("Conflit de synchronisation", "Sync conflict"),
  }[sync];

  return <div className="app-shell">
    <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); content.current?.focus(); }}>{t("Aller au contenu", "Skip to content")}</a>
    <aside className="sidebar">
      <div className="sidebar-top">
        <a className="brand" href="#accueil" aria-label={t("Navier, accueil", "Navier, home")} onClick={(event) => navClick(event, "accueil")}>Navier</a>
        <a className={`icon-button mobile-settings${view === "preferences" ? " nav-current" : ""}`} href="#preferences" aria-label={label("preferences")}
          aria-current={view === "preferences" ? "page" : undefined} onClick={(event) => navClick(event, "preferences")}><Settings size={19} aria-hidden="true"/></a>
      </div>
      <nav className="navigation" aria-label={t("Navigation principale", "Main navigation")}>
        {availableNavigation.filter(({ id }) => id !== "preferences" && id !== "offres").map(({ id, icon: Icon }) =>
          <a key={id} href={`#${id}`} className={`nav-link${view === id ? " nav-current" : ""}`} aria-current={view === id ? "page" : undefined}
            onClick={(event) => navClick(event, id)}><Icon size={16} strokeWidth={1.65} aria-hidden="true"/><span>{label(id)}</span></a>
        )}
        {!portable && <a className={`nav-link mobile-offers${view === "offres" ? " nav-current" : ""}`} href="#offres" aria-current={view === "offres" ? "page" : undefined}
          onClick={(event) => navClick(event, "offres")}><Layers size={16} strokeWidth={1.65} aria-hidden="true"/><span>{label("offres")}</span></a>}
      </nav>
      <div className="sidebar-bottom">
        <a className={`nav-link${view === "preferences" ? " nav-current" : ""}`} href="#preferences" aria-current={view === "preferences" ? "page" : undefined}
          onClick={(event) => navClick(event, "preferences")}><Settings size={16} strokeWidth={1.65} aria-hidden="true"/><span>{label("preferences")}</span></a>
        {!portable && <a className={`nav-link${view === "offres" ? " nav-current" : ""}`} href="#offres" aria-current={view === "offres" ? "page" : undefined}
          onClick={(event) => navClick(event, "offres")}><Layers size={16} strokeWidth={1.65} aria-hidden="true"/><span>{label("offres")}</span></a>}
      </div>
    </aside>

    <div className="main-shell">
      <header className={`topbar${client ? " topbar-account" : ""}`}>
        <span className="breadcrumb">{label(view)}</span>
        {view !== "accueil" && view !== "catalogue" && <form key={view} className="toolbar-search" role="search" onSubmit={(event) => {
          event.preventDefault();
          const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
          openCatalogue(query);
        }}>
          <label className="search-field">
            <Search size={15} strokeWidth={1.65} aria-hidden="true"/>
            <input name="query" type="search" maxLength={120} aria-label={t("Rechercher un produit ou une marque", "Search for a product or brand")}
              placeholder={t("Produit, marque, code-barres…", "Product, brand, barcode…")}/>
          </label>
        </form>}
        <div className="header-actions">
          <span className="sync-label">{status}</span>
          {!portable && client && <button type="button" className="button button-secondary account-control" onClick={() => setAuth(true)}>
            <LogIn size={16} aria-hidden="true"/>{user ? t("Compte", "Account") : t("Connexion", "Sign in")}
          </button>}
        </div>
      </header>

      <main className="main-content" id="main-content" ref={content} tabIndex={-1}>
        {(notice || sync === "error" || sync === "conflict") && <div className="notice" role="status">
          <span>{notice || (sync === "conflict"
            ? t("Une version plus récente existe en ligne. Ton brouillon reste sur cet appareil.", "A newer version exists online. Your draft remains on this device.")
            : t("La synchronisation est indisponible. Tes modifications restent sur cet appareil si le navigateur accepte le stockage.", "Sync is unavailable. Changes stay on this device if browser storage is available."))}</span>
          {sync === "error" && <button type="button" onClick={() => void data.retry()}>{t("Réessayer", "Try again")}</button>}
          {sync === "conflict" && <button type="button" onClick={() => conflictDialog.current?.showModal()}>{t("Charger la version en ligne", "Load the online version")}</button>}
          {notice && <button type="button" className="icon-button" aria-label={t("Fermer la notification", "Dismiss notification")} onClick={() => setNotice("")}><X size={16}/></button>}
        </div>}

        {!ready ? <p role="status">{t("Chargement de ton espace…", "Loading your workspace…")}</p> : <div className="page-content" key={view}>
          {view === "accueil" && <Dashboard state={state} onSearch={openCatalogue} onNavigate={navigate}
            onProduct={(id) => { navigate("vanity"); setSelected(id); }}
            onGuide={(routine) => { navigate("routines"); setGuide(routine.id); }}/>}
          {view === "catalogue" && <Catalog key={catalogue.revision} initialQuery={catalogue.query} currentProducts={state.products} onSave={saveProduct} localOnly={portable}/>}
          {view === "vanity" && <>
            {!productEditor && <div className="page-heading">
              <div><h1>{t("Mes produits", "My products")}</h1><p>{t("Les produits que tu as enregistrés.", "Products you’ve saved.")}</p></div>
              <button className="button button-primary" type="button" onClick={() => openCatalogue()}><Plus size={17}/>{t("Ajouter un produit", "Add a product")}</button>
            </div>}
            {productEditor
              ? <ProductEditor product={productEditor} currentProducts={state.products} onCancel={() => setProductEditor(null)} onSave={saveProduct}/>
              : <Inventory products={state.products} preferences={state.preferences} selected={selected}
                onSelect={setSelected} onEdit={setProductEditor} onRemove={removeProduct}/>}
          </>}
          {view === "routines" && <Routines products={state.products} routines={state.routines} preferences={state.preferences} palette={state.palette}
            onChange={(routines) => update((previous) => ({ ...previous, routines }))}
            startRoutineId={guide} onStartGuide={setGuide} onExitGuide={() => setGuide(undefined)} onComplete={complete}/>}
          {view === "palette" && <>
            <div className="page-heading"><div><h1>{t("Mes teintes", "My shades")}</h1><p>{t("Préleve une couleur sur une photo de maquillage et réutilise-la dans une routine.", "Sample a colour from a makeup photo and reuse it in a routine.")}</p></div></div>
            <details className="inline-help">
              <summary>{t("À quoi ça sert ?", "What is this for?")}</summary>
              <ol>
                <li>{t("Ajoute une photo d’un rouge à lèvres, d’un fard ou d’une palette.", "Add a photo of a lipstick, eyeshadow or palette.")}</li>
                <li>{t("Clique sur la couleur qui t’intéresse et enregistre-la sous un nom.", "Click the colour you want and give it a name.")}</li>
                <li>{t("Dans une routine, choisis cette teinte pour une étape avec un produit teinté. Le Face Chart l’affichera sur la zone choisie.", "In a routine, select the shade for a tinted product step. The Face Chart will show it on the chosen area.")}</li>
              </ol>
            </details>
            <Palette key={user?.id ?? "guest"} colors={state.palette}
              onChange={(apply) => update((previous) => ({ ...previous, palette: apply(previous.palette) }), user?.id ?? null)}
              onUpload={client && user ? (file) => uploadPalettePhoto(client, user.id, file) : undefined}
              onDiscardUpload={client && user ? (path) => removePalettePhoto(client, path) : undefined}
              onResolvePhoto={client && user ? (path) => getPalettePhotoUrl(client, path) : undefined}/>
          </>}
          {view === "tutoriels" && <Tutorials products={state.products} onCreateRoutine={createRoutine}/>}
          {view === "journal" && !portable && <Journal key={user?.id ?? "guest"} userId={user?.id} client={client} plus={billing.plus} entitlementLoading={billing.loading}
            products={state.products} routines={state.routines} completed={state.completed} onOpenPlans={() => navigate("offres")}/>}
          {view === "offres" && !portable && <Plans signedIn={Boolean(user)} billing={billing} onSignIn={() => setAuth(true)}/>}
          {view === "preferences" && <>
            <div className="page-heading"><div><h1>{t("Paramètres", "Settings")}</h1><p>{t("Langue, préférences et données.", "Language, preferences and data.")}</p></div></div>
            <section className="settings-language" aria-labelledby="language-title">
              <div><h2 id="language-title">{t("Langue de l’interface", "Interface language")}</h2></div>
              <select aria-labelledby="language-title" value={locale} onChange={(event) => {
                const next = event.target.value === "en" ? "en" : "fr";
                if (update((previous) => ({ ...previous, preferences: { ...previous.preferences, locale: next } }))) setNotice("");
              }}><option value="fr">Français</option><option value="en">English</option></select>
            </section>
            <PreferencesForm state={state} portable={portable} onSave={(preferences) => {
              if (update((previous) => ({ ...previous, preferences }))) setNotice(t("Préférences enregistrées.", "Preferences saved."));
            }}/>
            <RoutineCoach preferences={state.preferences} products={state.products} onCreate={createRoutine}/>
          </>}
        </div>}
      </main>
    </div>
    {!portable && <dialog ref={accountDialog} aria-labelledby="account-title" className="dialog" onClose={() => setAuth(false)}>
      {auth && <Account user={user} client={client} onClose={() => accountDialog.current?.close()} onNotice={setNotice}/>}
    </dialog>}
    {!portable && <dialog ref={conflictDialog} className="dialog small-dialog" aria-labelledby="conflict-title">
      <h2 id="conflict-title">{t("Charger la version en ligne", "Load the online version")}</h2>
      <p>{t("La version en ligne remplacera le brouillon enregistré sur cet appareil.", "The online version will replace the draft saved on this device.")}</p>
      <form method="dialog" className="form-actions">
        <button className="button button-secondary">{t("Annuler", "Cancel")}</button>
        <button className="button button-primary" onClick={() => void data.reloadRemote()}>{t("Charger", "Load")}</button>
      </form>
    </dialog>}
  </div>;
}

const englishCategories = { soin: "Skincare", maquillage: "Makeup", cheveux: "Hair", parfums: "Fragrance" };
function Dashboard({ state, onSearch, onNavigate, onProduct, onGuide }: {
  state: State; onSearch: (query: string) => void; onNavigate: (view: View) => void;
  onProduct: (id: string) => void; onGuide: (routine: Routine) => void;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const sessions = state.completed.filter(({ at }) => Date.parse(at) >= weekStart.getTime()).length;
  return <div className="home-page">
    <header className="home-heading">
      <h1>{t("Ton espace beauté", "Your beauty workspace")}</h1>
      <p>{t("Retrouve tes produits et organise tes routines.", "Find your products and organise your routines.")}</p>
    </header>
    <form className="home-search" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(query.trim()); }}>
      <label className="home-search-label">
        <span className="sr-only">{t("Rechercher par produit, marque ou code-barres", "Search by product, brand or barcode")}</span>
        <Search size={20} strokeWidth={1.65} aria-hidden="true"/>
        <input type="search" maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Nom du produit, marque ou code-barres", "Product name, brand or barcode")}/>
      </label>
      <button className="button button-primary" type="submit">{t("Rechercher", "Search")}<ArrowRight size={16} aria-hidden="true"/></button>
    </form>

    <div className="dashboard-grid">
      <section className="home-section" aria-labelledby="home-products">
        <header className="section-heading">
          <h2 id="home-products">{t("Mes produits", "My products")}</h2>
          {state.products.length > 0 && <button className="text-button" type="button" onClick={() => onNavigate("vanity")}>{t("Tout voir", "View all")}<ChevronRight size={15}/></button>}
        </header>
        {state.products.length ? <div className="home-list">
          {state.products.slice(0, 4).map((product) => <button type="button" className="home-row" key={product.id} onClick={() => onProduct(product.id)}>
            <span><strong>{product.name}</strong><small>{product.brand || t(categoryLabels[product.category], englishCategories[product.category])}</small></span><ChevronRight size={16}/>
          </button>)}
        </div> : <div className="home-empty">
          <p>{t("Aucun produit enregistré.", "No products saved yet.")}</p>
          <button type="button" className="text-button" onClick={() => onSearch("")}><Plus size={15}/>{t("Ajouter un produit", "Add a product")}</button>
        </div>}
      </section>

      <section className="home-section" aria-labelledby="home-routines">
        <header className="section-heading">
          <h2 id="home-routines">{t("Mes routines", "My routines")}</h2>
          {state.routines.length > 0 && <button className="text-button" type="button" onClick={() => onNavigate("routines")}>{t("Tout voir", "View all")}<ChevronRight size={15}/></button>}
        </header>
        {sessions > 0 && <p className="home-summary muted">{t(
          `${sessions} séance${sessions === 1 ? "" : "s"} ces 7 derniers jours`,
          `${sessions} ${sessions === 1 ? "session" : "sessions"} in the past 7 days`,
        )}</p>}
        {state.routines.length ? <div className="home-list">
          {state.routines.slice(0, 4).map((routine) => <button type="button" className="home-row" key={routine.id}
            onClick={() => routine.steps.length ? onGuide(routine) : onNavigate("routines")}>
            <span><strong>{routine.name}</strong><small>{routine.steps.length} {routine.steps.length === 1 ? t("étape", "step") : t("étapes", "steps")}</small></span><ChevronRight size={16}/>
          </button>)}
        </div> : <div className="home-empty">
          <p>{t("Aucune routine créée.", "No routines created yet.")}</p>
          <button type="button" className="text-button" onClick={() => onNavigate("routines")}><Plus size={15}/>{t("Créer une routine", "Create a routine")}</button>
        </div>}
      </section>
    </div>
  </div>;
}

function exportWorkspace(state: State) {
  const palette = state.palette.map(({ id, hex, name }) => ({ id, hex, name }));
  const exported = { version: 1, exportedAt: new Date().toISOString(), ...state, palette };
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "navier-data.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PreferencesForm({ state, portable, onSave }: {
  state: State; portable: boolean; onSave: (preferences: State["preferences"]) => void;
}) {
  const { t } = useLocale();
  const { locale: _locale, ...criteria } = state.preferences;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = preferenceSchema.safeParse({
      ...state.preferences,
      fragranceFree: form.has("fragranceFree"), sensitive: form.has("sensitive"), avoid: form.get("avoid"),
      skinFeel: form.get("skinFeel") || undefined, skinConcerns: form.getAll("skinConcerns"), undertone: form.get("undertone") || undefined,
    });
    if (parsed.success) onSave(parsed.data);
  }

  return <div className="preferences-layout">
    <form className="dashboard-card stacked-form" onSubmit={submit} key={JSON.stringify(criteria)}>
      <h2>{t("Mes critères", "My preferences")}</h2>
      <label className="check-field"><input type="checkbox" name="fragranceFree" defaultChecked={state.preferences.fragranceFree}/>
        <span>{t("Je préfère éviter le parfum", "I prefer to avoid fragrance")}</span></label>
      <label className="check-field"><input type="checkbox" name="sensitive" defaultChecked={state.preferences.sensitive}/>
        <span>{t("Ma peau réagit facilement", "My skin reacts easily")}</span></label>
      <label>{t("Ingrédients à éviter", "Ingredients to avoid")}
        <textarea name="avoid" maxLength={600} rows={3} defaultValue={state.preferences.avoid} placeholder={t("Ex. Parfum, Limonene", "E.g. Parfum, Limonene")}/>
        <small className="muted">{t("Sépare les noms par des virgules.", "Separate names with commas.")}</small>
      </label>
      <ProfileFields preferences={state.preferences}/>
      <div className="form-actions"><button className="button button-primary" type="submit">{t("Enregistrer", "Save preferences")}</button></div>
    </form>
    <aside className="dashboard-card preference-help">
      <h2>{t("Mes données", "My data")}</h2>
      <button className="button button-secondary" type="button" onClick={() => exportWorkspace(state)}><Download size={16}/>{t("Exporter mon espace", "Export my workspace")}</button>
      <p className="muted">{portable
        ? t("Garde le fichier Navier au même endroit et utilise le même navigateur pour retrouver tes données.", "Keep the Navier file in the same place and use the same browser to find your data.")
        : t("Le fichier inclut les produits, routines, teintes et préférences.", "The file includes products, routines, shades and preferences.")}</p>
      {!portable && <>
        <a href="/installer">{t("Installer Navier", "Install Navier")}</a>
        <a href="/confidentialite">{t("Confidentialité", "Privacy")}</a>
      </>}
    </aside>
  </div>;
}
function Account({ user, client, onClose, onNotice }: {
  user: ReturnType<typeof useWorkspaceState>["user"]; client: ReturnType<typeof useWorkspaceState>["client"];
  onClose: () => void; onNotice: (message: string) => void;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const firstName = String(form.get("name") ?? "").trim();
    setPending(true);
    setFailed(false);
    setMessage("");
    try {
      const { data, error } = mode === "login"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password, options: {
            emailRedirectTo: `${location.origin}/auth/confirm`, data: { first_name: firstName },
          } });
      if (error) throw error;
      if (data.session) {
        onNotice(t("Tu es connecté à ton espace Navier.", "You’re signed in to your Navier workspace."));
        onClose();
      } else {
        setMessage(t("Consulte ta boîte mail pour confirmer ton adresse.", "Check your email to confirm your address."));
      }
    } catch {
      setFailed(true);
      setMessage(mode === "login"
        ? t("Connexion impossible. Vérifie tes identifiants ou réessaie dans un instant.", "Unable to sign in. Check your credentials or try again in a moment.")
        : t("La création du compte a échoué. Vérifie l’adresse et choisis un mot de passe d’au moins 8 caractères.", "Unable to create your account. Check the email address and choose a password with at least 8 characters."));
    } finally { setPending(false); }
  }

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await client!.auth.signOut();
      if (error) throw error;
      onClose();
      onNotice(t("Tu es de retour dans ton espace local.", "You’re back in your local workspace."));
    } catch {
      setFailed(true);
      setMessage(t("Déconnexion impossible. Réessaie dans un instant.", "Unable to sign out. Try again in a moment."));
    } finally { setPending(false); }
  }

  return <>
    <div className="dialog-heading">
      <div><h2 id="account-title">{user ? t("Mon compte", "My account") : mode === "login" ? t("Se connecter", "Sign in") : t("Créer un compte", "Create an account")}</h2>
        <p>{user?.email ?? t("Retrouve ton espace sur plusieurs appareils.", "Access your workspace on your different devices.")}</p></div>
      <button className="icon-button" aria-label={t("Fermer", "Close")} onClick={onClose}><X size={21}/></button>
    </div>
    {!client ? <div className="product-detail-panel"><p>{t("La connexion nécessite une configuration Supabase. Les produits et routines de l’espace local sont conservés dans ce navigateur.", "Sign-in requires a Supabase configuration. Local products and routines are stored in this browser.")}</p></div>
      : user ? <div className="stacked-form"><p>{t("Ton compte dispose de sa propre collection. L’espace local reste accessible après la déconnexion.", "Your account has its own collection. You can access your local workspace after signing out.")}</p>
          <button type="button" className="button button-secondary" disabled={pending} onClick={() => void signOut()}><LogOut size={17}/>{t("Se déconnecter", "Sign out")}</button>
        </div>
      : <form className="stacked-form" onSubmit={(event) => void submit(event)}>
          {mode === "signup" && <label>{t("Prénom", "First name")}<input name="name" autoComplete="given-name" maxLength={40}/></label>}
          <label>{t("Adresse e-mail", "Email address")}<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
          <label>{t("Mot de passe", "Password")}<input type="password" name="password" minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} maxLength={128} required/></label>
          <button className="button button-primary" type="submit" disabled={pending}>{mode === "login" ? t("Se connecter", "Sign in") : t("Créer mon compte", "Create my account")}</button>
          <button className="text-button" type="button" disabled={pending} onClick={() => {
            setMode(mode === "login" ? "signup" : "login"); setMessage(""); setFailed(false);
          }}>{mode === "login" ? t("Créer un compte", "Create an account") : t("J’ai déjà un compte", "I already have an account")}</button>
        </form>}
    {message && <p className={failed ? "form-error" : "muted"} role={failed ? "alert" : "status"}>{message}</p>}
  </>;
}
