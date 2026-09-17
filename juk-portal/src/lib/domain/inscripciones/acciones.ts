import type { InscripcionEstado } from "./schema";

/**
 * Qué puede hacer el equipo con una ficha desde la bandeja.
 *
 * Vive en el dominio porque la misma regla la necesitan los dos lados y no
 * pueden discrepar: la server action (que no puede confiar en qué botón se
 * apretó) y el panel del detalle (que no puede ofrecer un botón que la action va
 * a rechazar).
 *
 * La regla que importa es la de `requiere_revision` CON alumno. Ahí el alta ya
 * corrió y creó al alumno; volver a correrla caería en `duplicado` por el unique
 * de `alumnos.dni` y sellaría la ficha como `duplicada`, borrando el motivo real
 * —que se colgó (o se iba a colgar) de una cuenta de familia que ya existía—.
 * Lo único que queda por decidir ahí es humano: confirmar esa cuenta.
 */

export const ACCIONES_INSCRIPCION = [
  "procesar",
  "reintentar",
  "confirmar_vinculo",
  "anular",
] as const;

export type AccionInscripcion = (typeof ACCIONES_INSCRIPCION)[number];

/** Lo único de la ficha que define qué se puede hacer con ella. */
export type FichaAccionable = {
  estado: InscripcionEstado;
  /** El alumno que esta ficha creó (o el que ya tenía ese DNI). */
  alumnoId: string | null;
};

export function accionesDeInscripcion(ficha: FichaAccionable): AccionInscripcion[] {
  switch (ficha.estado) {
    case "recibida":
      return ["procesar", "anular"];

    case "requiere_revision":
      return ficha.alumnoId === null
        ? ["procesar", "anular"]
        : ["confirmar_vinculo", "anular"];

    case "error":
      return ["reintentar", "anular"];

    // El DNI ya estaba cargado: no hay alta que correr. Anularla solo descarta
    // la ficha (y libera la invitación); al alumno existente no lo toca nadie.
    case "duplicada":
      return ["anular"];

    // Cerradas. `procesada` no se anula: anular no borraría al alumno que la
    // ficha creó, solo escondería de dónde salió.
    case "procesada":
    case "anulada":
      return [];
  }
}

export function permiteAccion(ficha: FichaAccionable, accion: AccionInscripcion): boolean {
  return accionesDeInscripcion(ficha).includes(accion);
}

/**
 * La ficha ya llegó a un desenlace del alta: un segundo clic, un reintento
 * tardío o un doble envío no tienen nada que hacer sobre ella. No es un error
 * —es el no-op que hace idempotente a la bandeja—.
 */
export function estaResuelta(ficha: FichaAccionable): boolean {
  return ficha.estado === "procesada" || ficha.estado === "duplicada";
}

/**
 * El vínculo con una cuenta de familia que ya existía es la operación sensible
 * de todo el flujo: es exactamente lo que una carga anónima no puede conseguir
 * sola. Cuando esto es true, la pantalla tiene que decirlo antes de que alguien
 * apriete un botón.
 */
export function tieneVinculoPendiente(ficha: FichaAccionable): boolean {
  return ficha.estado === "requiere_revision" && ficha.alumnoId !== null;
}
