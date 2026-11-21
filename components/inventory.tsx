"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { ArrowLeft, Brush, CalendarClock, Check, ChevronRight, CircleAlert, Columns2, Droplets, ExternalLink, FileText, Heart, Plus, Scissors, Search, SprayCan, SwatchBook, Trash2, X } from "lucide-react";
import { beautyListName, sameProductVariant, vanityDestination } from "@/lib/beauty-list-destinations";
import { analyzeProduct, ingredientList } from "@/lib/analysis";
import { canSupplementCatalog, catalogImageUrl, normalizeCatalogQuery, normalizeCatalogText, rankCatalogProducts, searchLocalCatalog, supplementCatalog } from "@/lib/catalog";
import { useLocale } from "@/lib/i18n";
import { categories, categoryLabels, makeupEffectLabels, makeupKindLabels, productSchema, sourceLabels, type BeautyList, type Preferences, type Product } from "@/lib/model";
import { searchOpenBeautyFacts } from "@/lib/open-beauty-facts";
import { getProductLifecycle, lifecycleStatusLabels, localCalendarDate, upcomingWindowDays } from "@/lib/product-life";
import styles from "./inventory.module.css";

type Filter = "all" | Product["category"];
type DateFilter = "all" | "soon" | "past";
type FeedbackFilter = "all" | "purchased" | NonNullable<Product["feedback"]>;
const categoryIcons = { soin: Droplets, maquillage: Brush, cheveux: Scissors, parfums: SprayCan };
const categoryLabelsEn = { soin: "Skincare", maquillage: "Makeup", cheveux: "Haircare", parfums: "Fragrance" };
const sourceLabelsEn = { manufacturer: "Manufacturer", manuel: "Manual entry", local: "Local catalogue · example formula", "open-beauty-facts": "Open Beauty Facts" };
const lifecycleLabelsEn = { past: "Past its date", today: "Due today", soon: "Check soon", upcoming: "Next date" };
const makeupKindLabelsEn = {
  foundation: "Foundation", concealer: "Concealer", blush: "Blush", contour: "Contour", bronzer: "Bronzer", highlighter: "Highlighter", eyeshadow: "Eyeshadow",
  eyeliner: "Eyeliner", mascara: "Mascara", lip: "Lip product", powder: "Powder", other: "Other",
};
const makeupEffectLabelsEn = { tinted: "Tinted", transparent: "Transparent", mattifying: "Mattifying", unknown: "Unspecified" };
const feedbackLabels = {
  favorite: ["Favori", "Favourite"],
  liked: ["Apprécié", "Liked"],
  disappointed: ["Décevant", "Disappointing"],
} as const;
const claimFields = [
  { key: "vegan", label: "Vegan" },
  { key: "crueltyFree", label: "Cruelty-free" },
] as const;
type Translate = ReturnType<typeof useLocale>["t"];

function brandLabel(brand: string, t: Translate) {
  return !brand || brand === "Marque non renseignée" ? t("Marque non renseignée", "Brand unspecified")
    : brand === "Formule indicative" ? t("Formule indicative", "Example formula") : brand;
}

function feedbackLabel(feedback: NonNullable<Product["feedback"]>, t: Translate) {
  const [french, english] = feedbackLabels[feedback];
  return t(french, english);
}

function ProductPhoto({ product, size = "card" }: { product: Product; size?: "card" | "thumb" | "detail" }) {
  const { t } = useLocale();
  const url = catalogImageUrl(product.imageUrl, product.barcode, product.manufacturerUrl);
  const [failed, setFailed] = useState<string>();
  const Icon = categoryIcons[product.category];
  const hasPhoto = Boolean(url && failed !== url);
  const manufacturer = product.source === "manufacturer";
  return <span className={styles.productPhoto} data-size={size}>
    {hasPhoto ? <>
      <img src={url} alt={size === "card" ? product.name : ""} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer"
        onError={() => setFailed(url)}/>
      {size === "card" && <small className={styles.photoCredit}>{manufacturer
        ? t("Photo de la marque", "Brand photo") : t("Photo communautaire", "Community photo")}</small>}
    </> : <span className={styles.photoPlaceholder}>
        <Icon size={size === "thumb" ? 20 : 34} strokeWidth={1.4} aria-hidden="true"/>
        {size !== "thumb" && <small>{t("Photo indisponible", "Photo unavailable")}</small>}
      </span>}
  </span>;
}

function productSource(product: Product) {
  return product.variants?.find(({ id }) => id === product.selectedVariantId)?.sourceUrl
    ?? product.manufacturerUrl ?? product.sourceUrl ?? (product.source === "open-beauty-facts" && product.barcode ? `https://world.openbeautyfacts.org/product/${product.barcode}` : undefined);
}

export function ProductTile({ product, onSelect, today }: { product: Product; onSelect: () => void; today?: string }) {
  const { t } = useLocale();
  const { status } = getProductLifecycle(product, today);
  const feedback = product.feedback ? feedbackLabel(product.feedback, t) : undefined;
  const summary = [product.purchased ? t("Acheté", "Purchased") : undefined, feedback].filter(Boolean).join(" · ");
  return <button className={styles.productTile} type="button" onClick={onSelect} data-product-id={product.id}>
    <ProductPhoto product={product} size="thumb"/>
    <span className={styles.tileText}>
      <strong>{product.name}</strong>
      <small>{brandLabel(product.brand, t)} · {t(categoryLabels[product.category], categoryLabelsEn[product.category])}</small>
      {summary && <small>{summary}</small>}
      {(status === "past" || status === "today" || status === "soon") && (
        <span className={styles.dateBadge} data-status={status}><CalendarClock size={14} aria-hidden="true"/>{t(lifecycleStatusLabels[status], lifecycleLabelsEn[status])}</span>
      )}
    </span>
    <ChevronRight size={16} aria-hidden="true"/>
  </button>;
}

