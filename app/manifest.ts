import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Navier — Studio et routines beauté", short_name: "Navier",
    description: "Simulation maquillage, routines, listes et catalogue beauté.",
    lang: "fr", start_url: "/", scope: "/", display: "standalone",
    background_color: "#fffdfa", theme_color: "#fffdfa",
    icons: [
      { src: "/icons/navier-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/navier-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/navier-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
