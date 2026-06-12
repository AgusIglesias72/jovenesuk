/**
 * Branding panel shown on the left of auth pages.
 * Pure decoration — communicates the JUK identity on the entry surfaces.
 *
 * STUDIO direction: deep-teal brand gradient with warm blurred blobs,
 * peach logo chip, display headline with an accented <em>.
 */
export function JukBrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[image:var(--grad-brand)] p-12 text-[var(--c-ink-onbrand)] lg:flex">
      {/* Decorative blobs */}
      <div
        className="absolute -right-16 -top-16 h-64 w-64 rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] opacity-30 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-20 -left-10 h-56 w-56 rounded-[var(--r-pill)] bg-[var(--c-brand-500)] opacity-30 blur-2xl"
        aria-hidden
      />

      {/* Top: logo */}
      <div className="relative flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
          aria-hidden
        >
          <span className="font-display text-2xl font-extrabold">J</span>
        </span>
        <div className="leading-tight">
          <p className="font-display font-bold">Jóvenes en UK</p>
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)]">
            Portal Interno
          </p>
        </div>
      </div>

      {/* Middle: quote / tagline */}
      <div className="relative max-w-md">
        <p className="font-display text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
          Todo lo que hace que{" "}
          <em className="not-italic text-[var(--c-accent-300)]">el viaje</em>{" "}
          salga bien, en un solo lugar.
        </p>
        <p className="mt-4 max-w-sm leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]">
          Alumnos, viajes, group leaders y el seguimiento de cada paso — del
          primer formulario al regreso a casa.
        </p>
      </div>

      {/* Bottom: dots + meta */}
      <div className="relative flex items-center gap-2">
        <span className="h-2 w-8 rounded-[var(--r-pill)] bg-[var(--c-accent)]" aria-hidden />
        <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" aria-hidden />
        <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" aria-hidden />
        <span className="ml-auto text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)]">
          © {new Date().getFullYear()} Jóvenes en UK
        </span>
      </div>
    </aside>
  );
}
