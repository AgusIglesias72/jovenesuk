import { randomUUID } from "node:crypto";

import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { users, type User } from "@/lib/db/schema/users";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";
import type { DatosAltaInscripcion, ResultadoAltaInscripcion } from "./alta-inscripcion";

/*
 * El alta desde el Application Form propio contra Postgres.
 *
 * Con mocks esto no se prueba: lo que importa es qué QUEDA en la base cuando la
 * ficha llegó de un formulario público. Sobre todo el caso del DNI repetido, que
 * es el blindaje del ataque: una ficha con el email de otra familia no puede
 * moverle la cuenta a un alumno que ya existe.
 *
 * Los fixtures no manejan `users`, así que las cuentas se crean y se borran acá
 * por el prefijo de email de la corrida. Los alumnos que crea la query bajo
 * prueba llevan el DNI con el prefijo de la corrida: `fx.limpiar()` los barre
 * igual que a los propios.
 */

const fx = crearFixtures("ALTAINS");
const PREFIJO_DNI = `INT-${fx.corrida}-`;
const DOMINIO_EMAIL = "int.jovenesenuk.com";
const PREFIJO_EMAIL = `int+${fx.corrida.toLowerCase()}-`;
const emailDe = (slug: string) => `${PREFIJO_EMAIL}${slug}@${DOMINIO_EMAIL}`;

const INICIO = dia("2030-07-10");
let secuencia = 0;
const proximoDni = () => `${PREFIJO_DNI}D${(secuencia += 1)}`;

type AltaQ = typeof import("./alta-inscripcion");
type Creado = Extract<ResultadoAltaInscripcion, { tipo: "creado" }>;

/**
 * La ficha tal como sale de la tabla de aterrizaje. El DNI va con el prefijo de
 * la corrida y no en dígitos (que es lo que llega en producción): la columna es
 * texto y la query no lo interpreta, y el prefijo es lo que garantiza que el
 * cleanup no mire un DNI real del dueño.
 */
function ficha(overrides: Partial<DatosAltaInscripcion> = {}): DatosAltaInscripcion {
  return {
    nombre: "[INT] Nombre",
    apellido: "[INT] Apellido form",
    fechaNacimiento: "2014-03-10",
    dni: proximoDni(),
    numeroPasaporte: "INTP0001",
    fechaVencimientoPasaporte: "2099-12-31",
    telefonoAlumno: null,
    emailAlumno: null,
    alergiasSalud: null,
    tutor1Nombre: "[INT] Tutor",
    tutor1Celular: "+540000000000",
    tutor1Email: emailDe("tutor"),
    preferenciasAlojamiento: null,
    nivelInglesAutoevaluacion: null,
    viajeId: null,
    ...overrides,
  };
}

function esCreado(r: ResultadoAltaInscripcion): asserts r is Creado {
  expect(r).toMatchObject({ tipo: "creado" });
}

