"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyState, starterState, stateSchema, type State } from "./model";
import { getSupabaseBrowserClient, loadRemoteState, RemoteStateConflict, removePalettePhoto, saveRemoteState } from "./supabase/browser";

type Sync = "loading" | "local" | "saving" | "synced" | "error" | "conflict";
type Draft = { state: State; version: string | null; dirty: boolean };
const keyFor = (id: string | null) => `navier.v1.${id ?? "guest"}`;

function readDraft(id: string | null): Draft | null {
  try {
    const raw = localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const value = JSON.parse(raw);
    const parsed = stateSchema.safeParse(value.state);
    if (!parsed.success) return null;
    return { state: parsed.data, version: typeof value.version === "string" ? value.version : null, dirty: value.dirty === true };
  } catch { return null; }
}

function writeDraft(id: string | null, draft: Draft) {
  try { localStorage.setItem(keyFor(id), JSON.stringify(draft)); return true; }
  catch { return false; }
}

function matchesDraft(remote: unknown, draft: State) {
  const validated = stateSchema.safeParse(remote);
  return validated.success && JSON.stringify(validated.data) === JSON.stringify(draft);
}

export function useWorkspaceState() {
  const [state, setState] = useState<State>(starterState);
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<Sync>("loading");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const scope = useRef<{ id: string | null; draft: Draft; running: boolean; writable: boolean; confirmed: State | null } | null>(null);
  const client = getSupabaseBrowserClient();

  const flush = useCallback(async () => {
    const current = scope.current;
    if (!client || !current?.id || !current.writable || current.running || !current.draft.dirty) return;
    current.running = true;
    setSync("saving");
    try {
      while (scope.current === current && current.draft.dirty) {
        const snapshot = current.draft.state;
        let version: string;
        try {
          version = await saveRemoteState(client, current.id, snapshot, current.draft.version);
        } catch (error) {
          if (!(error instanceof RemoteStateConflict)) throw error;
          const remote = await loadRemoteState<unknown>(client, current.id);
          if (!remote.updatedAt || !matchesDraft(remote.state, snapshot)) throw error;
          version = remote.updatedAt;
        }
        const previousPhotos = new Set(current.confirmed?.palette.flatMap((color) => color.photoPath ? [color.photoPath] : []));
        const currentPhotos = new Set(snapshot.palette.map((color) => color.photoPath));
        current.confirmed = snapshot;
        current.draft = { state: current.draft.state, version, dirty: current.draft.state !== snapshot };
        if (scope.current !== current) return;
        writeDraft(current.id, current.draft);
        for (const path of previousPhotos) {
          if (!currentPhotos.has(path) && path.startsWith(`${current.id}/`)) {
            void removePalettePhoto(client, path).catch(() => {
              if (scope.current === current) setNotice("Une ancienne photo privée n’a pas pu être supprimée du stockage.");
            });
          }
        }
      }
      if (scope.current === current) setSync("synced");
    } catch (error) {
      if (scope.current !== current) return;
      if (error instanceof RemoteStateConflict) {
        current.writable = false;
        setSync("conflict");
      } else {
        setSync("error");
      }
    } finally {
      current.running = false;
    }
  }, [client]);

  const activate = useCallback(async (id: string | null, discardDraft = false) => {
    const local = readDraft(id);
    const saved = discardDraft ? null : local;
    const current = {
      id, draft: local ?? { state: id ? emptyState : starterState, version: null, dirty: false },
      running: false, writable: false, confirmed: null as State | null,
    };
    scope.current = current;
    setState(current.draft.state);
    setReady(!id);
    setSync(id ? "loading" : "local");
    if (!id || !client) return;
    try {
      const remote = await loadRemoteState<unknown>(client, id);
      if (scope.current !== current) return;
      const draftAlreadySaved = saved?.dirty && saved.version !== remote.updatedAt &&
        matchesDraft(remote.state, saved.state);
      if (saved?.dirty && saved.version !== remote.updatedAt && !draftAlreadySaved) {
        setReady(true);
        setSync("conflict");
        return;
      }
      const parsed = remote.state === null ? emptyState : stateSchema.parse(remote.state);
      current.draft = saved?.dirty && !draftAlreadySaved ? saved : { state: parsed, version: remote.updatedAt, dirty: false };
      current.writable = true;
      current.confirmed = parsed;
      writeDraft(id, current.draft);
      setState(current.draft.state);
      setReady(true);
      setSync("synced");
      void flush();
    } catch {
      if (scope.current !== current) return;
      setReady(true);
      setSync("error");
    }
  }, [client, flush]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("auth") === "confirmed") setNotice("Ton adresse e-mail est confirmée.");
    if (params.get("auth") === "error") setNotice("Le lien de confirmation est invalide ou a expiré.");
    if (params.has("auth")) history.replaceState(null, "", location.pathname + location.hash);
    if (!client) {
      void activate(null);
      return;
    }
    let active = true;
    let currentId: string | null | undefined;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setTimeout(() => {
        if (!active) return;
        setUser(nextUser);
        const nextId = nextUser?.id ?? null;
        if (nextId === currentId) return;
        currentId = nextId;
        void activate(nextId);
      }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [activate, client]);

  useEffect(() => {
    if (sync !== "error") return;
    function reconnect() {
      const current = scope.current;
      if (!current?.id) return;
      if (current.writable) void flush();
      else void activate(current.id);
    }
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [activate, flush, sync]);

  const update = useCallback((recipe: (previous: State) => State, expectedId?: string | null) => {
    const current = scope.current;
    if (!current || (expectedId !== undefined && expectedId !== current.id)) return false;
    const validated = stateSchema.safeParse(recipe(current.draft.state));
    if (!validated.success) {
      setNotice("Cette modification dépasse les limites de l’espace. Vérifie la longueur des champs ou le nombre d’éléments.");
      return false;
    }
    if (new TextEncoder().encode(JSON.stringify(validated.data)).length > 490_000) {
      setNotice("L’espace a atteint sa taille maximale. Réduis le volume des compositions ou de l’historique.");
      return false;
    }
    current.draft = { ...current.draft, state: validated.data, dirty: Boolean(current.id) };
    setState(current.draft.state);
    if (!writeDraft(current.id, current.draft)) setNotice("Le navigateur n’a pas pu enregistrer une copie locale.");
    void flush();
    return true;
  }, [flush]);

  return {
    state, user, client, ready, sync, notice, setNotice, update,
    retry: () => scope.current?.writable ? flush() : activate(user?.id ?? null),
    reloadRemote: () => activate(user?.id ?? null, true),
  };
}
