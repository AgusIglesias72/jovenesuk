import type { Metadata } from "next";

import { EMAIL, MAIL_URL, PHONE_DISPLAY, SOCIALS, WHATSAPP_URL } from "../contact";
import { LeadForm } from "../LeadForm";
import {
  Acreditaciones,
  Cta,
  Kicker,
  PageHeader,
  WhatsAppIcon,
} from "../sections";
import { JsonLd, breadcrumbSchema, langAlternates } from "../seo";

export const metadata: Metadata = {
  title: "Contacto: armá tu viaje de estudio",
  description:
    "Escribinos por WhatsApp al +54 9 11 3378-3515 o por mail a info@jovenesenuk.com y armamos una propuesta personalizada para tu viaje de estudio en el exterior.",
  alternates: langAlternates("/contacto"),
};

export default function ContactoPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Contacto", path: "/contacto" }])} />
      <PageHeader
        kicker="Contacto"
        title="Hablemos de tu próximo viaje"
        sub="Contanos qué querés lograr con tu inglés y te armamos una propuesta personalizada: destino, curso, alojamiento y fechas a tu medida."
      />

      <section className="px-4 pt-16 sm:px-6 lg:px-10 lg:pt-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Dejanos tus datos
          </h2>
          <p className="mb-6 mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Completá el formulario y te contactamos con una propuesta a tu medida.
          </p>
          <LeadForm />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <p className="mx-auto mb-8 max-w-6xl font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-ink-subtle)]">
          O escribinos directo
        </p>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 shadow-[shadow:var(--shadow-soft)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-success-bg)] text-[var(--c-success)]">
              {WhatsAppIcon}
            </span>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
              WhatsApp
            </h2>
            <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              La vía más rápida. Escribinos y te respondemos a la brevedad.
            </p>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
              {PHONE_DISPLAY}
            </p>
            <div className="mt-6">
              <Cta href={WHATSAPP_URL} variant="accent" className="w-full">
                Abrir WhatsApp
              </Cta>
            </div>
          </div>

          <div className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 shadow-[shadow:var(--shadow-soft)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-info-bg)] text-[var(--c-info)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
              Email
            </h2>
            <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Para consultas detalladas, propuestas para instituciones o documentación.
            </p>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
              {EMAIL}
            </p>
            <div className="mt-6">
              <Cta href={MAIL_URL} variant="brand" className="w-full">
                Escribir un mail
              </Cta>
            </div>
          </div>

          <div className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 shadow-[shadow:var(--shadow-soft)] md:col-span-2 lg:col-span-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-accent-soft)] text-[var(--c-accent-600)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
              Redes
            </h2>
            <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Seguinos para ver las salidas en vivo, fechas y novedades. Estamos en
              Buenos Aires, Argentina.
            </p>
            <ul className="mt-4 space-y-2.5">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-baseline gap-2 text-[length:var(--t-small)]"
                  >
                    <span className="font-bold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                      {s.label}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                      {s.handle}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl rounded-[var(--r-xl)] bg-[var(--c-surface-2)] px-8 py-7">
          <Kicker>Antes de viajar</Kicker>
          <p className="mt-2 max-w-2xl text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Toda consulta arranca igual: evaluamos tu nivel de inglés sin costo, te
            asesoramos sobre destino, curso y alojamiento, y coordinamos reuniones
            informativas para que vos y tu familia viajen con todo claro.
          </p>
        </div>
      </section>

      <Acreditaciones />
    </>
  );
}
