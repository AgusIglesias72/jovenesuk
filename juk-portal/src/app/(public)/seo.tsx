/*
 * SEO/GEO del sitio público: URL canónica, JSON-LD (schema.org) y helpers.
 * El dominio se puede pisar con NEXT_PUBLIC_SITE_URL en cada entorno.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.jovenesenuk.com";
export const SITE_NAME = "Jóvenes en UK";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["TravelAgency", "EducationalOrganization"],
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/landing/logo-juk.png`,
  description:
    "Agencia argentina de viajes de estudio y programas de idiomas en el exterior. Educational Tour Operator con más de 10 años de trayectoria y más de 1.000 estudiantes.",
  email: "info@jovenesenuk.com",
  telephone: "+54-9-11-3378-3515",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Buenos Aires",
    addressCountry: "AR",
    // TODO: completar streetAddress, postalCode y geo (datos desconocidos por ahora).
  },
  areaServed: { "@type": "Country", name: "Argentina" },
  knowsLanguage: ["es", "en"],
  sameAs: [
    "https://www.instagram.com/jovenesenuk",
    "https://www.facebook.com/jovenesenuk",
    "https://www.tiktok.com/@jovenesenuk",
    "https://x.com/jovenesenuk",
  ],
} as const;

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "es-AR",
  publisher: { "@id": `${SITE_URL}/#organization` },
} as const;

/**
 * Alternates de metadata con canonical + hreflang. El sitio es monolingüe
 * (es-AR, apuntado a Argentina): cada página se referencia a sí misma en
 * es-AR y como x-default.
 */
export function langAlternates(path: string) {
  return {
    canonical: path,
    languages: { "es-AR": path, "x-default": path },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      ...items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: it.name,
        item: `${SITE_URL}${it.path}`,
      })),
    ],
  };
}

export type CourseInput = {
  name: string;
  description: string;
};

export function courseListSchema(courses: ReadonlyArray<CourseInput>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.map((course, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: course.name,
        description: course.description,
        provider: { "@id": `${SITE_URL}/#organization` },
      },
    })),
  };
}

export function serviceSchema(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Argentina" },
  };
}