export function Inventory({ products, preferences, selected, onSelect, onRemove, onTry }: {
  products: Product[]; preferences: Preferences; selected: string | null; onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onTry?: (product: Product) => void;
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [query, setQuery] = useState("");
  const [comparing, setComparing] = useState(false);
  const current = products.find((product) => product.id === selected);
  const today = localCalendarDate();
  const words = normalizeCatalogText(query).trim().split(/\s+/).filter(Boolean);
  const visible = products.filter((product) => {
    if (filter !== "all" && filter !== product.category) return false;
    const matchesFeedback = feedbackFilter === "purchased" ? product.purchased : feedbackFilter === "all" || feedbackFilter === product.feedback;
    if (!matchesFeedback) return false;
    const label = normalizeCatalogText(`${product.name} ${product.brand} ${categoryLabels[product.category]} ${categoryLabelsEn[product.category]} ${product.barcode ?? ""}`);
    if (!words.every((word) => label.includes(word))) return false;
    if (dateFilter === "all") return true;
    const { status } = getProductLifecycle(product, today);
    return status === dateFilter || (dateFilter === "soon" && status === "today");
  });

  function returnToList(id?: string) {
    onSelect(null);
    setComparing(false);
    requestAnimationFrame(() => {
      const tile = id && document.querySelector<HTMLButtonElement>(`button[data-product-id="${CSS.escape(id)}"]`);
      if (tile) tile.focus();
      else document.getElementById("inventory-search")?.focus();
    });
  }

  if (current) return <ProductDetail key={current.id} product={current} today={today} preferences={preferences}
    onBack={() => returnToList(current.id)} onRemove={() => onRemove(current.id)} onTry={onTry}/>;
  if (comparing && products.length >= 2) return <CompareProducts products={products} onBack={() => returnToList()}/>;
  if (!products.length) return <p className={styles.emptyState}>{t("Tes produits enregistrés apparaîtront ici.", "Your saved products will appear here.")}</p>;

  return <>
    <div className={styles.inventoryTools}>
      <div className={styles.filterRow} role="group" aria-label={t("Catégorie", "Category")}>
        {(["all", ...categories] as const).map((key) => (
          <button type="button" aria-pressed={filter === key} key={key} onClick={() => setFilter(key)}>
            {key === "all" ? t("Tous les produits", "All products") : t(categoryLabels[key], categoryLabelsEn[key])}
          </button>
        ))}
      </div>
      <div className={styles.inventoryControls}>
        <label className={`search-field ${styles.inventorySearch}`}><Search size={18} aria-hidden="true"/>
          <input id="inventory-search" type="search" aria-label={t("Rechercher dans mes produits", "Search my products")}
            placeholder={t("Rechercher dans mes produits", "Search my products")} value={query} onChange={(event) => setQuery(event.target.value)}/>
        </label>
        <label className={styles.inventoryFilter}>
          <Heart size={17} aria-hidden="true"/>
          <select aria-label={t("Filtrer par suivi personnel", "Filter by personal tracking")} value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value as FeedbackFilter)}>
            <option value="all">{t("Tous les statuts", "All statuses")}</option>
            <option value="purchased">{t("Produits achetés", "Purchased products")}</option>
            <option value="favorite">{t("Favoris", "Favourites")}</option>
            <option value="liked">{t("Produits appréciés", "Liked products")}</option>
            <option value="disappointed">{t("Produits décevants", "Disappointing products")}</option>
          </select>
        </label>
        <label className={styles.inventoryFilter}>
          <CalendarClock size={17} aria-hidden="true"/>
          <select aria-label={t("Filtrer par date de conservation", "Filter by use-by date")} value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
            <option value="all">{t("Toutes les dates", "All dates")}</option>
            <option value="soon">{t(`À vérifier sous ${upcomingWindowDays} jours`, `Due within ${upcomingWindowDays} days`)}</option>
            <option value="past">{t("Repères dépassés", "Past their dates")}</option>
          </select>
        </label>
        {products.length >= 2 && <button type="button" className="button button-secondary" onClick={() => setComparing(true)}>
          <Columns2 size={17} aria-hidden="true"/>{t("Comparer les compositions", "Compare ingredients")}
        </button>}
      </div>
    </div>
    {visible.length ? <div className={styles.collectionGrid}>{visible.map((product) => <ProductTile key={product.id} product={product} today={today} onSelect={() => onSelect(product.id)}/>)}</div>
      : <div className={styles.emptyState}>
        <h2>{t("Aucun produit trouvé", "No products found")}</h2>
        <button type="button" className="button button-secondary" onClick={() => { setQuery(""); setFilter("all"); setDateFilter("all"); setFeedbackFilter("all"); }}>
          {t("Réinitialiser les filtres", "Reset filters")}
        </button>
      </div>}
  </>;
}

