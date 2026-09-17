import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones } from "@/lib/db/schema/inscripciones";
import {
  prospectoComunicaciones,
  prospectos,
  type ProspectoComunicacion,
} from "@/lib/db/schema/prospectos";
import { viajes } from "@/lib/db/schema/viajes";
import { LOTE_TAMANIO, RESERVA_VENCIDA_MS } from "@/lib/domain/inscripciones/invitacion";
import { VARIANTES, type Variante } from "@/lib/domain/inscripciones/schema";
import type { ProspectoEstado } from "@/lib/domain/prospectos";
import { paginarEnSql, totalDe, type Pagina, type Paginado } from "@/lib/utils/paginate";
import { generarTokenOpaco, hashToken } from "@/lib/utils/token-opaco";

import { META_FORM_ABIERTO } from "./inscripciones-publicas";

/**
 * El envío MASIVO de invitaciones al Application Form.
 *
 * Una invitación no tiene tabla propia: es una fila de `prospecto_comunicaciones`
 * con sus columnas `invitacion_*` (ver el comentario de la tabla). Lo que agrega
 * este archivo es el ciclo de vida del ENVÍO, que es lo único que no se puede
 * resolver en memoria: reservar una tanda, mandarla, sellar el resultado y poder
 * retomar el lote desde otra pestaña sin repetir un solo mail.
 *
 * Trigger.dev no está desplegado: quien empuja el lote es el navegador del
 * admin, llamando a la action tanda tras tanda. Eso obliga a que TODO el estado
 * del avance viva en la base — un `Map` en memoria del server se pierde en
 * cuanto la pestaña se cierra o la lambda se recicla.
 *
 * Lo que lee el formulario público (resolver un link a su campaña) está en
 * `inscripciones-publicas.ts`, aparte a propósito: eso corre sin sesión.
 */

type EstadoComunicacion = NonNullable<ProspectoComunicacion["estado"]>;

/**
 * El mail ya salió. Son estados que puede seguir moviendo el webhook de Resend
 * (entregado → abierto → click), así que el envío nunca los pisa hacia atrás.
 */
const ESTADOS_ENVIADA: EstadoComunicacion[] = ["enviado", "entregado", "abierto", "click"];

/**
 * Los escalones que SOLO mueve el webhook de Resend. Son acumulativos: un
 * `click` implica que el mail se entregó y se abrió, así que cada escalón
 * incluye a los de más abajo y el embudo nunca se ensancha hacia el final.
 *
 * ⚠️ Son un PISO, no una medición exacta, por dos motivos que no se arreglan
 * acá: sin `RESEND_WEBHOOK_SECRET` configurado nadie los mueve y quedan en cero
 * (la pantalla los muestra como "no disponible", nunca como 0), y como
 * `actualizarEstadoComunicacion` escribe el último evento que llega, un
 * `opened` que llega DESPUÉS de un `clicked` deja la fila en `abierto` y pierde
 * el clic. Para lo que se usa —comparar campañas entre sí— alcanza.
 */
const ESTADOS_ENTREGADA: EstadoComunicacion[] = ["entregado", "abierto", "click"];
const ESTADOS_ABIERTA: EstadoComunicacion[] = ["abierto", "click"];

/** El mail no llegó: falló el request a Resend o el webhook devolvió rebote/spam. */
const ESTADOS_FALLIDA: EstadoComunicacion[] = ["fallido", "rebotado", "spam"];

/**
 * Los únicos estados desde los que el envío puede sellar un resultado.
 * `pendiente` entra porque una reserva vencida vuelve a pendiente mientras el
 * mail ya estaba en vuelo: sellarlo igual es lo que evita el mail duplicado.
 */
const ESTADOS_SELLABLES: EstadoComunicacion[] = ["enviando", "pendiente"];

/** Claves del sello de error dentro de `meta` (la bitácora no tiene columna propia). */
const META_ERROR_ENVIO = "invitacionErrorEnvio";
const META_FALLIDA_EL = "invitacionFallidaEl";

/** El motivo es para que una persona entienda qué pasó, no para guardar un stack. */
const MAX_MOTIVO = 300;

// ---------------------------------------------------------------------------
// Destinatarios
// ---------------------------------------------------------------------------

/**
 * A quién se le manda. `ids` es la selección explícita del tablero y gana sobre
 * el resto: el equipo tilda prospectos y manda, sin depender de que el filtro
 * de la pantalla signifique lo mismo dos minutos después.
 */
export type FiltrosDestinatarios = {
  q?: string;
  estado?: ProspectoEstado;
  responsableId?: string;
  ids?: string[];
};

export type DestinatarioInvitacion = {
  prospectoId: string;
  prospectoNombre: string;
  email: string;
};

