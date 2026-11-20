"use client";

import { Bookmark } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import { studioLookLimits, type SavedStudioLook } from "@/lib/studio-looks";
import styles from "./studio-look-library.module.css";

type StudioLookLibraryProps = {
  looks: readonly SavedStudioLook[];
  activeId?: string;
  canSave: boolean;
  onSave: (name: string, id?: string) => boolean;
  onOpen: (look: SavedStudioLook) => void;
  onDelete: (id: string) => boolean;
};

export function StudioLookLibrary({ looks, activeId, canSave, onSave, onOpen, onDelete }: StudioLookLibraryProps) {
  const { t, formatNumber } = useLocale();
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [editor, setEditor] = useState<{ name: string; id?: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string>();
  const [notice, setNotice] = useState<"saved" | "deleted" | "save-error" | "delete-error">();
  const active = looks.find((look) => look.id === activeId);
  const selected = looks.find((look) => look.id === selectedId) ?? active ?? looks[0];
  const pendingDelete = looks.find((look) => look.id === deleteId);
  const atLimit = looks.length >= studioLookLimits.looks;
  const maySubmit = editor?.name.trim() && canSave && (editor.id
    ? looks.some((look) => look.id === editor.id)
    : !atLimit);

  function displayName(look: SavedStudioLook) {
    const matches = looks.filter((item) => item.name === look.name);
    if (matches.length < 2) return look.name;
    const ordinal = matches.findIndex((item) => item.id === look.id) + 1;
    return `${look.name} (${formatNumber(ordinal)})`;
  }

  function returnFocus() {
    requestAnimationFrame(() => {
      const button = trigger.current;
      if (button?.isConnected && !button.disabled) button.focus();
      else heading.current?.focus();
    });
  }

  function beginSave(button: HTMLButtonElement, look?: SavedStudioLook) {
    trigger.current = button;
    setEditor({ id: look?.id, name: look?.name ?? "" });
    setDeleteId(undefined);
    setNotice(undefined);
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !maySubmit) return;
    if (!onSave(editor.name.trim(), editor.id)) {
      setNotice("save-error");
      return;
    }
    setSelectedId(undefined);
    setEditor(null);
    setNotice("saved");
    returnFocus();
  }

  function open(look: SavedStudioLook) {
    onOpen(look);
    setSelectedId(undefined);
    setEditor(null);
    setDeleteId(undefined);
    setNotice(undefined);
  }

  function beginDelete(button: HTMLButtonElement, look: SavedStudioLook) {
    trigger.current = button;
    setDeleteId(look.id);
    setEditor(null);
    setNotice(undefined);
    requestAnimationFrame(() => cancelDelete.current?.focus());
  }

  function deleteLook(look: SavedStudioLook) {
    if (!onDelete(look.id)) {
      setNotice("delete-error");
      return;
    }
    setSelectedId(undefined);
    setDeleteId(undefined);
    setNotice("deleted");
    returnFocus();
  }

  function cancel() {
    setEditor(null);
    setDeleteId(undefined);
    setNotice(undefined);
    returnFocus();
  }

  return <section className={styles.library} aria-labelledby={`${id}-title`}>
    <div className={styles.header}>
      <div className={styles.heading}>
        <Bookmark size={18} strokeWidth={1.7} aria-hidden="true"/>
        <h2 id={`${id}-title`} tabIndex={-1} ref={heading}>{t("Mes looks", "My looks")}</h2>
        {active && <span className={styles.active}>{t(`Ouvert · ${displayName(active)}`, `Open · ${displayName(active)}`)}</span>}
      </div>
      <div className={styles.actions}>
        <button type="button" className="button button-primary" disabled={!canSave || (!active && atLimit)}
          aria-expanded={Boolean(editor && editor.id === active?.id)}
          onClick={(event) => beginSave(event.currentTarget, active)}>
          {active ? t("Enregistrer les modifications", "Save changes") : t("Enregistrer ce look", "Save this look")}
        </button>
        {active && <button type="button" className="button button-secondary" disabled={!canSave || atLimit}
          aria-expanded={Boolean(editor && !editor.id)} onClick={(event) => beginSave(event.currentTarget)}>
          {t("Enregistrer comme nouveau", "Save as new")}
        </button>}
      </div>
    </div>
    {selected && <div className={styles.row}>
      <label className={styles.field} htmlFor={`${id}-picker`}>
        {t("Looks enregistrés", "Saved looks")}
        <select id={`${id}-picker`} value={selected.id} onChange={(event) => {
          setSelectedId(event.currentTarget.value);
          setDeleteId(undefined);
          setNotice(undefined);
        }}>
          {looks.map((look) => <option key={look.id} value={look.id}>{displayName(look)}</option>)}
        </select>
      </label>
      <button type="button" className="button button-secondary" onClick={() => open(selected)}>{t("Ouvrir", "Open")}</button>
      <button type="button" className="button button-secondary" aria-expanded={Boolean(pendingDelete)}
        onClick={(event) => beginDelete(event.currentTarget, selected)}>{t("Supprimer", "Delete")}</button>
    </div>}
    {!canSave && <p className={styles.muted}>{t("Ajoute une couleur ou un fini mat pour enregistrer un look.", "Apply colour or a matte finish to save a look.")}</p>}
    {canSave && !looks.length && !editor && <p className={styles.muted}>{t("Enregistre ton premier look pour le retrouver ici.", "Save your first look to find it here.")}</p>}
    {atLimit && <p className={styles.muted}>{t(
      `Tu as atteint la limite de ${formatNumber(studioLookLimits.looks)} looks. Tu peux toujours modifier un look enregistré.`,
      `You have reached the limit of ${formatNumber(studioLookLimits.looks)} looks. You can still update a saved look.`,
    )}</p>}
    {editor && <form className={styles.row} onSubmit={save}>
      <label className={styles.field} htmlFor={`${id}-name`}>
        {t("Nom du look", "Look name")}
        <input id={`${id}-name`} ref={nameInput} value={editor.name} maxLength={studioLookLimits.name}
          required onChange={(event) => {
            setEditor({ ...editor, name: event.currentTarget.value });
            setNotice(undefined);
          }}/>
      </label>
      <button type="submit" className="button button-primary" disabled={!maySubmit}>{t("Enregistrer", "Save")}</button>
      <button type="button" className="button button-secondary" onClick={cancel}>{t("Annuler", "Cancel")}</button>
    </form>}
    {pendingDelete && <div className={styles.confirm} role="group" aria-labelledby={`${id}-delete-question`}>
      <p id={`${id}-delete-question`}>{t(`Supprimer « ${displayName(pendingDelete)} » ?`, `Delete “${displayName(pendingDelete)}”?`)}</p>
      <div className={styles.actions}>
        <button type="button" className="button button-secondary" ref={cancelDelete} onClick={cancel}>{t("Annuler", "Cancel")}</button>
        <button type="button" className="button button-danger" onClick={() => deleteLook(pendingDelete)}>{t("Confirmer la suppression", "Confirm deletion")}</button>
      </div>
    </div>}
    {notice === "saved" && <p className={styles.muted} role="status">{t("Look enregistré.", "Look saved.")}</p>}
    {notice === "deleted" && <p className={styles.muted} role="status">{t("Look supprimé.", "Look deleted.")}</p>}
    {notice === "save-error" && <p className="form-error" role="alert">{t("Le look n’a pas pu être enregistré.", "The look could not be saved.")}</p>}
    {notice === "delete-error" && <p className="form-error" role="alert">{t("Le look n’a pas pu être supprimé.", "The look could not be deleted.")}</p>}
  </section>;
}
