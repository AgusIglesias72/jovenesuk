import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JUK · Portal Interno",
    short_name: "JUK Portal",
    description: "Portal de Gestión Interno de Jóvenes en UK",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0A1F44",
  };
}