/**
 * Por qué un prospecto del filtro NO va a recibir el mail. Existe para que el
 * equipo pueda contestar "¿por qué no me llegó?" sin abrir la base: la campaña
 * muestra los excluidos con su motivo antes de mandar nada.
 */
export type MotivoExclusion = "dado_de_baja" | "sin_email" | "email_repetido";

export type ProspectoExcluido = {
  prospectoId: string;
  prospectoNombre: string;
  motivo: MotivoExclusion;
};

export type Destinatarios = {
  incluidos: DestinatarioInvitacion[];
  excluidos: ProspectoExcluido[];
};

function condicionesDestinatarios(filtros: FiltrosDestinatarios): SQL | undefined {
  const condiciones: SQL[] = [];

  if (filtros.ids) condiciones.push(inArray(prospectos.id, filtros.ids));
  if (filtros.estado) condiciones.push(eq(prospectos.estado, filtros.estado));
  if (filtros.responsableId) condiciones.push(eq(prospectos.responsableId, filtros.responsableId));
  if (filtros.q?.trim()) {
    condiciones.push(sql`${prospectos.nombre} ilike ${`%${filtros.q.trim()}%`}`);
  }

  return condiciones.length ? and(...condiciones) : undefined;
}

/**
 * Parte el universo del filtro en "a estos les llega" y "a estos no, y por esto".
 *
 * El reparto se hace en TS y no en SQL porque las tres exclusiones necesitan el
 * dato crudo: `emails` es un `json` (hay que mirar el primer elemento no vacío,
 * igual que el outreach 1-a-1) y el repetido depende del orden en que se
 * recorren las filas. Contar afuera lo que se excluyó en un `where` obligaría a
 * una segunda consulta que además podría no coincidir.
 *
 * Una selección explícita vacía (`ids: []`) devuelve vacío: es "no seleccionó a
 * nadie", nunca "mandale a toda la base".
 *
 * El tope de `MAX_DESTINATARIOS_LOTE` lo aplica la action con
 * `excedeMaximoDestinatarios`: acá se reporta el universo completo, que es
 * justamente lo que la pantalla necesita para avisar que no entra en una campaña.
 */
export async function destinatariosDesdeProspectos(
  filtros: FiltrosDestinatarios
): Promise<Destinatarios> {
  if (filtros.ids && filtros.ids.length === 0) return { incluidos: [], excluidos: [] };

  const filas = await db
    .select({
      id: prospectos.id,
      nombre: prospectos.nombre,
      emails: prospectos.emails,
      suscritoOutreach: prospectos.suscritoOutreach,
    })
    .from(prospectos)
    .where(condicionesDestinatarios(filtros))
    .orderBy(prospectos.nombre, prospectos.id);

  const incluidos: DestinatarioInvitacion[] = [];
  const excluidos: ProspectoExcluido[] = [];
  const yaInvitados = new Set<string>();

  for (const fila of filas) {
    const base = { prospectoId: fila.id, prospectoNombre: fila.nombre };

    // La baja gana sobre todo lo demás: es la respuesta que el equipo tiene que
    // dar si un colegio pregunta, y la que no se revierte sumando un email.
    if (!fila.suscritoOutreach) {
      excluidos.push({ ...base, motivo: "dado_de_baja" });
      continue;
    }

    const email = fila.emails.map((e) => e.trim()).find((e) => e.length > 0);
    if (!email) {
      excluidos.push({ ...base, motivo: "sin_email" });
      continue;
    }

    // Dos prospectos con la misma casilla (la sede y su director, un colegio
    // cargado dos veces) recibirían dos links distintos en el mismo buzón.
    const clave = email.toLowerCase();
    if (yaInvitados.has(clave)) {
      excluidos.push({ ...base, motivo: "email_repetido" });
      continue;
    }

    yaInvitados.add(clave);
    incluidos.push({ ...base, email });
  }

  return { incluidos, excluidos };
}

// ---------------------------------------------------------------------------
// Crear el lote
// ---------------------------------------------------------------------------

export type NuevaInvitacion = {
  prospectoId: string;
  destinatario: string;
};

export type InvitacionDelLote = {
  comunicacionId: string;
  prospectoId: string;
  destinatario: string;
};

export type LoteCreado = {
  loteId: string;
  invitaciones: InvitacionDelLote[];
};

