import { cn } from "@/lib/utils/cn";

/**
 * GlobeLoader — el loader de marca, hoy SIN USO.
 *
 * Monta el loader auto-contenido de `public/globe-loader.html` en un iframe.
 * Los estados de carga de la app van con los skeletons de `skeleton.tsx`, que
 * respetan la silueta de cada pantalla (decisión del 12/06/2026). Este
 * componente se conserva a pedido del dueño para buscarle un lugar (una espera
 * larga, una pantalla de bienvenida); ninguna pantalla lo renderiza.
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
        "overflow-hidden",
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
