import { and, asc, eq, inArray, isNotNull, isNull, lt, notExists, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones } from "@/lib/db/schema/inscripciones";
import { prospectoComunicaciones } from "@/lib/db/schema/prospectos";
import { datosPurgadosDeInscripcion } from "@/lib/domain/privacidad/retencion";

/**
 * Las escrituras de la purga por retención (MIN-16). El plazo lo decide el
 * dominio (`@/lib/domain/privacidad/retencion`) y el barrido lo orquesta el job
 * (`@/lib/jobs/purgar-inscripciones`): acá solo están las cuatro consultas.
 *
 * Todas trabajan por LOTE y con el candado en el WHERE, no en la memoria del
 * job: un UPDATE que exige `datos_purgados_el is null` es lo que hace que dos
 * corridas simultáneas (el cron y alguien corriendo el script a mano) no cuenten
 * dos veces la misma fila ni la vuelvan a escribir.
 *
 * Borrar NO es borrar la fila: se vacían los datos personales y queda el talón
 * (ver `datosPurgadosDeInscripcion`). Un DELETE haría que el embudo de una
 * campaña de marzo mintiera en junio.
 */

/** Clave donde `marcarInvitacionRespondida` sella la respuesta dentro de `meta`. */
const META_RESPONDIDA = "invitacionRespondidaEl";

export type InscripcionPurgable = {
  id: string;
  /**
   * El criterio de clase: una ficha ya volcada a un alumno cae en el plazo
   * corto (90 días), y una que nunca llegó a un alumno, en el largo (730). Es
   * literalmente el motivo escrito en `RETENCION.inscripcion_procesada`, y no el
   * `estado`, porque una `duplicada` sin alumno identificado (el equipo todavía
   * la tiene que resolver a mano) no es un dato que ya viva en otro lado.
   */
  alumnoId: string | null;
  createdAt: Date;
};

/**
 * Las fichas fuera de plazo, las más viejas primero.
 *
 * El corte entra ya calculado (`fechaDeCorte` del dominio), uno por clase: el
 * job hace UN viaje por lote en vez de dos consultas que después habría que
 * intercalar. Cada fila vuelve con lo justo para que `debePurgar` la confirme
 * —el SQL acota, el dominio decide— y con nada personal adentro.
 *
 * ⚠️ `created_at` es la fecha de referencia de las DOS clases. Para la que se
 * procesó sola es exacta (la compuerta resuelve el alta en el mismo request), y
 * para una resuelta a mano meses después es anterior: esa ficha se purga antes
 * de los 90 días de su procesamiento, nunca después. Es el desenlace correcto
 * mientras la tabla no guarde un instante de procesamiento —agregarlo es una
 * migración sobre datos reales— porque sus datos ya están en la ficha del
 * alumno, que es justamente lo que el plazo corto da por hecho.
 *
 * Las fichas BORRADAS a pedido (`borrado_el`) no se excluyen: si el borrado no
 * alcanzó a vaciar los datos, esta purga es la red que lo termina.
 */
export async function listInscripcionesPurgables(opts: {
  corteProcesada: Date;
  corteSinProcesar: Date;
  limite: number;
}): Promise<InscripcionPurgable[]> {
  return db
    .select({
      id: inscripciones.id,
      alumnoId: inscripciones.alumnoId,
      createdAt: inscripciones.createdAt,
    })
    .from(inscripciones)
    .where(
      and(
        isNull(inscripciones.datosPurgadosEl),
        or(
          and(isNotNull(inscripciones.alumnoId), lt(inscripciones.createdAt, opts.corteProcesada)),
          and(isNull(inscripciones.alumnoId), lt(inscripciones.createdAt, opts.corteSinProcesar))
        )
      )
    )
    // Orden total (el id desempata): una tanda de invitaciones se responde
    // junta y comparte `created_at` al milisegundo. Sin desempate, dos lotes
    // consecutivos podrían mirar dos veces la misma fila y saltear otra.
    .orderBy(asc(inscripciones.createdAt), asc(inscripciones.id))
    .limit(opts.limite);
}