/**
 * Deja el lote entero escrito en `pendiente`, listo para que alguien lo empuje.
 * NO manda un solo mail: mandar es `reservarTanda` + `marcarEnviada`.
 *
 * ⚠️ Las filas nacen SIN token (`invitacion_token_hash` en null), y el token se
 * acuña recién al reservar la tanda. Es deliberado: de la base solo se puede
 * recuperar el hash, así que un token acuñado acá y devuelto en memoria muere
 * con la pestaña, y el lote que se retoma mañana no tendría con qué armar el
 * link de las filas que quedaron pendientes. Acuñarlo en `reservarTanda` deja
 * el texto plano vivo exactamente entre la reserva y el mail, y hace que
 * retomar sea idéntico a empezar. El índice único de la columna no molesta:
 * Postgres no compara NULL con NULL (ver el comentario de la tabla).
 *
 * Es UN solo INSERT multi-fila y no un `db.batch`: un statement ya es
 * todo-o-nada por sí mismo, y `batch` existe para envolver VARIOS (que es lo
 * que hace la acuñación de tokens más abajo). O están las N filas del lote, o
 * no está ninguna: media campaña sería imposible de retomar sin adivinar.
 *
 * El tope de destinatarios lo valida la action (`excedeMaximoDestinatarios`).
 */
export async function crearLoteInvitaciones(opts: {
  destinatarios: readonly NuevaInvitacion[];
  viajeId: string | null;
  /** Variante forzada por la campaña; null deja decidir a `/configuracion`. */
  variante?: Variante | null;
  expiraEl: Date;
  asunto?: string | null;
  creadoPor?: string | null;
}): Promise<LoteCreado> {
  const loteId = randomUUID();
  if (opts.destinatarios.length === 0) return { loteId, invitaciones: [] };

  const filas = await db
    .insert(prospectoComunicaciones)
    .values(
      opts.destinatarios.map((d) => ({
        prospectoId: d.prospectoId,
        tipo: "email" as const,
        asunto: opts.asunto ?? null,
        estado: "pendiente" as const,
        destinatario: d.destinatario,
        creadoPor: opts.creadoPor ?? null,
        invitacionViajeId: opts.viajeId,
        invitacionVariante: opts.variante ?? null,
        invitacionExpiraEl: opts.expiraEl,
        invitacionLoteId: loteId,
      }))
    )
    .returning({
      comunicacionId: prospectoComunicaciones.id,
      prospectoId: prospectoComunicaciones.prospectoId,
      destinatario: prospectoComunicaciones.destinatario,
    });

  return {
    loteId,
    invitaciones: filas.map((f) => ({
      comunicacionId: f.comunicacionId,
      prospectoId: f.prospectoId,
      // La columna es nullable en el schema (las notas no tienen destinatario),
      // pero toda invitación se inserta con uno: acá nunca es null.
      destinatario: f.destinatario ?? "",
    })),
  };
}

// ---------------------------------------------------------------------------
// Claim en dos fases
// ---------------------------------------------------------------------------

export type InvitacionReservada = {
  comunicacionId: string;
  prospectoId: string;
  prospectoNombre: string;
  contactoNombre: string | null;
  destinatario: string;
  viajeId: string | null;
  variante: Variante | null;
  expiraEl: Date | null;
  /** El token EN CLARO. Existe acá y en el mail: de la base solo sale el hash. */
  token: string;
};

/**
 * Fase 1 del claim: se queda con hasta `tamanio` invitaciones del lote y las
 * deja en `enviando` con su lease (`invitacion_reservado_el`), ANTES de hablar
 * con Resend. Marcar `enviado` antes de mandar dejaría filas fantasma
 * indistinguibles de una entrega real; marcarlo después sin reservar haría que
 * dos pestañas mandaran el mismo mail dos veces.
 *
 * El claim es de DOS PASOS —elegir candidatas y después tomarlas— y no un solo
 * UPDATE con un subselect `for update skip locked`. El subselect parecía más
 * prolijo, pero una subconsulta con cláusula de bloqueo no se evalúa una sola
 * vez: el planner la ejecuta POR FILA, así que la tanda se llevaba más
 * invitaciones que el `tamanio` pedido (el test de integración lo destapó
 * pidiendo 2 y reservando 5).
 *
 * Que dos llamadas simultáneas no manden el mismo mail lo garantiza el paso 2:
 * el UPDATE exige `estado = 'pendiente'` y devuelve SOLO las filas que él
 * cambió. Si dos pestañas eligen las mismas candidatas, la segunda actualiza
 * cero y se lleva una tanda vacía; nunca las dos la misma fila.
 *
 * Después de reservar, cada fila recibe su token recién acuñado en un
 * `db.batch` (un request, todo-o-nada; neon-http no tiene `db.transaction`). Si
 * ese paso falla, las filas quedan en `enviando` sin mail enviado y a los
 * RESERVA_VENCIDA_MS `reclamarReservasVencidas` las devuelve a `pendiente`.
 *
 * Consecuencia conocida de acuñar al reservar: si una tanda se corta justo
 * DESPUÉS de que Resend aceptó el mail, el reintento manda un segundo mail y el
 * link válido pasa a ser el del segundo. Es el desenlace correcto — nunca hay
 * dos links vivos para la misma invitación — y la ventana son 5 minutos.
 *
 * Las invitaciones revocadas antes de salir no se reservan nunca: revocar es el
 * botón de pánico y tiene que servir también contra un mail que todavía no salió.
 */
