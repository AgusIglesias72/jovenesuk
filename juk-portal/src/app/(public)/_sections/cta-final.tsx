import { Cta, WhatsAppIcon } from "../_components/primitives";
import { EMAIL, MAIL_URL, PHONE_DISPLAY, WHATSAPP_URL } from "../contact";

export function CtaFinal() {
  return (
    <section id="contacto" className="scroll-mt-20 px-4 pb-24 pt-16 sm:px-6 lg:px-10 lg:pt-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--r-xl)] bg-[image:var(--grad-warm)] px-6 py-16 text-center shadow-[shadow:var(--shadow-accent)] sm:px-12 lg:py-20">
        <div className="absolute inset-0 bg-[image:radial-gradient(600px_300px_at_15%_-20%,rgba(255,255,255,0.35),transparent_60%)]" aria-hidden />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onaccent)]">
            ¡Empezá a alcanzar tus metas!
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onaccent)]/85">
            Contanos qué querés lograr con tu inglés y te armamos una propuesta
            personalizada: destino, curso, alojamiento y fechas a tu medida.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Cta href={WHATSAPP_URL} variant="inverse">
              {WhatsAppIcon}
              Escribinos por WhatsApp
            </Cta>
            <a
              href={MAIL_URL}
              className="inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] border-2 border-[var(--c-ink-onaccent)]/30 px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onaccent)] transition-colors hover:border-[var(--c-ink-onaccent)]/60"
            >
              {EMAIL}
            </a>
          </div>
          <p className="mt-6 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] tracking-[0.08em] text-[var(--c-ink-onaccent)]/75">
            {PHONE_DISPLAY} · Buenos Aires, Argentina
          </p>
        </div>
      </div>
    </section>
  );
}
