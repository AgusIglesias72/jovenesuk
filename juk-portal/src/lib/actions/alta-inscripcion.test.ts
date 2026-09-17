import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditoria, auditoriasDe, resetearMocks, sentry } from "@/lib/actions/__tests__/mocks";

/*
 * La compuerta del alta automática.
 *
 * Los mocks se ponen en la capa de DATOS, no en `altaDesdeInscripcion`: lo que
 * hay que probar es que con un DNI ya cargado NO se llama a
 * `asegurarCuentaFamilia` ni se asigna viaje, y eso solo se ve si la query real
 * corre. Con la query mockeada, el test pasaría aunque el agujero estuviera
 * abierto.
 */

const q = vi.hoisted(() => ({
  getAlumnoByDni: vi.fn(),
  createAlumno: vi.fn(),
  asegurarCuentaFamilia: vi.fn(),
  getViajeById: vi.fn(),
  countAsignacionesActivas: vi.fn(),
  asignarConTablero: vi.fn(),
  registrarResolucionAlta: vi.fn(),
  /** Lo que devuelve el SELECT de `existeCuentaConEmail` (cuenta previa o no). */
  usuariosConEseEmail: [] as Array<{ id: string }>,
}));

vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock(
  "@/lib/actions/safe-audit",
  async () => (await import("@/lib/actions/__tests__/mocks")).auditoria
);
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => q.usuariosConEseEmail }),
      }),
    }),
  },
}));
vi.mock("@/lib/db/queries/alumnos", () => ({
  getAlumnoByDni: q.getAlumnoByDni,
  createAlumno: q.createAlumno,
}));
vi.mock("@/lib/db/queries/familias", () => ({ asegurarCuentaFamilia: q.asegurarCuentaFamilia }));
vi.mock("@/lib/db/queries/viajes", () => ({ getViajeById: q.getViajeById }));
vi.mock("@/lib/db/queries/asignaciones", () => ({
  countAsignacionesActivas: q.countAsignacionesActivas,
}));
vi.mock("@/lib/db/queries/asignar-alumno", () => ({ asignarConTablero: q.asignarConTablero }));
vi.mock("@/lib/db/queries/resolucion-inscripcion", () => ({
  registrarResolucionAlta: q.registrarResolucionAlta,
}));

import type { Inscripcion } from "@/lib/db/schema/inscripciones";

import { procesarAltaInscripcion } from "./alta-inscripcion";

const INSCRIPCION_ID = "11111111-0000-4000-8000-000000000001";
const COMUNICACION_ID = "22222222-0000-4000-8000-000000000001";
const VIAJE_ID = "33333333-0000-4000-8000-000000000001";
const ALUMNO_ID = "44444444-0000-4000-8000-000000000001";
const ALUMNO_EXISTENTE_ID = "44444444-0000-4000-8000-000000000009";
const ASIGNACION_ID = "55555555-0000-4000-8000-000000000001";
const FAMILIA_USER_ID = "66666666-0000-4000-8000-000000000001";
const ADMIN_ID = "77777777-0000-4000-8000-000000000001";

const CON_INVITACION = { via: "invitacion", comunicacionId: COMUNICACION_ID } as const;

function ficha(extra: Partial<Inscripcion> = {}): Inscripcion {
  return {
    id: INSCRIPCION_ID,
    numero: 123,
    comunicacionId: COMUNICACION_ID,
    tokenHash: "hash-del-token",
    variante: "a",
    viajeId: VIAJE_ID,

    nombre: "[INT] Malena",
    apellido: "[INT] Iglesias",
    fechaNacimiento: "2009-04-12",
    dni: "45102338",
    numeroPasaporte: "AAB123456",
    fechaVencimientoPasaporte: "2031-08-30",

    telefonoAlumno: null,
    emailAlumno: null,
    alergiasSalud: null,

    tutor1Nombre: "[INT] Carolina Iglesias",
    tutor1Celular: "+54 9 11 5555 5555",
    tutor1Email: "int+tutor@int.jovenesenuk.com",

    preferenciasAlojamiento: null,
    nivelInglesAutoevaluacion: null,

    estado: "recibida",
    alumnoId: null,
    motivo: null,

    consentimientoVersion: "2026-09",
    consentimientoTextoHash: "hash-del-texto",
    consentimientoEl: new Date("2026-09-10T12:00:00.000Z"),

    borradoEl: null,
    borradoPor: null,
    motivoBorrado: null,
    datosPurgadosEl: null,

    createdAt: new Date("2026-09-10T12:00:00.000Z"),
    ...extra,
  };
}

/** Lo que se escribió en la ficha (la bandeja lee exactamente esto). */
function sellado() {
  expect(q.registrarResolucionAlta).toHaveBeenCalledTimes(1);
  return q.registrarResolucionAlta.mock.calls[0] as [
    string,
    { estado: string; motivo: string | null; alumnoId: string | null },
  ];
}

