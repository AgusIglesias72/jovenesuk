import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones } from "@/lib/db/schema/inscripciones";

/**
 * Anular una ficha: la única decisión del ciclo de vida que NO toma el alta
 * automática sino una persona, desde la bandeja.
 *
 * Vive aparte de `resolucion-inscripcion.ts` a propósito: ese archivo sella lo
 * que hizo el alta (`procesada`, `duplicada`, `requiere_revision`, `error`) y
 * justamente NO pisa una ficha anulada. Acá es al revés: esto es lo que la
 * anula, y con eso libera el candado parcial `uniq_inscripcion_comunicacion`
 * para que esa familia pueda volver a cargar con el mismo link.
 *
 * El UPDATE es condicional (no anulada, no borrada) en vez de leer-y-escribir:
 * dos admins mirando la misma ficha son dos requests, y el segundo tiene que
 * enterarse de que no cambió nada en vez de reescribir el motivo del primero.
 */
export async function anularInscripcion(
  inscripcionId: string,
  motivo: string
): Promise<boolean> {
  const filas = await db
    .update(inscripciones)
    .set({ estado: "anulada", motivo })
    .where(
      and(
        eq(inscripciones.id, inscripcionId),
        ne(inscripciones.estado, "anulada"),
        isNull(inscripciones.borradoEl)
      )
    )
    .returning({ id: inscripciones.id });

  return filas.length > 0;
}
