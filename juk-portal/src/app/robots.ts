import type { MetadataRoute } from "next";

import { ROBOTS_DISALLOW } from "@/lib/routes";

import { SITE_URL } from "./(public)/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
