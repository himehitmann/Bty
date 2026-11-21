"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { BookOpen, Brush, CalendarCheck, ChevronDown, ClipboardList, Globe, House, Layers, ListChecks, LogIn, LogOut, Search, Settings, ShoppingBag, SwatchBook, UserRound, X } from "lucide-react";
import { Catalog, Inventory } from "./inventory";
import { Palette } from "./palette";
import { HomeDiscovery } from "./home-discovery";
import { MakeupStudio, type StudioDraft } from "./makeup-studio";
import { BeautyLists } from "./beauty-lists";
import { Routines } from "./routines";
import { Tutorials } from "./tutorials";
import { Journal } from "./journal";
import { Plans } from "./plans";
import { BeautyProfile } from "./beauty-profile";
import { MakeupStyles, type MakeupStylePreset } from "./makeup-styles";
import { WorkspaceSettings } from "./workspace-settings";
import { beautyListsWithDefaults, productListSnapshot, sameProductVariant, storedBeautyLists, vanityDestination } from "@/lib/beauty-list-destinations";
import { useBillingStatus } from "@/lib/billing-client";
import { LocaleProvider, useLocale, type Locale } from "@/lib/i18n";
import { isLocale, localeOptions } from "@/lib/locale";
import { beautyListLimits, type Product, type Routine } from "@/lib/model";
import { useMotionPreference } from "@/lib/motion-preference";
import { getPalettePhotoUrl, removePalettePhoto, uploadPalettePhoto } from "@/lib/supabase/browser";
import { useWorkspaceState } from "@/lib/use-workspace";

const navigation = [
  { id: "accueil", fr: "Accueil", en: "Home", icon: House },
  { id: "routines", fr: "Mes routines", en: "My routines", icon: ListChecks },
  { id: "listes", fr: "Mes listes", en: "My lists", icon: ClipboardList },
  { id: "studio", fr: "Simulation maquillage", en: "Makeup simulator", icon: Brush },
  { id: "styles", fr: "Styles de maquillage", en: "Makeup styles", icon: SwatchBook },
  { id: "catalogue", fr: "Catalogue", en: "Catalogue", icon: Search },
  { id: "vanity", fr: "Ma trousse", en: "My collection", icon: ShoppingBag },
  { id: "profile", fr: "Profil beauté", en: "Beauty profile", icon: UserRound },
  { id: "tutoriels", fr: "Tutoriels", en: "Tutorials", icon: BookOpen },
  { id: "journal", fr: "Journal", en: "Journal", icon: CalendarCheck },
  { id: "preferences", fr: "Paramètres", en: "Settings", icon: Settings },
  { id: "offres", fr: "Offres", en: "Plans", icon: Layers },
] as const;
type View = (typeof navigation)[number]["id"];
type WorkspaceData = ReturnType<typeof useWorkspaceState>;
type StudioTrials = { products: Product[]; request: { product: Product } };
const noTrials: Product[] = [];

