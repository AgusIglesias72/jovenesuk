/**
 * Branding panel shown on the left of auth pages.
 * Pure decoration — communicates the JUK identity on the entry surfaces.
 *
 * Uses display serif (Fraunces) for the marketing-ish typography of the
 * brand quote, navy background with gold/coral accents.
 */
export function JukBrandPanel() {
  return (
    <aside className="hidden lg:flex flex-col justify-between p-12 bg-juk-navy-950 text-white relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(230, 181, 77, 0.12) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212, 82, 77, 0.12) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Top: logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-juk-coral-600 rounded-md flex items-center justify-center font-display font-bold text-lg text-white">
          J
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display font-semibold text-lg tracking-tight">
            Jóvenes en UK
          </span>
          <span className="text-[10px] uppercase font-medium mt-0.5 text-juk-gold-500 tracking-[0.12em]">
            Portal Interno
          </span>
        </div>
      </div>

      {/* Middle: quote / tagline */}
      <div className="relative z-10 max-w-md">
        <p className="font-display font-medium leading-tight text-[32px] tracking-[-0.02em] text-white">
          Todo lo que hace que <em className="text-juk-coral-400">el viaje</em> salga bien,
          en un solo lugar.
        </p>
        <p className="mt-6 text-sm leading-relaxed text-juk-navy-400">
          Gestión de alumnos, viajes, trámites y pagos para el equipo operativo de JUK.
        </p>
      </div>

      {/* Bottom: subtle meta */}
      <div className="relative z-10 text-xs text-juk-navy-500">
        © {new Date().getFullYear()} Jóvenes en UK · v0.1
      </div>
    </aside>
  );
}
