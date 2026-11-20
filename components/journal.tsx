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
const comfortOptions = Object.entries(journalComfort) as [JournalComfort, string][];
const storedEntries = z.array(storedJournalEntrySchema);
const normalize = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");
const dateSchema = z.iso.date();

async function fetchJournalPage(client: SupabaseClient, userId: string, before?: string | null, signal?: AbortSignal) {
  let request = client.from("journal_entries").select(entryColumns).eq("user_id", userId)
    .order("entry_date", { ascending: false }).limit(journalPageSize);
  if (before) request = request.lt("entry_date", before);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return storedEntries.parse(data);
}

function periodLabel({ count, comfortable }: ReturnType<typeof summarizeJournal>) {
  if (!count) return "Aucune observation";
  return `${count} jour${count > 1 ? "s" : ""} suivi${count > 1 ? "s" : ""} · ${comfortable} confortable${comfortable > 1 ? "s" : ""}`;
}

export function Journal({ userId, client, ...props }: JournalProps) {
  return (
    <section className={styles.page} aria-labelledby="journal-title">
      <header className={styles.pageHeader}>
        <span className={styles.emblem}><Feather aria-hidden="true" size={21} /></span>
        <div>
          <h1 id="journal-title">Journal beauté</h1>
          <p>Retrouve ton ressenti et les produits utilisés, jour après jour.</p>
        </div>
      </header>
      {userId && client
        ? <PrivateJournal key={userId} userId={userId} client={client} {...props}/>
        : <LockedJournal onOpenPlans={props.onOpenPlans}/>}
    </section>
  );
}

function LockedJournal({ onOpenPlans }: { onOpenPlans: () => void }) {
  return (
    <div className={styles.locked}>
      <span className={styles.lockIcon}><LockKeyhole aria-hidden="true" size={23}/></span>
      <h2>Ton carnet personnel avec Navier Plus</h2>
      <p>Note le confort de ta peau, garde une trace des produits et des routines utilisés, puis relis tes observations sur plusieurs jours.</p>
      <button className="button button-primary" type="button" onClick={onOpenPlans}>Découvrir Navier Plus</button>
    </div>
  );
}

