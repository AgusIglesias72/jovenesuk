import { InscripcionSkeleton } from "@/components/ui/skeleton";

/**
 * La página resuelve el token contra la base antes de pintar nada, así que hay
 * un round-trip real que cubrir. `InscripcionSkeleton` espeja la silueta de la
 * pantalla: la cabecera de borde a borde, la ficha con su columna lateral al
 * costado y la franja de cifras abajo.
 *
 * Vive dentro del layout de `/inscripcion` (que no valida pertenencia de nada),
 * así que no aplica la trampa de `familias/loading.tsx`: acá streamear la
 * respuesta no convierte un `notFound()` en un 200.
 */
export default function Loading() {
  return <InscripcionSkeleton />;
}
