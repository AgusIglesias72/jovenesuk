import { randomUUID } from "node:crypto";

import { and, eq, inArray, like, lt, or, type SQL } from "drizzle-orm";

import type { DB } from "@/lib/db";
import { alumnos, type Alumno, type NewAlumno } from "@/lib/db/schema/alumnos";
import { asignaciones, type Asignacion } from "@/lib/db/schema/asignaciones";
import { auditoria } from "@/lib/db/schema/auditoria";
import {
  colegioDocumentoConfig,
  colegios,
  type Colegio,
  type NewColegio,
} from "@/lib/db/schema/colegios";
import { cuotas } from "@/lib/db/schema/cuotas";
import { notificacionesEnviadas } from "@/lib/db/schema/notificaciones";
import { pasosAlumno, type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes, type NewViaje, type Viaje } from "@/lib/db/schema/viajes";
import type { ConfigDocumental } from "@/lib/domain/colegios";

/*
 * Fixtures de los tests de integración (*.integration.test.ts).
 *
 * La base apuntada puede ser la Neon de DESARROLLO del dueño, con datos reales.
 * Por eso cada fila que se crea acá lleva un prefijo inconfundible, y el
 * cleanup borra SOLO por id propio o por el prefijo único de la corrida:
 *   - colegios: nombre  "[INT] <corrida> …"
 *   - viajes:   codigo  "INT-<corrida>-…" y nombre "[INT] …"
 *   - alumnos:  dni     "INT-<corrida>-…", nombres "[INT] …",
 *               tutor1_email "int+<corrida>-…@int.jovenesenuk.com"
 * Los archivos de integración corren en paralelo: cada uno tiene su corrida y
 * jamás borra por el prefijo genérico (salvo restos huérfanos de más de 6 h).
 *
 * `@/lib/db` lanza al importarse sin DATABASE_URL, así que acá solo se importa
 * su tipo y el cliente se carga perezoso: sin INTEGRATION_DATABASE_URL, el
 * archivo de test se saltea sin tocar nada.
 */

export const INTEGRATION_DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;
export const integracionHabilitada = Boolean(INTEGRATION_DATABASE_URL);

const DOMINIO_EMAIL = "int.jovenesenuk.com";
const HORAS_RESTO_HUERFANO = 6;

export class IntegracionDeshabilitadaError extends Error {
  constructor() {
    super("INTEGRATION_DATABASE_URL no está definida: los tests de integración no pueden correr.");
    this.name = "IntegracionDeshabilitadaError";
  }
}

export class FixtureError extends Error {
  constructor(detalle: string) {
    super(`Fixture de integración: ${detalle}`);
    this.name = "FixtureError";
  }
}

/**
 * Cliente Drizzle contra INTEGRATION_DATABASE_URL. Pisa DATABASE_URL ANTES de
 * importar `@/lib/db` para que las queries bajo prueba (que importan ese mismo
 * módulo) usen la base de integración y no otra que haya dejado .env.local.
 */
export async function conectarIntegracion(): Promise<DB> {
  if (!INTEGRATION_DATABASE_URL) throw new IntegracionDeshabilitadaError();
  process.env.DATABASE_URL = INTEGRATION_DATABASE_URL;
  const { db } = await import("@/lib/db");
  return db;
}

/** Día calendario como lo entrega Drizzle para columnas `date`: medianoche UTC. */
export function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function sumarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

