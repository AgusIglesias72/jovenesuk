import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Del barril y no de `schema/inscripciones` directo: ese módulo y
// `schema/prospectos` se importan mutuamente, y `prospectos` llama a
// `varianteFormulario()` al evaluarse. El barril los carga en un orden que
// funciona (mismo motivo que en `queries/inscripciones.integration.test.ts`).
import {
  inscripciones,
  prospectoComunicaciones,
  prospectos,
  type Inscripcion,
  type NewInscripcion,
  type ProspectoComunicacion,
} from "@/lib/db/schema";
import { TEXTO_CONSENTIMIENTO, VERSION_CONSENTIMIENTO } from "@/lib/domain/privacidad/politica";
import { FECHA_PURGADA, TEXTO_PURGADO, fechaDeCorte } from "@/lib/domain/privacidad/retencion";
import { hashTexto } from "@/lib/utils/hash-texto";
import { hashToken } from "@/lib/utils/token-opaco";

import { crearFixtures, dia, integracionHabilitada } from "../../../tests/integration/fixtures";

type Job = typeof import("./purgar-inscripciones");
type RetencionQ = typeof import("@/lib/db/queries/retencion");

/*
 * La purga por retención contra Postgres.
 *
 * Nada de esto se puede probar con la base mockeada: lo que está bajo prueba es
 * que el UPDATE deje el talón intacto, que el borde del plazo (día 89 vs. 91)
 * caiga del lado correcto en SQL y que correr la purga dos veces no vuelva a
 * escribir una sola fila.
 *
 * El job barre TODA la base, así que —igual que `scan-recordatorios`— el `ahora`
 * de los escenarios vive en 2003: con ese reloj, ninguna fila real (2026) queda
 * fuera de plazo. Además, antes de correr nada, el beforeAll verifica con las
 * mismas queries del job que las únicas candidatas son las de esta corrida; si
 * apareciera una ajena, el test aborta sin purgar.
 */

const fx = crearFixtures("PURGA");
const PREFIJO = `[INT] ${fx.corrida} `;
const emailDe = (sufijo: string) => `int+${fx.corrida.toLowerCase()}-${sufijo}@int.jovenesenuk.com`;

/** Hora deliberadamente "sucia": el plazo se cuenta por día calendario UTC. */
const AHORA = new Date("2003-04-10T11:00:00.000Z");
const HOY_UTC = Date.UTC(2003, 3, 10);

/** Negativo = en el futuro respecto de AHORA (una invitación todavía vigente). */
function haceDias(n: number): Date {
  return new Date(HOY_UTC - n * 86_400_000);
}

const PURGADA_HACE_MUCHO = new Date("2002-01-01T08:00:00.000Z");

// El índice único parcial de DNI es global sobre las fichas vivas: dos corridas
// en paralelo no pueden compartir documento.
const BASE_DNI = Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 9)).join("");
let secuenciaDni = 200;
const proximoDni = () => `${BASE_DNI}${(secuenciaDni += 1)}`;

