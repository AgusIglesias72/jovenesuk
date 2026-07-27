/**
 * Pipeline del CRM de prospectos — puro, sin dependencias.
 * El orden del array define las columnas del kanban de izquierda a derecha.
 */

export const PROSPECTO_ESTADOS = [
  "nuevo",
  "contactado",
  "interesado",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
] as const;

export type ProspectoEstado = (typeof PROSPECTO_ESTADOS)[number];

export const ESTADOS_TERMINALES = ["ganado", "perdido"] as const satisfies readonly ProspectoEstado[];

export type EstadoTerminal = (typeof ESTADOS_TERMINALES)[number];

export function esGanado(estado: ProspectoEstado): boolean {
  return estado === "ganado";
}

export function esPerdido(estado: ProspectoEstado): boolean {
  return estado === "perdido";
}

export function esTerminal(estado: ProspectoEstado): estado is EstadoTerminal {
  return (ESTADOS_TERMINALES as readonly ProspectoEstado[]).includes(estado);
}

/**
 * En el kanban toda transición manual está permitida salvo hacia el mismo
 * estado (mover una tarjeta a su propia columna no es un cambio de estado).
 */
export function transicionesEstado(desde: ProspectoEstado): ProspectoEstado[] {
  return PROSPECTO_ESTADOS.filter((e) => e !== desde);
}

export function puedeTransicionar(desde: ProspectoEstado, hacia: ProspectoEstado): boolean {
  return desde !== hacia;
}