/**
 * Vacía los datos personales de esas fichas y sella `datos_purgados_el`.
 * Devuelve los ids que ESTE update cambió, que es lo único que el job puede
 * contar: `datos_purgados_el is null` en el WHERE deja afuera lo que ya estaba
 * purgado, así que correr la purga dos veces suma cero la segunda vez.
 */
export async function purgarDatosInscripciones(
  ids: readonly string[],
  el: Date
): Promise<string[]> {
  if (ids.length === 0) return [];

  const filas = await db
    .update(inscripciones)
    .set({ ...datosPurgadosDeInscripcion(), datosPurgadosEl: el })
    .where(and(inArray(inscripciones.id, [...ids]), isNull(inscripciones.datosPurgadosEl)))
    .returning({ id: inscripciones.id });

  return filas.map((f) => f.id);
}

export type InvitacionPurgable = {
  id: string;
  /** La fecha de referencia de su plazo: se cuenta desde que venció el link. */
  expiraEl: Date;
};

/**
 * Invitaciones vencidas hace rato, nunca usadas y que todavía guardan el hash
 * de su token.
 *
 * "Usada" es lo mismo que evalúa `getInvitacionByTokenHash`, y por partida
 * doble: el sello de `meta` y la ficha que cuelga de la invitación. Acá cuenta
 * CUALQUIER ficha, también una anulada — anular libera el link para volver a
 * cargar, pero el rastro de esa invitación ya vive en una inscripción y se
 * purga con ella (es la regla que escribe `claseDe` en el dominio).
 *
 * Del email del destinatario no se ocupa esta purga: no es un dato que la
 * invitación tenga de propio, es el del prospecto, que tiene su propio ciclo de
 * vida (y su baja). Lo que muere acá es la llave.
 */
export async function listInvitacionesPurgables(opts: {
  corte: Date;
  limite: number;
}): Promise<InvitacionPurgable[]> {
  const fichaDeEstaInvitacion = db
    .select({ existe: sql`1` })
    .from(inscripciones)
    .where(eq(inscripciones.comunicacionId, prospectoComunicaciones.id));

  const filas = await db
    .select({
      id: prospectoComunicaciones.id,
      expiraEl: prospectoComunicaciones.invitacionExpiraEl,
    })
    .from(prospectoComunicaciones)
    .where(
      and(
        // Sin hash no queda nada que limpiar: es el candado de idempotencia.
        isNotNull(prospectoComunicaciones.invitacionTokenHash),
        // Una comunicación sin vencimiento no es una invitación (mismo criterio
        // que `getInvitacionByTokenHash` y que `revocarInvitacion`).
        isNotNull(prospectoComunicaciones.invitacionExpiraEl),
        lt(prospectoComunicaciones.invitacionExpiraEl, opts.corte),
        // El `::text` no es decorativo: `json ->> ?` es ambiguo en Postgres y
        // sin el cast el parámetro suelto falla con "operator is not unique".
        sql`${prospectoComunicaciones.meta} ->> ${META_RESPONDIDA}::text is null`,
        notExists(fichaDeEstaInvitacion)
      )
    )
    .orderBy(
      asc(prospectoComunicaciones.invitacionExpiraEl),
      asc(prospectoComunicaciones.id)
    )
    .limit(opts.limite);

  // El WHERE ya garantiza el vencimiento; el flatMap es lo que se lo cuenta al
  // tipo sin un `!` que mañana mienta.
  return filas.flatMap((f) => (f.expiraEl ? [{ id: f.id, expiraEl: f.expiraEl }] : []));
}

/**
 * Borra el hash del token de esas invitaciones. `is not null` en el WHERE hace
 * lo mismo que el sello de las fichas: el RETURNING trae solo lo que esta
 * corrida limpió de verdad.
 */
export async function limpiarTokensInvitaciones(ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const filas = await db
    .update(prospectoComunicaciones)
    .set({ invitacionTokenHash: null })
    .where(
      and(
        inArray(prospectoComunicaciones.id, [...ids]),
        isNotNull(prospectoComunicaciones.invitacionTokenHash)
      )
    )
    .returning({ id: prospectoComunicaciones.id });

  return filas.map((f) => f.id);
}
