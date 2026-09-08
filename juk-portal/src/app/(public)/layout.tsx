import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { Analytics } from "./Analytics";
import { Footer, TopNav } from "./sections";
import { JsonLd, ORGANIZATION_SCHEMA, SITE_NAME, SITE_URL, WEBSITE_SCHEMA } from "./seo";
import "./landing.css";

// Herramienta interna de diseño: chunk aparte que solo se descarga si se
// renderiza (en dev siempre; en prod solo con NEXT_PUBLIC_ENABLE_TWEAK=1).
const DesignTweaker = dynamic(() => import("./DesignTweaker").then((m) => m.DesignTweaker));
const TWEAK_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_TWEAK === "1";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Viajes de estudio e inglés en el exterior`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Viajes de estudio y cursos de inglés en el exterior para adolescentes, adultos y profesionales. Salidas grupales a Londres y Cambridge, programas individuales y Study & Work.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_AR",
    images: [
      {
        url: "/landing/trips/london-westminster.jpg",
        width: 1200,
        height: 800,
        alt: "Westminster y el Big Ben, Londres",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@jovenesenuk",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--c-page)] font-[family-name:var(--font-body)] text-[var(--c-ink)]">
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={WEBSITE_SCHEMA} />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--r-pill)] focus:bg-[var(--c-brand)] focus:px-5 focus:py-2.5 focus:text-[length:var(--t-small)] focus:font-semibold focus:text-[var(--c-ink-onbrand)] focus:shadow-[shadow:var(--shadow-2)]"
      >
        Saltar al contenido
      </a>
      <Analytics />
      <TopNav />
      <main id="contenido">{children}</main>
      <Footer />
      {TWEAK_ENABLED && <DesignTweaker />}
    </div>
  );
}