export async function reservarTanda(
  loteId: string,
  tamanio: number = LOTE_TAMANIO,
  ahora: Date = new Date()
): Promise<InvitacionReservada[]> {
  if (tamanio <= 0) return [];

  type FilaReservada = Omit<InvitacionReservada, "token" | "destinatario"> & {
    destinatario: string | null;
  };
  const reservadas: FilaReservada[] = [];

  // Se reintenta porque el claim es optimista: si otra pestaña se llevó las
  // mismas candidatas entre el paso 1 y el 2, esta llamada actualiza cero filas
  // y sin reintento se iría con una tanda vacía mientras el lote sigue lleno.
  // Tres vueltas alcanzan de sobra para dos o tres pestañas; más que eso no es
  // un lote a mano sino otro problema.
  for (let intento = 0; intento < 3 && reservadas.length < tamanio; intento++) {
    const faltan = tamanio - reservadas.length;

    // Paso 1: las candidatas. El orden es total (created_at + id) para que dos
    // procesos recorran el lote en la misma secuencia y la tanda sea siempre la
    // más vieja que queda. Lo ya reservado no vuelve a aparecer: dejó de estar
    // `pendiente` en el paso 2.
    const candidatas = await db
      .select({ id: prospectoComunicaciones.id })
      .from(prospectoComunicaciones)
      .where(
        and(
          eq(prospectoComunicaciones.invitacionLoteId, loteId),
          eq(prospectoComunicaciones.estado, "pendiente"),
          isNull(prospectoComunicaciones.invitacionRevocadaEl)
        )
      )
      .orderBy(asc(prospectoComunicaciones.createdAt), asc(prospectoComunicaciones.id))
      .limit(faltan);

    if (candidatas.length === 0) break;

    // Paso 2: tomarlas. `estado = 'pendiente'` en el WHERE es lo que hace
    // atómico el claim: el RETURNING trae solo lo que ESTE update cambió.
    const tanda = await db
      .update(prospectoComunicaciones)
      .set({ estado: "enviando", invitacionReservadoEl: ahora })
      .from(prospectos)
      .where(
        and(
          eq(prospectos.id, prospectoComunicaciones.prospectoId),
          eq(prospectoComunicaciones.estado, "pendiente"),
          inArray(
            prospectoComunicaciones.id,
            candidatas.map((c) => c.id)
          )
        )
      )
      .returning({
        comunicacionId: prospectoComunicaciones.id,
        prospectoId: prospectoComunicaciones.prospectoId,
        prospectoNombre: prospectos.nombre,
        contactoNombre: prospectos.contactoNombre,
        destinatario: prospectoComunicaciones.destinatario,
        viajeId: prospectoComunicaciones.invitacionViajeId,
        variante: prospectoComunicaciones.invitacionVariante,
        expiraEl: prospectoComunicaciones.invitacionExpiraEl,
      });

    reservadas.push(...tanda);
  }

  if (reservadas.length === 0) return [];

  const tokens = reservadas.map(() => generarTokenOpaco());
  const [primero, ...resto] = reservadas.map((fila, i) =>
    db
      .update(prospectoComunicaciones)
      .set({ invitacionTokenHash: hashToken(tokens[i]!) })
      .where(eq(prospectoComunicaciones.id, fila.comunicacionId))
  );
  // Se desestructura para armar la tupla no vacía que `batch` pide por tipo; el
  // early return de arriba garantiza que `primero` existe.
  await db.batch([primero!, ...resto]);

  // El nombre del viaje y el token de baja NO se devuelven acá a propósito: el
  // envío relee el prospecto justo antes de mandar cada mail
  // (`enviar-lote-invitaciones.ts`), porque entre que se armó la campaña y que
  // sale el correo alguien pudo darse de baja. Duplicar esos datos en la reserva
  // sería trabajo de más y una segunda fuente de verdad más vieja.
  return reservadas.map((fila, i) => ({
    ...fila,
    destinatario: fila.destinatario ?? "",
    token: tokens[i]!,
  }));
}

