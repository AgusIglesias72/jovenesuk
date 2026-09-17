import { PagosPageSkeleton } from "@/components/ui";

/**
 * Misma silueta que la bandeja: header sin acción, tira de StatCards, filtros y
 * tabla. `PagosPageSkeleton` es exactamente esa forma (header + 4 cards +
 * filtros + filas), así que se reusa en vez de clonar otro skeleton.
 */
export default function Loading() {
  return <PagosPageSkeleton />;
}