describe.skipIf(!integracionHabilitada)("purgarPorRetencion contra Postgres", () => {
  let job: Job;
  let q: RetencionQ;
  let prospectoId: string;
  let alumnoId: string;

  /** Las fichas del escenario, por nombre corto. */
  const ficha: Record<string, Inscripcion> = {};
  /** Las invitaciones del escenario, por nombre corto. */
  const invitacion: Record<string, ProspectoComunicacion> = {};
  const inscripcionIds: string[] = [];

  function datos(n: number, opts: Partial<NewInscripcion> = {}): NewInscripcion {
    return {
      nombre: `${PREFIJO}Nombre ${n}`,
      apellido: `${PREFIJO}Apellido ${n}`,
      fechaNacimiento: "2010-05-04",
      dni: proximoDni(),
      numeroPasaporte: `INTP${n}`,
      fechaVencimientoPasaporte: "2035-01-01",
      telefonoAlumno: "+540000000001",
      emailAlumno: emailDe(`alumno${n}`),
      alergiasSalud: "[INT] alergia al maní",
      tutor1Nombre: `${PREFIJO}Tutor ${n}`,
      tutor1Celular: "+540000000000",
      tutor1Email: emailDe(`tutor${n}`),
      preferenciasAlojamiento: "[INT] sin mascotas",
      nivelInglesAutoevaluacion: "[INT] intermedio",
      tokenHash: hashToken(`int-${fx.corrida}-ficha-${n}`),
      motivo: "[INT] motivo del alta",
      estado: "recibida",
      variante: "a",
      consentimientoVersion: VERSION_CONSENTIMIENTO,
      consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
      consentimientoEl: AHORA,
      ...opts,
    };
  }

  async function insertar(clave: string, valores: NewInscripcion): Promise<Inscripcion> {
    const [row] = await fx.db().insert(inscripciones).values(valores).returning();
    if (!row) throw new Error(`el INSERT de la ficha ${clave} no devolvió fila.`);
    ficha[clave] = row;
    inscripcionIds.push(row.id);
    return row;
  }

  async function insertarInvitacion(
    clave: string,
    valores: { expiraEl: Date; meta?: Record<string, unknown> }
  ): Promise<ProspectoComunicacion> {
    const [row] = await fx
      .db()
      .insert(prospectoComunicaciones)
      .values({
        prospectoId,
        tipo: "email",
        estado: "enviado",
        destinatario: emailDe(clave.toLowerCase()),
        meta: valores.meta ?? null,
        invitacionTokenHash: hashToken(`int-${fx.corrida}-${clave}`),
        invitacionExpiraEl: valores.expiraEl,
        invitacionLoteId: randomUUID(),
      })
      .returning();
    if (!row) throw new Error(`el INSERT de la invitación ${clave} no devolvió fila.`);
    invitacion[clave] = row;
    return row;
  }

  const releerFicha = async (id: string): Promise<Inscripcion> => {
    const [row] = await fx.db().select().from(inscripciones).where(eq(inscripciones.id, id));
    if (!row) throw new Error(`no existe la ficha ${id}.`);
    return row;
  };

  const releerInvitacion = async (id: string): Promise<ProspectoComunicacion> => {
    const [row] = await fx
      .db()
      .select()
      .from(prospectoComunicaciones)
      .where(eq(prospectoComunicaciones.id, id));
    if (!row) throw new Error(`no existe la invitación ${id}.`);
    return row;
  };

  beforeAll(async () => {
    await fx.iniciar();
    job = await import("./purgar-inscripciones");
    q = await import("@/lib/db/queries/retencion");

    const alumno = await fx.alumno({ fechaNacimiento: dia("1990-06-01") });
    alumnoId = alumno.id;

    const [prospecto] = await fx
      .db()
      .insert(prospectos)
      .values({
        nombre: `${PREFIJO}Colegio invitado`,
        ciudad: "[INT] Ciudad",
        emails: [emailDe("prospecto")],
        suscritoOutreach: true,
        unsubscribeToken: randomUUID(),
      })
      .returning();
    if (!prospecto) throw new Error("el INSERT de prospecto no devolvió fila.");
    prospectoId = prospecto.id;

    // ── Inscripciones ──────────────────────────────────────────────────────
    // Procesadas (ya volcadas a un alumno): plazo corto, 90 días.
    await insertar(
      "procesada89",
      datos(1, { estado: "procesada", alumnoId, createdAt: haceDias(89) })
    );
    await insertar(
      "procesada91",
      datos(2, { estado: "procesada", alumnoId, createdAt: haceDias(91) })
    );
    // Sin alumno: plazo largo, 730 días.
    await insertar(
      "sinProcesar91",
      datos(3, { estado: "requiere_revision", createdAt: haceDias(91) })
    );
    await insertar("sinProcesar731", datos(4, { estado: "error", createdAt: haceDias(731) }));
    // Purgada en otra corrida, hace años: no se vuelve a tocar.
    await insertar(
      "yaPurgada",
      datos(5, {
        estado: "anulada",
        createdAt: haceDias(5000),
        datosPurgadosEl: PURGADA_HACE_MUCHO,
      })
    );

    // ── Invitaciones ───────────────────────────────────────────────────────
    await insertarInvitacion("vencida91", { expiraEl: haceDias(91) });
    await insertarInvitacion("vencida89", { expiraEl: haceDias(89) });
    await insertarInvitacion("vigente", { expiraEl: haceDias(-30) });
    await insertarInvitacion("conSello", {
      expiraEl: haceDias(91),
      meta: { invitacionRespondidaEl: haceDias(120).toISOString() },
    });
    const conFicha = await insertarInvitacion("conFicha", { expiraEl: haceDias(91) });
    const conFichaAnulada = await insertarInvitacion("conFichaAnulada", {
      expiraEl: haceDias(91),
    });

    // La ficha que cuelga de la invitación es reciente: sirve de control de
    // "dentro de plazo" y es lo que hace que su invitación cuente como usada.
    await insertar(
      "deLaInvitacion",
      datos(6, { comunicacionId: conFicha.id, createdAt: haceDias(1) })
    );
    // Anular libera el link, pero el rastro de la invitación ya vive en esta
    // ficha y se purga con ella: su token tampoco se limpia por retención.
    await insertar(
      "anuladaDeLaInvitacion",
      datos(7, {
        comunicacionId: conFichaAnulada.id,
        estado: "anulada",
        createdAt: haceDias(1),
      })
    );

    // Guarda: con este reloj, las únicas candidatas tienen que ser las de esta
    // corrida. Si no, el escenario estaría por purgar datos ajenos.
    const candidatas = await q.listInscripcionesPurgables({
      corteProcesada: fechaDeCorte("inscripcion_procesada", AHORA),
      corteSinProcesar: fechaDeCorte("inscripcion_sin_procesar", AHORA),
      limite: 500,
    });
    const ajenas = candidatas.filter((c) => !inscripcionIds.includes(c.id));
    if (ajenas.length > 0) {
      throw new Error(
        `hay ${ajenas.length} inscripciones ajenas fuera de plazo con ahora=${AHORA.toISOString()}: el test no corre.`
      );
    }

    const propias = Object.values(invitacion).map((i) => i.id);
    const invitacionesAjenas = (
      await q.listInvitacionesPurgables({
        corte: fechaDeCorte("invitacion_sin_usar", AHORA),
        limite: 500,
      })
    ).filter((i) => !propias.includes(i.id));
    if (invitacionesAjenas.length > 0) {
      throw new Error(
        `hay ${invitacionesAjenas.length} invitaciones ajenas fuera de plazo: el test no corre.`
      );
    }
  });

  afterAll(async () => {
    // Por id y no por nombre: después de la purga el nombre está vacío.
    if (inscripcionIds.length) {
      await fx.db().delete(inscripciones).where(inArray(inscripciones.id, inscripcionIds));
    }
    // Las comunicaciones cascadean con su prospecto.
    if (prospectoId) await fx.db().delete(prospectos).where(eq(prospectos.id, prospectoId));
    await fx.limpiar();
  });

  it("purga lo vencido, deja el talón y no toca el borde (día 89 sí, día 91 no)", async () => {
    const resumen = await job.purgarPorRetencion(AHORA);

    expect(resumen).toEqual({ inscripcionesPurgadas: 2, invitacionesLimpiadas: 1 });

    const original = ficha.procesada91!;
    const purgada = await releerFicha(original.id);

    // Ni un dato personal.
    expect(purgada).toMatchObject({
      nombre: TEXTO_PURGADO,
      apellido: TEXTO_PURGADO,
      dni: TEXTO_PURGADO,
      numeroPasaporte: TEXTO_PURGADO,
      fechaNacimiento: FECHA_PURGADA,
      fechaVencimientoPasaporte: FECHA_PURGADA,
      telefonoAlumno: null,
      emailAlumno: null,
      alergiasSalud: null,
      tutor1Nombre: TEXTO_PURGADO,
      tutor1Celular: TEXTO_PURGADO,
      tutor1Email: TEXTO_PURGADO,
      preferenciasAlojamiento: null,
      nivelInglesAutoevaluacion: null,
      tokenHash: null,
    });
    expect(purgada.datosPurgadosEl?.toISOString()).toBe(AHORA.toISOString());

    // El talón, intacto: sin esto las métricas de la campaña mentirían hacia
    // atrás y se perdería la prueba del consentimiento.
    expect(purgada).toMatchObject({
      id: original.id,
      numero: original.numero,
      estado: "procesada",
      variante: original.variante,
      alumnoId,
      motivo: original.motivo,
      comunicacionId: original.comunicacionId,
      consentimientoVersion: original.consentimientoVersion,
      consentimientoTextoHash: original.consentimientoTextoHash,
    });
    expect(purgada.createdAt.toISOString()).toBe(original.createdAt.toISOString());

    // La sin procesar de 731 días también cayó (plazo largo cumplido).
    expect((await releerFicha(ficha.sinProcesar731!.id)).datosPurgadosEl).not.toBeNull();

    // El borde: 89 días de una procesada y 91 de una sin procesar se conservan
    // ENTEROS, no solo sin sellar.
    for (const clave of ["procesada89", "sinProcesar91", "deLaInvitacion"]) {
      const intacta = await releerFicha(ficha[clave]!.id);
      expect(intacta.datosPurgadosEl, clave).toBeNull();
      expect(intacta.nombre, clave).toBe(ficha[clave]!.nombre);
      expect(intacta.dni, clave).toBe(ficha[clave]!.dni);
      expect(intacta.alergiasSalud, clave).toBe("[INT] alergia al maní");
      expect(intacta.tokenHash, clave).toBe(ficha[clave]!.tokenHash);
    }
  });

  it("no vuelve a tocar una ficha que ya estaba purgada", async () => {
    const original = ficha.yaPurgada!;
    const sinTocar = await releerFicha(original.id);

    // Sigue con su sello viejo (no se movió a AHORA) y con lo que tenía.
    expect(sinTocar.datosPurgadosEl?.toISOString()).toBe(PURGADA_HACE_MUCHO.toISOString());
    expect(sinTocar.nombre).toBe(original.nombre);
    expect(sinTocar.dni).toBe(original.dni);
  });

  it("limpia el token de la invitación vencida sin usar, y de ninguna otra", async () => {
    expect((await releerInvitacion(invitacion.vencida91!.id)).invitacionTokenHash).toBeNull();

    // Vencida hace 89 días (dentro del trimestre), todavía vigente, usada por
    // sello y usada por la ficha que cuelga: las cuatro conservan su token.
    for (const clave of ["vencida89", "vigente", "conSello", "conFicha", "conFichaAnulada"]) {
      const intacta = await releerInvitacion(invitacion[clave]!.id);
      expect(intacta.invitacionTokenHash, clave).toBe(invitacion[clave]!.invitacionTokenHash);
    }
  });

  it("es idempotente: la segunda corrida no purga ni reescribe nada", async () => {
    const antes = await releerFicha(ficha.procesada91!.id);

    const resumen = await job.purgarPorRetencion(AHORA);

    expect(resumen).toEqual({ inscripcionesPurgadas: 0, invitacionesLimpiadas: 0 });

    const despues = await releerFicha(ficha.procesada91!.id);
    expect(despues.datosPurgadosEl?.toISOString()).toBe(antes.datosPurgadosEl?.toISOString());
  });

  it("procesa por lotes acotados: con lote de 1 el resultado es el mismo", async () => {
    // Una ficha nueva por cada plazo, las dos fuera de término.
    const a = await insertar(
      "lote1",
      datos(8, { estado: "procesada", alumnoId, createdAt: haceDias(200) })
    );
    const b = await insertar(
      "lote2",
      datos(9, { estado: "procesada", alumnoId, createdAt: haceDias(300) })
    );

    const resumen = await job.purgarPorRetencion(AHORA, { lote: 1 });

    expect(resumen.inscripcionesPurgadas).toBe(2);
    expect((await releerFicha(a.id)).nombre).toBe(TEXTO_PURGADO);
    expect((await releerFicha(b.id)).nombre).toBe(TEXTO_PURGADO);
  });

  it("el tope de lotes corta la corrida y la siguiente retoma donde quedó", async () => {
    const a = await insertar(
      "tope1",
      datos(10, { estado: "procesada", alumnoId, createdAt: haceDias(400) })
    );
    const b = await insertar(
      "tope2",
      datos(11, { estado: "procesada", alumnoId, createdAt: haceDias(401) })
    );

    // Una vuelta de un lote de uno: se lleva la más vieja (el orden es total).
    const primera = await job.purgarPorRetencion(AHORA, { lote: 1, maxLotes: 1 });
    expect(primera.inscripcionesPurgadas).toBe(1);
    expect((await releerFicha(b.id)).nombre).toBe(TEXTO_PURGADO);
    expect((await releerFicha(a.id)).nombre).toBe(a.nombre);

    const segunda = await job.purgarPorRetencion(AHORA, { lote: 1, maxLotes: 1 });
    expect(segunda.inscripcionesPurgadas).toBe(1);
    expect((await releerFicha(a.id)).nombre).toBe(TEXTO_PURGADO);
  });
});
