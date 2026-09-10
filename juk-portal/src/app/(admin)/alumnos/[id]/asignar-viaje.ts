import { formatFecha } from "@/lib/utils/date";

type Cupo = { cupoUsado: number; capacidadMaxima: number };

type ViajeParaEtiqueta = Cupo & { codigo: string; fechaInicio: Date };

/** Mismo umbral que la advertencia de sobre-capacidad de la action (activas >= máximo). */
export function cupoCompleto(v: Cupo): boolean {
  return v.cupoUsado >= v.capacidadMaxima;
}

export function textoCupos(v: Cupo): string {
  return `${v.cupoUsado}/${v.capacidadMaxima} cupos`;
}

/**
 * Label de la opción del select: el código identifica, la fecha de salida
 * desambigua viajes parecidos y el cupo evita elegir uno lleno a ciegas.
 */
export function etiquetaViajeAsignable(v: ViajeParaEtiqueta): string {
  const completo = cupoCompleto(v) ? " · completo" : "";
  return `${v.codigo} · sale ${formatFecha(v.fechaInicio)} · ${textoCupos(v)}${completo}`;
}

export function rangoFechas(v: { fechaInicio: Date; fechaFin: Date }): string {
  return `${formatFecha(v.fechaInicio)} – ${formatFecha(v.fechaFin)}`;
}