/**
 * Fase 2, camino feliz: el mail salió. Guarda el id de Resend, que es lo que
 * después usa el webhook para mover la fila a entregado/abierto/rebotado.
 *
 * Limpia el lease porque `invitacion_reservado_el` tiene un segundo dueño: la
 * reserva que toma el formulario público cuando la familia abre el link
 * (`reservaVigente`). Dejar el lease del envío puesto haría que la primera
 * apertura pareciera una segunda pestaña.
 *
 * Solo avanza desde `enviando` o `pendiente`: si el webhook ya movió la fila a
 * `entregado`, un sello tardío no la tira para atrás.
 */
export async function marcarEnviada(
  comunicacionId: string,
  resendMessageId: string | null
): Promise<boolean> {
  const filas = await db
    .update(prospectoComunicaciones)
    .set({ estado: "enviado", resendMessageId, invitacionReservadoEl: null })
    .where(
      and(
        eq(prospectoComunicaciones.id, comunicacionId),
        inArray(prospectoComunicaciones.estado, ESTADOS_SELLABLES)
      )
    )
    .returning({ id: prospectoComunicaciones.id });

  return filas.length > 0;
}

/**
 * Fase 2, camino triste: Resend rechazó el mail. La fila queda en `fallido` con
 * el motivo en `meta`, y ahí se queda: reintentar un fallo es una decisión del
 * equipo (la casilla puede estar mal escrita), no algo que el lote haga solo.
 *
 * El motivo se fusiona en `meta` en un solo statement, y esta vez el objeto
 * nuevo va a la DERECHA del `||` — al revés que el sello de "respondida": ahí
 * vale el primer instante, acá vale el último intento.
 */
export async function marcarFallida(comunicacionId: string, motivo: string): Promise<boolean> {
  const detalle = sql`jsonb_build_object(
    ${META_ERROR_ENVIO}::text, ${motivo.slice(0, MAX_MOTIVO)}::text,
    ${META_FALLIDA_EL}::text, ${new Date().toISOString()}::text
  )`;

  const filas = await db
    .update(prospectoComunicaciones)
    .set({
      estado: "fallido",
      invitacionReservadoEl: null,
      meta: sql`(coalesce(${prospectoComunicaciones.meta}::jsonb, '{}'::jsonb) || ${detalle})::json`,
    })
    .where(
      and(
        eq(prospectoComunicaciones.id, comunicacionId),
        inArray(prospectoComunicaciones.estado, ESTADOS_SELLABLES)
      )
    )
    .returning({ id: prospectoComunicaciones.id });

  return filas.length > 0;
}

/**
 * Lo que hace reanudable al lote: una reserva abandonada (se cerró la pestaña,
 * se recicló la lambda) vuelve a `pendiente` y la próxima tanda se la lleva.
 * Sin esto, un corte dejaría invitaciones trabadas en `enviando` para siempre.
 *
 * El borde es inclusivo, igual que `reservaVigente` en el dominio: a los 5
 * minutos EXACTOS la reserva ya venció. `ahora` entra por parámetro para que el
 * test pueda pararse justo en ese milisegundo.
 *
 * Una fila en `enviando` sin lease también se reclama: la reserva escribe
 * estado y timestamp en el mismo UPDATE, así que esa combinación solo puede ser
 * basura de un corte y quedaría trabada para siempre. Devuelve cuántas volvieron.
 */
export async function reclamarReservasVencidas(
  loteId: string,
  ahora: Date = new Date()
): Promise<number> {
  const limite = new Date(ahora.getTime() - RESERVA_VENCIDA_MS);

  const filas = await db
    .update(prospectoComunicaciones)
    .set({ estado: "pendiente", invitacionReservadoEl: null })
    .where(
      and(
        eq(prospectoComunicaciones.invitacionLoteId, loteId),
        eq(prospectoComunicaciones.estado, "enviando"),
        or(
          isNull(prospectoComunicaciones.invitacionReservadoEl),
          lte(prospectoComunicaciones.invitacionReservadoEl, limite)
        )
      )
    )
    .returning({ id: prospectoComunicaciones.id });

  return filas.length;
}

/**
 * Botón de pánico: corta el link sin borrar la bitácora del envío. Sirve para
 * las dos situaciones — el mail se mandó al contacto equivocado (el link deja
 * de abrir, lo evalúa `estadoInvitacion`) y el mail todavía no salió (la fila
 * queda fuera de toda tanda futura).
 *
 * `coalesce` conserva la PRIMERA revocación: revocar dos veces no reescribe
 * cuándo se cortó el acceso, que es justo el dato que se audita.
 *
 * Solo toca invitaciones de verdad: una comunicación sin vencimiento no lo es
 * (mismo criterio que `getInvitacionByTokenHash`).
 */
