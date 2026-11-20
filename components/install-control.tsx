"use client";

import { Download } from "lucide-react";
import { useLocale } from "@/lib/i18n";
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
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | "accepted" | "dismissed" | "failed">(null);

  async function install() {
    const request = installation?.request;
    if (!request) return;

    setBusy(true);
    setMessage(null);
    try {
      await request.prompt();
      const { outcome } = await request.userChoice;
      setMessage(outcome);
    } catch {
      setMessage("failed");
    } finally {
      installation.reset();
      setBusy(false);
    }
  }

  if (installation?.installed) {
    return <p role="status">{t("Navier est installé sur cet appareil.", "Navier is installed on this device.")}</p>;
  }

  return (
    <div className={className}>
      {installation?.request || busy ? (
        <button type="button" className="button button-primary" onClick={() => void install()} disabled={busy}>
          <Download size={18} aria-hidden="true" />
          {busy ? t("Installation en cours…", "Installing…") : t("Installer Navier", "Install Navier")}
        </button>
      ) : (
        <p>{installation?.isSecure === false
          ? t("L’installation depuis un navigateur nécessite une adresse HTTPS.", "Installing from a browser requires an HTTPS address.")
          : t("Suis les étapes pour ton appareil ou ouvre Navier directement dans ton navigateur.", "Follow the steps for your device or open Navier directly in your browser.")}</p>
      )}
      <p role="status">{message === "accepted"
        ? t("Tu peux maintenant ouvrir Navier depuis l’icône ajoutée par ton navigateur.", "You can now open Navier from the icon added by your browser.")
        : message === "dismissed"
          ? t("Tu peux relancer l’installation depuis le menu du navigateur.", "You can restart installation from the browser menu.")
          : message === "failed"
            ? t("L’installation n’a pas pu être lancée ici. Suis les étapes pour ton appareil.", "Installation couldn’t start here. Follow the steps for your device.")
            : ""}</p>
    </div>
  );
}
