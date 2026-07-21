import { LinkButton } from "@/components/ui";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--c-page)] bg-[image:var(--grad-page)] px-6 text-center">
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] opacity-20 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-[var(--r-pill)] bg-[var(--c-brand-300)] opacity-20 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <p
          className="font-display text-[64px] font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-brand-300)]"
          aria-hidden
        >
          Jóvenes en UK
        </p>
        <h1 className="mt-3 font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Estás sin conexión
        </h1>
        <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          No pudimos cargar esta página porque no hay internet. Revisá tu
          conexión y volvé a intentar; el resto sigue disponible cuando
          vuelvas a estar en línea.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/">Volver al inicio</LinkButton>
        </div>
      </div>
    </div>
  );
}