export async function revocarInvitacion(
  comunicacionId: string,
  el: Date = new Date()
): Promise<boolean> {
  const filas = await db
    .update(prospectoComunicaciones)
    .set({
      // El instante va como texto ISO con cast explícito: interpolar el `Date`
      // suelto lo serializa en la zona horaria del proceso y la fila terminaba
      // guardando tres horas menos (Argentina es UTC-3). El resto de la app
      // guarda instantes UTC.
      invitacionRevocadaEl: sql`coalesce(${prospectoComunicaciones.invitacionRevocadaEl}, ${el.toISOString()}::timestamp)`,
    })
    .where(
      and(
        eq(prospectoComunicaciones.id, comunicacionId),
        isNotNull(prospectoComunicaciones.invitacionExpiraEl)
      )
    )
    .returning({ id: prospectoComunicaciones.id });

  return filas.length > 0;
}

// ---------------------------------------------------------------------------
// Estado de los lotes
// ---------------------------------------------------------------------------

/**
 * El tablero de una campaña.
 *
 * Los contadores NO son una partición: `total` es el único número exhaustivo.
 * Cada uno dice exactamente esto:
 *  - `pendientes`: falta mandarlas y son mandables (sin revocar). Es, fila por
 *    fila, lo mismo que se va a llevar `reservarTanda`, para que "quedan 12"
 *    signifique "quedan 12 mails" y no "quedan 12 filas, algunas revocadas";
 *  - `enviando`: reservadas por un envío en curso (o por uno que se cortó y
 *    todavía no cumplió los 5 minutos);
 *  - `enviadas` / `fallidas`: lo que dice el estado, incluido lo que movió el
 *    webhook de Resend después;
 *  - `revocadas`: cruza con las demás (se puede revocar una ya enviada);
 *  - `respondidas`: subconjunto de `enviadas`; la familia mandó la ficha.
 *
 * Y el EMBUDO, que sí es una cadena y cada escalón es subconjunto del anterior:
 * `enviadas` → `entregadas` → `abiertas` → `clics` → `formularioAbierto` →
 * `respondidas` (fichas recibidas) → `procesadas` (fichas dadas de alta). Los
 * tres del medio dependen del webhook de Resend y hoy no se miden: la pantalla
 * los muestra como "no disponible" y NUNCA como 0, porque un cero se lee como
 * "nadie lo abrió" y eso sería mentira.
 *
 * `formularioAbierto` puede ser mayor que `abiertas` sin que nada esté roto: la
 * apertura del formulario la registra la propia app y no depende del webhook.
 */
export type ResumenLote = {
  loteId: string;
  creadoEl: Date;
  viajeId: string | null;
  viajeCodigo: string | null;
  viajeNombre: string | null;
  variante: Variante | null;
  expiraEl: Date | null;
  total: number;
  pendientes: number;
  enviando: number;
  enviadas: number;
  fallidas: number;
  revocadas: number;
  respondidas: number;
  /** Escalones del webhook de Resend. Cero mientras el webhook no exista. */
  entregadas: number;
  abiertas: number;
  clics: number;
  /** El link se abrió y el formulario llegó a mostrarse (`META_FORM_ABIERTO`). */
  formularioAbierto: number;
  /** Fichas del lote que terminaron dadas de alta. Subconjunto de `respondidas`. */
  procesadas: number;
  /** Una fila por piel, siempre las tres, para poder compararlas. */
  porVariante: CorteVariante[];
};

/**
 * El mismo embudo, partido por la piel del formulario. Es lo único que permite
 * contestar "¿la variante B convierte mejor que la A?" sin mirar fila por fila.
 *
 * Una campaña que forzó su variante tiene un solo corte con datos; el reparto
 * recién significa algo cuando la piel la decide `/configuracion` al abrir el
 * link y en el mismo lote conviven las tres.
 */
export type CorteVariante = {
  variante: Variante;
  enviadas: number;
  formularioAbierto: number;
  fichas: number;
};

export type FiltrosLotes = {
  viajeId?: string;
};

const conteo = (condicion: SQL) => sql<number>`count(*) filter (where ${condicion})`.mapWith(Number);

const sinRevocar = () => isNull(prospectoComunicaciones.invitacionRevocadaEl);

const salioElMail = () => inArray(prospectoComunicaciones.estado, ESTADOS_ENVIADA);

/**
 * El `::text` no es decorativo: `json ->> ?` es ambiguo en Postgres (existe la
 * versión por clave y la versión por índice) y sin el cast el parámetro suelto
 * falla con "operator is not unique". Mismo truco que en `inscripciones-publicas`.
 */
const abrioElFormulario = () =>
  sql`${prospectoComunicaciones.meta} ->> ${META_FORM_ABIERTO}::text is not null`;