describe.skipIf(!integracionHabilitada)("altaDesdeInscripcion contra Postgres", () => {
  let q: AltaQ;

  beforeAll(async () => {
    await fx.iniciar();
    q = await import("./alta-inscripcion");
  });

  afterAll(async () => {
    // Antes de fx.limpiar() no hace falta ningún orden: alumnos.familia_user_id
    // es una FK lazy (sin constraint), así que ninguna de las dos bloquea a la
    // otra. Las cuentas se van por el prefijo de email de la corrida, y sus
    // accounts/sessions cascadean.
    await fx.db().delete(users).where(like(users.email, `${PREFIJO_EMAIL}%@${DOMINIO_EMAIL}`));
    await fx.limpiar();
  });

  /** Cuenta de arranque (sin Better-Auth: el vínculo solo mira id y rol). */
  async function crearUsuario(email: string, role: User["role"]): Promise<User> {
    const [row] = await fx
      .db()
      .insert(users)
      .values({ email, name: `[INT] ${role}`, role, emailVerified: true })
      .returning();
    if (!row) throw new Error("el INSERT de usuario no devolvió fila.");
    return row;
  }

  async function colgarDeCuenta(alumnoId: string, familiaUserId: string): Promise<void> {
    await fx.db().update(alumnos).set({ familiaUserId }).where(eq(alumnos.id, alumnoId));
  }

  async function usuarioPorEmail(email: string): Promise<User | undefined> {
    const filas = await fx.db().select().from(users).where(eq(users.email, email)).limit(1);
    return filas[0];
  }

  async function asignacionesDe(alumnoId: string): Promise<string[]> {
    const filas = await fx
      .db()
      .select({ id: asignaciones.id })
      .from(asignaciones)
      .where(eq(asignaciones.alumnoId, alumnoId));
    return filas.map((f) => f.id);
  }

  async function alumnosConDni(dni: string): Promise<string[]> {
    const filas = await fx.db().select({ id: alumnos.id }).from(alumnos).where(eq(alumnos.dni, dni));
    return filas.map((f) => f.id);
  }

  async function viajeAbierto(capacidadMaxima?: number) {
    const colegio = await fx.colegio();
    return fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO, capacidadMaxima });
  }

  it("alta completa: alumno por formulario_web, cuenta de familia nueva y tablero M6 armado", async () => {
    const viaje = await viajeAbierto();
    const datos = ficha({ viajeId: viaje.id, tutor1Email: emailDe("alta-completa") });

    const r = await q.altaDesdeInscripcion(datos);
    esCreado(r);

    expect(r.vinculo).toEqual({ rama: "crear", familiaUserId: expect.any(String) });
    expect(r.asignacion).toEqual({
      estado: "asignado",
      viajeId: viaje.id,
      asignacionId: expect.any(String),
      autoConfirmado: false,
    });

    const alumno = await fx.alumnoPorId(r.alumnoId);
    expect(alumno).toMatchObject({
      dni: datos.dni,
      canalAlta: "formulario_web",
      // Nace pre_inscripto y pasa a inscripto en el mismo alta porque se lo
      // asignó al viaje (PRD §5.5): el canal es lo que prueba de dónde vino.
      estado: "inscripto",
      tutor1Email: datos.tutor1Email,
    });
    expect(alumno.fechaNacimiento.toISOString()).toBe("2014-03-10T00:00:00.000Z");
    expect(alumno.fechaVencimientoPasaporte.toISOString()).toBe("2099-12-31T00:00:00.000Z");

    if (r.vinculo.rama !== "crear") throw new Error("se esperaba la rama crear");
    expect(alumno.familiaUserId).toBe(r.vinculo.familiaUserId);
    const cuenta = await usuarioPorEmail(datos.tutor1Email);
    expect(cuenta).toMatchObject({ id: r.vinculo.familiaUserId, role: "familia", isActive: true });

    if (r.asignacion.estado !== "asignado") throw new Error("se esperaba la asignación");
    const pasos = await fx.pasos(r.asignacion.asignacionId);
    expect(pasos.size).toBe(11);
    expect(pasos.get("paso_0")).toMatchObject({
      estado: "completado",
      metadata: { canal: "formulario_web" },
    });
    expect(pasos.get("paso_0")?.fechaCompletado?.getTime()).toBe(alumno.fechaAlta.getTime());
  });

  it("DNI ya cargado: devuelve duplicado y NO le toca la cuenta de familia al alumno que ya estaba", async () => {
    const viaje = await viajeAbierto();
    const existente = await fx.alumno({ fechaNacimiento: dia("2013-01-01") });
    const cuentaReal = await crearUsuario(emailDe("familia-real"), "familia");
    await colgarDeCuenta(existente.id, cuentaReal.id);
    const antes = await fx.alumnoPorId(existente.id);

    // La ficha hostil: el DNI de un alumno que ya existe, con OTRO email de
    // tutor y otro apellido, apuntada a un viaje con cupo.
    const emailAjeno = emailDe("ajeno");
    const r = await q.altaDesdeInscripcion(
      ficha({
        dni: existente.dni,
        tutor1Email: emailAjeno,
        apellido: "[INT] Apellido ajeno",
        viajeId: viaje.id,
      })
    );

    expect(r).toEqual({ tipo: "duplicado", alumnoId: existente.id });

    const despues = await fx.alumnoPorId(existente.id);
    expect(despues.familiaUserId).toBe(cuentaReal.id);
    expect(despues.tutor1Email).toBe(antes.tutor1Email);
    expect(despues.apellido).toBe(antes.apellido);
    expect(despues.estado).toBe(antes.estado);
    expect(despues.updatedAt.getTime()).toBe(antes.updatedAt.getTime());

    // Ni cuenta nueva, ni alumno nuevo, ni asignación.
    expect(await usuarioPorEmail(emailAjeno)).toBeUndefined();
    expect(await alumnosConDni(existente.dni)).toEqual([existente.id]);
    expect(await asignacionesDe(existente.id)).toEqual([]);
  });

  it("viaje sin cupo: el alumno queda pre_inscripto sin asignar y el motivo lo dice", async () => {
    const viaje = await viajeAbierto(1);
    const ocupante = await fx.alumno({ fechaNacimiento: dia("2014-01-01") });
    await fx.asignacion(ocupante.id, viaje.id);

    const r = await q.altaDesdeInscripcion(
      ficha({ viajeId: viaje.id, tutor1Email: emailDe("sin-cupo") })
    );
    esCreado(r);

    expect(r.asignacion).toEqual({ estado: "sin_asignar", motivo: "sin_cupo" });
    // El alta igual se completó: solo falta el viaje, que asigna el equipo.
    expect(r.vinculo.rama).toBe("crear");
    expect((await fx.alumnoPorId(r.alumnoId)).estado).toBe("pre_inscripto");
    expect(await asignacionesDe(r.alumnoId)).toEqual([]);
  });

  for (const estado of ["cancelado", "finalizado"] as const) {
    it(`viaje ${estado}: no rompe, devuelve viaje_no_inscribible y deja al alumno pre_inscripto`, async () => {
      const colegio = await fx.colegio();
      const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO, estado });

      const r = await q.altaDesdeInscripcion(
        ficha({ viajeId: viaje.id, tutor1Email: emailDe(`cerrado-${estado}`) })
      );
      esCreado(r);

      expect(r.asignacion).toEqual({ estado: "sin_asignar", motivo: "viaje_no_inscribible" });
      expect((await fx.alumnoPorId(r.alumnoId)).estado).toBe("pre_inscripto");
      expect(await asignacionesDe(r.alumnoId)).toEqual([]);
    });
  }

  it("viaje que no existe: tampoco rompe el alta", async () => {
    const r = await q.altaDesdeInscripcion(
      ficha({ viajeId: randomUUID(), tutor1Email: emailDe("viaje-fantasma") })
    );
    esCreado(r);

    expect(r.asignacion).toEqual({ estado: "sin_asignar", motivo: "viaje_inexistente" });
    expect((await fx.alumnoPorId(r.alumnoId)).estado).toBe("pre_inscripto");
  });

  it("sin viaje en la ficha: alta sin asignar, con el motivo explícito", async () => {
    const r = await q.altaDesdeInscripcion(ficha({ tutor1Email: emailDe("sin-viaje") }));
    esCreado(r);

    expect(r.asignacion).toEqual({ estado: "sin_asignar", motivo: "sin_viaje" });
    expect(await asignacionesDe(r.alumnoId)).toEqual([]);
  });

  it("rama vincular: se cuelga de la cuenta que ya existía y lo devuelve tal cual", async () => {
    const email = emailDe("hermanos");
    const cuenta = await crearUsuario(email, "familia");
    const hermano = await fx.alumno({ fechaNacimiento: dia("2012-02-02") });
    await colgarDeCuenta(hermano.id, cuenta.id);

    const r = await q.altaDesdeInscripcion(
      ficha({ tutor1Email: email, apellido: hermano.apellido })
    );
    esCreado(r);

    // El efecto ocurre (los hermanos comparten cuenta, MIN-07), pero la rama
    // vuelve nombrada: es lo que la capa de arriba manda a revisión humana.
    expect(r.vinculo).toEqual({ rama: "vincular", familiaUserId: cuenta.id });
    expect((await fx.alumnoPorId(r.alumnoId)).familiaUserId).toBe(cuenta.id);
  });

  it("rama requiere_confirmacion: el alumno se crea SIN cuenta y vuelven los alumnos en conflicto", async () => {
    const email = emailDe("conflicto");
    const cuenta = await crearUsuario(email, "familia");
    const ajeno = await fx.alumno({ fechaNacimiento: dia("2012-03-03") });
    await colgarDeCuenta(ajeno.id, cuenta.id);

    const r = await q.altaDesdeInscripcion(
      ficha({ tutor1Email: email, apellido: "[INT] Apellido distinto" })
    );
    esCreado(r);

    expect(r.vinculo).toEqual({
      rama: "requiere_confirmacion",
      familiaUserId: cuenta.id,
      alumnos: [expect.objectContaining({ id: ajeno.id, dni: ajeno.dni })],
    });
    const alumno = await fx.alumnoPorId(r.alumnoId);
    expect(alumno.familiaUserId).toBeNull();
    expect(alumno.estado).toBe("pre_inscripto");
    // Y la cuenta ajena siguió intacta.
    expect((await fx.alumnoPorId(ajeno.id)).familiaUserId).toBe(cuenta.id);
  });

  it("rama email_del_equipo: el alumno queda pre_inscripto sin cuenta y el usuario del equipo no se toca", async () => {
    const email = emailDe("equipo");
    const admin = await crearUsuario(email, "admin_juk");

    const r = await q.altaDesdeInscripcion(ficha({ tutor1Email: email }));
    esCreado(r);

    expect(r.vinculo).toEqual({ rama: "email_del_equipo" });
    const alumno = await fx.alumnoPorId(r.alumnoId);
    expect(alumno.familiaUserId).toBeNull();
    expect(alumno.estado).toBe("pre_inscripto");
    expect(await usuarioPorEmail(email)).toMatchObject({ id: admin.id, role: "admin_juk" });
  });
});
