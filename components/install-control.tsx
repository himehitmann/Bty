"use client";

import { Download } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallContextValue = {
  request: InstallEvent | null;
  installed: boolean;
  isSecure: boolean;
  reset: () => void;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const browser = navigator as Navigator & { standalone?: boolean };

    function observeMode() {
      setInstalled(displayMode.matches || browser.standalone === true);
    }

    function offerInstall(event: Event) {
      event.preventDefault();
      setRequest(event as InstallEvent);
    }

    function confirmInstall() {
      setInstalled(true);
      setRequest(null);
    }

    observeMode();
    setIsSecure(window.isSecureContext);
    displayMode.addEventListener("change", observeMode);
    window.addEventListener("beforeinstallprompt", offerInstall);
    window.addEventListener("appinstalled", confirmInstall);

    if (process.env.NODE_ENV === "production" && window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      displayMode.removeEventListener("change", observeMode);
      window.removeEventListener("beforeinstallprompt", offerInstall);
      window.removeEventListener("appinstalled", confirmInstall);
    };
  }, []);

  return (
    <InstallContext.Provider value={{ request, installed, isSecure, reset: () => setRequest(null) }}>
      {children}
    </InstallContext.Provider>
  );
}

export function InstallControl({ className }: { className?: string }) {
  const installation = useContext(InstallContext);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function install() {
    const request = installation?.request;
    if (!request) return;

    setBusy(true);
    setMessage("");
    try {
      await request.prompt();
      const { outcome } = await request.userChoice;
      setMessage(outcome === "accepted"
        ? "Tu peux maintenant ouvrir Navier depuis l’icône ajoutée par ton navigateur."
        : "Tu peux relancer l’installation depuis le menu du navigateur.");
    } catch {
      setMessage("L’installation n’a pas pu être lancée ici. Suis les étapes pour ton appareil.");
    } finally {
      installation.reset();
      setBusy(false);
    }
  }

  if (installation?.installed) {
    return <p role="status">Navier est installé sur cet appareil.</p>;
  }

  return (
    <div className={className}>
      {installation?.request || busy ? (
        <button type="button" className="button button-primary" onClick={() => void install()} disabled={busy}>
          <Download size={18} aria-hidden="true" />
          {busy ? "Installation en cours…" : "Installer Navier"}
        </button>
      ) : (
        <p>{installation?.isSecure === false
          ? "L’installation depuis un navigateur nécessite une adresse HTTPS."
          : "Suis les étapes pour ton appareil ou ouvre Navier directement dans ton navigateur."}</p>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