const hayFicha = () => sql`${inscripciones.id} is not null`;

/**
 * La piel que vio la familia: la que quedó registrada en la ficha si la mandó
 * y, si no, la que forzó la campaña.
 *
 * Con las dos en null —campaña sin variante forzada, invitación sin ficha— la
 * piel la eligió `/configuracion` en el momento de abrir y nadie la anotó: esa
 * invitación no entra en ningún corte. Un reparto que suma menos que el total
 * es honesto; atribuirle la apertura a la piel equivocada arruinaría la
 * comparación, que es justo para lo que existe el corte.
 */
const pielVista = sql`coalesce(${inscripciones.variante}::text, ${prospectoComunicaciones.invitacionVariante}::text)`;

const esPiel = (variante: Variante) => sql`${pielVista} = ${variante}`;

/**
 * Todo agregado EN SQL sobre el lote entero. Contar en memoria lo que trajo la
 * página diría "3 enviadas" cuando el lote tiene 200, y los metadatos (viaje,
 * variante, vencimiento) salen con `max()` porque todas las filas de un lote los
 * comparten por construcción: agruparlos también partiría el lote en dos si
 * alguna vez dejaran de compartirlos.
 *
 * El `left join` a `inscripciones` no multiplica filas: el índice único parcial
 * `uniq_inscripcion_comunicacion` garantiza como máximo una ficha VIVA por
 * invitación (el mismo argumento que en `getInvitacionByTokenHash`). Solo se
 * cuenta el id — de esa tabla no se lee nada más, que guarda Nivel 2.
 */
function consultaLotes(where: SQL) {
  return db
    .select({
      // El WHERE garantiza que no es null; seleccionarlo como expresión evita
      // arrastrar un `string | null` que después habría que castear.
      loteId: sql<string>`${prospectoComunicaciones.invitacionLoteId}`,
      creadoEl: sql`min(${prospectoComunicaciones.createdAt})`.mapWith(
        prospectoComunicaciones.createdAt
      ),
      // `max()` no existe para uuid ni para un enum: se agregan como texto y se
      // vuelven a su tipo.
      viajeId: sql`max(${prospectoComunicaciones.invitacionViajeId}::text)::uuid`.mapWith(
        prospectoComunicaciones.invitacionViajeId
      ),
      viajeCodigo: sql`max(${viajes.codigo})`.mapWith(viajes.codigo),
      viajeNombre: sql`max(${viajes.nombre})`.mapWith(viajes.nombre),
      variante: sql`max(${prospectoComunicaciones.invitacionVariante}::text)`.mapWith(
        prospectoComunicaciones.invitacionVariante
      ),
      expiraEl: sql`max(${prospectoComunicaciones.invitacionExpiraEl})`.mapWith(
        prospectoComunicaciones.invitacionExpiraEl
      ),
      total: sql<number>`count(*)`.mapWith(Number),
      pendientes: conteo(
        sql`${eq(prospectoComunicaciones.estado, "pendiente")} and ${sinRevocar()}`
      ),
      enviando: conteo(eq(prospectoComunicaciones.estado, "enviando")),
      enviadas: conteo(salioElMail()),
      fallidas: conteo(inArray(prospectoComunicaciones.estado, ESTADOS_FALLIDA)),
      revocadas: conteo(isNotNull(prospectoComunicaciones.invitacionRevocadaEl)),
      respondidas: sql<number>`count(${inscripciones.id})`.mapWith(Number),

      entregadas: conteo(inArray(prospectoComunicaciones.estado, ESTADOS_ENTREGADA)),
      abiertas: conteo(inArray(prospectoComunicaciones.estado, ESTADOS_ABIERTA)),
      clics: conteo(eq(prospectoComunicaciones.estado, "click")),
      formularioAbierto: conteo(abrioElFormulario()),
      // Una ficha borrada por privacidad SIGUE contando: el borrado vacía los
      // datos personales y deja el talón (estado, variante, lote) justamente
      // para que las métricas de una campaña vieja no se achiquen solas.
      procesadas: conteo(eq(inscripciones.estado, "procesada")),

      pielAEnviadas: conteo(sql`${esPiel("a")} and ${salioElMail()}`),
      pielAAbrieron: conteo(sql`${esPiel("a")} and ${abrioElFormulario()}`),
      pielAFichas: conteo(sql`${esPiel("a")} and ${hayFicha()}`),
      pielBEnviadas: conteo(sql`${esPiel("b")} and ${salioElMail()}`),
      pielBAbrieron: conteo(sql`${esPiel("b")} and ${abrioElFormulario()}`),
      pielBFichas: conteo(sql`${esPiel("b")} and ${hayFicha()}`),
      pielCEnviadas: conteo(sql`${esPiel("c")} and ${salioElMail()}`),
      pielCAbrieron: conteo(sql`${esPiel("c")} and ${abrioElFormulario()}`),
      pielCFichas: conteo(sql`${esPiel("c")} and ${hayFicha()}`),
    })
    .from(prospectoComunicaciones)
    .leftJoin(viajes, eq(prospectoComunicaciones.invitacionViajeId, viajes.id))
    .leftJoin(
      inscripciones,
      and(
        eq(inscripciones.comunicacionId, prospectoComunicaciones.id),
        ne(inscripciones.estado, "anulada")
      )
    )
    .where(where)
    .groupBy(prospectoComunicaciones.invitacionLoteId);
}

