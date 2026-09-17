import { PageHeaderSkeleton, Skeleton } from "@/components/ui";

/**
 * La silueta del detalle: header y dos columnas de tres paneles. Sin este
 * archivo, el `loading.tsx` de la bandeja (StatCards + tabla) se mostraría
 * también acá.
 */

function PanelDetalleSkeleton() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Columna() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <PanelDetalleSkeleton key={i} />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div role="status" aria-label="Cargando…">
      <PageHeaderSkeleton withAction={false} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Columna />
        <Columna />
      </div>
    </div>
  );
}
