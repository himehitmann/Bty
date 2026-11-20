"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, BookOpen, BookOpenCheck, Crown, Download, Smartphone, Check, ChevronRight, CircleHelp, Clock3, Droplets, FlaskConical, House, LogIn, LogOut, Menu, Moon, Palette as PaletteIcon, Plus, Settings2, Sparkles, Sun, X } from "lucide-react";
import { Inventory, ProductDialog, ProductTile } from "./inventory";
import { Palette } from "./palette";
import { Routines } from "./routines";
import { Tutorials } from "./tutorials";
import { Journal } from "./journal";
import { Plans } from "./plans";
import { useBillingStatus } from "@/lib/billing-client";
import { emptyState, preferenceSchema, type Product, type Routine, type State } from "@/lib/model";
import { getPalettePhotoUrl, removePalettePhoto, uploadPalettePhoto } from "@/lib/supabase/browser";
import { useWorkspaceState } from "@/lib/use-workspace";

const navigation = [
  { id: "accueil", label: "Vue d’ensemble", icon: House },
  { id: "vanity", label: "Mon vanity", icon: Droplets },
  { id: "routines", label: "Mes routines", icon: Sparkles },
  { id: "palette", label: "Palette", icon: PaletteIcon },
  { id: "tutoriels", label: "Tutoriels", icon: BookOpen },
  { id: "journal", label: "Journal", icon: BookOpenCheck },
  { id: "preferences", label: "Préférences", icon: Settings2 },
  { id: "offres", label: "Offres", icon: Crown },
] as const;
type View = (typeof navigation)[number]["id"];

function readView(): View {
  const hash = location.hash.slice(1);
  return navigation.find((item) => item.id === hash)?.id ?? "accueil";
}

const pageHeadings = {
  vanity: ["Mon vanity", "Retrouve tes produits et explore leurs compositions."],
  routines: ["Mes routines", "Compose tes rituels et suis chaque geste avec le Face Chart."],
  palette: ["Ma palette", "Retrouve et conserve les teintes qui t’inspirent."],
  tutoriels: ["Tutoriels", "Des gestes simples à essayer avec les produits de ton vanity."],
  preferences: ["Préférences", "Affiche les points de vigilance qui comptent pour toi."],
};

const syncLabels = { loading: "Chargement…", local: "Espace local", saving: "Enregistrement…", synced: "Synchronisé", error: "Synchronisation indisponible", conflict: "Conflit de synchronisation" };

