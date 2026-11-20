import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navier — Ton espace beauté",
  description: "Organise ton vanity, compose tes routines et retrouve les teintes que tu aimes.",
  applicationName: "Navier",
  icons: { icon: "/icons/navier-192.png", apple: "/icons/navier-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Navier" },
};
export const viewport: Viewport = { themeColor: "#faf8fc" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
