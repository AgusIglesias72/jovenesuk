import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { safeAudit } from "@/lib/actions/safe-audit";
import {
  altaDesdeInscripcion,
  type ResultadoAsignacion,
  type Vinculo,
} from "@/lib/db/queries/alta-inscripcion";
import { getViajeByCodigo } from "@/lib/db/queries/viajes";
import { LARGO_MINIMO_SECRETO, coincideSecreto, secretoUsable } from "@/lib/domain/webhooks/secreto";
import { soloDigitos } from "@/lib/utils/dni";

/**
 * Webhook del Application Form JUK (Google Form) — US-15.
 *
 * Crea el alumno en estado Pre-inscripto con canal webhook (alimenta el Paso 0)
 * y, si el form trae `codigoViaje` (cada salida de colegio cliente tiene su
 * propio link), lo asigna automáticamente al viaje generando el tablero M6.
 *
 * Auth: header `x-webhook-secret` debe coincidir con GOOGLE_FORM_WEBHOOK_SECRET
 * (comparación de tiempo constante; el secreto necesita 32+ caracteres).
 * Idempotencia: si ya existe un alumno con el mismo DNI, responde 200 con
 * `duplicado: true` y no crea nada.
 *
 * ── Este archivo NO tiene alta propia ────────────────────────────────────────
 *
 * Desde el Application Form propio, el efecto (alumno + cuenta de familia +
 * asignación al viaje) vive en `altaDesdeInscripcion`
 * (`@/lib/db/queries/alta-inscripcion`) y este handler DELEGA ahí. Antes había
 * dos altas escritas a mano que hacían lo mismo, y dos altas que hacen lo mismo
 * se desincronizan: se arregla un caso de borde en una y la otra queda vieja.
 *
 * Lo que este webhook aporta es su propia AUTORIZACIÓN. El alta automática solo
 * corre con una capacidad que entregó el equipo; en el formulario público esa
 * capacidad es el token de invitación y acá es el secreto compartido de 32+
 * caracteres que se valida arriba de todo. Por eso el webhook no pasa por la
 * compuerta de `@/lib/actions/alta-inscripcion` (que es la que decide si hay
 * capacidad y sella la ficha): entra directo al efecto, con el secreto ya
 * verificado, y su comportamiento observable es el mismo de siempre.
 *
 * El blindaje que importa lo garantiza igual la capa de abajo: la idempotencia
 * por DNI corta ANTES de tocar nada, así que un envío con los datos de un alumno
 * que ya existe no puede cambiarle la cuenta de familia aunque traiga otro
 * `tutor1Email` (el caso está en `tests/e2e/webhook-google-form-casos.spec.ts`).
 *
 * ── Rastro en la tabla `inscripciones`: NO ───────────────────────────────────
 *
 * Se evaluó que el webhook dejara también su fila en `inscripciones` para que la
 * bandeja mostrara todo lo que entró. Se descartó por tres razones, en orden de
 * peso:
 *
 *  1. Las tres columnas de consentimiento son NOT NULL y son PRUEBA de a qué
 *     aceptó una familia (versión + hash del texto exacto). Esta ficha aceptó el
 *     texto del Google Form, que no tenemos: escribir ahí nuestra
 *     `VERSION_CONSENTIMIENTO` sería fabricar evidencia de un consentimiento que
 *     esa familia nunca vio.
 *  2. El unique parcial `uniq_inscripcion_dni_viva` haría fallar un alta
 *     legítima del webhook cuando ya hay una ficha viva del mismo DNI cargada
 *     por el formulario propio.
 *  3. El correlativo `numero` alimenta el código público INS-000123, que se le
 *     dicta a la familia por teléfono: gastarlo en fichas que nunca existieron
 *     como tales lo desalinea.
 *
 * El origen ya es distinguible donde hace falta: el alumno queda con
 * `canal_alta = webhook` y `/alumnos` filtra por canal.
 */

const fecha = z.preprocess(
  (v) => (v == null || v === "" ? undefined : new Date(v as string)),
  z.date()
);

const payloadSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  apellido: z.string().trim().min(1).max(120),
  fechaNacimiento: fecha,
  dni: z.string().trim().min(1).max(20),
  numeroPasaporte: z.string().trim().min(1).max(30),
  fechaVencimientoPasaporte: fecha,
  tutor1Nombre: z.string().trim().min(1).max(120),
  tutor1Celular: z.string().trim().min(1).max(50),
  tutor1Email: z.string().trim().email(),
  telefonoAlumno: z.string().trim().max(50).optional(),
  emailAlumno: z.string().trim().email().optional(),
  alergiasSalud: z.string().trim().max(2000).optional(),
  preferenciasAlojamiento: z.string().trim().max(500).optional(),
  nivelInglesAutoevaluacion: z.string().trim().max(100).optional(),
  /** Código del viaje del link (ej: UK-2026-SEP-WIMBLEDON). Opcional. */
  codigoViaje: z.string().trim().max(60).optional(),
});

/** Solo dígitos y separadores de formato: "45.102.338", "45 102 338". */
const NUMERO_CON_SEPARADORES = /^[\d.\s]+$/;

/**
 * TEC-12 en el borde del webhook. El campo del Google Form es texto libre y la
 * familia escribe el DNI como lo lee en el documento: "45.102.338". Guardado
 * así, rompe el slug de `/alumnos/<dni>` y no deduplica contra "45102338", que
 * es justo la clave de idempotencia de este endpoint.
 *
 * Se normaliza SOLO cuando el valor es un número con separadores, o sea cuando
 * sacarlos no cambia el documento. Un documento que NO es numérico (el pasaporte
 * de un alumno extranjero tipeado en el campo DNI) se guarda tal cual: pasarlo
 * por `soloDigitos` inventaría un número que puede chocar contra el DNI real de
 * otro alumno, y eso es peor que el problema que resuelve.
 */
