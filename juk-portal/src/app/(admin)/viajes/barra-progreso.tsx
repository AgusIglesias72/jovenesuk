import type { OcupacionViaje } from "@/lib/domain/viajes";
import { cn } from "@/lib/utils/cn";

/**
 * Barra de progreso del listado y del detalle de viaje.
 *
 * WHY `<progress>` nativo y no un div con `width`: el ancho es dinámico y la
 * app no admite estilos inline; el elemento nativo trae además el rol y el
 * valor accesibles. Los pseudo-elementos pintan el relleno con los gradientes
 * del design system (brand = avance, warm = hacia el mínimo).
 */
const TONOS = {
  brand:
    "[&::-webkit-progress-value]:bg-[image:var(--grad-brand)] [&::-moz-progress-bar]:bg-[image:var(--grad-brand)]",
  warm: "[&::-webkit-progress-value]:bg-[image:var(--grad-warm)] [&::-moz-progress-bar]:bg-[image:var(--grad-warm)]",
  alerta:
    "[&::-webkit-progress-value]:bg-[var(--c-berry)] [&::-moz-progress-bar]:bg-[var(--c-berry)]",
} as const;

export type TonoBarra = keyof typeof TONOS;

/** Sobre-cupo en baya (advertencia del US-11); bajo el mínimo en warm; si no, brand. */
export function tonoOcupacion(o: OcupacionViaje): TonoBarra {
  if (o.sobreCupo > 0) return "alerta";
  if (o.faltanParaMinimo > 0) return "warm";
  return "brand";
}

export function BarraProgreso({
  pct,
  label,
  tono = "brand",
  className,
}: {
  pct: number;
  label: string;
  tono?: TonoBarra;
  className?: string;
}) {
  return (
    <progress
      value={Math.min(100, Math.max(0, pct))}
      max={100}
      aria-label={label}
      className={cn(
        "block h-2 w-full appearance-none overflow-hidden rounded-[var(--r-pill)] border-0 bg-[var(--c-surface-2)]",
        "[&::-webkit-progress-bar]:bg-[var(--c-surface-2)] [&::-webkit-progress-value]:rounded-[var(--r-pill)] [&::-moz-progress-bar]:rounded-[var(--r-pill)]",
        TONOS[tono],
        className
      )}
    />
  );
}
