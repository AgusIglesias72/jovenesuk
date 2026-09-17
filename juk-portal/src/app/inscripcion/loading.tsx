import { FormPageSkeleton } from "@/components/ui/skeleton";

/**
 * La página resuelve el token contra la base antes de pintar nada, así que hay
 * un round-trip real que cubrir. `FormPageSkeleton` es la silueta de esta
 * pantalla: encabezado y una card con campos en dos columnas desde `sm`.
 *
 * Vive dentro del layout de `/inscripcion` (que no valida pertenencia de nada),
 * así que no aplica la trampa de `familias/loading.tsx`: acá streamear la
 * respuesta no convierte un `notFound()` en un 200.
 */
export default function Loading() {
  return <FormPageSkeleton fields={12} />;
}
