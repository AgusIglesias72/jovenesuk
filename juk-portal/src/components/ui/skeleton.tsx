import { cn } from "@/lib/utils/cn";

/**
 * Skeletons — placeholders de carga del design system.
 *
 * Para páginas con datos, preferimos skeletons que respetan la silueta de la
 * pantalla (el GlobeLoader queda como fallback global / esperas largas).
 * Cada route segment usa la variante que matchea su layout en `loading.tsx`.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[var(--r-md)] bg-[var(--c-surface-2)]", className)}
    />
  );
}

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {withAction && <Skeleton className="h-10 w-32 rounded-[var(--r-pill)]" />}
    </div>
  );
}

export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton />
      <div className="mb-4 flex flex-wrap gap-3">
        <Skeleton className="h-11 w-72 rounded-[var(--r-pill)]" />
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-11 w-44" />
      </div>
      <CardShell className="p-0">
        <div className="border-b border-[var(--c-border)] px-5 py-3">
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="divide-y divide-[var(--c-border)]">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-5 py-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden h-4 w-32 sm:block" />
              <Skeleton className="ml-auto h-7 w-16 rounded-[var(--r-pill)]" />
            </div>
          ))}
        </div>
      </CardShell>
    </div>
  );
}

export function FormPageSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton withAction={false} />
      <CardShell>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Skeleton className="h-10 w-28 rounded-[var(--r-pill)]" />
          <Skeleton className="h-10 w-36 rounded-[var(--r-pill)]" />
        </div>
      </CardShell>
    </div>
  );
}

/** /configuracion: header con acción, dos cards de formulario y dos cards de panel. */
export function ConfigSkeleton() {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, card) => (
            <CardShell key={card}>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-full max-w-sm" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <Skeleton className="h-10 w-32 rounded-[var(--r-pill)]" />
              </div>
            </CardShell>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, card) => (
            <CardShell key={card}>
              <Skeleton className="h-6 w-52" />
              <Skeleton className="mt-2 h-4 w-full max-w-sm" />
              <div className="mt-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardShell>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FichaAlumnoSkeleton() {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton />
      <CardShell>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </CardShell>
      <div className="mt-8 flex items-center gap-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-24 rounded-[var(--r-pill)]" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-20 rounded-[var(--r-pill)]" />
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export function ViajeDetalleSkeleton() {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton />
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-40 rounded-[var(--r-pill)]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CardShell>
          <Skeleton className="h-5 w-44" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardShell>
        <CardShell>
          <Skeleton className="h-5 w-44" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

/* ============================================================
   Portal de Familias
   ------------------------------------------------------------
   El shell (sidebar/header + tabs) NO lleva skeleton propio: un `loading.tsx`
   en `familias/` convertiría el `notFound()` de pertenencia en un 200 (ver el
   comentario de `familias/[dni]/layout.tsx`). Cada sección pinta su silueta.
   ============================================================ */

function FamiliaHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

/** Card de encabezado de viaje (nombre + código + fechas). */
function ViajeHeaderSkeleton() {
  return (
    <CardShell className="p-4">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="mt-2 h-3.5 w-40" />
      <Skeleton className="mt-3 h-3.5 w-48" />
    </CardShell>
  );
}

/** /familias/[dni]: header + viaje + 2 cards de acceso + pills. */
export function FamiliaResumenSkeleton() {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <FamiliaHeaderSkeleton />
      <div className="space-y-4">
        <ViajeHeaderSkeleton />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardShell key={i} className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
              <Skeleton className="mt-3 h-2 w-full rounded-[var(--r-pill)]" />
            </CardShell>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-[var(--tap)] w-52 rounded-[var(--r-pill)]" />
          <Skeleton className="h-[var(--tap)] w-32 rounded-[var(--r-pill)]" />
        </div>
      </div>
    </div>
  );
}

/** /familias/[dni]/documentacion: header + progreso + tarjetas de paso. */
export function FamiliaDocumentacionSkeleton({ pasos = 5 }: { pasos?: number }) {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <FamiliaHeaderSkeleton />
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-[var(--r-pill)]" />
        {Array.from({ length: pasos }).map((_, i) => (
          <CardShell key={i} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-6 w-20 rounded-[var(--r-pill)]" />
            </div>
            <Skeleton className="mt-3 h-3.5 w-full max-w-sm" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/** /familias/[dni]/pagos: header + resumen del plan + filtros + cuotas. */
export function FamiliaPagosSkeleton({ cuotas = 6 }: { cuotas?: number }) {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <FamiliaHeaderSkeleton />
      <div className="space-y-4">
        <CardShell className="p-4">
          <Skeleton className="h-5 w-56" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-2 w-full rounded-[var(--r-pill)]" />
        </CardShell>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-[var(--r-pill)]" />
          ))}
        </div>
        <CardShell className="p-0">
          <div className="divide-y divide-[var(--c-border)]">
            {Array.from({ length: cuotas }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-6 w-20 rounded-[var(--r-pill)]" />
              </div>
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

/** /familias/[dni]/viaje: header + viaje + ficha de 6 datos + itinerario. */
export function FamiliaViajeSkeleton() {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <FamiliaHeaderSkeleton />
      <div className="space-y-4">
        <ViajeHeaderSkeleton />
        <CardShell>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </CardShell>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface)] p-6">
            <Skeleton className="mx-auto h-4 w-36" />
            <Skeleton className="mx-auto mt-3 h-3.5 w-full max-w-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** /familias/[dni]/datos: header + dos bloques de datos + caja de reporte. */
export function FamiliaDatosSkeleton() {
  return (
    <div role="status" aria-label="Cargando…" className="space-y-6">
      <FamiliaHeaderSkeleton />
      {[8, 4].map((campos, bloque) => (
        <section key={bloque} className="space-y-3">
          <Skeleton className="h-5 w-44" />
          <CardShell>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {Array.from({ length: campos }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardShell>
        </section>
      ))}
      <CardShell className="p-4">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-3 h-10 w-40 rounded-[var(--r-pill)]" />
      </CardShell>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton withAction={false} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardShell key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-16" />
          </CardShell>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CardShell>
          <Skeleton className="h-5 w-48" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardShell>
        <CardShell>
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}
