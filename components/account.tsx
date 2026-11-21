"use client";

import { LogOut, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useLocale } from "@/lib/i18n";

export type AccountEntry = "login" | "password";
type AccountMode = AccountEntry | "signup" | "recover";

export function Account({ user, client, ready, initialMode, onClose, onNotice }: {
  user: User | null;
  client: SupabaseClient | null;
  ready: boolean;
  initialMode: AccountEntry;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const running = useRef(false);
  const mounted = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function switchMode(next: AccountMode) {
    setMode(next);
    setNotice(undefined);
    requestAnimationFrame(() => emailInput.current?.focus());
  }

  function done(text: string) {
    if (!mounted.current) return;
    onNotice(text);
    onClose();
  }

  async function run(operation: () => Promise<void>, errorText: string) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setNotice(undefined);
    try { await operation(); }
    catch { if (mounted.current) setNotice({ text: errorText, error: true }); }
    finally {
      running.current = false;
      if (mounted.current) setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || running.current) return;
    const form = new FormData(event.currentTarget);
    const address = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const redirectTo = new URL("/auth/confirm", location.origin).href;

    if (mode === "recover") {
      void run(async () => {
        const { error } = await client.auth.resetPasswordForEmail(address, { redirectTo });
        if (error && (error.status === undefined || error.status >= 500)) throw error;
        if (mounted.current) setNotice({ text: t(
          "Si un compte correspond à cette adresse, un lien de réinitialisation peut t’être envoyé. Vérifie ta boîte mail.",
          "If an account matches this address, you may receive a reset link. Check your inbox.",
        ) });
      }, t("Impossible de demander le lien pour le moment. Réessaie dans un instant.", "A reset link couldn’t be requested right now. Try again in a moment."));
    } else if (mode === "password") {
      if (!user || !ready) return;
      if (password !== form.get("confirmation")) {
        setNotice({ text: t("Les deux mots de passe doivent être identiques.", "Both passwords must match."), error: true });
        event.currentTarget.querySelector<HTMLInputElement>('[name="confirmation"]')?.focus();
        return;
      }
      void run(async () => {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        done(t("Ton mot de passe a été mis à jour.", "Your password has been updated."));
      }, t("Le mot de passe n’a pas pu être modifié. Vérifie le mot de passe ou demande un nouveau lien.", "Your password couldn’t be changed. Check the password or request a new link."));
    } else {
      void run(async () => {
        const firstName = String(form.get("name") ?? "").trim();
        const { data, error } = mode === "login"
          ? await client.auth.signInWithPassword({ email: address, password })
          : await client.auth.signUp({ email: address, password, options: {
            emailRedirectTo: redirectTo, data: firstName ? { first_name: firstName } : {},
          } });
        if (error) throw error;
        if (data.session) done(t("Tu es connecté à ton espace Navier.", "You’re signed in to your Navier workspace."));
        else if (mounted.current) setNotice({ text: t("Consulte ta boîte mail pour confirmer ton adresse.", "Check your email to confirm your address.") });
      }, mode === "login"
        ? t("Connexion impossible. Vérifie tes identifiants ou réessaie dans un instant.", "Unable to sign in. Check your credentials or try again in a moment.")
        : t("La création du compte a échoué. Vérifie l’adresse et choisis un mot de passe d’au moins 8 caractères.", "Unable to create your account. Check the email address and choose a password with at least 8 characters."));
    }
  }

  function signOut() {
    if (!client) return;
    void run(async () => {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) {
        const current = await client.auth.getSession();
        if (current.error || current.data.session) throw error;
        done(t("Session fermée sur cet appareil. Le serveur n’a pas confirmé sa révocation.", "Signed out on this device. The server did not confirm revocation."));
        return;
      }
      done(t("Tu es de retour dans ton espace local.", "You’re back in your local workspace."));
    }, t("Déconnexion impossible. Réessaie dans un instant.", "Unable to sign out. Try again in a moment."));
  }

  const signedIn = Boolean(user && mode === "login");
  const passwordReady = Boolean(ready && user);
  const titles = {
    login: signedIn ? t("Mon compte", "My account") : t("Se connecter", "Sign in"),
    signup: t("Créer un compte", "Create an account"),
    recover: t("Réinitialiser le mot de passe", "Reset your password"),
    password: t("Choisir un nouveau mot de passe", "Choose a new password"),
  };
  return <>
    <header className="dialog-heading">
      <div>
        <h2 id="account-title">{titles[mode]}</h2>
        {signedIn && user?.email && <p>{user.email}</p>}
        {mode === "login" && !signedIn && <p>{t("Retrouve ton espace sur plusieurs appareils.", "Access your workspace on your different devices.")}</p>}
      </div>
      <button type="button" className="icon-button" aria-label={t("Fermer", "Close")} onClick={onClose}><X size={21} aria-hidden="true"/></button>
    </header>
    {!client ? <div className="product-detail-panel"><p>{t("La connexion nécessite une configuration Supabase. Les produits et routines de l’espace local sont conservés dans ce navigateur.", "Sign-in requires a Supabase configuration. Local products and routines are stored in this browser.")}</p></div>
      : signedIn ? <div className="stacked-form">
        <p>{t("Ton compte dispose de sa propre collection. L’espace local reste accessible après la déconnexion.", "Your account has its own collection. You can access your local workspace after signing out.")}</p>
        <button type="button" className="button button-secondary" disabled={pending} onClick={signOut}>
          <LogOut size={17} aria-hidden="true"/>{t("Se déconnecter de cet appareil", "Sign out on this device")}
        </button>
        <button type="button" className="text-button" disabled={pending} onClick={() => switchMode("recover")}>
          {t("Demander un lien pour changer le mot de passe", "Request a link to change my password")}
        </button>
      </div>
      : mode === "password" && !passwordReady ? <div className="stacked-form">
        {ready ? <><p>{t("La session de récupération est indisponible. Demande un nouveau lien.", "The recovery session is unavailable. Request a new link.")}</p>
          <button type="button" className="button button-secondary" onClick={() => switchMode("recover")}>{t("Demander un nouveau lien", "Request a new link")}</button></>
          : <p role="status">{t("Vérification de la session…", "Checking your session…")}</p>}
      </div>
      : <form key={mode} method="post" className="stacked-form" onSubmit={submit} aria-busy={pending}
        onChange={() => { if (notice) setNotice(undefined); }}>
        {mode === "signup" && <label>{t("Prénom", "First name")}<input name="name" autoComplete="given-name" maxLength={40}/></label>}
        {mode !== "password" && <label>{t("Adresse e-mail", "Email address")}
          <input ref={emailInput} name="email" type="email" autoComplete="username" maxLength={254} required
            value={user?.email ?? email} readOnly={Boolean(user?.email)} onChange={(event) => setEmail(event.currentTarget.value)}/>
        </label>}
        {mode !== "recover" && <label>{mode === "password" ? t("Nouveau mot de passe", "New password") : t("Mot de passe", "Password")}
          <input name="password" type="password" minLength={mode === "login" ? 1 : 8} maxLength={128} required
            autoComplete={mode === "login" ? "current-password" : "new-password"}/>
        </label>}
        {mode === "password" && <label>{t("Confirmer le nouveau mot de passe", "Confirm the new password")}
          <input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/>
        </label>}
        {mode === "recover" && <p className="muted">{t("Ouvre le lien dans le même navigateur pour choisir ton nouveau mot de passe.", "Open the link in the same browser to choose your new password.")}</p>}
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? t("En cours…", "Working…") : mode === "login" ? t("Se connecter", "Sign in") : mode === "signup" ? t("Créer mon compte", "Create my account")
            : mode === "recover" ? t("Envoyer un lien", "Send a reset link") : t("Enregistrer le mot de passe", "Save new password")}
        </button>
        {mode !== "password" && <button className="text-button" type="button" disabled={pending} onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? t("Créer un compte", "Create an account") : mode === "signup" ? t("J’ai déjà un compte", "I already have an account") : t("Retour à la connexion", "Back to sign in")}
        </button>}
        {mode === "login" && <button className="text-button" type="button" disabled={pending} onClick={() => switchMode("recover")}>
          {t("Mot de passe oublié ?", "Forgot your password?")}
        </button>}
      </form>}
    {notice && <p className={notice.error ? "form-error" : "muted"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
  </>;
}
