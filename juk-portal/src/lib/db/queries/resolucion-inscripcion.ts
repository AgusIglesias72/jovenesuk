import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones } from "@/lib/db/schema/inscripciones";
import type { InscripcionEstado } from "@/lib/domain/inscripciones/schema";

/**
 * Cierre de la ficha: qué pasó con el alta automática.
 *
 * Es la única escritura del ciclo de vida de una inscripción fuera de su
 * creación, y la usa una sola función: `procesarAltaInscripcion`
 * (`@/lib/actions/alta-inscripcion.ts`), que es donde vive la política. Vive
 * en su propio archivo y no en `inscripciones-publicas.ts` porque esto NO es
 * del formulario público: lo dispara también la bandeja del back-office.
 */

/**
 * Los cuatro desenlaces que puede escribir el alta. `recibida` y `anulada`
 * quedan fuera a propósito: la primera es el estado del que se sale, la segunda
 * la decide una persona desde la bandeja.
 */
export type ResolucionInscripcion = {
  estado: Extract<InscripcionEstado, "procesada" | "duplicada" | "requiere_revision" | "error">;
  /** En español y accionable: es lo que lee el equipo en la bandeja. */
  motivo: string | null;
  /** El alumno creado o el que ya tenía ese DNI; null si no hubo. */
  alumnoId: string | null;
};

/**
 * Sella el resultado del alta sobre la ficha. Devuelve si la encontró.
 *
 * No pisa una ficha `anulada`: anular es la única decisión que libera la
 * invitación, y un alta que llegue tarde (un reintento, un job) no puede
 * revivir una ficha que el equipo ya descartó.
 */
export async function registrarResolucionAlta(
  inscripcionId: string,
  resolucion: ResolucionInscripcion
): Promise<boolean> {
  const filas = await db
    .update(inscripciones)
    .set({
      estado: resolucion.estado,
      motivo: resolucion.motivo,
      alumnoId: resolucion.alumnoId,
    })
    .where(and(eq(inscripciones.id, inscripcionId), ne(inscripciones.estado, "anulada")))
    .returning({ id: inscripciones.id });

  return filas.length > 0;
}
