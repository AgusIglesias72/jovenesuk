import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jóvenes en UK",
    short_name: "Jóvenes en UK",
    description:
      "Viajes de estudio y cursos de inglés en el exterior. Salidas grupales, individuales y para colegios.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f2",
    theme_color: "#1f6f63",
  };
}