function PrivateJournal({
  userId, client, plus, entitlementLoading, products, routines, completed, onOpenPlans,
}: Omit<JournalProps, "client" | "userId"> & { userId: string; client: SupabaseClient }) {
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
  const days = makeJournalDays(today);
  const lastWeek = summarizeJournal(entries, days.slice(7).map((day) => day.date));
  const previousWeek = summarizeJournal(entries, days.slice(0, 7).map((day) => day.date));
  const term = normalize(query.trim());
  const history = entries.filter((entry) => !term || normalize([
    entry.notes, entry.routine?.name, ...entry.products.map((product) => product.name),
  ].join(" ")).includes(term));

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
        setError("L’écriture dans le journal demande un abonnement Plus actif.");
        return false;
      }
      if (result.error?.code === "23505" || (!result.error && !result.data)) {
        setError("Recharge le journal pour vérifier la version de cette observation et ton accès.");
        return false;
      }
      if (result.error) throw result.error;
      mergeEntries([storedJournalEntrySchema.parse(result.data)]);
      setNotice("Ton observation est enregistrée.");
      return true;
    } catch {
      setError("Ton observation n’a pas pu être enregistrée. Ton brouillon reste affiché.");
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
    } catch { setError("Les observations précédentes n’ont pas pu être chargées."); }
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
      if (!signal.aborted) setError("Le téléchargement a échoué. Réessaie avec une connexion active.");
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
        setError("Cette observation a changé. Recharge le journal avant de la supprimer.");
        return;
      }
      setEntries((previous) => previous.filter((entry) => entry.entry_date !== deleteEntry.entry_date));
      setNotice("Observation supprimée.");
    } catch { setError("L’observation n’a pas pu être supprimée."); }
    finally { setBusy(null); }
  }

  if (loading || (entitlementLoading && !plus)) return <p role="status" className={styles.panel}>Chargement de ton journal…</p>;
  if (loadFailed) {
    return <p role="alert" className={styles.panel}>Le journal est indisponible. Réessaie avec une connexion active.
      <button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>Recharger</button>
    </p>;
  }
  if (!plus && entries.length === 0) return <LockedJournal onOpenPlans={onOpenPlans}/>;

  return (
    <>
      {error && <div className={styles.warning} role="alert">{error} <button className="text-button" onClick={() => setRetry((value) => value + 1)}>Recharger</button></div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {!plus && (
        <div className={styles.readOnly}>
          <div><strong>Ton historique reste accessible</strong><p>Avec Navier Plus, tu peux ajouter et modifier tes observations.</p></div>
          <button type="button" className="button button-secondary" onClick={onOpenPlans}>Voir Navier Plus</button>
        </div>
      )}
      <div className={styles.journalGrid}>
        <div className={styles.primary}>
          <section className={styles.panel} aria-labelledby="journal-calendar-title">
            <div className={styles.sectionHeader}>
              <h2 id="journal-calendar-title"><CalendarDays aria-hidden="true" size={19}/> Calendrier</h2>
              <label className={styles.dateLabel} htmlFor={dateInput}>Choisir une date
                <input id={dateInput} type="date" value={selectedDate} max={today} disabled={Boolean(busy)} onChange={(event) => selectDate(event.target.value)}/>
              </label>
            </div>
            <div className={styles.calendar}>
              {days.map((day) => {
                const entry = entries.find((entry) => entry.entry_date === day.date);
                return <button type="button" key={day.date} className={styles.day} aria-current={day.date === today ? "date" : undefined}
                  aria-pressed={day.date === selectedDate} disabled={Boolean(busy)}
                  aria-label={`${journalDateLabel(day.date)}, ${entry ? journalComfort[entry.comfort] : "sans observation"}`}
                  onClick={() => selectDate(day.date)}>
                  <small>{day.weekday}</small><span>{day.label}</span>
                  <i data-comfort={entry?.comfort} aria-hidden="true"/>
                </button>;
              })}
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="journal-entry-title" tabIndex={-1} ref={formSection}>
            <h2 id="journal-entry-title">{journalDateLabel(selectedDate)}</h2>
            {dateLoading || (dateOutsidePage && !dateError) ? <p role="status">Chargement de la journée…</p>
              : dateError ? <p role="alert">La journée n’a pas pu être chargée. <button type="button" className="text-button" onClick={() => setDateRetry((value) => value + 1)}>Réessayer</button></p>
                : plus ? (
                  <EntryForm key={selectedDate} date={selectedDate} entry={currentEntry} products={products} routines={routines}
                    completed={completed} busy={Boolean(busy)} onSave={saveEntry}/>
                ) : currentEntry ? <EntryDetails entry={currentEntry}/>
                  : <p>Aucune observation pour cette journée.</p>}
          </section>
        </div>
        <aside className={styles.panel}>
          <h2>Deux semaines d’observations</h2>
          <dl className={styles.summary}>
            <div>
              <dt>Ces 7 derniers jours</dt>
              <dd>{periodLabel(lastWeek)}</dd>
            </div>
            <div>
              <dt>Les 7 jours précédents</dt>
              <dd>{periodLabel(previousWeek)}</dd>
            </div>
          </dl>
          <p className={styles.muted}>Ce résumé reflète tes observations. La météo, la fréquence d’utilisation et d’autres facteurs peuvent aussi jouer sur ton ressenti.</p>
        </aside>
      </div>
      <section className={styles.panel} aria-labelledby="journal-history-title">
        <div className={styles.sectionHeader}>
          <h2 id="journal-history-title"><BookOpen aria-hidden="true" size={19}/> Historique</h2>
          {entries.length > 0 && <button type="button" className="button button-secondary" disabled={Boolean(busy)} onClick={downloadJournal}>
            <Download aria-hidden="true" size={17}/> {busy === "export" ? "Téléchargement…" : "Exporter le journal"}
          </button>}
        </div>
        {!!entries.length && <label className={styles.search}>
          <Search aria-hidden="true" size={17}/>
          <input type="search" placeholder="Produit, routine ou note" aria-label="Rechercher dans le journal" value={query} onChange={(event) => setQuery(event.target.value)}/>
        </label>}
        {!history.length ? <p>{term ? "Aucune observation correspondante dans les pages chargées." : "Les observations enregistrées apparaîtront ici."}</p>
          : <div className={styles.history}>
            {history.map((entry) => (
              <article className={styles.historyEntry} key={entry.entry_date}>
                <h3><button type="button" className="text-button" onClick={() => selectDate(entry.entry_date, true)} disabled={Boolean(busy)}>{journalDateLabel(entry.entry_date)}</button></h3>
                <EntryDetails entry={entry}/>
                <button type="button" className={styles.trashButton} onClick={() => askDelete(entry)} disabled={Boolean(busy)}
                  aria-label={`Supprimer l’observation du ${journalDateLabel(entry.entry_date)}`}><Trash2 aria-hidden="true" size={17}/></button>
              </article>
            ))}
          </div>}
        {nextBefore && <button type="button" className="button button-secondary" onClick={loadMore} disabled={pageLoading}>{pageLoading ? "Chargement…" : "Voir les observations précédentes"}</button>}
      </section>
      <dialog className="dialog" ref={deleteDialog} aria-labelledby="journal-delete-title">
        <h2 id="journal-delete-title">Supprimer cette observation ?</h2>
        {deleteEntry && <p>L’observation du {journalDateLabel(deleteEntry.entry_date)} sera supprimée de ton journal.</p>}
        <div className={styles.dialogActions}>
          <button type="button" className="button button-secondary" onClick={() => deleteDialog.current?.close()}>Annuler</button>
          <button type="button" className="button button-danger" onClick={confirmDelete}>Supprimer</button>
        </div>
      </dialog>
    </>
  );
}

