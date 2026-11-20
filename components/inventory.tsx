"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Barcode, CalendarClock, ChevronRight, CircleAlert, Columns2, Droplets, Feather, FlaskConical, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { analyzeProduct, ingredientList } from "@/lib/analysis";
import { searchLocalCatalog } from "@/lib/catalog";
import { categories, categoryLabels, productInput, productSchema, sourceLabels, type Preferences, type Product } from "@/lib/model";
import { formatTrackingDate, getProductLifecycle, lifecycleStatusLabels, localCalendarDate, upcomingWindowDays } from "@/lib/product-life";
import styles from "./inventory.module.css";

type Filter = "all" | Product["category"];
type DateFilter = "all" | "soon" | "past";
const categoryIcons = { soin: Droplets, maquillage: Sparkles, cheveux: Feather };
const categoryBackgrounds = { soin: "#eae0f5", maquillage: "#f6e4ed", cheveux: "#f5e9de" };

export function ProductTile({ product, onSelect, today }: { product: Product; onSelect: () => void; today?: string }) {
  const [failed, setFailed] = useState(false);
  const Icon = categoryIcons[product.category];
  const { status } = getProductLifecycle(product, today);
  return <button className="product-tile" type="button" onClick={onSelect}>
    <span className="product-image" style={{ backgroundColor: product.tint ?? categoryBackgrounds[product.category] }}>
      {product.imageUrl && !failed ? <img src={product.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)}/> : <Icon size={40} strokeWidth={1.05}/>}
      <span className={`category-tag ${product.category}`}>{categoryLabels[product.category]}</span>
    </span>
    <span className="product-caption">
      <span>
        <strong>{product.name}</strong><small>{product.brand || "Marque non renseignée"}</small>
        {(status === "past" || status === "today" || status === "soon") && (
          <span className={styles.dateBadge} data-status={status}><CalendarClock size={14} aria-hidden="true"/>{lifecycleStatusLabels[status]}</span>
        )}
      </span>
      <ChevronRight size={18} aria-hidden="true"/>
    </span>
  </button>;
}

