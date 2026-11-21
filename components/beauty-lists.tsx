"use client";

import { Brush, Check, ListChecks, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import { beautyListName, isDefaultBeautyList, productListSnapshot } from "@/lib/beauty-list-destinations";
import { beautyListLimits, type BeautyList, type Product } from "@/lib/model";
import styles from "./beauty-lists.module.css";

type ListItem = BeautyList["items"][number];
type Update = (recipe: (current: BeautyList[]) => BeautyList[]) => boolean;
type EntryAction = { kind: "edit"; id: string; text: string; reason: string } | { kind: "delete"; id: string };

type Props = {
  lists: BeautyList[];
  products: Product[];
  onChange: Update;
  firstListId?: string;
  onTryProduct?: (product: Product) => void;
};

const normalizeSearch = (value: string) => value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const suggestedNames = [["À acheter", "Shopping"], ["Favoris", "Favourites"], ["Déceptions", "Disappointments"]] as const;

export function BeautyLists({ lists, products, onChange, firstListId, onTryProduct }: Props) {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState(firstListId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [failed, setFailed] = useState(false);
  const createId = useId();
  const listName = useRef<HTMLInputElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const selected = lists.find((list) => list.id === selectedId) ?? lists[0];
  const listLimit = lists.filter(({ id }) => !isDefaultBeautyList(id)).length >= beautyListLimits.lists;

  const createVisible = !listLimit && (creating || !lists.length);
  const update: Update = (recipe) => {
    const accepted = onChange(recipe);
    setFailed(!accepted);
    return accepted;
  };

  function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = name.trim();
    if (!label || listLimit) return;
    const id = crypto.randomUUID();
    if (update((current) => [...current, { id, name: label, items: [] }])) {
      setSelectedId(id);
      setName("");
      setCreating(false);
      requestAnimationFrame(() => createButton.current?.focus());
    }
  }

  return (
    <section className={styles.page} aria-labelledby="beauty-lists-title">
      <header className={styles.header}>
        <div>
          <h1 id="beauty-lists-title">{t("Mes listes", "My lists")}</h1>
          <p>{t("Rassemble tes achats à prévoir, tes favoris ou les produits d’une trousse.", "Keep track of purchases, favourites or the products in a kit.")}</p>
        </div>
        {!!lists.length && !createVisible && <button ref={createButton} type="button" className="button button-primary"
          disabled={listLimit} onClick={() => setCreating(true)}>
          <Plus size={17} aria-hidden="true"/>{t("Nouvelle liste", "New list")}
        </button>}
      </header>
      {failed && <p className={styles.warning} role="alert">
        {t("La modification n’a pas pu être enregistrée. Vérifie l’espace disponible et réessaie.", "The change couldn’t be saved. Check the available space and try again.")}
      </p>}
      {listLimit && <p className={styles.muted}>{t(
        `Tu as atteint la limite de ${beautyListLimits.lists} listes.`,
        `You’ve reached the limit of ${beautyListLimits.lists} lists.`,
      )}</p>}
      {createVisible && (
        <form className={`${styles.form} ${styles.create}`} onSubmit={createList}>
          <label htmlFor={createId}>{t("Nom de la liste", "List name")}</label>
          <div className={styles.inputRow}>
            <input ref={listName} id={createId} value={name} onChange={(event) => setName(event.target.value)}
              maxLength={beautyListLimits.name} required autoFocus={creating}
              placeholder={t("Par exemple, Trousse de voyage", "For example, Travel kit")}/>
            <button type="submit" className="button button-primary" disabled={!name.trim()}>
              {t("Créer la liste", "Create list")}
            </button>
            {creating && !!lists.length && <button type="button" className="button button-secondary" onClick={() => {
              setCreating(false);
              requestAnimationFrame(() => createButton.current?.focus());
            }}>{t("Annuler", "Cancel")}</button>}
          </div>
          <div className={styles.suggestions} aria-label={t("Suggestions de noms", "Suggested list names")}>
            {suggestedNames.filter(([fr, en]) => !lists.some((list) => normalizeSearch(beautyListName(list, t)) === normalizeSearch(t(fr, en))))
              .map(([french, english]) => <button type="button" key={french} onClick={() => {
              setName(t(french, english));
              listName.current?.focus();
            }}>{t(french, english)}</button>)}
          </div>
        </form>
      )}
      {selected && <div className={styles.columns}>
        <nav className={styles.listNav} aria-label={t("Choisir une liste", "Choose a list")}>
          <ul>
            {lists.map((list) => <li key={list.id}>
              <button type="button" className={styles.listPicker} aria-pressed={list.id === selected.id} onClick={() => {
                setSelectedId(list.id);
                setFailed(false);
              }}>
                <ListChecks size={18} aria-hidden="true"/>
                <span>{beautyListName(list, t)}</span>
                <small>{list.items.length}</small>
              </button>
            </li>)}
          </ul>
        </nav>
        <ListDetail key={selected.id} list={selected} products={products} onTryProduct={onTryProduct}
          onEdit={(recipe) => update((current) => current.map((item) => item.id === selected.id ? recipe(item) : item))}
          onDelete={() => {
            if (update((current) => current.filter((item) => item.id !== selected.id))) {
              setSelectedId(undefined);
              requestAnimationFrame(() => createButton.current?.focus());
            }
          }}
        />
      </div>}
    </section>
  );
}

function ListDetail({ list, products, onEdit, onDelete, onTryProduct }: {
  list: BeautyList;
  products: Product[];
  onEdit: (recipe: (current: BeautyList) => BeautyList) => boolean;
  onDelete: () => void;
  onTryProduct?: (product: Product) => void;
}) {
  const { t } = useLocale();
  const [listAction, setListAction] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(list.name);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [entryAction, setEntryAction] = useState<EntryAction | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerSearch = useRef<HTMLInputElement>(null);
  const listTrigger = useRef<HTMLButtonElement | null>(null);
  const entryTrigger = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const textId = useId();
  const reasonId = useId();
  const nameId = useId();
  const entryEditId = useId();
  const reasonEditId = useId();
  const atLimit = list.items.length >= beautyListLimits.items;
  const checked = list.items.filter((item) => item.checked).length;
  const storedProducts = new Set(list.items.flatMap((item) => item.productId ? [item.productId] : []));
  const presentProducts = new Map(products.map((product) => [product.id, product]));
  const search = normalizeSearch(query);
  const matches = picker ? products.filter((product) => !storedProducts.has(product.id)
    && normalizeSearch(`${product.name} ${product.brand}`).includes(search)) : [];

  function addItem(item: Omit<ListItem, "id" | "checked">) {
    if (atLimit) return false;
    const next = { ...item, id: crypto.randomUUID(), checked: false };
    return onEdit((current) => {
      if (current.items.length >= beautyListLimits.items || next.productId && current.items.some((entry) => entry.productId === next.productId)) return current;
      return { ...current, items: [...current.items, next] };
    });
  }

  function addText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = text.trim();
    if (entry && addItem({ text: entry, reason: reason.trim() || undefined })) {
      setText("");
      setReason("");
      inputRef.current?.focus();
    }
  }

  function changeItem(id: string, recipe: (current: ListItem) => ListItem) {
    return onEdit((current) => ({ ...current, items: current.items.map((item) => item.id === id ? recipe(item) : item) }));
  }

  function saveListName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = name.trim();
    if (label && (label === beautyListName(list, t) || onEdit((current) => ({ ...current, name: label })))) closeListAction();
  }

  function editEntry(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (entryAction?.kind !== "edit" || entryAction.id !== id) return;
    const label = entryAction.text.trim();
    const rationale = entryAction.reason.trim() || undefined;
    if (label && changeItem(id, (item) => ({ ...item, text: label, reason: rationale }))) closeEntryAction();
  }

  function closeListAction() {
    setListAction(null);
    requestAnimationFrame(() => listTrigger.current?.focus());
  }

  function closeEntryAction() {
    setEntryAction(null);
    requestAnimationFrame(() => entryTrigger.current?.focus());
  }

  return (
    <section className={styles.detail} aria-labelledby={titleId}>
      <div className={styles.detailHeader}>
        <div>
          <h2 id={titleId}>{beautyListName(list, t)}</h2>
          <p className={styles.muted}>{t(`${checked} / ${list.items.length} cochés`, `${checked} / ${list.items.length} checked`)}</p>
        </div>
        <div className={styles.actions} hidden={Boolean(listAction)}>
          <button type="button" className="button button-secondary" onClick={(event) => {
            listTrigger.current = event.currentTarget;
            setName(beautyListName(list, t));
            setListAction("rename");
          }}>
            <Pencil size={15} aria-hidden="true"/>{t("Renommer", "Rename")}
          </button>
          {!isDefaultBeautyList(list.id) && <button type="button" className={styles.iconButton} aria-label={t("Supprimer la liste", "Delete list")} onClick={(event) => {
            listTrigger.current = event.currentTarget;
            setListAction("delete");
          }}>
            <Trash2 size={17} aria-hidden="true"/>
          </button>}
        </div>
      </div>

      {listAction === "rename" && <form className={styles.form} onSubmit={saveListName}>
        <label htmlFor={nameId}>{t("Nouveau nom", "New name")}</label>
        <div className={styles.inputRow}>
          <input id={nameId} value={name} onChange={(event) => setName(event.target.value)} required maxLength={beautyListLimits.name} autoFocus/>
          <button type="submit" className="button button-primary" disabled={!name.trim()}>{t("Enregistrer", "Save")}</button>
          <button type="button" className="button button-secondary" onClick={closeListAction}>{t("Annuler", "Cancel")}</button>
        </div>
      </form>}
      {listAction === "delete" && <div className={styles.confirm} role="group" aria-label={t("Confirmer la suppression de la liste", "Confirm list deletion")}>
        <p>{t("La liste et tous ses éléments seront supprimés.", "The list and all its entries will be deleted.")}</p>
        <div className={styles.actions}>
          <button type="button" className="button button-secondary" onClick={closeListAction} autoFocus>{t("Annuler", "Cancel")}</button>
          <button type="button" className="button button-danger" onClick={onDelete}>{t("Supprimer cette liste", "Delete this list")}</button>
        </div>
      </div>}

      {!listAction && <>
        <form className={styles.form} onSubmit={addText}>
          <label htmlFor={textId}>{t("Ajouter un élément", "Add an entry")}</label>
          <div className={styles.inputRow}>
            <input ref={inputRef} id={textId} value={text} onChange={(event) => setText(event.target.value)} required
              disabled={atLimit} maxLength={beautyListLimits.text} placeholder={t("Par exemple, un sérum à tester", "For example, a serum to try")}/>
            <button type="submit" className="button button-primary" disabled={atLimit || !text.trim()}>
              <Plus size={16} aria-hidden="true"/>{t("Ajouter", "Add")}
            </button>
          </div>
          {!atLimit && <details className={styles.reasonEditor}>
            <summary>{t("Ajouter une raison", "Add a reason")}</summary>
            <label htmlFor={reasonId}>{t("Raison personnelle", "Personal reason")}</label>
            <textarea id={reasonId} rows={2} value={reason} onChange={(event) => setReason(event.target.value)}
              maxLength={beautyListLimits.reason} placeholder={t("Par exemple, j’aime sa texture", "For example, I like its texture")}/>
          </details>}
        </form>
        {!!products.length && !atLimit && <button type="button" className="button button-secondary" aria-expanded={picker} onClick={() => {
          setPicker(!picker);
          if (!picker) requestAnimationFrame(() => pickerSearch.current?.focus());
        }}><PackagePlus size={16} aria-hidden="true"/>{t("Ajouter depuis ma trousse", "Add from my collection")}</button>}
        {picker && !atLimit && <div className={styles.picker}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true"/>
            <input ref={pickerSearch} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Nom ou marque", "Name or brand")}
              aria-label={t("Rechercher dans les produits du vanity", "Search products in your collection")}/>
          </label>
          {!!matches.length ? <>
            <ul className={styles.productResults}>
              {matches.slice(0, 8).map((product) => <li key={product.id}>
                <button type="button" onClick={() => {
                  if (addItem({ productId: product.id, product: productListSnapshot(product),
                    text: product.brand ? `${product.name} · ${product.brand}` : product.name })) pickerSearch.current?.focus();
                }}>
                  <span>{product.name}{product.brand && <small>{product.brand}</small>}</span>
                  <Plus size={16} aria-hidden="true"/>
                </button>
              </li>)}
            </ul>
            {matches.length > 8 && <p className={styles.muted}>{t("Précise ta recherche pour voir d’autres résultats.", "Refine your search to see more results.")}</p>}
          </> : <p className={styles.muted}>{search ? t("Aucun produit correspondant.", "No matching products.") : t("Tous les produits du vanity figurent déjà ici.", "All products in your collection are already on this list.")}</p>}
        </div>}
        {atLimit && <p className={styles.muted}>{t(
          `Cette liste contient le maximum de ${beautyListLimits.items} éléments.`,
          `This list has reached the limit of ${beautyListLimits.items} entries.`,
        )}</p>}
      </>}

      {!!list.items.length ? <ul className={styles.entries}>
        {list.items.map((item) => {
          const action = entryAction?.id === item.id ? entryAction : null;
          const fromVanity = item.productId ? presentProducts.get(item.productId) : undefined;
          const product = fromVanity ?? item.product;
          return <li key={item.id} className={styles.entry}>
            <div className={styles.entryRow}>
              <div className={styles.entryCopy}>
                <label className={styles.checkbox}>
                  <input type="checkbox" checked={item.checked} onChange={(event) => {
                    const next = event.target.checked;
                    changeItem(item.id, (current) => ({ ...current, checked: next }));
                  }}/>
                  <span>
                    <span className={item.checked ? styles.checked : undefined}>{item.text}</span>
                    {fromVanity && <small>{t("Dans ma trousse", "In my collection")}</small>}
                  </span>
                </label>
                {item.reason && <p className={styles.reason}>{item.reason}</p>}
              </div>
              <div className={styles.actions} hidden={Boolean(action)}>
                {onTryProduct && product?.category === "maquillage" && <button type="button" className="button button-secondary" onClick={() => onTryProduct(product)}>
                  <Brush size={15} aria-hidden="true"/>{t("Essayer", "Try")}<span className="sr-only"> · {item.text}</span>
                </button>}
                <button type="button" className={styles.iconButton} aria-label={t(`Modifier ${item.text}`, `Edit ${item.text}`)}
                  onClick={(event) => {
                    entryTrigger.current = event.currentTarget;
                    setEntryAction({ kind: "edit", id: item.id, text: item.text, reason: item.reason ?? "" });
                  }}><Pencil size={16} aria-hidden="true"/></button>
                <button type="button" className={styles.iconButton} aria-label={t(`Supprimer ${item.text}`, `Delete ${item.text}`)}
                  onClick={(event) => {
                    entryTrigger.current = event.currentTarget;
                    setEntryAction({ kind: "delete", id: item.id });
                  }}><Trash2 size={16} aria-hidden="true"/></button>
              </div>
            </div>
            {action?.kind === "edit" && <form className={styles.form} onSubmit={(event) => editEntry(event, item.id)}>
              <label htmlFor={entryEditId}>{t("Modifier l’élément", "Edit entry")}</label>
              <input className={styles.editorInput} id={entryEditId} value={action.text} onChange={(event) => setEntryAction({ ...action, text: event.target.value })}
                maxLength={beautyListLimits.text} autoFocus required/>
              <label htmlFor={reasonEditId}>{t("Raison personnelle (facultatif)", "Personal reason (optional)")}</label>
              <textarea id={reasonEditId} rows={2} value={action.reason} onChange={(event) => setEntryAction({ ...action, reason: event.target.value })}
                maxLength={beautyListLimits.reason}/>
              <div className={styles.actions}>
                <button type="submit" className="button button-primary" disabled={!action.text.trim()}>
                  <Check size={16} aria-hidden="true"/>{t("Enregistrer", "Save")}
                </button>
                <button type="button" className="button button-secondary" onClick={closeEntryAction}>{t("Annuler", "Cancel")}</button>
              </div>
            </form>}
            {action?.kind === "delete" && <div className={styles.confirm} role="group" aria-label={t("Confirmer la suppression de l’élément", "Confirm entry deletion")}>
              <p>{t("Supprimer cet élément de la liste ?", "Delete this entry from the list?")}</p>
              <div className={styles.actions}>
                <button type="button" className="button button-secondary" onClick={closeEntryAction} autoFocus>{t("Annuler", "Cancel")}</button>
                <button type="button" className="button button-danger" onClick={() => {
                  if (onEdit((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))) {
                    setEntryAction(null);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }
                }}>{t("Supprimer l’élément", "Delete entry")}</button>
              </div>
            </div>}
          </li>;
        })}
      </ul> : <p className={styles.muted}>{t("Aucun élément pour le moment.", "No entries yet.")}</p>}
    </section>
  );
}