function ProductDetail({ product, today, preferences, onBack, onRemove, onTry }: {
  product: Product; today: string; preferences: Preferences; onBack: () => void; onRemove: () => void; onTry?: (product: Product) => void;
}) {
  const { t } = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const [removePending, setRemovePending] = useState(false);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (removePending) confirmation.current?.focus(); }, [removePending]);

  return <section className={styles.inlineSurface} aria-labelledby="product-title">
    <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={17} aria-hidden="true"/>{t("Mes produits", "My products")}</button>
    <header className={styles.panelHeading}>
      <ProductPhoto product={product} size="detail"/>
      <div><h2 id="product-title" ref={heading} tabIndex={-1}>{product.name}</h2>
        <p>{brandLabel(product.brand, t)} · {t(categoryLabels[product.category], categoryLabelsEn[product.category])}</p></div>
    </header>
    {onTry && product.category === "maquillage" && <div className="form-actions">
      <button type="button" className="button button-primary" onClick={() => onTry(product)}><Brush size={16} aria-hidden="true"/>
        {t("Essayer dans le Studio", "Try in the Studio")}
      </button>
    </div>}
    <PersonalProductFeedback product={product}/>
    <ProductComposition product={product} preferences={preferences}/>
    <ProductTracking product={product} today={today}/>
    <ProductDeclarations product={product}/>
    {product.category === "maquillage" && <MakeupDetails product={product}/>}
    {removePending ? <div ref={confirmation} tabIndex={-1} className="remove-panel" role="group" aria-label={t("Confirmer la suppression", "Confirm removal")}>
      <p>{t("Ce produit et les étapes de routine qui l’utilisent seront supprimés.", "This product and the routine steps that use it will be removed.")}</p>
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => {
        setRemovePending(false);
        requestAnimationFrame(() => removeButton.current?.focus());
      }}>{t("Annuler", "Cancel")}</button>
        <button type="button" className="button button-danger" onClick={onRemove}>{t("Supprimer le produit", "Remove product")}</button></div>
    </div> : <div className="form-actions">
      <button ref={removeButton} type="button" className="button button-secondary" onClick={() => setRemovePending(true)}><Trash2 size={17} aria-hidden="true"/>{t("Supprimer", "Remove")}</button>
    </div>}
  </section>;
}

function ProductComposition({ product, preferences }: { product: Product; preferences: Preferences }) {
  const { t, locale } = useLocale();
  const ingredients = ingredientList(product.ingredients);
  const notes = ingredients.length ? analyzeProduct(product, preferences, locale) : [];
  const sourceUrl = productSource(product);

  return <>
    <section className="product-detail-panel">
      <h3>{t("Composition INCI", "INCI ingredients")}</h3>
      <p className="muted">{t(sourceLabels[product.source], sourceLabelsEn[product.source])}{product.barcode ? ` · ${product.barcode}` : ""}</p>
      {ingredients.length ? <ul className="ingredient-list">
        {ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>{ingredient}</li>)}
      </ul> : <p>{t("Composition non renseignée. Consulte la liste d’ingrédients sur l’emballage.", "Ingredients are missing. Check the ingredient list on the packaging.")}</p>}
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">{t("Voir la fiche catalogue d’origine", "View the original catalogue entry")}</a>}
    </section>
    {ingredients.length > 0 && <section className="product-detail-panel insight-panel">
      <h3><CircleAlert size={18} aria-hidden="true"/>{t("Points de vigilance", "Things to check")}</h3>
      {notes.length ? <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>{t("Aucun signal repéré dans la liste fournie avec tes préférences actuelles.", "There are no matches in the supplied list for your current preferences.")}</p>}
      <p className="muted">{t("Les listes peuvent être incomplètes ou périmées. Vérifie la composition sur l’emballage.", "Ingredient lists can be incomplete or out of date. Check the packaging for the current list.")}</p>
    </section>}
  </>;
}

function PersonalProductFeedback({ product }: { product: Product }) {
  const { t } = useLocale();
  const feedback = product.feedback ? feedbackLabel(product.feedback, t) : undefined;
  if (!product.purchased && !feedback && !product.personalNote) return null;
  return <section className="product-detail-panel">
    <h3>{t("Mon suivi", "My tracking")}</h3>
    {(product.purchased || feedback) && <dl className={styles.declarationList}>
      {product.purchased && <div><dt>{t("Achat", "Purchase")}</dt><dd>{t("Acheté", "Purchased")}</dd></div>}
      {feedback && <div><dt>{t("Mon avis", "My feedback")}</dt><dd>{feedback}</dd></div>}
    </dl>}
    {product.personalNote && <div>
      <strong>{t("Ma note privée", "My private note")}</strong>
      <p className={styles.instructionText}>{product.personalNote}</p>
    </div>}
  </section>;
}

function evidenceLabel(source: "open-beauty-facts" | "manufacturer" | "packaging", t: Translate) {
  return source === "manufacturer" ? t("Fabricant · lien renseigné", "Manufacturer · supplied link")
    : source === "packaging" ? t("Emballage · saisie manuelle", "Packaging · manual entry")
    : t("Open Beauty Facts · fiche communautaire", "Open Beauty Facts · community entry");
}