type FilaLote = Awaited<ReturnType<typeof consultaLotes>>[number];

/**
 * Pasa los nueve contadores por piel a la forma que dibuja la pantalla.
 *
 * El `Record<Variante, …>` es el que manda: una piel nueva en el dominio no
 * compila hasta que alguien decida qué contar para ella, en vez de desaparecer
 * calladita del corte.
 */
function corteDe(fila: FilaLote): CorteVariante[] {
  const porPiel: Record<Variante, Omit<CorteVariante, "variante">> = {
    a: {
      enviadas: fila.pielAEnviadas,
      formularioAbierto: fila.pielAAbrieron,
      fichas: fila.pielAFichas,
    },
    b: {
      enviadas: fila.pielBEnviadas,
      formularioAbierto: fila.pielBAbrieron,
      fichas: fila.pielBFichas,
    },
    c: {
      enviadas: fila.pielCEnviadas,
      formularioAbierto: fila.pielCAbrieron,
      fichas: fila.pielCFichas,
    },
  };

  return VARIANTES.map((variante) => ({ variante, ...porPiel[variante] }));
}

/**
 * La fila cruda tiene los contadores por piel aplanados (SQL no devuelve
 * arrays de un `group by`): acá se anidan y se sacan de la superficie pública,
 * para que nadie empiece a leer `pielBFichas` desde una pantalla.
 */
function aResumen(fila: FilaLote): ResumenLote {
  const {
    pielAEnviadas,
    pielAAbrieron,
    pielAFichas,
    pielBEnviadas,
    pielBAbrieron,
    pielBFichas,
    pielCEnviadas,
    pielCAbrieron,
    pielCFichas,
    ...resumen
  } = fila;

  return { ...resumen, porVariante: corteDe(fila) };
}

function condicionesLotes(filtros: FiltrosLotes): SQL {
  const condiciones: SQL[] = [isNotNull(prospectoComunicaciones.invitacionLoteId)];
  if (filtros.viajeId) {
    condiciones.push(eq(prospectoComunicaciones.invitacionViajeId, filtros.viajeId));
  }
  // `and` sobre una lista no vacía siempre devuelve SQL.
  return and(...condiciones)!;
}

/**
 * Las campañas, la más nueva arriba.
 *
 * El `ORDER BY` desempata por `invitacion_lote_id`, que es único por grupo: dos
 * lotes creados en el mismo instante (el mismo `min(created_at)`, que pasa al
 * crear dos campañas seguidas, y siempre en los tests) tendrían un orden
 * arbitrario y LIMIT/OFFSET repetiría o saltearía filas entre páginas.
 */
export async function listLotes(
  filtros: FiltrosLotes,
  pagina: Pagina
): Promise<Paginado<ResumenLote>> {
  const where = condicionesLotes(filtros);

  const paginado = await paginarEnSql(
    pagina,
    (limit, offset) =>
      consultaLotes(where)
        .orderBy(
          sql`min(${prospectoComunicaciones.createdAt}) desc`,
          desc(prospectoComunicaciones.invitacionLoteId)
        )
        .limit(limit)
        .offset(offset),
    () =>
      db
        .select({ n: countDistinct(prospectoComunicaciones.invitacionLoteId) })
        .from(prospectoComunicaciones)
        .where(where)
        .then(totalDe)
  );

  // El corte por piel se anida después de paginar, no en SQL: lo que pagina son
  // campañas, y el reparto ya vino agregado sobre el lote entero.
  return { ...paginado, items: paginado.items.map(aResumen) };
}

/** El mismo resumen para un lote solo: lo que mira la pantalla del envío. */
export async function resumenLote(loteId: string): Promise<ResumenLote | null> {
  const filas = await consultaLotes(eq(prospectoComunicaciones.invitacionLoteId, loteId));
  const fila = filas[0];
  return fila ? aResumen(fila) : null;
}
