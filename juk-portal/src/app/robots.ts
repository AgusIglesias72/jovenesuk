import type { MetadataRoute } from "next";

import { SITE_URL } from "./(public)/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/alumnos",
          "/viajes",
          "/colegios",
          "/group-leaders",
          "/usuarios",
          "/pagos",
          "/configuracion",
          "/familias",
          "/login",
          "/reset-password",
          "/api/",
          "/design",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