export function Workspace() {
  const data = useWorkspaceState();
  const { state, user, client, ready, update, sync, notice, setNotice } = data;
  const billing = useBillingStatus(user?.id);
  const [view, setView] = useState<View>("accueil");
  const [mobileNav, setMobileNav] = useState(false);
  const [productEditor, setProductEditor] = useState<Product | "add" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [guide, setGuide] = useState<string | undefined>();
  const [auth, setAuth] = useState(false);
  const accountDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const sampleDialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);
  const mainContent = useRef<HTMLElement>(null);
  const [now, setNow] = useState<Date>();
  useEffect(() => { setNow(new Date()); }, []);
  const date = now ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(now) : "";

  useEffect(() => {
    function onHash() { setView(readView()); setGuide(undefined); }
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).then((registration) => {
      const assets = [
        ...Array.from(document.scripts, (script) => script.src),
        ...Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]"), (link) => link.href),
        ...performance.getEntriesByType("resource").map((entry) => entry.name),
      ].filter(Boolean);
      registration.active?.postMessage({ type: "WARM_SHELL", assets });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (auth && !accountDialog.current?.open) accountDialog.current?.showModal();
  }, [auth]);

  useEffect(() => {
    if (!mobileNav) return;
    const focusDrawer = requestAnimationFrame(() => menuClose.current?.focus());
    const desktop = window.matchMedia("(width > 760px)");
    function handleResize(event: MediaQueryListEvent) {
      if (event.matches) setMobileNav(false);
    }
    desktop.addEventListener("change", handleResize);
    return () => {
      cancelAnimationFrame(focusDrawer);
      desktop.removeEventListener("change", handleResize);
    };
  }, [mobileNav]);

  function dismissMobileNav() {
    setMobileNav(false);
    menuTrigger.current?.focus();
  }

  function navigate(next: View) {
    setView(next);
    setMobileNav(false);
    setGuide(undefined);
    if (next !== readView()) history.pushState(null, "", next === "accueil" ? location.pathname : `#${next}`);
    window.scrollTo(0, 0);
    if (mobileNav) requestAnimationFrame(() => mainContent.current?.focus());
  }

  function openGuide(routine: Routine) {
    navigate("routines");
    setGuide(routine.id);
  }

  function saveProduct(product: Product) {
    const saved = update((previous) => ({
      ...previous,
      products: previous.products.some((entry) => entry.id === product.id)
        ? previous.products.map((entry) => entry.id === product.id ? product : entry)
        : [product, ...previous.products],
    }));
    if (saved) setProductEditor(null);
    return saved;
  }

  function removeProduct(id: string) {
    const saved = update((previous) => ({
      ...previous,
      products: previous.products.filter((item) => item.id !== id),
      routines: previous.routines.map((routine) => ({
        ...routine, steps: routine.steps.filter((step) => step.productId !== id),
      })),
    }));
    if (!saved) return;
    setProductEditor(null);
    setSelected(null);
  }

  function complete(routine: Routine) {
    const saved = update((previous) => ({
      ...previous,
      completed: [{ routineId: routine.id, at: new Date().toISOString() }, ...previous.completed].slice(0, 1000),
    }));
    if (saved) setNotice(`Routine « ${routine.name} » terminée.`);
    return saved;
  }

  function createFromTutorial(routine: Routine) {
    if (state.routines.length >= 100) { setNotice("Tu as atteint la limite de 100 routines."); return false; }
    if (!update((previous) => ({ ...previous, routines: [...previous.routines, routine] }))) return false;
    navigate("routines");
    setNotice(`Routine « ${routine.name} » ajoutée.`);
    return true;
  }

  const activeAccount = user?.id;
  useEffect(() => {
    setSelected(null);
    setGuide(undefined);
    setProductEditor(null);
  }, [activeAccount]);

  const name = user?.user_metadata?.first_name;
  const firstName = typeof name === "string" ? name.trim().slice(0, 40) : "";
  const addProduct = () => {
    if (!ready) return;
    if (state.products.length >= 500) { setNotice("Tu as atteint la limite de 500 produits."); return; }
    setProductEditor("add");
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Aller au contenu</a>
      {mobileNav && <button className="nav-scrim" tabIndex={-1} onClick={dismissMobileNav} aria-label="Fermer le menu depuis l’arrière-plan" />}
      <aside id="primary-navigation" className={`sidebar ${mobileNav ? "sidebar-open" : ""}`} onKeyDown={(event) => {
        if (mobileNav && !event.defaultPrevented && event.key === "Escape") dismissMobileNav();
      }}>
        <button ref={menuClose} className="mobile-menu-close icon-button" type="button" onClick={dismissMobileNav} aria-label="Fermer le menu"><X size={21}/></button>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate("accueil"); }}>
          <span>NAVIER</span>
        </a>
        <nav aria-label="Navigation principale" className="navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <a key={id} href={id === "accueil" ? "/" : `#${id}`} className={`nav-link ${view === id ? "nav-current" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigate(id); }}>
              <Icon size={18} strokeWidth={1.75}/><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link install-link" href="/installer"><Smartphone size={17}/> Installer Navier</a>
          <div className="account-card">
            <span className="avatar" aria-hidden="true">{firstName[0]?.toUpperCase() ?? "N"}</span>
            <span className="account-label"><strong>{firstName || "Mon espace"}</strong><small>{user ? "Compte Navier" : "Espace personnel"}</small></span>
            <button className="icon-button account-icon" type="button" aria-label={user ? "Gérer mon compte" : "Se connecter"} onClick={() => setAuth(true)}>
              {user ? <Settings2 size={17}/> : <LogIn size={17}/>}
            </button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button ref={menuTrigger} className="mobile-menu icon-button" type="button" aria-label={mobileNav ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={mobileNav} aria-controls="primary-navigation" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X size={21}/> : <Menu size={21}/>}
            </button>
            <span>Mon espace</span><ChevronRight size={14}/><strong>{navigation.find((item) => item.id === view)?.label}</strong>
          </div>
          <span className="sync-pill"><span className={`sync-dot ${sync === "error" || sync === "conflict" ? "sync-warning" : ""}`}/>{syncLabels[sync]}</span>
        </header>

        <main id="main-content" ref={mainContent} tabIndex={-1} className="main-content" inert={mobileNav}>
          {(notice || sync === "error" || sync === "conflict") && (
            <div className="notice" role="status">
              <span>{notice || (sync === "conflict" ? "Une version plus récente existe. Tes modifications restent enregistrées sur cet appareil." : "Les modifications sont conservées sur cet appareil lorsque le stockage du navigateur est disponible.")}</span>
              {sync === "error" && <button type="button" onClick={() => void data.retry()}>Réessayer</button>}
              {sync === "conflict" && <button type="button" onClick={() => conflictDialog.current?.showModal()}>Charger la version en ligne</button>}
              {notice && <button className="icon-button" type="button" aria-label="Fermer la notification" onClick={() => setNotice("")}><X size={18}/></button>}
            </div>
          )}

          {view === "accueil" ? (
            <Dashboard state={state} date={date} firstName={firstName} ready={ready}
              onAdd={addProduct} onNavigate={navigate} onGuide={openGuide}
              onProduct={(id) => { setSelected(id); navigate("vanity"); }} />
          ) : (
            <>
              {(view === "vanity" || view === "preferences" || view === "palette") && <div className="page-heading">
                <div><h1>{pageHeadings[view][0]}</h1><p>{pageHeadings[view][1]}</p></div>
                {view === "vanity" && <button className="button button-primary" type="button" onClick={addProduct} disabled={!ready}><Plus size={18}/>Ajouter un produit</button>}
              </div>}
              {!ready ? <p role="status">Chargement de ton espace…</p> : <>
                {view === "vanity" && <Inventory products={state.products} preferences={state.preferences}
                  selected={selected} onSelect={setSelected} onEdit={setProductEditor} onRemove={removeProduct} onAdd={addProduct}/>}
                {view === "routines" && <Routines products={state.products} routines={state.routines} preferences={state.preferences}
                  onChange={(routines) => update((previous) => ({ ...previous, routines }))}
                  startRoutineId={guide} onStartGuide={setGuide} onExitGuide={() => setGuide(undefined)} onComplete={complete}/>}
                {view === "palette" && <Palette key={user?.id ?? "guest"} colors={state.palette}
                  onChange={(apply) => update((previous) => ({ ...previous, palette: apply(previous.palette) }), user?.id ?? null)}
                  onUpload={client && user ? (file) => uploadPalettePhoto(client, user.id, file) : undefined}
                  onDiscardUpload={client && user ? (path) => removePalettePhoto(client, path) : undefined}
                  onResolvePhoto={client && user ? (path) => getPalettePhotoUrl(client, path) : undefined}
                />}
                {view === "tutoriels" && <Tutorials products={state.products} onCreateRoutine={createFromTutorial}/>}
                {view === "journal" && <Journal key={user?.id ?? "guest"} userId={user?.id} client={client}
                  plus={billing.plus} entitlementLoading={billing.loading} products={state.products} routines={state.routines}
                  completed={state.completed} onOpenPlans={() => navigate("offres")}/>}
                {view === "offres" && <Plans signedIn={Boolean(user)} billing={billing} onSignIn={() => setAuth(true)}/>}
                {view === "preferences" && <PreferencesForm state={state}
                  onClearSamples={() => sampleDialog.current?.showModal()}
                  onSave={(preferences) => {
                    if (update((previous) => ({ ...previous, preferences }))) setNotice("Préférences enregistrées.");
                  }} />}
              </>}
            </>
          )}
        </main>
      </div>

      {productEditor && <ProductDialog product={productEditor === "add" ? undefined : productEditor}
        currentProducts={state.products} onClose={() => setProductEditor(null)} onSave={saveProduct}/>}
      <dialog ref={accountDialog} aria-labelledby="account-title" className="dialog" onClose={() => setAuth(false)}>
        {auth && <Account user={user} client={client} onClose={() => accountDialog.current?.close()} onNotice={setNotice}/>}
      </dialog>
      <dialog ref={conflictDialog} className="dialog small-dialog" aria-labelledby="conflict-title">
        <h2 id="conflict-title">Charger la version en ligne</h2>
        <p>Une fois chargée, elle remplacera le brouillon local de ce compte sur cet appareil.</p>
        <form method="dialog" className="form-actions">
          <button className="button button-secondary">Annuler</button>
          <button className="button button-primary" onClick={() => void data.reloadRemote()}>Charger</button>
        </form>
      </dialog>
      <dialog ref={sampleDialog} className="dialog small-dialog" aria-labelledby="sample-title">
        <h2 id="sample-title">Retirer les exemples</h2>
        <p>Les produits de découverte et les étapes qui les utilisent seront supprimés.</p>
        <form method="dialog" className="form-actions">
          <button className="button button-secondary">Annuler</button>
          <button className="button button-primary" onClick={() => {
            update((previous) => ({ ...previous,
              products: previous.products.filter((product) => !product.id.startsWith("example-")),
              routines: previous.routines.filter((routine) => !routine.id.startsWith("example-")).map((routine) => ({
                ...routine, steps: routine.steps.filter((step) => !step.productId.startsWith("example-")),
              })),
            }));
            setNotice("Exemples retirés.");
          }}>Retirer</button>
        </form>
      </dialog>
    </div>
  );
}

