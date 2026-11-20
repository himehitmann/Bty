"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Brush, CalendarClock, ChevronRight, CircleAlert, Columns2, Droplets, Pencil, Plus, Scissors, Search, SprayCan, Trash2 } from "lucide-react";
import { analyzeProduct, ingredientList } from "@/lib/analysis";
import { normalizeCatalogText, searchLocalCatalog, type CatalogSearchMode } from "@/lib/catalog";
import { useLocale } from "@/lib/i18n";
import { categories, categoryLabels, makeupEffectLabels, makeupEffects, makeupKindLabels, makeupKinds, productInput, productSchema, sourceLabels, type Preferences, type Product } from "@/lib/model";
import { getProductLifecycle, lifecycleStatusLabels, localCalendarDate, upcomingWindowDays } from "@/lib/product-life";
import styles from "./inventory.module.css";

type Filter = "all" | Product["category"];
type DateFilter = "all" | "soon" | "past";
const categoryIcons = { soin: Droplets, maquillage: Brush, cheveux: Scissors, parfums: SprayCan };
const categoryLabelsEn = { soin: "Skincare", maquillage: "Makeup", cheveux: "Haircare", parfums: "Fragrance" };
const sourceLabelsEn = { manuel: "Manual entry", local: "Local catalogue · example formula", "open-beauty-facts": "Open Beauty Facts" };
const lifecycleLabelsEn = { past: "Past its date", today: "Due today", soon: "Check soon", upcoming: "Next date" };
const makeupKindLabelsEn = {
  foundation: "Foundation", concealer: "Concealer", blush: "Blush", bronzer: "Bronzer", highlighter: "Highlighter", eyeshadow: "Eyeshadow",
  eyeliner: "Eyeliner", mascara: "Mascara", lip: "Lip product", powder: "Powder", other: "Other",
};
const makeupEffectLabelsEn = { tinted: "Tinted", transparent: "Transparent", mattifying: "Mattifying", unknown: "Unspecified" };
const claimFields = [
  { key: "vegan", label: "Vegan" },
  { key: "crueltyFree", label: "Cruelty-free" },
] as const;
type Translate = ReturnType<typeof useLocale>["t"];

function brandLabel(brand: string, t: Translate) {
  return !brand || brand === "Marque non renseignée" ? t("Marque non renseignée", "Brand unspecified")
    : brand === "Formule indicative" ? t("Formule indicative", "Example formula") : brand;
}

function ProductIcon({ category }: { category: Product["category"] }) {
  const Icon = categoryIcons[category];
  return <span className={styles.productIcon}><Icon size={18} strokeWidth={1.6} aria-hidden="true"/></span>;
}

export function ProductTile({ product, onSelect, today }: { product: Product; onSelect: () => void; today?: string }) {
  const { t } = useLocale();
  const { status } = getProductLifecycle(product, today);
  return <button className={styles.productTile} type="button" onClick={onSelect} data-product-id={product.id}>
    <ProductIcon category={product.category}/>
    <span className={styles.tileText}>
      <strong>{product.name}</strong>
      <small>{brandLabel(product.brand, t)} · {t(categoryLabels[product.category], categoryLabelsEn[product.category])}</small>
      {(status === "past" || status === "today" || status === "soon") && (
        <span className={styles.dateBadge} data-status={status}><CalendarClock size={14} aria-hidden="true"/>{t(lifecycleStatusLabels[status], lifecycleLabelsEn[status])}</span>
      )}
    </span>
    <ChevronRight size={16} aria-hidden="true"/>
  </button>;
}

