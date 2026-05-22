import { cn } from "@/lib/utils/cn";

/**
 * GlobeLoader — el loader oficial de JUK.
 *
 * Monta el loader auto-contenido de `public/globe-loader.html` en un iframe.
 * Usalo SIEMPRE que haya un estado de carga (route `loading.tsx`, Suspense
 * fallback, esperas de página). No crear spinners ad-hoc.
 *
 * @example
 *   // app/(admin)/loading.tsx
 *   export default function Loading() {
 *     return <GlobeLoader />;
 *   }
 */
export function GlobeLoader({
  label = "Cargando…",
  fullScreen = false,
  className,
}: {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        fullScreen ? "fixed inset-0 z-50" : "relative min-h-[70vh] w-full",
        "overflow-hidden bg-[#efece6]",
        className
      )}
    >
      <iframe
        src="/globe-loader.html"
        title={label}
        aria-label={label}
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
