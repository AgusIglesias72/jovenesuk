import {
  limpiarTokensInvitaciones,
  listInscripcionesPurgables,
  listInvitacionesPurgables,
  purgarDatosInscripciones,
} from "@/lib/db/queries/retencion";
import { debePurgar, fechaDeCorte } from "@/lib/domain/privacidad/retencion";

/**
 * La purga por retención: lo que vuelve verdad la Política de Privacidad
 * publicada (MIN-16, Ley 25.326). Los plazos ya estaban escritos y testeados en
 * `@/lib/domain/privacidad/retencion`; hasta acá no los ejecutaba nadie.
 *
 * Qué hace, en una línea: vacía los datos personales de las inscripciones fuera
 * de plazo y borra el hash del token de las invitaciones vencidas que nadie usó.
 *
 * Borrar NO es borrar la fila. Queda el talón (id, número, estado, variante,
 * fechas, campaña) para que las métricas no mientan hacia atrás: una inscripción
 * de marzo tiene que seguir contando en el embudo de esa campaña en junio,
 * cuando sus datos personales ya no existan. Qué se vacía exactamente lo decide
 * el dominio (`datosPurgadosDeInscripcion`); acá solo se ejecuta.
 *
 * `ahora` entra SIEMPRE por parámetro: sin `new Date()` adentro, el test se para
 * en el día 89 y en el 91 y el borde se prueba de verdad.
 *
 * Cómo se corre hoy: a mano, `npm run job:purga` (Trigger.dev todavía no está
 * desplegado; ver docs/estado-actual.md §7).
 *
 * El día que Trigger exista, el enganche es una `schedules.task` en
 * `src/trigger/` que solo orquesta, igual que `dailyReminderScan`:
 *
 *   id:   "purga-retencion"
 *   cron: "0 4 * * *" (UTC) — diaria a las 01:00 ART, la hora más muerta del
 *         portal; el plazo se cuenta por día calendario, así que la hora exacta
 *         no mueve qué se purga, solo cuándo se nota.
 *   run:  const { purgarPorRetencion } = await import("@/lib/jobs/purgar-inscripciones");
 *         return purgarPorRetencion(new Date());
 *
 * No hay nada más que preparar: la purga es idempotente y acotada por lote, así
 * que correrla dos veces el mismo día (el cron y alguien a mano) no duplica
 * nada ni deja la corrida colgada.
 */

/**
 * Cuántas filas se miran por vuelta. La purga no puede depender de que la tabla
 * sea chica: con lotes, una tabla de 50.000 fichas son 250 UPDATE acotados y no
 * uno gigante que mantenga la fila bloqueada mientras el portal atiende.
 */
export const LOTE_PURGA = 200;

/**
 * Tope de vueltas por corrida (LOTE_PURGA × MAX_LOTES = 10.000 filas). Es un
 * cinturón, no un plazo: la corrida siguiente retoma exactamente donde esta
 * cortó, porque lo purgado deja de ser candidato. Existe para que una purga a
 * mano tenga un final previsible en vez de barrer una tabla entera sin avisar.
 */
export const MAX_LOTES = 50;

export type ResumenPurga = {
  inscripcionesPurgadas: number;
  invitacionesLimpiadas: number;
};

export type OpcionesPurga = {
  lote?: number;
  maxLotes?: number;
};

export async function purgarPorRetencion(
  ahora: Date,
  opciones: OpcionesPurga = {}
): Promise<ResumenPurga> {
  const lote = opciones.lote ?? LOTE_PURGA;
  const maxLotes = opciones.maxLotes ?? MAX_LOTES;

  // Uno después del otro, no en `Promise.all`: son dos barridos que escriben, y
  // paralelizarlos solo serviría para duplicar los UPDATE en vuelo contra la
  // base mientras el portal atiende. La purga no tiene apuro.
  return {
    inscripcionesPurgadas: await purgarInscripciones(ahora, lote, maxLotes),
    invitacionesLimpiadas: await limpiarInvitaciones(ahora, lote, maxLotes),
  };
}

/**
 * Las fichas fuera de plazo. El SQL acota por la fecha de corte de cada clase y
 * el dominio confirma fila por fila: el borde (el día 90 se conserva, el 91 se
 * purga) se decide en UN solo lugar, `debePurgar`, y no en dos que pueden
 * separarse con el tiempo.
 *
 * El lote siguiente no necesita OFFSET: lo purgado deja de ser candidato, así
 * que la misma consulta ya devuelve lo que falta.
 */
async function purgarInscripciones(ahora: Date, lote: number, maxLotes: number): Promise<number> {
  const corteProcesada = fechaDeCorte("inscripcion_procesada", ahora);
  const corteSinProcesar = fechaDeCorte("inscripcion_sin_procesar", ahora);

  let purgadas = 0;

  for (let vuelta = 0; vuelta < maxLotes; vuelta++) {
    const candidatas = await listInscripcionesPurgables({
      corteProcesada,
      corteSinProcesar,
      limite: lote,
    });
    if (candidatas.length === 0) break;

    const confirmadas = candidatas.filter((ficha) =>
      debePurgar({
        tipo: "inscripcion",
        // Ya volcada a un alumno = plazo corto. Ver `InscripcionPurgable`.
        estado: ficha.alumnoId === null ? "sin_procesar" : "procesada",
        fecha: ficha.createdAt,
        ahora,
      })
    );
    // Si el dominio no confirmó ninguna, esas mismas filas volverían en la
    // próxima vuelta para siempre: la salida es acá, no un lote más.
    if (confirmadas.length === 0) break;

    const hechas = await purgarDatosInscripciones(
      confirmadas.map((f) => f.id),
      ahora
    );
    purgadas += hechas.length;

    // Cero cambios con filas confirmadas = otra corrida se las llevó en el
    // medio. Sin este corte, las dos se quedarían dando vueltas sobre lo mismo.
    if (hechas.length === 0) break;
    if (candidatas.length < lote) break;
  }

  return purgadas;
}

/**
 * Las invitaciones vencidas que nadie usó. Un token que ya no puede abrir nada
 * no tiene por qué seguir guardado, ni siquiera hasheado.
 */
async function limpiarInvitaciones(ahora: Date, lote: number, maxLotes: number): Promise<number> {
  const corte = fechaDeCorte("invitacion_sin_usar", ahora);
  let limpiadas = 0;

  for (let vuelta = 0; vuelta < maxLotes; vuelta++) {
    const candidatas = await listInvitacionesPurgables({ corte, limite: lote });
    if (candidatas.length === 0) break;

    const confirmadas = candidatas.filter((invitacion) =>
      debePurgar({
        tipo: "invitacion",
        // El SELECT ya dejó afuera las usadas (sello en `meta` o ficha colgada).
        estado: "sin_usar",
        fecha: invitacion.expiraEl,
        ahora,
      })
    );
    if (confirmadas.length === 0) break;

    const hechas = await limpiarTokensInvitaciones(confirmadas.map((i) => i.id));
    limpiadas += hechas.length;

    if (hechas.length === 0) break;
    if (candidatas.length < lote) break;
  }

  return limpiadas;
}