export function Inventory({ products, preferences, selected, onSelect, onEdit, onRemove, onAdd }: {
  products: Product[]; preferences: Preferences; selected: string | null; onSelect: (id: string | null) => void;
  onEdit: (product: Product) => void; onRemove: (id: string) => void; onAdd: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");
  const [removePending, setRemovePending] = useState<string | null>(null);
  const detail = useRef<HTMLDialogElement>(null);
  const current = products.find((product) => product.id === selected);
  const today = localCalendarDate();
  const search = query.trim().toLocaleLowerCase("fr");
  const visible = products.filter((product) => {
    if (filter !== "all" && filter !== product.category) return false;
    if (!`${product.name} ${product.brand} ${product.barcode ?? ""}`.toLocaleLowerCase("fr").includes(search)) return false;
    if (dateFilter === "all") return true;
    const { status } = getProductLifecycle(product, today);
    return status === dateFilter || (dateFilter === "soon" && status === "today");
  });
  useEffect(() => {
    if (current && !detail.current?.open) detail.current?.showModal();
    if (!current && detail.current?.open) detail.current.close();
  }, [current]);
  const ingredients = current ? ingredientList(current.ingredients) : [];
  const notes = current ? analyzeProduct(current, preferences) : [];

  return <>
    <div className="inventory-tools">
      <div className="filters" aria-label="Catégorie">
        {(["all", ...categories] as const).map((key) => (
          <button type="button" className={filter === key ? "filter-active" : ""} aria-pressed={filter === key} key={key} onClick={() => setFilter(key)}>
            {key === "all" ? "Tous les produits" : categoryLabels[key]}
          </button>
        ))}
      </div>
      <label className="search-field"><Search size={18}/><input type="search" aria-label="Rechercher dans mon vanity" placeholder="Rechercher un produit" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      {products.length > 0 && <label className={styles.dateFilter}>
        <CalendarClock size={17} aria-hidden="true"/>
        <select aria-label="Filtrer par repère de conservation" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
          <option value="all">Toutes les dates</option>
          <option value="soon">À vérifier sous {upcomingWindowDays} jours</option>
          <option value="past">Repères dépassés</option>
        </select>
      </label>}
      {products.length >= 2 && <CompareProducts products={products}/>}
    </div>
    {visible.length ? <div className="product-grid">{visible.map((product) => <ProductTile key={product.id} product={product} today={today} onSelect={() => onSelect(product.id)}/>)}</div>
      : <div className="empty-panel"><FlaskConical size={30}/><h2>{products.length ? "Aucun produit trouvé" : "Ton vanity est vide"}</h2>
        <button className="button button-secondary" onClick={products.length ? () => { setQuery(""); setFilter("all"); setDateFilter("all"); } : onAdd}>{products.length ? "Réinitialiser les filtres" : "Ajouter un produit"}</button>
      </div>}
    <dialog ref={detail} className="dialog" aria-labelledby="product-title" onClose={() => { onSelect(null); setRemovePending(null); }}>
      {current && <>
        <div className="dialog-heading">
          <div><span className={`category-tag static-tag ${current.category}`}>{categoryLabels[current.category]}</span><h2 id="product-title">{current.name}</h2><p>{current.brand || "Marque non renseignée"}</p></div>
          <button type="button" className="icon-button" onClick={() => detail.current?.close()} aria-label="Fermer la fiche"><X size={20}/></button>
        </div>
        <ProductTracking product={current} today={today}/>
        <section className="product-detail-panel">
          <h3>Composition INCI</h3>
          <p className="muted">{sourceLabels[current.source]}{current.barcode ? ` · ${current.barcode}` : ""}</p>
          {ingredients.length ? <ul className="ingredient-list">{ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>{ingredient}</li>)}</ul> : <p>La liste d’ingrédients n’est pas renseignée.</p>}
          {current.source === "open-beauty-facts" && current.barcode && <a href={`https://world.openbeautyfacts.org/product/${current.barcode}`} target="_blank" rel="noreferrer">Voir la fiche Open Beauty Facts</a>}
        </section>
        <section className="product-detail-panel insight-panel">
          <h3><CircleAlert size={18}/> Points de vigilance</h3>
          {notes.length ? <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>Aucun signal repéré dans la liste fournie avec tes préférences actuelles.</p>}
          <p className="muted">Les listes peuvent être incomplètes ou périmées. Les concentrations, le pH et ta tolérance individuelle ne sont pas déductibles ici. Vérifie l’emballage. Navier ne fournit pas de diagnostic médical ni de garantie de tolérance.</p>
        </section>
        {removePending === current.id ? <div className="remove-panel" role="group" aria-label="Confirmer la suppression">
          <p>Ce produit et les étapes de routine qui l’utilisent seront supprimés.</p>
          <div className="form-actions"><button className="button button-secondary" onClick={() => setRemovePending(null)}>Annuler</button>
            <button className="button button-danger" onClick={() => onRemove(current.id)}>Supprimer le produit</button></div>
        </div> : <div className="form-actions">
          <button className="button button-secondary" onClick={() => setRemovePending(current.id)}><Trash2 size={17}/>Supprimer</button>
          <button className="button button-primary" onClick={() => { detail.current?.close(); onEdit(current); }}><Pencil size={16}/>Modifier</button>
        </div>}
      </>}
    </dialog>
  </>;
}