function Dashboard({ state, date, firstName, ready, onAdd, onNavigate, onGuide, onProduct }: {
  state: State; date: string; firstName: string; ready: boolean; onAdd: () => void;
  onNavigate: (view: View) => void; onGuide: (routine: Routine) => void; onProduct: (id: string) => void;
}) {
  const { products, routines, completed } = state;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });
  const allToday = new Set(completed.filter(({ at }) => dateFormat.format(new Date(at)) === today).map(({ routineId }) => routineId));
  const featured = routines.find((routine) => routine.period === "matin" && routine.steps.length) ?? routines.find((routine) => routine.steps.length);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="date-label"><Sun size={15} strokeWidth={1.8}/><span>{date || "Aujourd’hui"}</span></div>
          <h1>Bonjour{firstName ? ` ${firstName}` : ""}<span className="greeting-dot">.</span></h1>
          <p>Bienvenue dans ton espace beauté.</p>
        </div>
        <button className="button button-primary" type="button" onClick={onAdd} disabled={!ready}><Plus size={18}/>Ajouter un produit</button>
      </div>

      <section className="hero-panel" aria-labelledby="hero-title">
        <div className="hero-content">
          <span className="hero-label"><Sparkles size={14} strokeWidth={1.6}/> Ton rituel beauté</span>
          <h2 id="hero-title">Un moment<br/>pour toi.</h2>
          <p>Avance étape par étape, à ton rythme.</p>
          <button className="button button-primary hero-button" disabled={!ready} onClick={() => featured ? onGuide(featured) : onNavigate("routines")}>
            {featured ? "Suivre ma routine" : "Créer une routine"}
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-card" aria-labelledby="today-title">
          <div className="section-heading"><h2 id="today-title">Mes routines</h2><button className="text-button" onClick={() => onNavigate("routines")}>Toutes les routines</button></div>
          <div className="routine-list">
            {routines.slice(0, 2).map((routine) => {
              const Icon = routine.period === "matin" ? Sun : routine.period === "soir" ? Moon : Sparkles;
              return <button className="routine-row" type="button" key={routine.id} onClick={() => routine.steps.length ? onGuide(routine) : onNavigate("routines")}>
                <span className={`routine-icon ${routine.period === "soir" ? "evening" : ""}`}><Icon size={20} strokeWidth={1.6}/></span>
                <span className="routine-label"><strong>{routine.name}</strong><small>{routine.steps.length} {routine.steps.length === 1 ? "étape" : "étapes"}</small></span>
                <span className="routine-end" title={allToday.has(routine.id) ? "Terminée aujourd’hui" : undefined}>{allToday.has(routine.id) ? <Check size={17}/> : <ChevronRight size={17}/>}</span>
              </button>;
            })}
            {!routines.length && <p className="empty-inline"><Clock3 size={17}/> Tes routines apparaîtront ici.</p>}
          </div>
        </section>
        <section className="dashboard-card quick-card" aria-labelledby="quick-title">
          <div className="section-heading"><h2 id="quick-title">À explorer</h2></div>
          <button className="quick-link" onClick={() => onNavigate("palette")}>
            <span className="quick-icon"><PaletteIcon size={18} strokeWidth={1.7}/></span>
            <span><strong>Palette de couleurs</strong><small>Capture une teinte depuis une photo</small></span>
            <ArrowUpRight size={17} className="quick-arrow"/>
          </button>
          <button className="quick-link" onClick={() => onNavigate("tutoriels")}>
            <span className="quick-icon quick-book"><BookOpen size={18} strokeWidth={1.7}/></span>
            <span><strong>Tutoriels beauté</strong><small>Des idées avec tes produits</small></span>
            <ArrowUpRight size={17} className="quick-arrow"/>
          </button>
        </section>
      </div>

      <section className="home-vanity" aria-labelledby="home-vanity-title">
        <div className="section-heading">
          <div><h2 id="home-vanity-title">Mon vanity</h2><p>{products.length} {products.length === 1 ? "produit" : "produits"} dans ta collection</p></div>
          <button className="text-button" onClick={() => onNavigate("vanity")}>Voir mon vanity</button>
        </div>
        {products.length ? <div className="product-grid">
          {products.slice(0, 3).map((product) => <ProductTile key={product.id} product={product} onSelect={() => onProduct(product.id)}/>)}
        </div> : <div className="empty-panel"><FlaskConical size={26}/><h3>Ton vanity est vide</h3><button className="button button-primary" onClick={onAdd}>Ajouter ton premier produit</button></div>}
      </section>
    </>
  );
}

