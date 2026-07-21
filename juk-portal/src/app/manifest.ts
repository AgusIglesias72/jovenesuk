import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Jóvenes en UK",
    short_name: "Jóvenes en UK",
    description:
      "Viajes de estudio y cursos de inglés en el exterior. Salidas grupales, individuales y para colegios.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-AR",
    dir: "ltr",
    categories: ["business", "productivity"],
    background_color: "#fbf7f2",
    theme_color: "#1f6f63",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
