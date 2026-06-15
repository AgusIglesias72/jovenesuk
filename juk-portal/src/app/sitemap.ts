import type { MetadataRoute } from "next";

import { NOTAS } from "./(public)/notas/notas-data";
import { SITE_URL } from "./(public)/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/salidas", priority: 0.9 },
    { path: "/programas", priority: 0.9 },
    { path: "/quienes-somos", priority: 0.7 },
    { path: "/contacto", priority: 0.7 },
    { path: "/consulta", priority: 0.8 },
    { path: "/notas", priority: 0.8 },
  ];

  return [
    ...pages.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      changeFrequency: "monthly" as const,
      priority: p.priority,
    })),
    ...NOTAS.map((n) => ({
      url: `${SITE_URL}/notas/${n.slug}`,
      lastModified: n.fecha,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