function normalizarDni(valor: string): string {
  return NUMERO_CON_SEPARADORES.test(valor) ? soloDigitos(valor) : valor;
}

/**
 * Las fechas de la ficha viajan como "AAAA-MM-DD" (es lo que guarda
 * `inscripciones`, y lo que `altaDesdeInscripcion` espera). El payload del
 * webhook sigue aceptando lo mismo que antes —cualquier cosa que `new Date()`
 * entienda— y se convierte acá: el día UTC es el mismo que venía guardando
 * Drizzle al escribir un `Date` en una columna `date`.
 */
function diaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

const ORIGEN = "webhook_google_form";

/**
 * Todo lo que se automatizó queda auditado, con el origen y la rama del vínculo
 * de familia. El `vincular` lleva ADEMÁS su propia entrada: colgar un alumno de
 * una cuenta que ya existía es la operación sensible de este flujo y tiene que
 * poder buscarse sola, entre por donde entre (el formulario propio deja la misma
 * marca desde `@/lib/actions/alta-inscripcion`).
 */
async function auditar(opts: {
  alumnoId: string;
  vinculo: Vinculo;
  asignacion: ResultadoAsignacion;
  codigoViaje: string | undefined;
}): Promise<void> {
  const { alumnoId, vinculo, asignacion, codigoViaje } = opts;

  await safeAudit({
    accion: "create",
    entidadTipo: "alumno",
    entidadId: alumnoId,
    usuarioId: null,
    metadata: { origen: ORIGEN, vinculo: vinculo.rama },
  });

  if (vinculo.rama === "vincular") {
    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: alumnoId,
      usuarioId: null,
      metadata: {
        origen: ORIGEN,
        vinculo: "cuenta_existente",
        familiaUserId: vinculo.familiaUserId,
      },
    });
  }

  if (asignacion.estado !== "asignado") return;

  await safeAudit({
    accion: "asignar_a_viaje",
    entidadTipo: "asignacion",
    entidadId: asignacion.asignacionId,
    usuarioId: null,
    metadata: { origen: ORIGEN, codigoViaje },
  });

  if (asignacion.autoConfirmado) {
    await safeAudit({
      accion: "cambio_estado_viaje",
      entidadTipo: "viaje",
      entidadId: asignacion.viajeId,
      usuarioId: null,
      metadata: {
        origen: ORIGEN,
        estadoAnterior: "inscripcion_abierta",
        estado: "confirmado",
        motivo: "auto_5_alumnos",
      },
    });
  }
}

// El aviso de secreto mal configurado se loguea una vez por instancia: sin
// esto, un form con reintentos llena los logs con la misma línea.
let secretoInvalidoLogueado = false;

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  if (!secretoUsable(secret)) {
    if (!secretoInvalidoLogueado) {
      secretoInvalidoLogueado = true;
      console.error(
        `[webhook/google-form] GOOGLE_FORM_WEBHOOK_SECRET ausente o de menos de ${LARGO_MINIMO_SECRETO} caracteres; se rechazan todos los envíos.`
      );
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!coincideSecreto(request.headers.get("x-webhook-secret"), secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { codigoViaje, ...ficha } = parsed.data;

  try {
    // El link del form trae el CÓDIGO del viaje y el alta trabaja con el id, así
    // que resolverlo acá cuesta un round-trip de más. Se paga a propósito: la
    // regla de "¿este viaje admite inscripciones y tiene cupo?" queda en un solo
    // lugar en vez de estar copiada en este handler.
    const viaje = codigoViaje ? await getViajeByCodigo(codigoViaje) : null;

    const resultado = await altaDesdeInscripcion(
      {
        nombre: ficha.nombre,
        apellido: ficha.apellido,
        fechaNacimiento: diaIso(ficha.fechaNacimiento),
        dni: normalizarDni(ficha.dni),
        numeroPasaporte: ficha.numeroPasaporte,
        fechaVencimientoPasaporte: diaIso(ficha.fechaVencimientoPasaporte),
        telefonoAlumno: ficha.telefonoAlumno ?? null,
        emailAlumno: ficha.emailAlumno ?? null,
        alergiasSalud: ficha.alergiasSalud ?? null,
        tutor1Nombre: ficha.tutor1Nombre,
        tutor1Celular: ficha.tutor1Celular,
        tutor1Email: ficha.tutor1Email,
        preferenciasAlojamiento: ficha.preferenciasAlojamiento ?? null,
        nivelInglesAutoevaluacion: ficha.nivelInglesAutoevaluacion ?? null,
        viajeId: viaje?.id ?? null,
      },
      { canalAlta: "webhook" }
    );

    if (resultado.tipo === "duplicado") {
      // El DNI está tomado pero no lo podemos leer de vuelta (lectura sobre otra
      // rama de la réplica): 409 con el motivo real, nunca un 500 mudo.
      if (resultado.alumnoId === null) {
        return NextResponse.json({ error: "Ya existe un alumno con ese DNI." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, duplicado: true, alumnoId: resultado.alumnoId });
    }

    const { alumnoId, vinculo, asignacion } = resultado;
    await auditar({ alumnoId, vinculo, asignacion, codigoViaje });

    return NextResponse.json({
      ok: true,
      alumnoId,
      asignacion:
        asignacion.estado === "asignado"
          ? { viajeId: asignacion.viajeId, asignacionId: asignacion.asignacionId }
          : null,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
