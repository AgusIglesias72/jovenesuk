"use client";

/**
 * Branding panel shown on the left of auth pages.
 * Pure decoration — communicates the JUK identity on the entry surfaces.
 *
 * STUDIO direction: deep-teal brand gradient with warm blurred blobs,
 * peach logo chip, display headline with an accented <em>.
 *
 * El copy es NEUTRO por defecto: por /login entran tanto el equipo como las
 * familias, y para un padre "Portal Interno" leía como "esto no es para vos".
 * Con `?portal=familias` (el link que sale en el mail de acceso) el panel habla
 * en su idioma. Es client component solo por eso: los layouts no reciben
 * searchParams, así que la audiencia se lee de la URL.
 *
 * Fondo opcional: con `CON_FOTO` en true se muestra la foto detrás del gradiente
 * (con un velo de marca encima para que el logo y el texto sigan legibles); en
 * false queda sólo el gradiente. Qué foto es y cómo es el velo se define en los
 * tokens (`--img-login` / `--grad-login-veil` en src/styles/tokens.css).
 */

import { useSearchParams } from "next/navigation";

const CON_FOTO = true;

export type AudienciaAuth = "equipo" | "familias";

const COPY: Record<AudienciaAuth, { kicker: string; bajada: string }> = {
  equipo: {
    kicker: "Portal",
    bajada:
      "Alumnos, viajes y el seguimiento de cada paso — del primer formulario al regreso a casa.",
  },
  familias: {
    kicker: "Portal de Familias",
    bajada:
      "Documentación, cuotas y novedades del viaje — del primer formulario al regreso a casa.",
  },
};

export function JukBrandPanel({ audiencia }: { audiencia?: AudienciaAuth }) {
  const searchParams = useSearchParams();
  const resuelta: AudienciaAuth =
    audiencia ?? (searchParams.get("portal") === "familias" ? "familias" : "equipo");
  const copy = COPY[resuelta];
  const conImagen = CON_FOTO;

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[image:var(--grad-brand)] p-12 text-[var(--c-ink-onbrand)] lg:flex">
      {conImagen && (
        <>
          {/* Foto de fondo */}
          <div
            className="absolute inset-0 bg-[image:var(--img-login)] bg-cover bg-center"
            aria-hidden
          />
          {/* Velo de marca: mantiene la identidad teal y la legibilidad del texto
              sobre la foto (más oscuro abajo, donde va el titular). */}
          <div
            className="absolute inset-0 opacity-90 mix-blend-multiply bg-[image:var(--grad-brand)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[image:var(--grad-login-veil)]"
            aria-hidden
          />
        </>
      )}

      {/* Decorative blobs (más sutiles cuando hay foto) */}
      <div
        className={`absolute -right-16 -top-16 h-64 w-64 rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] blur-2xl ${
          conImagen ? "opacity-20" : "opacity-30"
        }`}
        aria-hidden
      />
      <div
        className={`absolute -bottom-20 -left-10 h-56 w-56 rounded-[var(--r-pill)] bg-[var(--c-brand-500)] blur-2xl ${
          conImagen ? "opacity-20" : "opacity-30"
        }`}
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
            {copy.kicker}
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
          {copy.bajada}
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
