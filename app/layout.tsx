import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { InstallPromptProvider } from "@/components/install-control";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Navier — Studio maquillage, routines et listes beauté",
  description: "Essaie un maquillage sur un visage illustré, compose tes routines et retrouve tes produits et tes listes beauté.",
  applicationName: "Navier",
  icons: { icon: "/icons/navier-192.png", apple: "/icons/navier-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Navier" },
};
export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="fr"><body><LocaleProvider><InstallPromptProvider>{children}</InstallPromptProvider></LocaleProvider></body></html>;
}