function CompareProducts({ products }: { products: Product[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const left = products.find((product) => product.id === leftId);
  const right = products.find((product) => product.id === rightId);
  const leftInci = left ? ingredientList(left.ingredients) : [];
  const rightInci = right ? ingredientList(right.ingredients) : [];
  const rightKeys = new Set(rightInci.map(comparisonKey));
  const shared = new Set(leftInci.map(comparisonKey).filter((key) => rightKeys.has(key)));

  function openComparison() {
    const suggested = products.filter((product) => product.ingredients.trim());
    const first = left ?? suggested[0] ?? products[0];
    const second = right && right.id !== first?.id ? right
      : suggested.find((product) => product.id !== first?.id) ?? products.find((product) => product.id !== first?.id);
    setLeftId(first?.id ?? "");
    setRightId(second?.id ?? "");
    dialog.current?.showModal();
  }

  return <>
    <button type="button" className="button button-secondary" aria-haspopup="dialog" onClick={openComparison}>
      <Columns2 size={17} aria-hidden="true"/> Comparer deux compositions
    </button>
    <dialog className={`dialog ${styles.compareDialog}`} ref={dialog} aria-labelledby="compare-products-title">
      <div className="dialog-heading">
        <div><h2 id="compare-products-title">Comparer deux compositions</h2><p>Choisis deux produits de ton vanity.</p></div>
        <button type="button" className="icon-button" onClick={() => dialog.current?.close()} aria-label="Fermer la comparaison"><X size={20}/></button>
      </div>
      <div className={`stacked-form ${styles.compareColumns}`}>
        <label>Premier produit
          <select value={leftId} onChange={(event) => setLeftId(event.target.value)}>
            {products.map((product) => <option disabled={product.id === rightId} key={product.id} value={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}
          </select>
        </label>
        <label>Second produit
          <select value={rightId} onChange={(event) => setRightId(event.target.value)}>
            {products.map((product) => <option disabled={product.id === leftId} key={product.id} value={product.id}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}
          </select>
        </label>
      </div>
      <p className={styles.compareStatus} role="status">
        {leftInci.length && rightInci.length
          ? `${shared.size} libellé${shared.size === 1 ? "" : "s"} INCI en commun dans les listes fournies.`
          : "Les deux listes doivent être renseignées pour afficher les libellés communs."}
      </p>
      <div className={styles.compareColumns}>
        {left && <CompareIngredients product={left} ingredients={leftInci} shared={shared}/>}
        {right && <CompareIngredients product={right} ingredients={rightInci} shared={shared}/>}
      </div>
      <p className="muted">La comparaison rapproche les libellés identiques en ignorant la casse et les espaces superflus. Deux noms différents peuvent désigner le même ingrédient. Les listes peuvent être incomplètes et ne renseignent pas les concentrations.</p>
    </dialog>
  </>;
}

function comparisonKey(ingredient: string) {
  return ingredient.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function CompareIngredients({ product, ingredients, shared }: { product: Product; ingredients: string[]; shared: Set<string> }) {
  return <section className="product-detail-panel">
    <h3>{product.name}</h3>
    <p className="muted">{sourceLabels[product.source]}</p>
    {ingredients.length ? <ul className="ingredient-list">
      {ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>
        {ingredient}{shared.has(comparisonKey(ingredient)) && <span className={styles.sharedIngredient}>Commun</span>}
      </li>)}
    </ul> : <p>Composition non renseignée.</p>}
  </section>;
}

function ProductTracking({ product, today }: { product: Product; today: string }) {
  const { paoDate, deadline, status } = getProductLifecycle(product, today);
  const { openedOn, paoMonths, expiresOn } = product;
  const hasTracking = Boolean(openedOn || paoMonths || expiresOn);

  return <section className={styles.tracking} aria-labelledby="product-tracking-title">
    <h3 id="product-tracking-title">Dates de conservation</h3>
    {hasTracking ? <>
      <dl>
        {openedOn && <><dt>Ouverture</dt><dd><time dateTime={openedOn}>{formatTrackingDate(openedOn)}</time></dd></>}
        {paoMonths && <><dt>Durée après ouverture</dt><dd>{paoMonths} mois</dd></>}
        {paoDate && <><dt>Date calculée après ouverture</dt><dd><time dateTime={paoDate}>{formatTrackingDate(paoDate)}</time></dd></>}
        {expiresOn && <><dt>Péremption indiquée sur l’emballage</dt><dd><time dateTime={expiresOn}>{formatTrackingDate(expiresOn)}</time></dd></>}
      </dl>
      {deadline && <p className={styles.deadline}>
        <strong>{lifecycleStatusLabels[status]}</strong><span>· <time dateTime={deadline.date}>{formatTrackingDate(deadline.date)}</time></span>
        {paoDate && expiresOn && <span className="muted">({deadline.source === "printed" ? "date de l’emballage" : "durée après ouverture"})</span>}
      </p>}
      {!deadline && <p>{openedOn ? "Renseigne la durée indiquée avec le symbole du pot ouvert pour calculer un repère." : "Renseigne la date d’ouverture pour calculer un repère."}</p>}
    </> : <p>Tu peux modifier la fiche pour indiquer la date d’ouverture ou la date de péremption inscrite sur l’emballage.</p>}
    <p className={styles.trackingHint}>Ces dates servent au suivi. Suis les indications de conservation et d’utilisation sur l’emballage.</p>
  </section>;
}

export function ProductDialog({ product, currentProducts, onClose, onSave }: {
  product?: Product; currentProducts: Product[]; onClose: () => void; onSave: (product: Product) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [tab, setTab] = useState<"catalogue" | "manuel">(product ? "manuel" : "catalogue");
  const [draft, setDraft] = useState<Product | undefined>(product);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function search(query: string) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setStatus("");
    setCatalog([]);
    try {
      const response = await fetch(`/api/catalog?q=${encodeURIComponent(query.trim())}`, { signal: request.signal });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (request.signal.aborted) return;
      const matches: Product[] = Array.isArray(payload.products) ? payload.products.flatMap((item: unknown) => {
        const result = productSchema.safeParse(item);
        return result.success ? [result.data] : [];
      }) : [];
      setCatalog(matches);
      setStatus(payload.externalStatus === "unavailable"
        ? "Open Beauty Facts est indisponible. Tu peux choisir une fiche du catalogue local ou saisir le produit."
        : !matches.length ? "Aucun résultat. Essaie un autre nom ou ajoute le produit manuellement." : "");
    } catch {
      if (!request.signal.aborted) {
        setCatalog(searchLocalCatalog(query.trim()));
        setStatus("Recherche en ligne indisponible. Le catalogue local et la saisie manuelle restent accessibles.");
      }
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }

  useEffect(() => {
    dialog.current?.showModal();
    if (!product) void search("");
    return () => controller.current?.abort();
  }, [product]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const barcode = String(form.get("barcode") ?? "").trim();
    const openedOn = String(form.get("openedOn") ?? "").trim() || undefined;
    const expiresOn = String(form.get("expiresOn") ?? "").trim() || undefined;
    const pao = String(form.get("paoMonths") ?? "").trim();
    if (openedOn && openedOn > localCalendarDate()) {
      setError("La date d’ouverture doit être aujourd’hui ou dans le passé.");
      return;
    }
    const parsed = productInput.safeParse({
      name: form.get("name"), brand: form.get("brand"), category: form.get("category"),
      ingredients: form.get("ingredients"), barcode: barcode || undefined, openedOn, expiresOn,
      paoMonths: pao ? Number(pao) : undefined,
    });
    if (!parsed.success) { setError("Vérifie le nom, la composition, le code-barres et les dates renseignées."); return; }
    if (barcode && currentProducts.some((entry) => entry.barcode === barcode && entry.id !== product?.id)) {
      setError("Ce code-barres est déjà enregistré dans ton vanity.");
      return;
    }
    const sourceChanged = draft && (draft.ingredients !== parsed.data.ingredients || draft.barcode !== parsed.data.barcode);
    const saved = onSave({ ...draft, ...parsed.data, id: product?.id ?? crypto.randomUUID(),
      source: sourceChanged ? "manuel" : draft?.source ?? "manuel" });
    if (!saved) setError("Ce produit n’a pas été enregistré. Vérifie la taille de ton inventaire et raccourcis la composition si nécessaire.");
  }

  return <dialog className="dialog product-dialog" aria-labelledby="editor-title" ref={dialog} onClose={onClose}>
    <div className="dialog-heading">
      <div><h2 id="editor-title">{product ? "Modifier un produit" : "Ajouter un produit"}</h2><p>{product ? "Mets à jour sa fiche dans ton vanity." : "Cherche une fiche ou saisis les informations de ton produit."}</p></div>
      <button className="icon-button" type="button" aria-label="Fermer" onClick={() => dialog.current?.close()}><X size={21}/></button>
    </div>
    {!product && <div className="filters editor-tabs" aria-label="Mode de saisie">
      <button className={tab === "catalogue" ? "filter-active" : ""} type="button" aria-pressed={tab === "catalogue"} onClick={() => setTab("catalogue")}>Catalogue</button>
      <button className={tab === "manuel" ? "filter-active" : ""} type="button" aria-pressed={tab === "manuel"} onClick={() => setTab("manuel")}>Saisie manuelle</button>
    </div>}
    {tab === "catalogue" ? <div className="catalog-pane">
      <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); void search(query); }}>
        <label className="search-field"><Barcode size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Nom ou code-barres" placeholder="Nom ou code-barres" maxLength={120}/></label>
        <button type="submit" className="button button-primary" disabled={pending}><Search size={17}/>Rechercher</button>
      </form>
      {pending && <p role="status">Recherche en cours…</p>}
      {status && <p role="status">{status}</p>}
      <ul className="catalog-results">
        {catalog.map((item) => {
          const Icon = categoryIcons[item.category];
          return <li key={item.id}><button className="catalog-item" onClick={() => { setDraft(item); setTab("manuel"); setError(""); }}>
            <span className="routine-icon"><Icon size={19}/></span>
            <span><strong>{item.name}</strong><small>{item.brand && item.source !== "local" ? `${item.brand} · ` : ""}{sourceLabels[item.source]}</small></span><Plus size={18}/>
          </button></li>;
        })}
      </ul>
      <p className="muted">Fiches communautaires par <a href="https://world.openbeautyfacts.org/" target="_blank" rel="noreferrer">Open Beauty Facts</a>. Vérifie la composition sur l’emballage.</p>
    </div> : <form onSubmit={submit} className="stacked-form" key={draft?.id ?? "manual"}>
      <div className="form-grid">
        <label>Nom du produit<input name="name" required maxLength={140} defaultValue={draft?.name}/></label>
        <label>Marque<input name="brand" maxLength={140} defaultValue={draft?.brand}/></label>
        <label>Catégorie<select name="category" defaultValue={draft?.category ?? "soin"}>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label>Code-barres<input name="barcode" inputMode="numeric" pattern="[0-9]{8,14}" maxLength={14} defaultValue={draft?.barcode}/></label>
      </div>
      <label>Composition INCI <span className="muted">(facultative)</span><textarea name="ingredients" rows={5} maxLength={6500} defaultValue={draft?.ingredients} placeholder="Aqua, Glycerin, …"/></label>
      {draft && <p className="muted">Source initiale de la composition · {sourceLabels[draft.source]}</p>}
      <details className={styles.tracking} open={Boolean(product)} onInvalid={(event) => { event.currentTarget.open = true; }}>
        <summary>Dates de conservation <span className="muted">(facultatives)</span></summary>
        <p>Reporte les repères de l’emballage. Le symbole du pot ouvert indique une durée en mois, par exemple 12M.</p>
        <div className="form-grid">
          <label>Ouvert le<input name="openedOn" type="date" max={localCalendarDate()} defaultValue={draft?.openedOn}/></label>
          <label>Durée après ouverture (mois)<input name="paoMonths" type="number" min={1} max={60} step={1} inputMode="numeric" defaultValue={draft?.paoMonths}/></label>
          <label>Péremption indiquée sur l’emballage<input name="expiresOn" type="date" max="9999-12-31" defaultValue={draft?.expiresOn}/></label>
        </div>
      </details>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => dialog.current?.close()}>Annuler</button>
        <button className="button button-primary" type="submit">{product ? "Enregistrer" : "Ajouter à mon vanity"}</button>
      </div>
    </form>}
  </dialog>;
}