function readView(portable: boolean): View {
  const hash = location.hash.slice(1);
  const view = hash === "palette" ? "studio" : navigation.find((item) => item.id === hash)?.id ?? "accueil";
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
  const [motion, setMotion] = useMotionPreference();
  const activeAccount = user?.id;
  const studioScope = activeAccount ?? "guest";
  const [view, setView] = useState<View>("accueil");
  const [studioTab, setStudioTab] = useState<"look" | "photo">("look");
  const [catalogue, setCatalogue] = useState({ query: "", revision: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string>();
  const [trialsByScope, setTrialsByScope] = useState(() => new Map<string, StudioTrials>());
  const trials = trialsByScope.get(studioScope);
  const studioDrafts = useRef(new Map<string, StudioDraft>());
  const saveStudioDraft = useCallback((draft: StudioDraft) => { studioDrafts.current.set(studioScope, draft); }, [studioScope]);
  const [preset, setPreset] = useState<{ account: string; value: MakeupStylePreset }>();
  const [guide, setGuide] = useState<string>();
  const [auth, setAuth] = useState(false);
  const accountDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const appShell = useRef<HTMLDivElement>(null);
  const workspaceHeader = useRef<HTMLElement>(null);
  const content = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHistoryChange = () => {
      const next = readView(portable);
      setView(next);
      if (next === "catalogue") {
        setCatalogue((current) => current.query ? { query: "", revision: current.revision + 1 } : current);
        setSearchTerm("");
      }
      setStudioTab(location.hash === "#palette" ? "photo" : "look");
      setSelected(null);
      setSelectedList(undefined);
      setPreset(undefined);
      setGuide(undefined);
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

  useEffect(() => {
    const shell = appShell.current;
    const header = workspaceHeader.current;
    if (!shell || !header) return;
    const measure = () => shell.style.setProperty("--workspace-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const saveOptions = { requireLocalCopy: !activeAccount };
  useEffect(() => {
    setSelected(null);
    setSelectedList(undefined);
    setPreset(undefined);
    setGuide(undefined);
  }, [studioScope]);

  function navigate(next: View, focus = true) {
    setView(next);
    setStudioTab("look");
    setSelected(null);
    setSelectedList(undefined);
    setPreset(undefined);
    setGuide(undefined);
    setNotice("");
    if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
    window.scrollTo(0, 0);
    if (focus) requestAnimationFrame(() => content.current?.focus({ preventScroll: true }));
  }

  function navClick(event: MouseEvent<HTMLAnchorElement>, next: View) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (next === "catalogue") openCatalogue();
    else navigate(next);
  }

  function openCatalogue(query = "", focusSearch = false) {
    setSearchTerm(query);
    setCatalogue((current) => ({ query, revision: current.revision + 1 }));
    navigate("catalogue", !focusSearch);
    if (focusSearch) searchInput.current?.focus();
  }

  function clearSearch() {
    setSearchTerm("");
    if (view === "catalogue") setCatalogue((current) => ({ query: "", revision: current.revision + 1 }));
    searchInput.current?.focus();
  }

  function saveProduct(product: Product, destination: string) {
    let saved = false;
    const applied = update((previous) => {
      const preferences = { ...previous.preferences, catalogueDestination: destination };
      if (destination === vanityDestination) {
        const exists = previous.products.some((item) => sameProductVariant(item, product));
        if (!exists && previous.products.length >= 500) return previous;
        saved = true;
        return { ...previous, preferences, products: exists ? previous.products : [product, ...previous.products] };
      }
      const lists = beautyListsWithDefaults(previous.lists);
      const target = lists.find(({ id }) => id === destination);
      if (!target) return previous;
      const exists = target.items.some((item) => item.product ? sameProductVariant(item.product, product) : item.productId === product.id);
      if (!exists && target.items.length >= beautyListLimits.items) return previous;
      saved = true;
      if (exists) return { ...previous, preferences };
      const entry = { id: crypto.randomUUID(), text: product.name, checked: false, productId: product.id, product: productListSnapshot(product) };
      return { ...previous, preferences, lists: storedBeautyLists(lists.map((list) => list.id === destination
        ? { ...list, items: [...list.items, entry] } : list)) };
    }, activeAccount ?? null, saveOptions);
    return applied && saved;
  }

  function tryProduct(product: Product) {
    navigate("studio");
    setTrialsByScope((current) => {
      const products = current.get(studioScope)?.products ?? noTrials;
      return new Map(current).set(studioScope, {
        products: [...products.filter(({ id }) => id !== product.id), product].slice(-12),
        request: { product },
      });
    });
  }

  function openDestination(destination: string, product?: Product) {
    if (destination === vanityDestination) {
      navigate("vanity");
      setSelected(product?.id ?? null);
    } else {
      navigate("listes");
      setSelectedList(destination);
    }
  }

  function removeProduct(id: string) {
    if (!update((previous) => ({
      ...previous,
      products: previous.products.filter((item) => item.id !== id),
      routines: previous.routines.map((routine) => ({ ...routine, steps: routine.steps.filter((step) => step.productId !== id) })),
    }), activeAccount ?? null, saveOptions)) return;
    setSelected(null);
    setNotice(t("Produit supprimé.", "Product removed."));
  }

  function complete(routine: Routine) {
    const saved = update((previous) => ({
      ...previous,
      completed: [{ routineId: routine.id, at: new Date().toISOString() }, ...previous.completed].slice(0, 1000),
    }), activeAccount ?? null, saveOptions);
    if (saved) setNotice(t(`« ${routine.name} » terminée.`, `“${routine.name}” completed.`));
    return saved;
  }

  function createRoutine(routine: Routine) {
    if (state.routines.length >= 100) {
      setNotice(t("La limite de 100 routines est atteinte.", "The limit of 100 routines has been reached."));
      return false;
    }
    if (!update((previous) => ({ ...previous, routines: [...previous.routines, routine] }), activeAccount ?? null, saveOptions)) return false;
    navigate("routines");
    setNotice(t(`« ${routine.name} » ajoutée.`, `“${routine.name}” added.`));
    return true;
  }

  function switchLanguage(next: Locale) {
    if (next !== locale) update((previous) => ({ ...previous, preferences: { ...previous.preferences, locale: next } }), activeAccount ?? null, saveOptions);
  }

  const label = (id: View) => {
    const item = navigation.find((entry) => entry.id === id)!;
    return t(item.fr, item.en);
  };
  const availableNavigation = portable ? navigation.filter(({ id }) => id !== "journal" && id !== "offres") : navigation;
  const lists = beautyListsWithDefaults(state.lists);
  const status = {
    loading: t("Chargement", "Loading"),
    local: t("Sur cet appareil", "On this device"),
    saving: t("Enregistrement", "Saving"),
    synced: t("Synchronisé", "Synced"),
    error: t("Synchronisation indisponible", "Sync unavailable"),
    conflict: t("Conflit de synchronisation", "Sync conflict"),
  }[sync];

  return <div className="app-shell" ref={appShell} data-motion={motion}>
    <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); content.current?.focus(); }}>{t("Aller au contenu", "Skip to content")}</a>
    <header className="workspace-header" ref={workspaceHeader}>
      <div className="workspace-masthead">
        <a className="brand" href="#accueil" aria-label={t("Navier, accueil", "Navier, home")}
          aria-current={view === "accueil" ? "page" : undefined} onClick={(event) => navClick(event, "accueil")}>Navier</a>
        <form className="toolbar-search search-field" role="search" aria-label={t("Rechercher des produits", "Find products")} onSubmit={(event) => {
          event.preventDefault();
          openCatalogue(searchTerm.trim());
        }}>
          <input ref={searchInput} name="query" type="search" maxLength={120} spellCheck={false}
            value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
            aria-label={t("Nom du produit, marque ou code-barres", "Product name, brand or barcode")}
            placeholder={t("Nom du produit, marque ou code-barres", "Product name, brand or barcode")}/>
          {searchTerm && <button className="toolbar-search-clear" type="button" onClick={clearSearch}
            aria-label={t("Effacer la recherche", "Clear search")}><X size={15} aria-hidden="true"/></button>}
          <button className="toolbar-search-button" type="submit" aria-label={t("Lancer la recherche", "Search catalogue")}>
            <Search size={18} strokeWidth={1.8} aria-hidden="true"/>
          </button>
        </form>
        <div className="header-actions">
          <label className="language-select">
            <Globe size={16} strokeWidth={1.7} aria-hidden="true"/>
            <select aria-label={t("Langue de l’interface", "Interface language")} value={locale} disabled={!ready}
              onChange={(event) => { if (isLocale(event.target.value)) switchLanguage(event.target.value); }}>
              {localeOptions.map(({ value, name }) => <option key={value} value={value} lang={value}>{name}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true"/>
          </label>
          <a className={`icon-button header-settings${view === "preferences" ? " nav-current" : ""}`} href="#preferences"
            aria-label={label("preferences")} aria-current={view === "preferences" ? "page" : undefined}
            onClick={(event) => navClick(event, "preferences")}><Settings size={19} strokeWidth={1.7} aria-hidden="true"/></a>
          {!portable && client && <button type="button" className="button button-secondary account-control"
            aria-label={user ? t("Compte", "Account") : t("Connexion", "Sign in")} onClick={() => setAuth(true)}>
            <LogIn size={16} aria-hidden="true"/><span>{user ? t("Compte", "Account") : t("Connexion", "Sign in")}</span>
          </button>}
          {user && <span className="sr-only" role="status">{status}</span>}
        </div>
      </div>
      <nav className="workspace-navigation" aria-label={t("Navigation principale", "Main navigation")}>
        <div className="workspace-navigation-inner">
          {availableNavigation.filter(({ id }) => id !== "accueil" && id !== "preferences").map(({ id, icon: Icon }) =>
            <a key={id} href={`#${id}`} className={`nav-link${view === id ? " nav-current" : ""}`}
              aria-current={view === id ? "page" : undefined} onClick={(event) => navClick(event, id)}>
              <Icon size={16} strokeWidth={1.7} aria-hidden="true"/><span>{label(id)}</span>
            </a>
          )}
        </div>
      </nav>
    </header>

    <div className="main-shell">
      <main className={`main-content${view === "accueil" ? " discovery-content" : ""}`} id="main-content" ref={content} tabIndex={-1}>
        {(notice || sync === "error" || sync === "conflict") && <div className="notice" role="status">
          <span>{notice || (sync === "conflict"
            ? t("Une version plus récente existe en ligne. Ton brouillon reste sur cet appareil.", "A newer version exists online. Your draft remains on this device.")
            : t("La synchronisation est indisponible. Tes modifications restent sur cet appareil si le navigateur accepte le stockage.", "Sync is unavailable. Changes stay on this device if browser storage is available."))}</span>
          {sync === "error" && <button type="button" onClick={() => void data.retry()}>{t("Réessayer", "Try again")}</button>}
          {sync === "conflict" && <button type="button" onClick={() => conflictDialog.current?.showModal()}>{t("Charger la version en ligne", "Load the online version")}</button>}
          {notice && <button type="button" className="icon-button" aria-label={t("Fermer la notification", "Dismiss notification")} onClick={() => setNotice("")}><X size={16}/></button>}
        </div>}

        {!ready ? <p role="status">{t("Chargement de ton espace…", "Loading your workspace…")}</p> : <div className="page-content" key={view}>
          {view === "accueil" && <HomeDiscovery state={state} onNavigate={(route) => route === "catalogue" ? openCatalogue() : navigate(route)}
            onProduct={(id) => { navigate("vanity"); setSelected(id); }}
            onRoutine={(routine) => { navigate("routines"); if (routine.steps.length) setGuide(routine.id); }}/>}
          {view === "catalogue" && <Catalog key={catalogue.revision} initialQuery={catalogue.query} currentProducts={state.products}
            lists={lists} preferences={state.preferences} destination={state.preferences.catalogueDestination} onSave={saveProduct} portable={portable}
            onTry={tryProduct} onOpenDestination={openDestination}/>}
          {view === "vanity" && <>
            <div className="page-heading">
              <div><h1>{t("Ma trousse", "My collection")}</h1><p>{t("Les produits que tu utilises, disponibles dans le Studio et les routines.", "Products you use, available in the Studio and your routines.")}</p></div>
              <button className="button button-primary" type="button" onClick={() => openCatalogue("", true)}><Search size={17} aria-hidden="true"/>{t("Chercher un produit", "Find a product")}</button>
            </div>
            <Inventory products={state.products} preferences={state.preferences} selected={selected} onSelect={setSelected} onRemove={removeProduct} onTry={tryProduct}/>
          </>}
          {view === "routines" && <Routines key={user?.id ?? "guest"} products={state.products} routines={state.routines} preferences={state.preferences} palette={state.palette}
            onChange={(routines) => update((previous) => ({ ...previous, routines }), activeAccount ?? null, saveOptions)}
            startRoutineId={guide} onStartGuide={setGuide} onExitGuide={() => setGuide(undefined)} onComplete={complete}/>}
          {view === "studio" && <MakeupStudio key={`${studioScope}:${studioTab}`} products={state.products}
            preset={preset?.account === studioScope ? preset.value : undefined}
            trialProducts={trials?.products ?? noTrials} trialRequest={trials?.request}
            draft={studioDrafts.current.get(studioScope)} onDraftChange={saveStudioDraft} defaultPortrait={state.preferences.studioPortrait}
            savedLooks={state.looks ?? []}
            onChangeLooks={(apply) => update((previous) => ({ ...previous, looks: apply(previous.looks ?? []) }), activeAccount ?? null, saveOptions)}
            palette={state.palette} initialTab={studioTab} paletteEditor={
              <Palette colors={state.palette}
                onChange={(apply) => update((previous) => ({ ...previous, palette: apply(previous.palette) }), activeAccount ?? null, saveOptions)}
                onUpload={client && user ? (file) => uploadPalettePhoto(client, user.id, file) : undefined}
                onDiscardUpload={client && user ? (path) => removePalettePhoto(client, path) : undefined}
                onResolvePhoto={client && user ? (path) => getPalettePhotoUrl(client, path) : undefined}/>
            }/>}
          {view === "listes" && <BeautyLists key={`${user?.id ?? "guest"}:${selectedList ?? "overview"}`} lists={lists} products={state.products}
            firstListId={selectedList} onTryProduct={tryProduct}
            onChange={(apply) => update((previous) => ({ ...previous, lists: storedBeautyLists(apply(beautyListsWithDefaults(previous.lists))) }), activeAccount ?? null, saveOptions)}/>}
          {view === "styles" && <MakeupStyles onTry={(look) => { navigate("studio"); setPreset({ account: studioScope, value: look }); }}/>}
          {view === "profile" && <BeautyProfile key={user?.id ?? "guest"} preferences={state.preferences} products={state.products} onCreate={createRoutine}
            onSave={(profile) => update((previous) => ({ ...previous, preferences: { ...previous.preferences, ...profile } }), activeAccount ?? null, saveOptions)}/>}
          {view === "tutoriels" && <Tutorials key={user?.id ?? "guest"} products={state.products} onCreateRoutine={createRoutine}/>}
          {view === "journal" && !portable && <Journal key={user?.id ?? "guest"} userId={user?.id} client={client} plus={billing.plus} entitlementLoading={billing.loading}
            products={state.products} routines={state.routines} completed={state.completed} onOpenPlans={() => navigate("offres")}/>}
          {view === "offres" && !portable && <Plans key={user?.id ?? "guest"} signedIn={Boolean(user)} billing={billing} onSignIn={() => setAuth(true)}/>}
          {view === "preferences" && <WorkspaceSettings state={state} portable={portable}
            account={portable || !client ? "local" : user ? "signed-in" : "guest"}
            onLanguageChange={switchLanguage} onOpenAccount={() => setAuth(true)} onOpenProfile={(event) => navClick(event, "profile")}
            motion={motion} onMotionChange={setMotion}/>}
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