function exportWorkspace(state: State) {
  const palette = state.palette.map(({ id, hex, name }) => ({ id, hex, name }));
  const exported = { version: 1, exportedAt: new Date().toISOString(), ...state, palette };
  const file = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "navier-mes-donnees.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PreferencesForm({ state, onSave, onClearSamples }: {
  state: State; onSave: (preferences: State["preferences"]) => void; onClearSamples: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = preferenceSchema.safeParse({
      fragranceFree: form.has("fragranceFree"), sensitive: form.has("sensitive"), avoid: form.get("avoid"),
    });
    if (parsed.success) onSave(parsed.data);
  }

  return <div className="preferences-layout">
    <form className="dashboard-card stacked-form" onSubmit={submit} key={JSON.stringify(state.preferences)}>
      <h2>Mes critères</h2>
      <label className="check-field"><input type="checkbox" name="fragranceFree" defaultChecked={state.preferences.fragranceFree}/>
        <span><strong>Je préfère éviter le parfum</strong><small>Signaler le parfum et certains composés parfumants déclarés.</small></span></label>
      <label className="check-field"><input type="checkbox" name="sensitive" defaultChecked={state.preferences.sensitive}/>
        <span><strong>Ma peau réagit facilement</strong><small>Afficher des repères de tolérance supplémentaires.</small></span></label>
      <label>Ingrédients à éviter<textarea name="avoid" maxLength={600} rows={3} defaultValue={state.preferences.avoid} placeholder="Par exemple : Parfum, Limonene"/>
        <small className="muted">Utilise les noms de l’emballage et sépare-les par des virgules.</small></label>
      <div className="form-actions"><button className="button button-primary" type="submit">Enregistrer mes préférences</button></div>
    </form>
    <aside className="dashboard-card preference-help">
      <h2><CircleHelp size={20}/> À propos des repères</h2>
      <p>Navier compare les listes d’ingrédients et les étapes de ta routine avec tes critères. Vérifie les notices et les emballages en cas de doute.</p>
      <p>Les repères sont informatifs. Ils ne donnent ni diagnostic ni garantie d’innocuité, d’efficacité ou de résultat esthétique.</p>
      <button className="button button-secondary" type="button" onClick={() => exportWorkspace(state)}><Download size={16}/> Exporter mon espace</button>
      <p className="muted">Le fichier inclut le vanity, les routines, les teintes et les préférences. Les photos et le journal sont séparés.</p>
      <a href="/confidentialite">Confidentialité et données</a>
      {state.products.some((product) => product.id.startsWith("example-")) && (
        <button className="button button-secondary" type="button" onClick={onClearSamples}>Retirer les exemples</button>
      )}
    </aside>
  </div>;
}

