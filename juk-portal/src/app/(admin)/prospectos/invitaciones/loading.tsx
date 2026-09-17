import { FiltersSkeleton, PageHeaderSkeleton, PanelSkeleton, Skeleton } from "@/components/ui";

/**
 * La silueta real de la pantalla: header, filtro del universo, el panel de la
 * campaña nueva y la tabla de campañas.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-4">
        <FiltersSkeleton />
      </div>
      <PanelSkeleton filas={6} />
      <Skeleton className="mb-3 mt-8 h-6 w-32" />
      <PanelSkeleton />
    </>
  );
}