function ProductDeclarations({ product }: { product: Product }) {
  const { t } = useLocale();
  const instructions = product.usageInstructions;
  return <>
    <section className="product-detail-panel">
      <h3>{t("Mode d’emploi", "Directions")}</h3>
      {instructions ? <>
        <p className={styles.instructionText}>{instructions.text}</p>
        {instructions.source === "packaging" ? <p className="muted">{evidenceLabel(instructions.source, t)}</p>
          : <a href={instructions.url} target="_blank" rel="noreferrer">{evidenceLabel(instructions.source, t)}</a>}
      </> : <p>{t("Consignes non renseignées. Consulte l’emballage ou le fabricant.", "Directions are missing. Check the packaging or the manufacturer’s guidance.")}</p>}
    </section>
    <section className="product-detail-panel">
      <h3>{t("Déclarations produit", "Product claims")}</h3>
      <dl className={styles.declarationList}>
        {claimFields.map(({ key, label }) => {
          const claim = product.claims?.[key];
          return <div key={key}>
            <dt>{label}</dt>
            <dd>{claim ? <a href={claim.url} target="_blank" rel="noreferrer">{t("Mention déclarée", "Declared claim")} · {evidenceLabel(claim.source, t)}</a>
              : <span className="muted">{t("Non renseigné", "Unspecified")}</span>}</dd>
          </div>;
        })}
      </dl>
      {(product.claims?.vegan || product.claims?.crueltyFree) && <p className="muted">{t("Les mentions reflètent les déclarations de la source indiquée.", "These claims are attributed to the listed sources.")}</p>}
    </section>
  </>;
}

function MakeupDetails({ product }: { product: Product }) {
  const { t } = useLocale();
  const makeupKind = product.makeupKind;
  const makeupEffect = product.makeupEffect ?? "unknown";
  return <section className="product-detail-panel">
    <h3>{t("Rendu sur le Face Chart", "Face Chart appearance")}</h3>
    <dl className={styles.declarationList}>
      <div><dt>{t("Type de maquillage", "Makeup type")}</dt><dd>{makeupKind ? t(makeupKindLabels[makeupKind], makeupKindLabelsEn[makeupKind]) : t("Non renseigné", "Unspecified")}</dd></div>
      <div><dt>{t("Effet visuel", "Finish")}</dt><dd>{t(makeupEffectLabels[makeupEffect], makeupEffectLabelsEn[makeupEffect])}</dd></div>
      {product.shadeHex && <div><dt>{t("Teinte", "Shade")}</dt><dd className={styles.colorSample}><span style={{ backgroundColor: product.shadeHex }} aria-hidden="true"/>{product.shadeHex.toUpperCase()}</dd></div>}
    </dl>
  </section>;
}

function CompareProducts({ products, onBack }: { products: Product[]; onBack: () => void }) {
  const { t, formatNumber } = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState(() => {
    const withIngredients = products.filter((product) => product.ingredients.trim());
    const left = withIngredients[0] ?? products[0];
    const right = withIngredients[1] ?? products.find((product) => product.id !== left.id);
    return { leftId: left.id, rightId: right?.id ?? "" };
  });
  const left = products.find((product) => product.id === selected.leftId) ?? products[0];
  const right = products.find((product) => product.id === selected.rightId && product.id !== left.id)
    ?? products.find((product) => product.id !== left.id);
  const leftInci = ingredientList(left.ingredients);
  const rightInci = right ? ingredientList(right.ingredients) : [];
  const rightKeys = new Set(rightInci.map(comparisonKey));
  const shared = new Set(leftInci.map(comparisonKey).filter((key) => rightKeys.has(key)));
  const sharedCount = formatNumber(shared.size);

  useEffect(() => { heading.current?.focus(); }, []);

  return <section className={styles.inlineSurface} aria-labelledby="compare-products-title">
    <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={17} aria-hidden="true"/>{t("Mes produits", "My products")}</button>
    <header className={styles.panelHeading}>
      <div><h2 id="compare-products-title" ref={heading} tabIndex={-1}>{t("Comparer deux compositions", "Compare ingredients")}</h2>
        <p>{t("Choisis deux de tes produits.", "Choose two of your saved products.")}</p></div>
    </header>
    <div className={`stacked-form ${styles.compareColumns}`}>
      <label>{t("Premier produit", "First product")}
        <select value={left.id} onChange={(event) => setSelected({ ...selected, leftId: event.target.value })}>
          {products.map((product) => <option disabled={product.id === right?.id} key={product.id} value={product.id}>{product.name} · {brandLabel(product.brand, t)}</option>)}
        </select>
      </label>
      <label>{t("Second produit", "Second product")}
        <select value={right?.id ?? ""} onChange={(event) => setSelected({ ...selected, rightId: event.target.value })}>
          {products.map((product) => <option disabled={product.id === left.id} key={product.id} value={product.id}>{product.name} · {brandLabel(product.brand, t)}</option>)}
        </select>
      </label>
    </div>
    <p className={styles.compareStatus} role="status">
      {leftInci.length && rightInci.length
        ? shared.size === 1
          ? t(`${sharedCount} libellé INCI en commun.`, `${sharedCount} matching INCI entry.`)
          : t(`${sharedCount} libellés INCI en commun.`, `${sharedCount} matching INCI entries.`)
        : t("Il faut deux listes INCI pour afficher les libellés communs.", "Matching entries need two ingredient lists.")}
    </p>
    <div className={styles.compareColumns}>
      <CompareIngredients product={left} ingredients={leftInci} shared={shared}/>
      {right && <CompareIngredients product={right} ingredients={rightInci} shared={shared}/>}
    </div>
    <p className="muted">{t("Les libellés sont comparés sans tenir compte de la casse ni des espaces superflus. Deux noms différents peuvent désigner le même ingrédient. Les listes ne renseignent pas les concentrations.", "Entries are matched without regard to case or extra spaces. One ingredient can have several names. These lists do not show concentrations.")}</p>
  </section>;
}

