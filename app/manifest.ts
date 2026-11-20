import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Navier — Ton espace beauté", short_name: "Navier",
    description: "Vanity, routines beauté et palette personnelle.",
    lang: "fr", start_url: "/", scope: "/", display: "standalone",
    background_color: "#f7f5ef", theme_color: "#f7f5ef",
    icons: [
      { src: "/icons/navier-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/navier-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/navier-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