/** Ni cuenta de familia ni viaje: el alta no tocó nada de eso. */
function sinTocarFamiliaNiViaje() {
  expect(q.asegurarCuentaFamilia).not.toHaveBeenCalled();
  expect(q.asignarConTablero).not.toHaveBeenCalled();
}

beforeEach(() => {
  resetearMocks();
  q.usuariosConEseEmail = [];
  q.getAlumnoByDni.mockResolvedValue(null);
  q.createAlumno.mockResolvedValue({ id: ALUMNO_ID, dni: "45102338", apellido: "[INT] Iglesias" });
  q.asegurarCuentaFamilia.mockResolvedValue({ estado: "vinculada", userId: FAMILIA_USER_ID });
  q.getViajeById.mockResolvedValue({
    id: VIAJE_ID,
    estado: "inscripcion_abierta",
    capacidadMaxima: 20,
  });
  q.countAsignacionesActivas.mockResolvedValue(3);
  q.asignarConTablero.mockResolvedValue({
    asignacionId: ASIGNACION_ID,
    autoConfirmado: false,
    pasosCreados: 12,
  });
  q.registrarResolucionAlta.mockResolvedValue(true);
});

describe("procesarAltaInscripcion — la compuerta", () => {
  it("sin invitación no llega al alta: no crea alumno ni toca cuentas de familia", async () => {
    const res = await procesarAltaInscripcion(ficha(), { via: "ninguna" });

    expect(q.getAlumnoByDni).not.toHaveBeenCalled();
    expect(q.createAlumno).not.toHaveBeenCalled();
    sinTocarFamiliaNiViaje();
    expect(auditoria.safeAudit).not.toHaveBeenCalled();

    expect(res.altaEjecutada).toBe(false);
    expect(res.estado).toBe("requiere_revision");
    expect(res.motivo).toContain("sin una invitación válida");
    expect(sellado()[1].estado).toBe("requiere_revision");
  });

  it("con el DNI ya cargado corta antes de tocar la cuenta de familia y el viaje", async () => {
    // El ataque: una ficha pública con el email de OTRA familia y el DNI de un
    // alumno que ya existe. No puede moverle la cuenta ni el viaje.
    q.getAlumnoByDni.mockResolvedValue({ id: ALUMNO_EXISTENTE_ID, dni: "45102338" });

    const res = await procesarAltaInscripcion(
      ficha({ tutor1Email: "atacante@example.com" }),
      CON_INVITACION
    );

    expect(q.createAlumno).not.toHaveBeenCalled();
    sinTocarFamiliaNiViaje();

    expect(res.estado).toBe("duplicada");
    expect(res.alumnoId).toBe(ALUMNO_EXISTENTE_ID);
    expect(res.motivo).toContain("no se tocó al alumno existente");
    expect(sellado()[1]).toMatchObject({
      estado: "duplicada",
      alumnoId: ALUMNO_EXISTENTE_ID,
    });
  });

  it("el DNI tomado que no se puede releer queda duplicada, con el motivo real", async () => {
    q.getAlumnoByDni.mockResolvedValue(null);
    q.createAlumno.mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: "23505" })
    );

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(res.estado).toBe("duplicada");
    expect(res.alumnoId).toBeNull();
    expect(res.motivo).toContain("buscalo a mano");
    sinTocarFamiliaNiViaje();
  });
});