export function Inventory({ products, preferences, selected, onSelect, onEdit, onRemove }: {
  products: Product[]; preferences: Preferences; selected: string | null; onSelect: (id: string | null) => void;
  onEdit: (product: Product) => void; onRemove: (id: string) => void;
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");
  const [comparing, setComparing] = useState(false);
  const current = products.find((product) => product.id === selected);
  const today = localCalendarDate();
  const words = normalizeCatalogText(query).trim().split(/\s+/).filter(Boolean);
  const visible = products.filter((product) => {
    if (filter !== "all" && filter !== product.category) return false;
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
    onBack={() => returnToList(current.id)} onEdit={() => onEdit(current)} onRemove={() => onRemove(current.id)}/>;
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
        {products.length > 0 && <label className={styles.dateFilter}>
          <CalendarClock size={17} aria-hidden="true"/>
          <select aria-label={t("Filtrer par date de conservation", "Filter by use-by date")} value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
            <option value="all">{t("Toutes les dates", "All dates")}</option>
            <option value="soon">{t(`À vérifier sous ${upcomingWindowDays} jours`, `Due within ${upcomingWindowDays} days`)}</option>
            <option value="past">{t("Repères dépassés", "Past their dates")}</option>
          </select>
        </label>}
        {products.length >= 2 && <button type="button" className="button button-secondary" onClick={() => setComparing(true)}>
          <Columns2 size={17} aria-hidden="true"/>{t("Comparer les compositions", "Compare ingredients")}
        </button>}
      </div>
    </div>
    {visible.length ? <div className={styles.collectionGrid}>{visible.map((product) => <ProductTile key={product.id} product={product} today={today} onSelect={() => onSelect(product.id)}/>)}</div>
      : <div className={styles.emptyState}>
        <h2>{t("Aucun produit trouvé", "No products found")}</h2>
        <button type="button" className="button button-secondary" onClick={() => { setQuery(""); setFilter("all"); setDateFilter("all"); }}>
          {t("Réinitialiser les filtres", "Reset filters")}
        </button>
      </div>}
  </>;
}

function ProductDetail({ product, today, preferences, onBack, onEdit, onRemove }: {
  product: Product; today: string; preferences: Preferences; onBack: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const { t, locale } = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const [removePending, setRemovePending] = useState(false);
  const ingredients = ingredientList(product.ingredients);
  const notes = analyzeProduct(product, preferences, locale);
  const sourceUrl = product.sourceUrl ?? (product.source === "open-beauty-facts" && product.barcode ? `https://world.openbeautyfacts.org/product/${product.barcode}` : undefined);

  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (removePending) confirmation.current?.focus(); }, [removePending]);

  return <section className={styles.inlineSurface} aria-labelledby="product-title">
    <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={17} aria-hidden="true"/>{t("Mes produits", "My products")}</button>
    <header className={styles.panelHeading}>
      <ProductIcon category={product.category}/>
      <div><h2 id="product-title" ref={heading} tabIndex={-1}>{product.name}</h2>
        <p>{brandLabel(product.brand, t)} · {t(categoryLabels[product.category], categoryLabelsEn[product.category])}</p></div>
      <button type="button" className={`button button-primary ${styles.panelAction}`} onClick={onEdit}>
        <Pencil size={16} aria-hidden="true"/>{t("Modifier", "Edit")}
      </button>
    </header>
    <section className="product-detail-panel">
      <h3>{t("Composition INCI", "INCI ingredients")}</h3>
      {ingredients.length ? <>
        <p className="muted">{t(sourceLabels[product.source], sourceLabelsEn[product.source])}{product.barcode ? ` · ${product.barcode}` : ""}</p>
        <ul className="ingredient-list">{ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}>{ingredient}</li>)}</ul>
      </> : <p>{t("Composition non renseignée. Consulte la liste d’ingrédients sur l’emballage.", "Ingredients are missing. Check the ingredient list on the packaging.")}</p>}
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">{t("Voir la fiche catalogue d’origine", "View the original catalogue entry")}</a>}
    </section>
    <section className="product-detail-panel insight-panel">
      <h3><CircleAlert size={18} aria-hidden="true"/>{t("Points de vigilance", "Things to check")}</h3>
      {notes.length ? <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>{t("Aucun signal repéré dans la liste fournie avec tes préférences actuelles.", "There are no matches in the supplied list for your current preferences.")}</p>}
      <p className="muted">{t("Les listes peuvent être incomplètes ou périmées. Vérifie la composition sur l’emballage.", "Ingredient lists can be incomplete or out of date. Check the packaging for the current list.")}</p>
    </section>
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
        ? t(`${sharedCount} libellé${shared.size === 1 ? "" : "s"} INCI en commun.`, `${sharedCount} matching INCI ${shared.size === 1 ? "entry" : "entries"}.`)
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
  const hasTracking = Boolean(openedOn || paoMonths || expiresOn);
  const dateLabel = (date: string) => formatDate(new Date(`${date}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  return <section className={styles.tracking} aria-labelledby="product-tracking-title">
    <h3 id="product-tracking-title">{t("Dates de conservation", "Use-by dates")}</h3>
    {hasTracking ? <>
      <dl>
        {openedOn && <><dt>{t("Ouverture", "Opened")}</dt><dd><time dateTime={openedOn}>{dateLabel(openedOn)}</time></dd></>}
        {paoMonths && <><dt>{t("Durée après ouverture", "Period after opening")}</dt><dd>{t(`${formatNumber(paoMonths)} mois`, `${formatNumber(paoMonths)} ${paoMonths === 1 ? "month" : "months"}`)}</dd></>}
        {paoDate && <><dt>{t("Date calculée après ouverture", "Date based on opening")}</dt><dd><time dateTime={paoDate}>{dateLabel(paoDate)}</time></dd></>}
        {expiresOn && <><dt>{t("Péremption indiquée sur l’emballage", "Expiry date on packaging")}</dt><dd><time dateTime={expiresOn}>{dateLabel(expiresOn)}</time></dd></>}
      </dl>
      {deadline && <p className={styles.deadline}>
        <strong>{t(lifecycleStatusLabels[status], lifecycleLabelsEn[status])}</strong><span>· <time dateTime={deadline.date}>{dateLabel(deadline.date)}</time></span>
        {paoDate && expiresOn && <span className="muted">({deadline.source === "printed" ? t("date de l’emballage", "printed expiry date") : t("durée après ouverture", "period after opening")})</span>}
      </p>}
      {!deadline && <p>{openedOn
        ? t("Renseigne la durée indiquée par le symbole du pot ouvert pour calculer la date.", "Enter the number of months shown on the open jar symbol to calculate the date.")
        : t("Renseigne la date d’ouverture pour calculer la date.", "Enter the opening date to calculate the use-by date.")}</p>}
    </> : <p>{t("Modifie la fiche pour indiquer sa date d’ouverture ou de péremption.", "Edit this product to enter its opening or expiry date.")}</p>}
    <p className={styles.trackingHint}>{t("Suis les indications de conservation et d’utilisation sur l’emballage.", "Follow the storage and use instructions on the packaging.")}</p>
  </section>;
}

function optionalText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function readClaims(form: FormData, draft: Product | undefined, sameBarcode: boolean): Product["claims"] {
  const claims: NonNullable<Product["claims"]> = {};
  for (const { key } of claimFields) {
    const url = optionalText(form, `${key}Url`);
    const existing = draft?.claims?.[key];
    if (url) claims[key] = { source: "manufacturer", url };
    else if (sameBarcode && existing?.source === "open-beauty-facts" && !form.has(`${key}Remove`)) claims[key] = existing;
  }
  return claims.vegan || claims.crueltyFree ? claims : undefined;
}

function EvidenceFields({ draft }: { draft?: Product }) {
  const { t } = useLocale();
  const instructions = draft?.usageInstructions;
  const [source, setSource] = useState<NonNullable<Product["usageInstructions"]>["source"]>(instructions?.source ?? "packaging");

  return <details className={styles.tracking} onInvalid={(event) => { event.currentTarget.open = true; }}>
    <summary>{t("Mode d’emploi et déclarations", "Directions and claims")} <span className="muted">{t("(facultatifs)", "(optional)")}</span></summary>
    <div className={styles.evidenceFields}>
      <label>{t("Consignes d’utilisation", "Directions")}
        <textarea name="instructions" rows={3} maxLength={1200} defaultValue={instructions?.text}
          placeholder={t("Recopie les consignes indiquées pour ce produit.", "Copy the directions provided for this product.")}/>
      </label>
      <label>{t("Provenance des consignes", "Source of directions")}
        <select name="instructionsSource" value={source} onChange={(event) => setSource(event.target.value as typeof source)}>
          <option value="packaging">{t("Emballage", "Packaging")}</option>
          <option value="manufacturer">{t("Site du fabricant", "Manufacturer’s website")}</option>
          {instructions?.source === "open-beauty-facts" && <option value="open-beauty-facts">{evidenceLabel("open-beauty-facts", t)}</option>}
        </select>
      </label>
      {source === "manufacturer" && <label>{t("Lien HTTPS des consignes du fabricant", "HTTPS link to the manufacturer’s directions")}
        <input name="instructionsUrl" type="url" inputMode="url" pattern="https://.+" maxLength={700}
          defaultValue={instructions?.source === "manufacturer" ? instructions.url : undefined} placeholder="https://"/>
      </label>}
      <p>{t("Ajoute le lien de la page où le fabricant indique la mention.", "Link to the page where the manufacturer makes the claim.")}</p>
      {claimFields.map(({ key, label }) => {
        const claim = draft?.claims?.[key];
        return <div className={styles.evidenceField} key={key}>
          <label>{label} · {t("lien HTTPS du fabricant", "manufacturer’s HTTPS link")}
            <input name={`${key}Url`} type="url" inputMode="url" pattern="https://.+" maxLength={700}
              defaultValue={claim?.source === "manufacturer" ? claim.url : undefined} placeholder="https://"/>
          </label>
          {claim?.source === "open-beauty-facts" && <label className={styles.removeEvidence}>
            <input name={`${key}Remove`} type="checkbox"/>
            {t(`Retirer la mention ${label} issue d’Open Beauty Facts`, `Remove the ${label} claim from Open Beauty Facts`)}
          </label>}
        </div>;
      })}
    </div>
  </details>;
}

function MakeupFields({ draft }: { draft?: Product }) {
  const { t } = useLocale();
  const [effect, setEffect] = useState<Product["makeupEffect"]>(draft?.makeupEffect ?? "unknown");
  const [shade, setShade] = useState(draft?.shadeHex ?? "");
  const shadeValid = /^#[\da-f]{6}$/i.test(shade);

  return <fieldset className={styles.makeupFields}>
    <legend>{t("Rendu sur le Face Chart", "Face Chart appearance")}</legend>
    <div className="form-grid">
      <label>{t("Type de maquillage", "Makeup type")}
        <select name="makeupKind" defaultValue={draft?.makeupKind ?? ""}>
          <option value="">{t("Non renseigné", "Unspecified")}</option>
          {makeupKinds.map((kind) => <option key={kind} value={kind}>{t(makeupKindLabels[kind], makeupKindLabelsEn[kind])}</option>)}
        </select>
      </label>
      <label>{t("Effet visuel", "Finish")}
        <select name="makeupEffect" value={effect} onChange={(event) => setEffect(event.target.value as Product["makeupEffect"])}>
          {makeupEffects.map((option) => <option key={option} value={option}>{t(makeupEffectLabels[option], makeupEffectLabelsEn[option])}</option>)}
        </select>
      </label>
    </div>
    {effect === "tinted" && <div className={styles.shadeFields}>
      <label><span>{t("Code de la teinte", "Shade code")} <span className="muted">{t("(facultatif)", "(optional)")}</span></span>
        <input name="shadeHex" value={shade} onChange={(event) => setShade(event.target.value)} pattern="#[0-9a-fA-F]{6}"
          maxLength={7} autoCapitalize="off" spellCheck={false} placeholder="#A47973"/>
      </label>
      <label>{t("Choisir une couleur", "Choose a colour")}
        <input type="color" value={shadeValid ? shade : "#a47973"} onChange={(event) => setShade(event.target.value)}/>
      </label>
    </div>}
    <p className="muted">{t("Le Face Chart utilise cette information pour représenter ton look.", "The Face Chart uses this information to illustrate your look.")}</p>
  </fieldset>;
}

type CatalogueResult = { items: Product[]; origin: "online" | "local" | "unavailable"; query: string };

function localMatches(query: string, mode: CatalogSearchMode = "all") {
  const items = searchLocalCatalog(query, mode);
  return query ? items : items.filter(({ source }) => source !== "local");
}

export function Catalog({ currentProducts, onSave, initialQuery = "", localOnly = false }: {
  currentProducts: Product[];
  onSave: (product: Product) => boolean;
  initialQuery?: string;
  localOnly?: boolean;
}) {
  const { t, formatNumber } = useLocale();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [brandOnly, setBrandOnly] = useState(false);
  const [result, setResult] = useState<CatalogueResult>(() => ({ items: localMatches(initialQuery.trim()), origin: "local", query: initialQuery.trim() }));
  const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<{ initialProduct?: Product } | null>(null);
  const recordedBarcodes = new Set(currentProducts.flatMap((product) => product.barcode ? [product.barcode.padStart(14, "0")] : []));
  const full = currentProducts.length >= 500;

  const search = useCallback(async (value: string, mode: CatalogSearchMode = "all") => {
    const cleanQuery = value.trim().slice(0, 120);
    searchRequest.current?.abort();
    const localItems = localMatches(cleanQuery, mode);
    if (localOnly || cleanQuery.length < 2) {
      setResult({ items: localItems, origin: "local", query: cleanQuery });
      setPending(false);
      return;
    }
    const request = new AbortController();
    searchRequest.current = request;
    setPending(true);
    try {
      const params = new URLSearchParams({ q: cleanQuery, mode });
      const response = await fetch(`/api/catalog?${params}`, { signal: request.signal });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { products?: unknown; externalStatus?: string };
      if (request.signal.aborted) return;
      const items = Array.isArray(payload.products) ? payload.products.flatMap((item) => {
        const parsed = productSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }) : localItems;
      setResult({ items, query: cleanQuery,
        origin: payload.externalStatus === "ok" ? "online" : payload.externalStatus === "unavailable" ? "unavailable" : "local" });
    } catch {
      if (!request.signal.aborted) setResult({ items: localItems, origin: "unavailable", query: cleanQuery });
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }, [localOnly]);

  useEffect(() => {
    setQuery(initialQuery);
    void search(initialQuery);
    return () => searchRequest.current?.abort();
  }, [initialQuery, search]);

  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => searchInput.current?.focus());
  }

  if (editor) return <ProductEditor currentProducts={currentProducts} initialProduct={editor.initialProduct} onCancel={closeEditor}
    onSave={(product) => {
      const saved = onSave(product);
      if (saved) closeEditor();
      return saved;
    }}/>;

  const count = formatNumber(result.items.length);
  return <section className={styles.catalog} aria-labelledby="catalogue-title">
    <header className={styles.catalogHeader}>
      <div><h1 id="catalogue-title">{t("Catalogue", "Catalogue")}</h1>
        <p>{t("Trouve une fiche par nom, marque ou code-barres.", "Find a product by name, brand or barcode.")}</p></div>
      <button className="button button-secondary" type="button" disabled={full} onClick={() => setEditor({})}>
        <Plus size={17} aria-hidden="true"/>{t("Ajouter manuellement", "Add manually")}
      </button>
    </header>
    {full && <p className="muted" role="status">{t("Tu as atteint la limite de 500 produits.", "You’ve reached the 500-product limit.")}</p>}
    <form role="search" aria-label={t("Chercher dans le catalogue", "Search the catalogue")} className={styles.catalogSearch}
      onSubmit={(event) => { event.preventDefault(); void search(query, brandOnly ? "brand" : "all"); }}>
      <label className="search-field"><Search size={19} aria-hidden="true"/>
        <input ref={searchInput} type="search" aria-label={t("Nom du produit, marque ou code-barres", "Product name, brand or barcode")}
          placeholder={t("Nom du produit, marque ou code-barres", "Product name, brand or barcode")} maxLength={120}
          value={query} onChange={(event) => setQuery(event.target.value)}/>
      </label>
      <button className="button button-primary" type="submit">{t("Rechercher", "Search")}</button>
      <label className={styles.brandFilter}>
        <input type="checkbox" checked={brandOnly} onChange={(event) => setBrandOnly(event.target.checked)}/>
        {t("Rechercher uniquement par marque", "Search by brand only")}
      </label>
    </form>
    <section className={styles.resultsPanel} aria-labelledby="catalogue-results-title" aria-busy={pending}>
      <h2 id="catalogue-results-title">{result.query || pending ? t("Résultats", "Results") : t("Catalogue local", "Local catalogue")}</h2>
      <div role="status" className={styles.searchStatus}>
        {pending ? t("Recherche en cours…", "Searching…") : result.query ? t(
          `${count} résultat${result.items.length === 1 ? "" : "s"} pour « ${result.query} ».`,
          `${count} ${result.items.length === 1 ? "result" : "results"} for “${result.query}”.`,
        ) : localOnly
          ? t("Sélection disponible hors ligne.", "Selection available offline.")
          : t("Quelques fiches disponibles avant la recherche.", "A few entries to browse before searching.")}
        {!pending && result.origin === "unavailable" && <p>{t(
          "Open Beauty Facts est indisponible. Tu peux essayer le catalogue local ou saisir le produit.",
          "Open Beauty Facts is unavailable. You can use the local catalogue or enter the product manually.",
        )}</p>}
        {!pending && localOnly && result.query && <p>{t("Recherche dans le catalogue local.", "Search of the local catalogue.")}</p>}
      </div>
      {!pending && (result.items.length > 0 ? <ul className={styles.catalogResults}>
        {result.items.map((item) => {
          const alreadyAdded = Boolean(item.barcode && recordedBarcodes.has(item.barcode.padStart(14, "0")));
          return <li key={item.id}><button type="button" disabled={alreadyAdded || full} className={styles.catalogItem}
            onClick={() => setEditor({ initialProduct: item })}>
            <ProductIcon category={item.category}/>
            <span className={styles.tileText}>
              <strong>{item.name}</strong>
              <small>{item.brand && item.source !== "local" ? `${brandLabel(item.brand, t)} · ` : ""}{t(categoryLabels[item.category], categoryLabelsEn[item.category])} · {t(sourceLabels[item.source], sourceLabelsEn[item.source])}</small>
            </span>
            {alreadyAdded ? <span className={styles.savedLabel}>{t("Déjà ajouté", "Already added")}</span> : <Plus size={17} aria-hidden="true"/>}
          </button></li>;
        })}
      </ul> : <p className="muted">{t("Essaie un autre nom, une autre marque ou la saisie manuelle.", "Try a different product name or brand, or add the product manually.")}</p>)}
    </section>
    {(!localOnly || result.items.some(({ source }) => source === "open-beauty-facts")) && <p className="muted">
      {t("Fiches communautaires issues d’Open Beauty Facts. Vérifie la composition sur l’emballage.", "Community entries come from Open Beauty Facts. Check the current ingredient list on the packaging.")}
    </p>}
  </section>;
}

export function ProductEditor({ product, initialProduct, currentProducts, onCancel, onSave }: {
  product?: Product; initialProduct?: Product; currentProducts: Product[]; onCancel: () => void; onSave: (product: Product) => boolean;
}) {
  const { t } = useLocale();
  const draft = product ?? initialProduct;
  const heading = useRef<HTMLHeadingElement>(null);
  const [category, setCategory] = useState<Product["category"]>(draft?.category ?? "soin");
  const [error, setError] = useState("");

  useEffect(() => { heading.current?.focus(); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const barcode = optionalText(form, "barcode");
    const openedOn = optionalText(form, "openedOn");
    const expiresOn = optionalText(form, "expiresOn");
    const pao = optionalText(form, "paoMonths");
    if (openedOn && openedOn > localCalendarDate()) {
      setError(t("La date d’ouverture doit être aujourd’hui ou dans le passé.", "Choose an opening date on or before today."));
      return;
    }
    const sameBarcode = draft?.barcode === barcode;
    const instructions = optionalText(form, "instructions");
    const instructionsSource = form.get("instructionsSource");
    let usageInstructions: unknown;
    if (instructions && instructionsSource === "open-beauty-facts") {
      if (draft?.usageInstructions?.source !== "open-beauty-facts" || draft.usageInstructions.text !== instructions) {
        setError(t("Choisis l’emballage ou le site du fabricant pour les consignes que tu as modifiées.", "Choose packaging or the manufacturer’s website as the source for the directions you edited."));
        return;
      }
      usageInstructions = sameBarcode ? draft.usageInstructions : undefined;
    } else if (instructions && instructionsSource === "manufacturer") {
      usageInstructions = { text: instructions, source: "manufacturer", url: optionalText(form, "instructionsUrl") };
    } else if (instructions) {
      usageInstructions = { text: instructions, source: "packaging" };
    }
    const makeupEffect = category === "maquillage" ? optionalText(form, "makeupEffect") : undefined;
    const parsed = productInput.safeParse({
      name: form.get("name"), brand: form.get("brand"), category,
      ingredients: form.get("ingredients"), barcode, openedOn, expiresOn, paoMonths: pao ? Number(pao) : undefined,
      makeupKind: category === "maquillage" ? optionalText(form, "makeupKind") : undefined,
      makeupEffect, shadeHex: makeupEffect === "tinted" ? optionalText(form, "shadeHex") : undefined,
      claims: readClaims(form, draft, sameBarcode), usageInstructions,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(field === "claims" || field === "usageInstructions"
        ? t("Vérifie les consignes et les liens HTTPS vers le fabricant.", "Check the directions and the manufacturer’s HTTPS links.")
        : t("Vérifie le nom, la composition, le code-barres et les informations renseignées.", "Check the product name, ingredient list, barcode and other details."));
      return;
    }
    if (barcode && currentProducts.some((entry) => entry.barcode?.padStart(14, "0") === barcode.padStart(14, "0") && entry.id !== product?.id)) {
      setError(t("Un produit avec ce code-barres est déjà enregistré.", "A product with this barcode is already saved."));
      return;
    }
    const sourceChanged = draft && (draft.ingredients !== parsed.data.ingredients || !sameBarcode);
    const saved = onSave({ ...draft, ...parsed.data, id: product?.id ?? crypto.randomUUID(),
      source: sourceChanged ? "manuel" : draft?.source ?? "manuel",
      sourceUrl: sameBarcode ? draft?.sourceUrl : undefined,
      imageUrl: !sameBarcode && draft?.source === "open-beauty-facts" ? undefined : draft?.imageUrl,
      claims: parsed.data.claims, usageInstructions: parsed.data.usageInstructions,
      makeupKind: parsed.data.makeupKind, makeupEffect: parsed.data.makeupEffect, shadeHex: parsed.data.shadeHex,
    });
    if (!saved) setError(t("Ce produit n’a pas été enregistré. Vérifie la taille de ton inventaire et raccourcis la composition si nécessaire.", "The product could not be saved. Check your product limit and shorten the ingredient list if needed."));
  }

  return <section className={`${styles.inlineSurface} ${styles.productEditor}`} aria-labelledby="editor-title">
    <header className={styles.panelHeading}>
      <div><h1 ref={heading} tabIndex={-1} id="editor-title">{product ? t("Modifier un produit", "Edit product") : t("Ajouter un produit", "Add product")}</h1>
        <p>{draft ? t("Vérifie et complète les informations de ce produit.", "Review and complete the product details.") : t("Renseigne les informations de ton produit.", "Enter your product details.")}</p></div>
    </header>
    <form onSubmit={submit} className="stacked-form" key={draft?.id ?? "manual"}>
      <div className="form-grid">
        <label>{t("Nom du produit", "Product name")}<input name="name" required maxLength={140} defaultValue={draft?.name}/></label>
        <label>{t("Marque", "Brand")}<input name="brand" maxLength={140} defaultValue={draft?.brand === "Marque non renseignée" ? undefined : draft?.brand}/></label>
        <label>{t("Catégorie", "Category")}<select name="category" value={category} onChange={(event) => setCategory(event.target.value as Product["category"])}>
          {categories.map((option) => <option key={option} value={option}>{t(categoryLabels[option], categoryLabelsEn[option])}</option>)}
        </select></label>
        <label>{t("Code-barres", "Barcode")}<input name="barcode" inputMode="numeric" pattern="[0-9]{8,14}" maxLength={14} defaultValue={draft?.barcode}/></label>
      </div>
      <label><span>{t("Composition INCI", "INCI ingredients")} <span className="muted">{t("(facultative)", "(optional)")}</span></span>
        <textarea name="ingredients" rows={5} maxLength={6500} defaultValue={draft?.ingredients}
          placeholder={category === "parfums" ? t("Recopie la liste d’ingrédients de l’emballage", "Copy the ingredient list from the packaging") : "Aqua, Glycerin, …"}/>
      </label>
      {draft?.ingredients && <p className="muted">{t("Source de la composition", "Ingredient source")} · {t(sourceLabels[draft.source], sourceLabelsEn[draft.source])}</p>}
      {category === "maquillage" && <MakeupFields draft={draft}/>}
      <EvidenceFields draft={draft}/>
      <details className={styles.tracking} open={Boolean(product && (product.openedOn || product.paoMonths || product.expiresOn))} onInvalid={(event) => { event.currentTarget.open = true; }}>
        <summary>{t("Dates de conservation", "Use-by dates")} <span className="muted">{t("(facultatives)", "(optional)")}</span></summary>
        <p>{t("Le symbole du pot ouvert indique une durée en mois, par exemple 12M.", "The open jar symbol shows the number of months, for example 12M.")}</p>
        <div className="form-grid">
          <label>{t("Ouvert le", "Opening date")}<input name="openedOn" type="date" max={localCalendarDate()} defaultValue={draft?.openedOn}/></label>
          <label>{t("Durée après ouverture (mois)", "Period after opening (months)")}<input name="paoMonths" type="number" min={1} max={60} step={1} inputMode="numeric" defaultValue={draft?.paoMonths}/></label>
          <label>{t("Péremption indiquée sur l’emballage", "Expiry date on packaging")}<input name="expiresOn" type="date" max="9999-12-31" defaultValue={draft?.expiresOn}/></label>
        </div>
      </details>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}>{t("Annuler", "Cancel")}</button>
        <button className="button button-primary" type="submit">{product ? t("Enregistrer", "Save") : t("Ajouter à mes produits", "Add to my products")}</button>
      </div>
    </form>
  </section>;
}
