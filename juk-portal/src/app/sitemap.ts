import type { MetadataRoute } from "next";

import { POLITICA_ACTUAL } from "@/lib/domain/privacidad/politica";

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
    // La política se indexa por la URL sin versión (la vigente). `lastModified`
    // sale de la versión publicada: cambia recién cuando cambia el texto. Las
    // URLs de versiones viejas (/privacidad/<AAAA-MM-DD>) quedan fuera a
    // propósito: existen para poder releer un consentimiento, no para el SEO.
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: POLITICA_ACTUAL.vigenteDesde,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    ...NOTAS.map((n) => ({
      url: `${SITE_URL}/notas/${n.slug}`,
      lastModified: n.fecha,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
