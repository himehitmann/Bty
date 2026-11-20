import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { InstallPromptProvider } from "@/components/install-control";

export const metadata: Metadata = {
  title: "Navier — Ton espace beauté",
  description: "Organise ton vanity, compose tes routines et retrouve les teintes que tu aimes.",
  applicationName: "Navier",
  icons: { icon: "/icons/navier-192.png", apple: "/icons/navier-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Navier" },
};
export const viewport: Viewport = { themeColor: "#f7f5ef" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="fr"><body><InstallPromptProvider>{children}</InstallPromptProvider></body></html>;
}