export function isoDia(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

type IdsPropios = { colegios: string[]; viajes: string[]; alumnos: string[] };

async function borrarPorIds(db: DB, ids: IdsPropios, filtroNotificaciones?: SQL): Promise<void> {
  const asignacionIds =
    ids.alumnos.length || ids.viajes.length
      ? (
          await db
            .select({ id: asignaciones.id })
            .from(asignaciones)
            .where(
              or(
                ids.alumnos.length ? inArray(asignaciones.alumnoId, ids.alumnos) : undefined,
                ids.viajes.length ? inArray(asignaciones.viajeId, ids.viajes) : undefined
              )
            )
        ).map((r) => r.id)
      : [];

  const pasoIds = asignacionIds.length
    ? (
        await db
          .select({ id: pasosAlumno.id })
          .from(pasosAlumno)
          .where(inArray(pasosAlumno.asignacionId, asignacionIds))
      ).map((r) => r.id)
    : [];

  // notificaciones_enviadas y auditoria no tienen FK: no cascadean nunca.
  const notif = or(
    pasoIds.length ? inArray(notificacionesEnviadas.entidadId, pasoIds) : undefined,
    filtroNotificaciones
  );
  if (notif) await db.delete(notificacionesEnviadas).where(notif);

  const entidades = [...ids.viajes, ...ids.alumnos, ...ids.colegios, ...asignacionIds];
  if (entidades.length) await db.delete(auditoria).where(inArray(auditoria.entidadId, entidades));

  // asignaciones es RESTRICT hacia alumnos/viajes; cuotas y pasos_alumno cascadean.
  if (asignacionIds.length)
    await db.delete(asignaciones).where(inArray(asignaciones.id, asignacionIds));
  // viajes → colegios no cascadea: primero viajes, después colegios (su config sí cascadea).
  if (ids.viajes.length) await db.delete(viajes).where(inArray(viajes.id, ids.viajes));
  if (ids.alumnos.length) await db.delete(alumnos).where(inArray(alumnos.id, ids.alumnos));
  if (ids.colegios.length) await db.delete(colegios).where(inArray(colegios.id, ids.colegios));
}

/**
 * Restos de corridas que murieron antes del afterAll. Solo filas con el
 * prefijo genérico de integración Y viejas: una corrida en paralelo (otro
 * archivo) nunca tiene filas de hace horas.
 */
export async function limpiarRestosHuerfanos(db: DB): Promise<void> {
  const limite = new Date(Date.now() - HORAS_RESTO_HUERFANO * 3_600_000);
  const [vs, as, cs] = await Promise.all([
    db
      .select({ id: viajes.id })
      .from(viajes)
      .where(and(like(viajes.codigo, "INT-%"), like(viajes.nombre, "[INT] %"), lt(viajes.createdAt, limite))),
    db
      .select({ id: alumnos.id })
      .from(alumnos)
      .where(and(like(alumnos.dni, "INT-%"), lt(alumnos.fechaAlta, limite))),
    db
      .select({ id: colegios.id })
      .from(colegios)
      .where(and(like(colegios.nombre, "[INT] %"), lt(colegios.createdAt, limite))),
  ]);
  await borrarPorIds(
    db,
    {
      viajes: vs.map((r) => r.id),
      alumnos: as.map((r) => r.id),
      colegios: cs.map((r) => r.id),
    },
    and(
      like(notificacionesEnviadas.destinatario, `int+%@${DOMINIO_EMAIL}`),
      lt(notificacionesEnviadas.enviadoAt, limite)
    )
  );
}

export type ColegioIntOpts = {
  pais?: NewColegio["pais"];
  tipoEntradaRequerida?: NewColegio["tipoEntradaRequerida"];
  config?: Partial<ConfigDocumental>;
};

export type ViajeIntOpts = {
  colegioDestinoId: string;
  fechaInicio: Date;
  fechaFin?: Date;
  tipo?: NewViaje["tipo"];
  origen?: NewViaje["origen"];
  estado?: NewViaje["estado"];
  capacidadMaxima?: number;
};

export type AlumnoIntOpts = {
  fechaNacimiento: Date;
  estado?: NewAlumno["estado"];
  canalAlta?: NewAlumno["canalAlta"];
};

export type Fixtures = ReturnType<typeof crearFixtures>;

/**
 * Registro de fixtures de UN archivo de test. `ambito` es un nombre corto
 * (ej. "CUOTAS") que, junto con un sufijo aleatorio, forma el prefijo de la
 * corrida.
 */
export function crearFixtures(ambito: string) {
  const corrida = `${ambito.toUpperCase()}-${Date.now().toString(36)}${randomUUID().slice(0, 4)}`.toUpperCase();
  const prefijoCodigo = `INT-${corrida}-`;
  const prefijoColegio = `[INT] ${corrida} `;
  const prefijoEmail = `int+${corrida.toLowerCase()}-`;
  const propios: IdsPropios = { colegios: [], viajes: [], alumnos: [] };
  let secuencia = 0;
  let cliente: DB | null = null;

  const siguiente = () => (secuencia += 1);

  function db(): DB {
    if (!cliente) throw new FixtureError("llamá a iniciar() en el beforeAll antes de usar la DB.");
    return cliente;
  }

  async function iniciar(): Promise<DB> {
    cliente = await conectarIntegracion();
    await limpiarRestosHuerfanos(cliente);
    return cliente;
  }

  async function colegio(opts: ColegioIntOpts = {}): Promise<Colegio> {
    const n = siguiente();
    const [row] = await db()
      .insert(colegios)
      .values({
        nombre: `${prefijoColegio}Colegio ${n}`,
        tipo: "destino",
        pais: opts.pais ?? "reino_unido",
        ciudad: "[INT] Ciudad",
        contactoAcademico: { nombre: "[INT] Académico", email: `${prefijoEmail}acad${n}@${DOMINIO_EMAIL}` },
        contactoAdministrativo: { nombre: "[INT] Admin", email: `${prefijoEmail}adm${n}@${DOMINIO_EMAIL}` },
        tipoEntradaRequerida: opts.tipoEntradaRequerida ?? "eta",
      })
      .returning();
    if (!row) throw new FixtureError("el INSERT de colegio no devolvió fila.");
    propios.colegios.push(row.id);

    const overrides = Object.entries(opts.config ?? {}) as [
      keyof ConfigDocumental,
      ConfigDocumental[keyof ConfigDocumental],
    ][];
    if (overrides.length) {
      await db()
        .insert(colegioDocumentoConfig)
        .values(overrides.map(([documento, requisito]) => ({ colegioId: row.id, documento, requisito })));
    }
    return row;
  }

  async function viaje(opts: ViajeIntOpts): Promise<Viaje> {
    const n = siguiente();
    const tipo = opts.tipo ?? "grupal";
    const [row] = await db()
      .insert(viajes)
      .values({
        codigo: `${prefijoCodigo}V${n}`,
        nombre: `[INT] Viaje ${n}`,
        tipo,
        fechaInicio: opts.fechaInicio,
        fechaFin: opts.fechaFin ?? sumarDias(opts.fechaInicio, 14),
        origen: opts.origen ?? "representante_independiente",
        paisDestino: "reino_unido",
        colegioDestinoId: opts.colegioDestinoId,
        curso: "[INT] Curso",
        tipoAlojamientoSolicitado: "familia_anfitriona",
        capacidadMaxima: opts.capacidadMaxima ?? (tipo === "individual" ? 1 : 24),
        estado: opts.estado ?? (tipo === "individual" ? "confirmado" : "inscripcion_abierta"),
      })
      .returning();
    if (!row) throw new FixtureError("el INSERT de viaje no devolvió fila.");
    propios.viajes.push(row.id);
    return row;
  }

  async function alumno(opts: AlumnoIntOpts): Promise<Alumno> {
    const n = siguiente();
    const [row] = await db()
      .insert(alumnos)
      .values({
        nombre: `[INT] Nombre ${n}`,
        apellido: `[INT] Apellido ${String(n).padStart(3, "0")}`,
        fechaNacimiento: opts.fechaNacimiento,
        dni: `${prefijoCodigo}A${n}`,
        numeroPasaporte: `INTP${n}`,
        fechaVencimientoPasaporte: dia("2099-12-31"),
        tutor1Nombre: `[INT] Tutor ${n}`,
        tutor1Celular: "+540000000000",
        tutor1Email: `${prefijoEmail}${n}@${DOMINIO_EMAIL}`,
        estado: opts.estado ?? "pre_inscripto",
        canalAlta: opts.canalAlta ?? "alta_manual",
      })
      .returning();
    if (!row) throw new FixtureError("el INSERT de alumno no devolvió fila.");
    propios.alumnos.push(row.id);
    return row;
  }

  /** Asignación "pelada" (sin tablero), para lo que no necesita el trigger. */
  async function asignacion(
    alumnoId: string,
    viajeId: string,
    estado: Asignacion["estado"] = "activa"
  ): Promise<Asignacion> {
    const [row] = await db().insert(asignaciones).values({ alumnoId, viajeId, estado }).returning();
    if (!row) throw new FixtureError("el INSERT de asignación no devolvió fila.");
    return row;
  }

  async function pasos(asignacionId: string): Promise<Map<PasoAlumno["codigo"], PasoAlumno>> {
    const rows = await db()
      .select()
      .from(pasosAlumno)
      .where(eq(pasosAlumno.asignacionId, asignacionId));
    return new Map(rows.map((r) => [r.codigo, r]));
  }

  async function paso(asignacionId: string, codigo: PasoAlumno["codigo"]): Promise<PasoAlumno> {
    const row = (await pasos(asignacionId)).get(codigo);
    if (!row) throw new FixtureError(`la asignación ${asignacionId} no tiene paso ${codigo}.`);
    return row;
  }

  /** Arrange sobre un paso PROPIO (lo que en la app haría otra action). */
  async function actualizarPaso(
    asignacionId: string,
    codigo: PasoAlumno["codigo"],
    cambios: Partial<Pick<PasoAlumno, "estado" | "metadata" | "fechaLimite" | "fechaCompletado">>
  ): Promise<void> {
    if (propios.alumnos.length === 0) throw new FixtureError("no hay alumnos propios en esta corrida.");
    const deAlumnosPropios = db()
      .select({ id: asignaciones.id })
      .from(asignaciones)
      .where(inArray(asignaciones.alumnoId, propios.alumnos));
    const actualizados = await db()
      .update(pasosAlumno)
      .set({ ...cambios, updatedAt: new Date() })
      .where(
        and(
          eq(pasosAlumno.asignacionId, asignacionId),
          eq(pasosAlumno.codigo, codigo),
          inArray(pasosAlumno.asignacionId, deAlumnosPropios)
        )
      )
      .returning({ id: pasosAlumno.id });
    if (actualizados.length !== 1)
      throw new FixtureError(`no se actualizó el paso ${codigo} de ${asignacionId} (¿no es propio?).`);
  }

  async function asignacionPorId(id: string): Promise<Asignacion> {
    const [row] = await db().select().from(asignaciones).where(eq(asignaciones.id, id)).limit(1);
    if (!row) throw new FixtureError(`no existe la asignación ${id}.`);
    return row;
  }

  async function viajePorId(id: string): Promise<Viaje> {
    const [row] = await db().select().from(viajes).where(eq(viajes.id, id)).limit(1);
    if (!row) throw new FixtureError(`no existe el viaje ${id}.`);
    return row;
  }

  async function alumnoPorId(id: string): Promise<Alumno> {
    const [row] = await db().select().from(alumnos).where(eq(alumnos.id, id)).limit(1);
    if (!row) throw new FixtureError(`no existe el alumno ${id}.`);
    return row;
  }

  async function cuotasDe(asignacionId: string) {
    return db()
      .select()
      .from(cuotas)
      .where(eq(cuotas.asignacionId, asignacionId))
      .orderBy(cuotas.numero);
  }

  /**
   * Borra EXACTAMENTE lo de esta corrida: ids registrados más cualquier fila
   * con el prefijo único de la corrida (por si un INSERT llegó a la DB pero el
   * test cayó antes de registrarlo).
   */
  async function limpiar(): Promise<void> {
    if (!cliente) return;
    const [vs, as, cs] = await Promise.all([
      db().select({ id: viajes.id }).from(viajes).where(like(viajes.codigo, `${prefijoCodigo}%`)),
      db().select({ id: alumnos.id }).from(alumnos).where(like(alumnos.dni, `${prefijoCodigo}%`)),
      db().select({ id: colegios.id }).from(colegios).where(like(colegios.nombre, `${prefijoColegio}%`)),
    ]);
    const unir = (a: string[], b: { id: string }[]) => [...new Set([...a, ...b.map((r) => r.id)])];
    await borrarPorIds(
      db(),
      {
        viajes: unir(propios.viajes, vs),
        alumnos: unir(propios.alumnos, as),
        colegios: unir(propios.colegios, cs),
      },
      like(notificacionesEnviadas.destinatario, `${prefijoEmail}%@${DOMINIO_EMAIL}`)
    );
  }

  return {
    corrida,
    propios,
    iniciar,
    db,
    colegio,
    viaje,
    alumno,
    asignacion,
    pasos,
    paso,
    actualizarPaso,
    asignacionPorId,
    viajePorId,
    alumnoPorId,
    cuotasDe,
    limpiar,
  };
}

/**
 * Cuenta filas con los prefijos genéricos de integración en todas las tablas
 * que tocan los fixtures. Sirve para verificar a mano que no quedó nada.
 */
export async function contarRestosIntegracion(db: DB) {
  const [vs, as, cs, ns] = await Promise.all([
    db.select({ id: viajes.id }).from(viajes).where(or(like(viajes.codigo, "INT-%"), like(viajes.nombre, "[INT]%"))),
    db
      .select({ id: alumnos.id })
      .from(alumnos)
      .where(
        or(
          like(alumnos.dni, "INT-%"),
          like(alumnos.nombre, "[INT]%"),
          like(alumnos.tutor1Email, `int+%@${DOMINIO_EMAIL}`)
        )
      ),
    db.select({ id: colegios.id }).from(colegios).where(like(colegios.nombre, "[INT]%")),
    db
      .select({ id: notificacionesEnviadas.id })
      .from(notificacionesEnviadas)
      .where(like(notificacionesEnviadas.destinatario, `int+%@${DOMINIO_EMAIL}`)),
  ]);
  return { viajes: vs.length, alumnos: as.length, colegios: cs.length, notificaciones: ns.length };
}