function comparisonKey(ingredient: string) {
  return ingredient.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function CompareIngredients({ product, ingredients, shared }: { product: Product; ingredients: string[]; shared: Set<string> }) {
  const { t } = useLocale();
  return <section className="product-detail-panel">
    <h3>{product.name}</h3>
    <p className="muted">{t(sourceLabels[product.source], sourceLabelsEn[product.source])}</p>
    {ingredients.length ? <ul className="ingredient-list">
      {ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>
        {ingredient}{shared.has(comparisonKey(ingredient)) && <span className={styles.sharedIngredient}>{t("Commun", "Match")}</span>}
      </li>)}
    </ul> : <p>{t("Composition non renseignée.", "Ingredients are missing.")}</p>}
  </section>;
}

function ProductTracking({ product, today }: { product: Product; today: string }) {
  const { t, formatDate, formatNumber } = useLocale();
  const { openedOn, paoMonths, expiresOn } = product;
  const { paoDate, deadline, status } = getProductLifecycle(product, today);
  if (!openedOn && !paoMonths && !expiresOn) return null;
  const dateLabel = (date: string) => formatDate(new Date(`${date}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  return <section className={styles.tracking} aria-labelledby="product-tracking-title">
    <h3 id="product-tracking-title">{t("Dates de conservation", "Use-by dates")}</h3>
    <>
      <dl>
        {openedOn && <><dt>{t("Ouverture", "Opened")}</dt><dd><time dateTime={openedOn}>{dateLabel(openedOn)}</time></dd></>}
        {paoMonths && <><dt>{t("Durée après ouverture", "Period after opening")}</dt><dd>{paoMonths === 1
          ? t(`${formatNumber(paoMonths)} mois`, `${formatNumber(paoMonths)} month`)
          : t(`${formatNumber(paoMonths)} mois`, `${formatNumber(paoMonths)} months`)}</dd></>}
        {paoDate && <><dt>{t("Date calculée après ouverture", "Date based on opening")}</dt><dd><time dateTime={paoDate}>{dateLabel(paoDate)}</time></dd></>}
        {expiresOn && <><dt>{t("Péremption indiquée sur l’emballage", "Expiry date on packaging")}</dt><dd><time dateTime={expiresOn}>{dateLabel(expiresOn)}</time></dd></>}
      </dl>
      {deadline && <p className={styles.deadline}>
        <strong>{t(lifecycleStatusLabels[status], lifecycleLabelsEn[status])}</strong><span>· <time dateTime={deadline.date}>{dateLabel(deadline.date)}</time></span>
        {paoDate && expiresOn && <span className="muted">({deadline.source === "printed" ? t("date de l’emballage", "printed expiry date") : t("durée après ouverture", "period after opening")})</span>}
      </p>}
      {!deadline && <p>{t("Repère de conservation incomplet.", "Incomplete use-by information.")}</p>}
    </>
    <p className={styles.trackingHint}>{t("Suis les indications de conservation et d’utilisation sur l’emballage.", "Follow the storage and use instructions on the packaging.")}</p>
  </section>;
}

type CatalogueResult = {
  items: Product[];
  origin: "online" | "local" | "unavailable";
  query: string;
  supplemented?: boolean;
};

function localMatches(query: string) {
  const items = searchLocalCatalog(query);
  return query ? items : items.filter(({ source }) => source === "manufacturer");
}

type CatalogueActions = {
  currentProducts: Product[];
  lists: BeautyList[];
  destination?: string;
  onSave: (product: Product, destination: string) => boolean;
  onTry: (product: Product) => void;
  onOpenDestination: (destination: string, product?: Product) => void;
};

type CatalogueVariant = NonNullable<Product["variants"]>[number];

function productForVariant(product: Product, variant?: CatalogueVariant): Product {
  if (!variant) {
    return product.selectedVariantId ? { ...product, barcode: undefined, selectedVariantId: undefined, shadeHex: undefined } : product;
  }
  return {
    ...product,
    id: `${product.id}:shade:${variant.id}`,
    name: `${product.name} · ${variant.name}`.slice(0, 140),
    variants: [variant],
    selectedVariantId: variant.id,
    barcode: variant.barcode,
    shadeHex: variant.shadeHex,
    makeupEffect: product.makeupEffect ?? (variant.shadeHex ? "tinted" : undefined),
  };
}

function CataloguePreview({ product, variant, preferences, heading, onClose, headingId }: {
  product: Product;
  variant?: CatalogueVariant;
  preferences: Preferences;
  heading: Ref<HTMLHeadingElement>;
  onClose: () => void;
  headingId: string;
}) {
  const { t } = useLocale();
  const entry = productForVariant(product, variant);

  return <section className={styles.catalogPreview} aria-labelledby={headingId}>
    <header className={styles.previewHeader}>
      <div className={styles.panelHeading}>
        <ProductPhoto product={product} size="detail"/>
        <div>
          <p className={styles.category}>{t(categoryLabels[product.category], categoryLabelsEn[product.category])}</p>
          <h2 id={headingId} ref={heading} tabIndex={-1}>{product.name}</h2>
          <p>{brandLabel(product.brand, t)}</p>
          {variant && <p className={styles.previewShade}>{t("Teinte", "Shade")} · <strong>{variant.name}</strong></p>}
        </div>
      </div>
      <button type="button" className="button button-secondary" onClick={onClose}>
        <X size={17} aria-hidden="true"/>{t("Fermer la fiche", "Close product details")}
      </button>
    </header>
    <div className={styles.previewColumns}>
      <div>
        <ProductComposition product={entry} preferences={preferences}/>
      </div>
      <div>
        <ProductDeclarations product={entry}/>
        {product.category === "maquillage" && <MakeupDetails product={entry}/>}
      </div>
    </div>
  </section>;
}

export function Catalog({ initialQuery = "", portable = false, preferences, ...actions }: CatalogueActions & {
  initialQuery?: string;
  portable?: boolean;
  preferences: Preferences;
}) {
  const { t, formatNumber } = useLocale();
  const previewId = useId();
  const [result, setResult] = useState<CatalogueResult>(() => ({
    items: localMatches(initialQuery.trim()), origin: "local", query: initialQuery.trim(),
  }));
  const [pending, setPending] = useState(false);
  const [supplementRequest, setSupplementRequest] = useState<{ query: string; attempt: number }>();
  const [previewedId, setPreviewedId] = useState<string>();
  const [variantSelections, setVariantSelections] = useState(() => new Map<string, string>());
  const additionalResults = useRef<HTMLHeadingElement>(null);
  const previewSurface = useRef<HTMLDivElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const previewedProduct = result.items.find(({ id }) => id === previewedId);
  const openProductId = previewedProduct?.id;

  useEffect(() => {
    const input = initialQuery.trim().slice(0, 120);
    const normalized = normalizeCatalogQuery(input);
    const query = normalized ? input : "";
    const localItems = localMatches(query);
    const hasOfficialMatch = localItems.some(({ source }) => source === "manufacturer");
    const supplemented = supplementRequest?.query === query && canSupplementCatalog(query, localItems);
    const items = supplemented ? supplementCatalog(localItems, [], query) : localItems;
    const tryOnline = normalized.length >= 2 && (supplemented || !hasOfficialMatch);
    if (!tryOnline || !navigator.onLine) {
      setResult({ items, origin: tryOnline ? "unavailable" : "local", query, supplemented });
      setPending(false);
      return;
    }

    const request = new AbortController();
    setResult({ items, origin: "local", query, supplemented });
    setPending(true);
    async function search() {
      try {
        if (portable) {
          const remote = await searchOpenBeautyFacts(query, "all", { signal: request.signal });
          const products = supplemented ? supplementCatalog(localItems, remote, query) : rankCatalogProducts([...remote, ...items], query);
          if (!request.signal.aborted) setResult({ items: products, origin: "online", query, supplemented });
          return;
        }

        const params = new URLSearchParams({ q: query });
        if (supplemented) params.set("supplement", "1");
        const response = await fetch(`/api/catalog?${params}`, { signal: request.signal, credentials: "omit" });
        if (!response.ok) throw new Error();
        const payload = await response.json() as { products?: unknown; externalStatus?: string };
        if (request.signal.aborted) return;
        const products = Array.isArray(payload.products) ? payload.products.flatMap((item) => {
          const parsed = productSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        }) : items;
        setResult({ items: supplemented ? supplementCatalog(localItems, products, query) : products, query, supplemented,
          origin: payload.externalStatus === "ok" ? "online" : payload.externalStatus === "unavailable" ? "unavailable" : "local" });
      } catch {
        if (!request.signal.aborted) setResult({ items, origin: "unavailable", query, supplemented });
      } finally {
        if (!request.signal.aborted) setPending(false);
      }
    }
    void search();
    return () => request.abort();
  }, [initialQuery, portable, supplementRequest]);

  useEffect(() => {
    if (result.supplemented && result.origin === "online") additionalResults.current?.focus();
  }, [result.supplemented, result.origin]);

  useEffect(() => {
    if (!openProductId) return;
    previewSurface.current?.scrollIntoView({ block: "start" });
    previewHeading.current?.focus({ preventScroll: true });
  }, [openProductId]);

  function closePreview() {
    const trigger = previewTrigger.current;
    setPreviewedId(undefined);
    requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); });
  }

  function selectedVariant(product: Product) {
    return variantSelections.get(product.id) ?? product.selectedVariantId ?? "";
  }

  function renderCard(product: Product) {
    return <li key={product.id}><CatalogueCard product={product} {...actions} variantId={selectedVariant(product)}
      onVariantChange={(variantId) => setVariantSelections((current) => new Map(current).set(product.id, variantId))}
      previewId={previewId} previewExpanded={product.id === openProductId} onPreview={(trigger) => {
        if (product.id === openProductId) closePreview();
        else {
          previewTrigger.current = trigger;
          setPreviewedId(product.id);
        }
      }}/></li>;
  }

  const count = formatNumber(result.items.length);
  const resultCount = result.items.length === 1
    ? t(`${count} résultat pour « ${result.query} ».`, `${count} result for “${result.query}”.`)
    : t(`${count} résultats pour « ${result.query} ».`, `${count} results for “${result.query}”.`);
  const canSupplement = canSupplementCatalog(result.query, result.items) && (!result.supplemented || result.origin !== "online");
  const primaryItems = result.supplemented ? result.items.filter(({ source }) => source === "manufacturer") : result.items;
  const extraItems = result.supplemented ? result.items.filter(({ source }) => source === "open-beauty-facts") : [];

  return <section className={styles.catalog} aria-labelledby="catalogue-title" onKeyDown={(event) => {
    if (openProductId && event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      closePreview();
    }
  }}>
    <header className={styles.catalogHeader}>
      <div><h1 id="catalogue-title">{t("Catalogue", "Catalogue")}</h1>
        <p>{t("Recherche un produit, une marque ou un code-barres.", "Search for a product, brand or barcode.")}</p></div>
    </header>
    <div id={previewId} ref={previewSurface} className={styles.previewAnchor} hidden={!previewedProduct}>
      {previewedProduct && <CataloguePreview product={previewedProduct} preferences={preferences} heading={previewHeading}
        variant={previewedProduct.variants?.find(({ id }) => id === selectedVariant(previewedProduct))}
        headingId={`${previewId}-title`} onClose={closePreview}/>}
    </div>
    <section className={styles.resultsPanel} aria-labelledby="catalogue-results-title">
      <h2 id="catalogue-results-title">{result.query || pending ? t("Résultats", "Results") : t("Produits à découvrir", "Products to explore")}</h2>
      <div role="status" className={styles.searchStatus}>
        {pending ? t("Recherche en cours…", "Searching…") : result.query ? resultCount
          : t("Sélection disponible hors ligne.", "Selection available offline.")}
        {!pending && result.origin === "unavailable" && <p>{t(
          "Open Beauty Facts est indisponible. Les résultats locaux sont affichés ici.",
          "Open Beauty Facts is unavailable. Local results are displayed here.",
        )}</p>}
      </div>
      {canSupplement && <button className={`button button-secondary ${styles.supplementButton}`} type="button"
        aria-controls="catalogue-supplement-results" disabled={pending}
        onClick={() => setSupplementRequest((current) => ({ query: result.query, attempt: (current?.attempt ?? 0) + 1 }))}>
        {result.supplemented && !pending ? t("Réessayer la recherche", "Retry search") : t("Voir d’autres résultats", "Show more results")}
      </button>}
      {primaryItems.length > 0 ? <ul className={styles.catalogResults} aria-label={t("Produits du catalogue", "Catalogue products")} aria-busy={pending}>
        {primaryItems.map(renderCard)}
      </ul> : !pending && <p className={styles.emptyState}>
        {t("Aucun produit trouvé. Essaie un autre nom, une marque ou un code-barres dans la barre de recherche.", "No products found. Try another name, brand or barcode in the search bar.")}
      </p>}
      <section id="catalogue-supplement-results" className={styles.supplementResults} aria-labelledby="catalogue-supplement-title"
        hidden={!result.supplemented}>
        <h2 id="catalogue-supplement-title" ref={additionalResults} tabIndex={-1}>{t("Résultats complémentaires", "Additional results")}</h2>
        {extraItems.length > 0 ? <ul className={styles.catalogResults} aria-labelledby="catalogue-supplement-title" aria-busy={pending}>
          {extraItems.map(renderCard)}
        </ul> : !pending && result.origin === "online" && <p className={styles.emptyState}>
          {t("Aucun résultat complémentaire.", "No additional results.")}
        </p>}
      </section>
    </section>
    <p className={`muted ${styles.catalogAttribution}`}>{t("Fiches de marques et données complémentaires.", "Brand listings and supplementary data.")}{" "}
      <a href="https://world.openbeautyfacts.org/data" target="_blank" rel="noreferrer">Open Beauty Facts · ODbL</a>{" · "}
      <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer"
        aria-label={t("Licence des photos communautaires CC BY-SA 3.0", "Community photo licence CC BY-SA 3.0")}>CC BY-SA 3.0</a>
    </p>
  </section>;
}

function CatalogueCard({ product, currentProducts, lists, destination, onSave, onTry, onOpenDestination, variantId, onVariantChange,
  previewId, previewExpanded, onPreview }: CatalogueActions & {
  product: Product;
  variantId: string;
  onVariantChange: (variantId: string) => void;
  previewId: string;
  previewExpanded: boolean;
  onPreview: (trigger: HTMLButtonElement) => void;
}) {
  const { t } = useLocale();
  const uid = useId();
  const [choosing, setChoosing] = useState(false);
  const [target, setTarget] = useState("");
  const [failed, setFailed] = useState(false);
  const [shadePrompt, setShadePrompt] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  const shadeSelect = useRef<HTMLSelectElement>(null);
  const destinationSelect = useRef<HTMLSelectElement>(null);
  const variants = product.variants ?? [];
  const variant = variants.find(({ id }) => id === variantId);
  const entry = productForVariant(product, variant);
  const needsShade = variants.length > 0 && !variant;
  const destinationList = lists.find(({ id }) => id === destination);
  const chosenDestination = destination === vanityDestination || destinationList ? destination : undefined;
  const destinationName = destinationList ? beautyListName(destinationList, t) : t("Ma trousse", "My collection");
  const savedProduct = chosenDestination === vanityDestination ? currentProducts.find((item) => sameProductVariant(item, entry)) : undefined;
  const saved = !needsShade && Boolean(savedProduct || destinationList?.items.some((item) =>
    item.product ? sameProductVariant(item.product, entry) : item.productId === entry.id));
  const sourceUrl = productSource(entry);
  const official = product.source === "manufacturer";

  function requireShade() {
    if (!needsShade) return true;
    setShadePrompt(true);
    shadeSelect.current?.focus();
    return false;
  }

  function closeDestination() {
    setChoosing(false);
    requestAnimationFrame(() => primary.current?.focus());
  }

  function save(into: string) {
    if (!into || !requireShade()) return;
    if (onSave(entry, into)) {
      if (choosing) closeDestination();
      setFailed(false);
    } else setFailed(true);
  }

  function chooseDestination() {
    if (!requireShade()) return;
    setTarget(chosenDestination ?? "");
    setFailed(false);
    setChoosing(true);
    requestAnimationFrame(() => destinationSelect.current?.focus());
  }

  return <article className={styles.catalogCard} data-catalog-product={product.id}>
    <div className={styles.catalogVisual}>
      <ProductPhoto product={product}/>
      {variants.some(({ shadeHex }) => shadeHex) && <span className={styles.catalogSwatches} aria-hidden="true">
        {variants.filter(({ shadeHex }) => shadeHex).slice(0, 7).map(({ id, shadeHex }) => <span key={id} style={{ backgroundColor: shadeHex }}/>)}
      </span>}
    </div>
    <div className={styles.cardText}>
      <p className={styles.category}>{t(categoryLabels[product.category], categoryLabelsEn[product.category])}</p>
      <h3>{product.name}</h3>
      <p className={styles.cardBrand}>{brandLabel(product.brand, t)}</p>
    </div>
    <div className={styles.catalogShade}>{variants.length > 0 && <div className={styles.catalogField}>
      <label htmlFor={`${uid}-shade`}>{t("Teinte", "Shade")}<span className="sr-only"> · {product.name}</span></label>
      <div className={styles.shadeSelect}>
        {variant?.shadeHex && <span className={styles.shadeChip} style={{ backgroundColor: variant.shadeHex }} aria-hidden="true"/>}
        <select ref={shadeSelect} id={`${uid}-shade`} value={variantId}
          aria-invalid={shadePrompt || undefined} aria-describedby={shadePrompt || variant?.shadeApproximate ? `${uid}-shade-hint` : undefined}
          onChange={(event) => { onVariantChange(event.target.value); setShadePrompt(false); setFailed(false); }}>
          <option value="">{t("Choisir une teinte", "Choose a shade")}</option>
          {variants.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <small id={`${uid}-shade-hint`} role="status">{shadePrompt
        ? t("Choisis une teinte pour continuer.", "Choose a shade to continue.")
        : variant?.shadeApproximate ? t("Couleur indicative", "Approximate colour") : ""}</small>
    </div>}</div>
    <div className={styles.cardActions}>
      <button type="button" className="button button-secondary" aria-expanded={previewExpanded} aria-controls={previewId}
        onClick={(event) => onPreview(event.currentTarget)}>
        <FileText size={16} aria-hidden="true"/>
        {previewExpanded ? t("Fermer la fiche", "Close product details") : t("Voir la fiche", "View product details")}<span className="sr-only"> · {product.name}</span>
      </button>
      <button ref={primary} type="button" className={`button button-primary ${styles.cardSave}`}
        onClick={() => saved && chosenDestination ? onOpenDestination(chosenDestination, savedProduct)
          : chosenDestination ? save(chosenDestination) : chooseDestination()}>
        {saved ? <Check size={16} aria-hidden="true"/> : <Plus size={16} aria-hidden="true"/>}
        {saved ? t("Voir l’enregistrement", "View saved product") : t("Enregistrer", "Save")}<span className="sr-only"> · {product.name}</span>
      </button>
      {chosenDestination && <div className={styles.destinationLine}>
        <span>{destinationName}</span>
        <button type="button" className={styles.cardLink} aria-expanded={choosing} onClick={chooseDestination}>
          {t("Changer", "Change")}<span className="sr-only"> · {product.name}</span>
        </button>
      </div>}
      {product.category === "maquillage" && <button type="button" className="button button-secondary" onClick={() => { if (requireShade()) onTry(entry); }}>
        <SwatchBook size={16} aria-hidden="true"/>{t("Essayer dans le Studio", "Try in the Studio")}<span className="sr-only"> · {product.name}</span>
      </button>}
      {sourceUrl && <a className={styles.cardLink} href={sourceUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={14} aria-hidden="true"/>{official ? t("Voir chez la marque", "View on brand site") : t("Données communautaires", "Community data")}<span className="sr-only"> · {product.name}</span>
      </a>}
    </div>
    <div className={styles.catalogExtra}>
      {choosing && <div className={styles.catalogField}>
        <label htmlFor={`${uid}-destination`}>{t("Où enregistrer ?", "Where to save?")}</label>
        <select ref={destinationSelect} id={`${uid}-destination`} value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">{t("Choisir une destination", "Choose a destination")}</option>
          <option value={vanityDestination}>{t("Ma trousse", "My collection")}</option>
          {lists.map((list) => <option key={list.id} value={list.id}>{beautyListName(list, t)}</option>)}
        </select>
        <div className={styles.destinationActions}>
          <button type="button" className="button button-primary" disabled={!target || needsShade} onClick={() => save(target)}>{t("Ajouter ici", "Save here")}</button>
          <button type="button" className="button button-secondary" onClick={() => { closeDestination(); setFailed(false); }}>{t("Annuler", "Cancel")}</button>
        </div>
      </div>}
      {failed && <p className={styles.cardError} role="alert">{t("L’enregistrement a échoué.", "This product couldn’t be saved.")}</p>}
    </div>
  </article>;
}