describe("procesarAltaInscripcion — el vínculo de familia manda", () => {
  it("crear + asignado es el único caso 100% automático: queda procesada", async () => {
    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(q.asegurarCuentaFamilia).toHaveBeenCalledWith(
      ALUMNO_ID,
      "int+tutor@int.jovenesenuk.com",
      "[INT] Carolina Iglesias"
    );
    expect(q.asignarConTablero).toHaveBeenCalledTimes(1);

    expect(res.estado).toBe("procesada");
    expect(res.motivo).toBeNull();
    expect(res.alumnoId).toBe(ALUMNO_ID);

    const [creacion] = auditoriasDe("create");
    expect(creacion).toMatchObject({
      entidadTipo: "alumno",
      entidadId: ALUMNO_ID,
      usuarioId: null,
      metadata: { origen: "inscripcion_web", vinculo: "crear", comunicacionId: COMUNICACION_ID },
    });
    expect(auditoriasDe("asignar_a_viaje")).toHaveLength(1);
  });

  it("vincular se hace, pero la ficha queda para revisar y con auditoría propia", async () => {
    // La cuenta ya existía ANTES de la carga: por eso la rama es `vincular`.
    q.usuariosConEseEmail = [{ id: FAMILIA_USER_ID }];

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(q.asegurarCuentaFamilia).toHaveBeenCalledTimes(1);
    // Nunca con `confirmarVinculo`: esa confirmación es de un admin.
    expect(q.asegurarCuentaFamilia.mock.calls[0]?.[3]).toBeUndefined();

    expect(res.estado).toBe("requiere_revision");
    expect(res.alumnoId).toBe(ALUMNO_ID);
    expect(res.motivo).toContain("ya tenía una cuenta de familia");

    const [vinculo] = auditoriasDe("update");
    expect(vinculo).toMatchObject({
      entidadTipo: "alumno",
      entidadId: ALUMNO_ID,
      metadata: { vinculo: "cuenta_existente", familiaUserId: FAMILIA_USER_ID },
    });
    expect(sellado()[1].estado).toBe("requiere_revision");
  });

  it("requiere_confirmacion: el alumno queda SIN cuenta y el motivo nombra a los otros alumnos", async () => {
    q.usuariosConEseEmail = [{ id: FAMILIA_USER_ID }];
    q.asegurarCuentaFamilia.mockResolvedValue({
      estado: "requiere_confirmacion",
      userId: FAMILIA_USER_ID,
      alumnos: [
        { id: ALUMNO_EXISTENTE_ID, dni: "40111222", nombre: "Juan", apellido: "Pérez" },
      ],
    });

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(res.estado).toBe("requiere_revision");
    expect(res.alumnoId).toBe(ALUMNO_ID);
    expect(res.motivo).toContain("alumnos de otro apellido");
    expect(res.motivo).toContain("Pérez, Juan (DNI 40111222)");
    expect(res.motivo).toContain("SIN cuenta del Portal de Familias");
    // El vínculo no se hizo: no hay auditoría de cuenta existente.
    expect(auditoriasDe("update")).toHaveLength(0);
    expect(auditoriasDe("create")[0]).toMatchObject({
      metadata: { vinculo: "requiere_confirmacion" },
    });
  });

  it("email_del_equipo: nunca automático, el alumno queda sin cuenta", async () => {
    q.usuariosConEseEmail = [{ id: ADMIN_ID }];
    q.asegurarCuentaFamilia.mockResolvedValue({
      estado: "sin_cuenta",
      motivo: "email_del_equipo",
    });

    const res = await procesarAltaInscripcion(ficha({ tutor1Email: "admin@jovenesenuk.com" }), {
      via: "equipo",
      usuarioId: ADMIN_ID,
    });

    expect(res.estado).toBe("requiere_revision");
    expect(res.motivo).toContain("usuario del equipo");
    expect(auditoriasDe("update")).toHaveLength(0);
    // Lo disparó una persona: la auditoría la nombra.
    expect(auditoriasDe("create")[0]).toMatchObject({
      usuarioId: ADMIN_ID,
      metadata: { via: "equipo", vinculo: "email_del_equipo" },
    });
  });
});

describe("procesarAltaInscripcion — la asignación al viaje", () => {
  it("sin cupo el alumno se crea sin asignar, con motivo claro y SIN quedar en error", async () => {
    q.countAsignacionesActivas.mockResolvedValue(20);

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(q.createAlumno).toHaveBeenCalledTimes(1);
    expect(q.asignarConTablero).not.toHaveBeenCalled();

    expect(res.estado).toBe("requiere_revision");
    expect(res.estado).not.toBe("error");
    expect(res.motivo).toContain("no tiene cupo");
    expect(res.alumnoId).toBe(ALUMNO_ID);
    expect(auditoriasDe("asignar_a_viaje")).toHaveLength(0);
  });

  it("una ficha sin viaje deja al alumno pre-inscripto y la ficha para asignar", async () => {
    const res = await procesarAltaInscripcion(ficha({ viajeId: null }), CON_INVITACION);

    expect(q.getViajeById).not.toHaveBeenCalled();
    expect(res.estado).toBe("requiere_revision");
    expect(res.motivo).toContain("no traía viaje");
  });

  it("el viaje que se auto-confirma con la asignación queda auditado", async () => {
    q.asignarConTablero.mockResolvedValue({
      asignacionId: ASIGNACION_ID,
      autoConfirmado: true,
      pasosCreados: 12,
    });

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(res.estado).toBe("procesada");
    expect(auditoriasDe("cambio_estado_viaje")[0]).toMatchObject({
      entidadId: VIAJE_ID,
      metadata: { estado: "confirmado", motivo: "auto_5_alumnos" },
    });
  });
});

describe("procesarAltaInscripcion — desenlaces inesperados", () => {
  it("un fallo real del alta deja la ficha en error, con motivo, y no lanza", async () => {
    q.createAlumno.mockRejectedValue(new Error("neon caído"));

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(res.estado).toBe("error");
    expect(res.motivo).toContain("se puede reintentar");
    expect(sentry.captureException).toHaveBeenCalled();
    expect(sellado()[1].estado).toBe("error");
  });

  it("si no se puede sellar la ficha, el alta igual se reporta y no rompe", async () => {
    q.registrarResolucionAlta.mockRejectedValue(new Error("neon caído"));

    const res = await procesarAltaInscripcion(ficha(), CON_INVITACION);

    expect(res.estado).toBe("procesada");
    expect(res.alumnoId).toBe(ALUMNO_ID);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
