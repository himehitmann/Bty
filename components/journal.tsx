"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BookOpen, CalendarDays, Download, Feather, LockKeyhole, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  journalComfort, journalDateLabel, journalEntrySchema, journalPageSize, localDateKey, makeJournalDays,
  maxJournalProducts, storedJournalEntrySchema, summarizeJournal,
  type JournalComfort, type JournalEntry, type StoredJournalEntry,
} from "@/lib/journal";
import { useLocale } from "@/lib/i18n";
import type { Product, Routine, State } from "@/lib/model";
import styles from "./journal.module.css";

type JournalProps = {
  userId?: string | null;
  client: SupabaseClient | null;
  plus: boolean;
  entitlementLoading?: boolean;
  products: Product[];
  routines: Routine[];
  completed: State["completed"];
  onOpenPlans: () => void;
};

const entryColumns = "entry_date,comfort,routine,products,notes,updated_at";
const comfortOptions = Object.keys(journalComfort) as JournalComfort[];
const storedEntries = z.array(storedJournalEntrySchema);
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const dateSchema = z.iso.date();
const journalErrors = {
  subscription: { fr: "L’écriture dans le journal demande un abonnement Plus actif.", en: "An active Plus subscription is needed to write journal entries." },
  refresh: { fr: "Recharge le journal pour vérifier la version de cette observation et ton accès.", en: "Reload the journal to check the latest version of this entry and your access." },
  save: { fr: "Ton observation n’a pas pu être enregistrée. Ton brouillon reste affiché.", en: "Your entry couldn’t be saved. Your draft is still here." },
  olderEntries: { fr: "Les observations précédentes n’ont pas pu être chargées.", en: "Older entries couldn’t be loaded." },
  download: { fr: "Le téléchargement a échoué. Réessaie avec une connexion active.", en: "The download failed. Check your connection and try again." },
  staleEntry: { fr: "Cette observation a changé. Recharge le journal avant de la supprimer.", en: "This entry has changed. Reload the journal before deleting it." },
  delete: { fr: "L’observation n’a pas pu être supprimée.", en: "The entry couldn’t be deleted." },
} as const;
const journalNotices = {
  saved: { fr: "Ton observation est enregistrée.", en: "Your entry has been saved." },
  deleted: { fr: "Observation supprimée.", en: "Entry deleted." },
} as const;

async function fetchJournalPage(client: SupabaseClient, userId: string, before?: string | null, signal?: AbortSignal) {
  let request = client.from("journal_entries").select(entryColumns).eq("user_id", userId)
    .order("entry_date", { ascending: false }).limit(journalPageSize);
  if (before) request = request.lt("entry_date", before);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return storedEntries.parse(data);
}

export function Journal({ userId, client, ...props }: JournalProps) {
  const { t } = useLocale();
  return (
    <section className={styles.page} aria-labelledby="journal-title">
      <header className={styles.pageHeader}>
        <span className={styles.emblem}><Feather aria-hidden="true" size={21} /></span>
        <div>
          <h1 id="journal-title">{t("Journal beauté", "Beauty journal")}</h1>
          <p>{t("Retrouve ton ressenti et les produits utilisés, jour après jour.", "See how your skin felt and what you used, day by day.")}</p>
        </div>
      </header>
      {userId && client
        ? <PrivateJournal key={userId} userId={userId} client={client} {...props}/>
        : <LockedJournal onOpenPlans={props.onOpenPlans}/>}
    </section>
  );
}

function LockedJournal({ onOpenPlans }: { onOpenPlans: () => void }) {
  const { t } = useLocale();
  return (
    <div className={styles.locked}>
      <span className={styles.lockIcon}><LockKeyhole aria-hidden="true" size={23}/></span>
      <h2>{t("Ton carnet personnel avec Navier Plus", "Your personal journal with Navier Plus")}</h2>
      <p>{t(
        "Note le confort de ta peau, garde une trace des produits et des routines utilisés, puis relis tes observations sur plusieurs jours.",
        "Record how your skin feels, track the products and routines you use, and revisit your observations over time.",
      )}</p>
      <button className="button button-primary" type="button" onClick={onOpenPlans}>{t("Découvrir Navier Plus", "Explore Navier Plus")}</button>
    </div>
  );
}