function EntryDetails({ entry }: { entry: JournalEntry }) {
  return (
    <div className={styles.entryDetails}>
      <span className={styles.comfortTag} data-comfort={entry.comfort}>{journalComfort[entry.comfort]}</span>
      {entry.routine && <p className={styles.routineLabel}>{entry.routine.name}</p>}
      {entry.products.length > 0 && <ul aria-label="Produits utilisés" className={styles.products}>
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
  const id = useId();
  const [comfort, setComfort] = useState<JournalComfort | "">(entry?.comfort ?? "");
  const [routineId, setRoutineId] = useState(entry?.routine?.id ?? "");
  const [usedProducts, setUsedProducts] = useState(entry?.products ?? []);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState("");
  const routine = routines.find((candidate) => candidate.id === routineId);
  const completedIds = new Set(completed.filter((item) => localDateKey(new Date(item.at)) === date).map((item) => item.routineId));

  function addProducts(choices: Product[]) {
    const names = new Map(usedProducts.map((product) => [product.id, product]));
    for (const product of choices) {
      if (!names.has(product.id) && names.size < maxJournalProducts) names.set(product.id, { id: product.id, name: product.name });
    }
    setUsedProducts(Array.from(names.values()));
    setMessage(choices.some((choice) => !names.has(choice.id))
      ? `Une observation peut contenir jusqu’à ${maxJournalProducts} produits.` : "");
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
      setMessage("Choisis ton ressenti et vérifie la longueur de ta note.");
      return;
    }
    if (await onSave(checked.data, entry?.updated_at)) setMessage("");
  }

  return (
    <form onSubmit={submit} className={styles.entryForm}>
      <fieldset disabled={busy}>
        <legend>Comment était le confort de ta peau ?</legend>
        <div className={styles.comfortChoices}>
          {comfortOptions.map(([value, label]) => (
            <label key={value} className={styles.comfortChoice} data-comfort={value}>
              <input type="radio" name={`comfort-${id}`} required value={value} checked={comfort === value} onChange={() => setComfort(value)}/>
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.formRow}>
        <label className={styles.field}>Routine suivie
          <select value={routineId} onChange={(event) => setRoutineId(event.target.value)} disabled={busy}>
            <option value="">Aucune routine sélectionnée</option>
            {routines.map((item) => <option key={item.id} value={item.id}>{item.name}{completedIds.has(item.id) ? " · terminée ce jour" : ""}</option>)}
            {entry?.routine && !routines.some((item) => item.id === entry.routine?.id) && <option value={entry.routine.id}>{entry.routine.name}</option>}
          </select>
        </label>
        {routine?.steps.length ? <button className="text-button" type="button" disabled={busy} onClick={() => {
          const includedIds = new Set(routine.steps.map((step) => step.productId));
          addProducts(products.filter((product) => includedIds.has(product.id)));
        }}>Ajouter les produits de cette routine</button> : null}
      </div>
      <div className={styles.formRow}>
        <label className={styles.field}>Produits utilisés
          <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={busy || !products.some((product) => !usedProducts.some((included) => included.id === product.id))}>
            <option value="">Choisir un produit du vanity</option>
            {products.filter((product) => !usedProducts.some((included) => included.id === product.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button type="button" className="button button-secondary" disabled={busy || !productId} onClick={() => {
          const chosen = products.find((product) => product.id === productId);
          if (chosen) addProducts([chosen]);
          setProductId("");
        }}><Plus aria-hidden="true" size={16}/> Ajouter</button>
      </div>
      {usedProducts.length > 0 && <ul className={styles.products} aria-label="Produits retenus">
        {usedProducts.map((product) => <li key={product.id}>{product.name}
          <button type="button" aria-label={`Retirer ${product.name}`} disabled={busy} onClick={() => {
            setUsedProducts((previous) => previous.filter((item) => item.id !== product.id));
            setMessage("");
          }}><X aria-hidden="true" size={14}/></button>
        </li>)}
      </ul>}
      <label className={styles.field}>Note personnelle
        <textarea rows={3} maxLength={500} disabled={busy} value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder="Qu’as-tu remarqué aujourd’hui ?"/>
      </label>
      {message && <p className={styles.warning} role="status">{message}</p>}
      <button className="button button-primary" type="submit" disabled={busy || !comfort}>{busy ? "Enregistrement…" : "Enregistrer l’observation"}</button>
    </form>
  );
}