function Account({ user, client, onClose, onNotice }: {
  user: ReturnType<typeof useWorkspaceState>["user"]; client: ReturnType<typeof useWorkspaceState>["client"];
  onClose: () => void; onNotice: (message: string) => void;
}) {
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
        onNotice("Tu es connecté à ton espace Navier.");
        onClose();
      } else {
        setMessage("Consulte ta boîte mail pour confirmer ton adresse.");
      }
    } catch {
      setFailed(true);
      setMessage(mode === "login" ? "Connexion impossible. Vérifie tes identifiants ou réessaie dans un instant." : "La création du compte a échoué. Vérifie l’adresse et choisis un mot de passe d’au moins 8 caractères.");
    } finally { setPending(false); }
  }

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await client!.auth.signOut();
      if (error) throw error;
      onClose();
      onNotice("Tu es de retour dans ton espace local.");
    } catch {
      setFailed(true);
      setMessage("Déconnexion impossible. Réessaie dans un instant.");
    } finally { setPending(false); }
  }

  return <>
    <div className="dialog-heading">
      <div><h2 id="account-title">{user ? "Mon compte" : mode === "login" ? "Se connecter" : "Créer un compte"}</h2>
        <p>{user?.email ?? "Retrouve ton espace sur plusieurs appareils."}</p></div>
      <button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={21}/></button>
    </div>
    {!client ? <div className="product-detail-panel"><p>La connexion nécessite une configuration Supabase. Les produits et routines de l’espace local sont conservés dans ce navigateur.</p></div>
      : user ? <div className="stacked-form"><p>Ton compte dispose de sa propre collection. L’espace local reste accessible après la déconnexion.</p>
          <button type="button" className="button button-secondary" disabled={pending} onClick={() => void signOut()}><LogOut size={17}/> Se déconnecter</button>
        </div>
      : <form className="stacked-form" onSubmit={(event) => void submit(event)}>
          {mode === "signup" && <label>Prénom<input name="name" autoComplete="given-name" maxLength={40}/></label>}
          <label>Adresse e-mail<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
          <label>Mot de passe<input type="password" name="password" minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} maxLength={128} required/></label>
          <button className="button button-primary" type="submit" disabled={pending}>{mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
          <button className="text-button" type="button" disabled={pending} onClick={() => {
            setMode(mode === "login" ? "signup" : "login"); setMessage(""); setFailed(false);
          }}>{mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}</button>
        </form>}
    {message && <p className={failed ? "form-error" : "muted"} role={failed ? "alert" : "status"}>{message}</p>}
  </>;
}