function PrivateJournal({
  userId, client, plus, entitlementLoading, products, routines, completed, onOpenPlans,
}: Omit<JournalProps, "client" | "userId"> & { userId: string; client: SupabaseClient }) {
  const { t, locale, intlLocale, formatNumber } = useLocale();
  const [today] = useState(localDateKey);
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<StoredJournalEntry[]>([]);
  const [loadedDates, setLoadedDates] = useState<ReadonlySet<string>>(new Set());
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [dateLoading, setDateLoading] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [dateRetry, setDateRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<keyof typeof journalErrors | "">("");
  const [notice, setNotice] = useState<keyof typeof journalNotices | "">("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<"save" | "delete" | "export" | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<StoredJournalEntry | null>(null);
  const formSection = useRef<HTMLElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const exportScope = useRef<AbortController | null>(null);
  const dateInput = useId();

  useEffect(() => {
    const controller = new AbortController();
    exportScope.current = controller;
    return () => controller.abort();
  }, []);

  const mergeEntries = useCallback((added: StoredJournalEntry[]) => {
    setEntries((previous) => {
      const byDate = new Map(previous.map((entry) => [entry.entry_date, entry]));
      for (const entry of added) byDate.set(entry.entry_date, entry);
      return Array.from(byDate.values()).sort((first, second) => second.entry_date.localeCompare(first.entry_date));
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      try {
        const page = await fetchJournalPage(client, userId, null, controller.signal);
        if (controller.signal.aborted) return;
        setEntries(page);
        setNextBefore(page.length === journalPageSize ? page.at(-1)?.entry_date ?? null : null);
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [client, userId, retry]);

  const dateOutsidePage = nextBefore !== null && selectedDate < nextBefore && !loadedDates.has(selectedDate) &&
    !entries.some((entry) => entry.entry_date === selectedDate);
  useEffect(() => {
    if (loading || !dateOutsidePage) {
      setDateLoading(false);
      return;
    }
    const controller = new AbortController();
    setDateLoading(true);
    setDateError(false);
    void (async () => {
      try {
        const { data, error } = await client.from("journal_entries").select(entryColumns)
          .eq("user_id", userId).eq("entry_date", selectedDate).abortSignal(controller.signal).maybeSingle();
        if (error) throw error;
        if (controller.signal.aborted) return;
        if (data) mergeEntries([storedJournalEntrySchema.parse(data)]);
        setLoadedDates((previous) => new Set(previous).add(selectedDate));
      } catch {
        if (!controller.signal.aborted) setDateError(true);
      } finally {
        if (!controller.signal.aborted) setDateLoading(false);
      }
    })();
    return () => controller.abort();
  }, [client, userId, selectedDate, dateOutsidePage, loading, dateRetry, mergeEntries]);

  const currentEntry = entries.find((entry) => entry.entry_date === selectedDate);
  const days = makeJournalDays(today, intlLocale);
  const lastWeek = summarizeJournal(entries, days.slice(7).map((day) => day.date));
  const previousWeek = summarizeJournal(entries, days.slice(0, 7).map((day) => day.date));
  const term = normalize(query.trim());
  const history = entries.filter((entry) => !term || normalize([
    entry.notes, entry.routine?.name, ...entry.products.map((product) => product.name),
  ].join(" ")).includes(term));

  function periodLabel({ count, comfortable }: ReturnType<typeof summarizeJournal>) {
    if (!count) return t("Aucune observation", "No observations");
    return t(
      `${formatNumber(count)} ${count > 1 ? "jours suivis" : "jour suivi"} · ${formatNumber(comfortable)} ${comfortable > 1 ? "confortables" : "confortable"}`,
      `${formatNumber(count)} ${count === 1 ? "day" : "days"} logged · ${formatNumber(comfortable)} comfortable`,
    );
  }

  function selectDate(date: string, focus = false) {
    if (!date || date > today || !dateSchema.safeParse(date).success) return;
    setSelectedDate(date);
    setDateError(false);
    setError("");
    setNotice("");
    if (focus) requestAnimationFrame(() => formSection.current?.focus());
  }

  async function saveEntry(entry: JournalEntry, version?: string) {
    setBusy("save");
    setNotice("");
    setError("");
    try {
      const query = client.from("journal_entries");
      const result = version
        ? await query.update({ comfort: entry.comfort, routine: entry.routine, products: entry.products, notes: entry.notes })
          .eq("user_id", userId).eq("entry_date", entry.entry_date).eq("updated_at", version).select(entryColumns).maybeSingle()
        : await query.insert({ ...entry, user_id: userId }).select(entryColumns).single();
      if (result.error?.code === "42501") {
        setError("subscription");
        return false;
      }
      if (result.error?.code === "23505" || (!result.error && !result.data)) {
        setError("refresh");
        return false;
      }
      if (result.error) throw result.error;
      mergeEntries([storedJournalEntrySchema.parse(result.data)]);
      setNotice("saved");
      return true;
    } catch {
      setError("save");
      return false;
    } finally { setBusy(null); }
  }

  async function loadMore() {
    if (!nextBefore || pageLoading) return;
    setPageLoading(true);
    setError("");
    try {
      const page = await fetchJournalPage(client, userId, nextBefore);
      mergeEntries(page);
      setNextBefore(page.length === journalPageSize ? page.at(-1)?.entry_date ?? null : null);
    } catch { setError("olderEntries"); }
    finally { setPageLoading(false); }
  }

  async function downloadJournal() {
    const signal = exportScope.current?.signal;
    if (!signal || signal.aborted) return;
    setBusy("export");
    setError("");
    try {
      const allEntries: JournalEntry[] = [];
      let before: string | null = null;
      do {
        const page = await fetchJournalPage(client, userId, before, signal);
        for (const entry of page) allEntries.push(journalEntrySchema.parse(entry));
        before = page.length === journalPageSize ? page.at(-1)?.entry_date ?? null : null;
      } while (before);
      if (signal.aborted) return;
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: allEntries }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = Object.assign(document.createElement("a"), { href: url, download: `navier-journal-${today}.json` });
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!signal.aborted) setError("download");
    } finally {
      if (!signal.aborted) setBusy(null);
    }
  }

  function askDelete(entry: StoredJournalEntry) {
    setDeleteEntry(entry);
    deleteDialog.current?.showModal();
  }

  async function confirmDelete() {
    if (!deleteEntry) return;
    deleteDialog.current?.close();
    setBusy("delete");
    setError("");
    setNotice("");
    try {
      const { data, error } = await client.from("journal_entries").delete()
        .eq("user_id", userId).eq("entry_date", deleteEntry.entry_date).eq("updated_at", deleteEntry.updated_at)
        .select("entry_date").maybeSingle();
      if (error) throw error;
      if (!data) {
        setError("staleEntry");
        return;
      }
      setEntries((previous) => previous.filter((entry) => entry.entry_date !== deleteEntry.entry_date));
      setNotice("deleted");
    } catch { setError("delete"); }
    finally { setBusy(null); }
  }

  if (loading || (entitlementLoading && !plus)) return <p role="status" className={styles.panel}>{t("Chargement de ton journal…", "Loading your journal…")}</p>;
  if (loadFailed) {
    return <p role="alert" className={styles.panel}>{t("Le journal est indisponible. Réessaie avec une connexion active.", "The journal is unavailable. Check your connection and try again.")}
      <button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>{t("Recharger", "Reload")}</button>
    </p>;
  }
  if (!plus && entries.length === 0) return <LockedJournal onOpenPlans={onOpenPlans}/>;

  return (
    <>
      {error && <div className={styles.warning} role="alert">{journalErrors[error][locale]} <button className="text-button" onClick={() => setRetry((value) => value + 1)}>{t("Recharger", "Reload")}</button></div>}
      {notice && <p className={styles.notice} role="status">{journalNotices[notice][locale]}</p>}
      {!plus && (
        <div className={styles.readOnly}>
          <div><strong>{t("Ton historique reste accessible", "Your history stays available")}</strong><p>{t("Avec Navier Plus, tu peux ajouter et modifier tes observations.", "With Navier Plus, you can add and edit entries.")}</p></div>
          <button type="button" className="button button-secondary" onClick={onOpenPlans}>{t("Voir Navier Plus", "See Navier Plus")}</button>
        </div>
      )}
      <div className={styles.journalGrid}>
        <div className={styles.primary}>
          <section className={styles.panel} aria-labelledby="journal-calendar-title">
            <div className={styles.sectionHeader}>
              <h2 id="journal-calendar-title"><CalendarDays aria-hidden="true" size={19}/> {t("Calendrier", "Calendar")}</h2>
              <label className={styles.dateLabel} htmlFor={dateInput}>{t("Choisir une date", "Choose a date")}
                <input id={dateInput} type="date" value={selectedDate} max={today} disabled={Boolean(busy)} onChange={(event) => selectDate(event.target.value)}/>
              </label>
            </div>
            <div className={styles.calendar}>
              {days.map((day) => {
                const entry = entries.find((entry) => entry.entry_date === day.date);
                return <button type="button" key={day.date} className={styles.day} aria-current={day.date === today ? "date" : undefined}
                  aria-pressed={day.date === selectedDate} disabled={Boolean(busy)}
                  aria-label={`${journalDateLabel(day.date, intlLocale)}, ${entry ? journalComfort[entry.comfort][locale] : t("sans observation", "no entry")}`}
                  onClick={() => selectDate(day.date)}>
                  <small>{day.weekday}</small><span>{day.label}</span>
                  <i data-comfort={entry?.comfort} aria-hidden="true"/>
                </button>;
              })}
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="journal-entry-title" tabIndex={-1} ref={formSection}>
            <h2 id="journal-entry-title">{journalDateLabel(selectedDate, intlLocale)}</h2>
            {dateLoading || (dateOutsidePage && !dateError) ? <p role="status">{t("Chargement de la journée…", "Loading this day…")}</p>
              : dateError ? <p role="alert">{t("La journée n’a pas pu être chargée.", "This day couldn’t be loaded.")} <button type="button" className="text-button" onClick={() => setDateRetry((value) => value + 1)}>{t("Réessayer", "Try again")}</button></p>
                : plus ? (
                  <EntryForm key={selectedDate} date={selectedDate} entry={currentEntry} products={products} routines={routines}
                    completed={completed} busy={Boolean(busy)} onSave={saveEntry}/>
                ) : currentEntry ? <EntryDetails entry={currentEntry}/>
                  : <p>{t("Aucune observation pour cette journée.", "No entry for this day.")}</p>}
          </section>
        </div>
        <aside className={styles.panel}>
          <h2>{t("Deux semaines d’observations", "Two weeks of observations")}</h2>
          <dl className={styles.summary}>
            <div>
              <dt>{t("Ces 7 derniers jours", "Past 7 days")}</dt>
              <dd>{periodLabel(lastWeek)}</dd>
            </div>
            <div>
              <dt>{t("Les 7 jours précédents", "Previous 7 days")}</dt>
              <dd>{periodLabel(previousWeek)}</dd>
            </div>
          </dl>
          <p className={styles.muted}>{t(
            "Ce résumé reflète tes observations. La météo, la fréquence d’utilisation et d’autres facteurs peuvent aussi jouer sur ton ressenti.",
            "This summary reflects your observations. Weather, how often you use a product and other factors can also affect how your skin feels.",
          )}</p>
        </aside>
      </div>
      <section className={styles.panel} aria-labelledby="journal-history-title">
        <div className={styles.sectionHeader}>
          <h2 id="journal-history-title"><BookOpen aria-hidden="true" size={19}/> {t("Historique", "History")}</h2>
          {entries.length > 0 && <button type="button" className="button button-secondary" disabled={Boolean(busy)} onClick={downloadJournal}>
            <Download aria-hidden="true" size={17}/> {busy === "export" ? t("Téléchargement…", "Downloading…") : t("Exporter le journal", "Export journal")}
          </button>}
        </div>
        {!!entries.length && <label className={styles.search}>
          <Search aria-hidden="true" size={17}/>
          <input type="search" placeholder={t("Produit, routine ou note", "Product, routine or note")} aria-label={t("Rechercher dans le journal", "Search journal")} value={query} onChange={(event) => setQuery(event.target.value)}/>
        </label>}
        {!history.length ? <p>{term ? t("Aucune observation correspondante dans les pages chargées.", "No matching entries in the loaded pages.") : t("Les observations enregistrées apparaîtront ici.", "Saved entries will appear here.")}</p>
          : <div className={styles.history}>
            {history.map((entry) => (
              <article className={styles.historyEntry} key={entry.entry_date}>
                <h3><button type="button" className="text-button" onClick={() => selectDate(entry.entry_date, true)} disabled={Boolean(busy)}>{journalDateLabel(entry.entry_date, intlLocale)}</button></h3>
                <EntryDetails entry={entry}/>
                <button type="button" className={styles.trashButton} onClick={() => askDelete(entry)} disabled={Boolean(busy)}
                  aria-label={t(`Supprimer l’observation du ${journalDateLabel(entry.entry_date, intlLocale)}`, `Delete entry for ${journalDateLabel(entry.entry_date, intlLocale)}`)}><Trash2 aria-hidden="true" size={17}/></button>
              </article>
            ))}
          </div>}
        {nextBefore && <button type="button" className="button button-secondary" onClick={loadMore} disabled={pageLoading}>{pageLoading ? t("Chargement…", "Loading…") : t("Voir les observations précédentes", "Show older entries")}</button>}
      </section>
      <dialog className="dialog" ref={deleteDialog} aria-labelledby="journal-delete-title">
        <h2 id="journal-delete-title">{t("Supprimer cette observation ?", "Delete this entry?")}</h2>
        {deleteEntry && <p>{t(
          `L’observation du ${journalDateLabel(deleteEntry.entry_date, intlLocale)} sera supprimée de ton journal.`,
          `The entry for ${journalDateLabel(deleteEntry.entry_date, intlLocale)} will be deleted from your journal.`,
        )}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className="button button-secondary" onClick={() => deleteDialog.current?.close()}>{t("Annuler", "Cancel")}</button>
          <button type="button" className="button button-danger" onClick={confirmDelete}>{t("Supprimer", "Delete")}</button>
        </div>
      </dialog>
    </>
  );
}

function EntryDetails({ entry }: { entry: JournalEntry }) {
  const { t, locale } = useLocale();
  return (
    <div className={styles.entryDetails}>
      <span className={styles.comfortTag} data-comfort={entry.comfort}>{journalComfort[entry.comfort][locale]}</span>
      {entry.routine && <p className={styles.routineLabel}>{entry.routine.name}</p>}
      {entry.products.length > 0 && <ul aria-label={t("Produits utilisés", "Products used")} className={styles.products}>
        {entry.products.map((product, index) => <li key={`${product.id}-${index}`}>{product.name}</li>)}
      </ul>}
      {entry.notes && <p className={styles.entryNote}>{entry.notes}</p>}
    </div>
  );
}

function EntryForm({ date, entry, products, routines, completed, busy, onSave }: {
  date: string;
  entry?: StoredJournalEntry;
  products: Product[];
  routines: Routine[];
  completed: State["completed"];
  busy: boolean;
  onSave: (entry: JournalEntry, version?: string) => Promise<boolean>;
}) {
  const { t, locale, formatNumber } = useLocale();
  const id = useId();
  const [comfort, setComfort] = useState<JournalComfort | "">(entry?.comfort ?? "");
  const [routineId, setRoutineId] = useState(entry?.routine?.id ?? "");
  const [usedProducts, setUsedProducts] = useState(entry?.products ?? []);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState<"products" | "invalid" | "">("");
  const routine = routines.find((candidate) => candidate.id === routineId);
  const completedIds = new Set(completed.filter((item) => localDateKey(new Date(item.at)) === date).map((item) => item.routineId));

  function addProducts(choices: Product[]) {
    const names = new Map(usedProducts.map((product) => [product.id, product]));
    for (const product of choices) {
      if (!names.has(product.id) && names.size < maxJournalProducts) names.set(product.id, { id: product.id, name: product.name });
    }
    setUsedProducts(Array.from(names.values()));
    setMessage(choices.some((choice) => !names.has(choice.id))
      ? "products" : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = journalEntrySchema.safeParse({
      entry_date: date,
      comfort,
      routine: routine ? { id: routine.id, name: routine.name } : entry?.routine?.id === routineId ? entry.routine : null,
      products: usedProducts,
      notes,
    });
    if (!checked.success) {
      setMessage("invalid");
      return;
    }
    if (await onSave(checked.data, entry?.updated_at)) setMessage("");
  }

  return (
    <form onSubmit={submit} className={styles.entryForm}>
      <fieldset disabled={busy}>
        <legend>{t("Comment était le confort de ta peau ?", "How did your skin feel?")}</legend>
        <div className={styles.comfortChoices}>
          {comfortOptions.map((value) => (
            <label key={value} className={styles.comfortChoice} data-comfort={value}>
              <input type="radio" name={`comfort-${id}`} required value={value} checked={comfort === value} onChange={() => setComfort(value)}/>
              {journalComfort[value][locale]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.formRow}>
        <label className={styles.field}>{t("Routine suivie", "Routine followed")}
          <select value={routineId} onChange={(event) => setRoutineId(event.target.value)} disabled={busy}>
            <option value="">{t("Aucune routine sélectionnée", "No routine selected")}</option>
            {routines.map((item) => <option key={item.id} value={item.id}>{item.name}{completedIds.has(item.id) ? t(" · terminée ce jour", " · completed that day") : ""}</option>)}
            {entry?.routine && !routines.some((item) => item.id === entry.routine?.id) && <option value={entry.routine.id}>{entry.routine.name}</option>}
          </select>
        </label>
        {routine?.steps.length ? <button className="text-button" type="button" disabled={busy} onClick={() => {
          const includedIds = new Set(routine.steps.map((step) => step.productId));
          addProducts(products.filter((product) => includedIds.has(product.id)));
        }}>{t("Ajouter les produits de cette routine", "Add products from this routine")}</button> : null}
      </div>
      <div className={styles.formRow}>
        <label className={styles.field}>{t("Produits utilisés", "Products used")}
          <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={busy || !products.some((product) => !usedProducts.some((included) => included.id === product.id))}>
            <option value="">{t("Choisir un produit du vanity", "Choose a product from your vanity")}</option>
            {products.filter((product) => !usedProducts.some((included) => included.id === product.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button type="button" className="button button-secondary" disabled={busy || !productId} onClick={() => {
          const chosen = products.find((product) => product.id === productId);
          if (chosen) addProducts([chosen]);
          setProductId("");
        }}><Plus aria-hidden="true" size={16}/> {t("Ajouter", "Add")}</button>
      </div>
      {usedProducts.length > 0 && <ul className={styles.products} aria-label={t("Produits retenus", "Selected products")}>
        {usedProducts.map((product) => <li key={product.id}>{product.name}
          <button type="button" aria-label={t(`Retirer ${product.name}`, `Remove ${product.name}`)} disabled={busy} onClick={() => {
            setUsedProducts((previous) => previous.filter((item) => item.id !== product.id));
            setMessage("");
          }}><X aria-hidden="true" size={14}/></button>
        </li>)}
      </ul>}
      <label className={styles.field}>{t("Note personnelle", "Personal note")}
        <textarea rows={3} maxLength={500} disabled={busy} value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder={t("Qu’as-tu remarqué aujourd’hui ?", "What did you notice today?")}/>
      </label>
      {message && <p className={styles.warning} role="status">{message === "products" ? t(
        `Une observation peut contenir jusqu’à ${formatNumber(maxJournalProducts)} produits.`,
        `An entry can include up to ${formatNumber(maxJournalProducts)} products.`,
      ) : t("Choisis ton ressenti et vérifie la longueur de ta note.", "Choose how your skin felt and check the length of your note.")}</p>}
      <button className="button button-primary" type="submit" disabled={busy || !comfort}>{busy ? t("Enregistrement…", "Saving…") : t("Enregistrer l’observation", "Save entry")}</button>
    </form>
  );
}
