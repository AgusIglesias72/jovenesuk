import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Alumno } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { notificacionesEnviadas } from "@/lib/db/schema/notificaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";
import { a1Vencido, recordatorioA1DeHoy, recordatorioD1DeHoy } from "@/lib/domain/recordatorios";

import {
  crearFixtures,
  dia,
  FixtureError,
  integracionHabilitada,
  sumarDias,
} from "../../../tests/integration/fixtures";

vi.mock("@/lib/email/send-recordatorio", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/email/send-recordatorio")>();
  return { sendRecordatorioEmail: vi.fn(real.sendRecordatorioEmail) };
});

type Scan = (typeof import("./scan-recordatorios"))["scanRecordatorios"];
type ListarPasos = (typeof import("@/lib/db/queries/recordatorios"))["listPasosParaRecordatorio"];
type Asignar = (typeof import("@/lib/db/queries/asignar-alumno"))["asignarConTablero"];
type Cancelar = (typeof import("@/lib/db/queries/asignaciones"))["cancelarAsignacion"];
type EmailModulo = typeof import("@/lib/email");

const fx = crearFixtures("RECOR");
const HOY = new Date("2003-04-10T11:00:00.000Z");
const MENOR = dia("1990-06-01");

/*
 * El scan recorre TODOS los pasos A1/D1 activos de la base y escribe
 * (notificaciones_enviadas, estado 'vencido'). Para no tocar datos ajenos, los
 * escenarios propios viven en 2002-2003 y, antes de cada corrida, se verifica
 * con las mismas funciones de dominio que ninguna fila ajena dispararía nada
 * con ese `hoy`; si alguna lo haría, el test aborta sin correr el scan.
 */
describe.skipIf(!integracionHabilitada)("scanRecordatorios contra Postgres", () => {
  let scan: Scan;
  let listPasosParaRecordatorio: ListarPasos;
  let asignar: Asignar;
  let cancelar: Cancelar;
  let email: EmailModulo;
  const asig = { x: "", y: "", z: "", cancelada: "", enCurso: "" };
  let tutorX: Alumno;

  beforeAll(async () => {
    vi.stubEnv("EMAIL_DRY_RUN", "1");
    await fx.iniciar();
    ({ scanRecordatorios: scan } = await import("./scan-recordatorios"));
    ({ listPasosParaRecordatorio } = await import("@/lib/db/queries/recordatorios"));
    ({ asignarConTablero: asignar } = await import("@/lib/db/queries/asignar-alumno"));
    ({ cancelarAsignacion: cancelar } = await import("@/lib/db/queries/asignaciones"));
    email = await import("@/lib/email");

    const colegio = await fx.colegio();
    const abierto = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: sumarDias(HOY, 30) });
    const enCurso = await fx.viaje({
      colegioDestinoId: colegio.id,
      fechaInicio: sumarDias(HOY, -5),
      fechaFin: sumarDias(HOY, 60),
    });

    const inscribir = async (viaje: Viaje) => {
      const alumno = await fx.alumno({ fechaNacimiento: MENOR });
      const r = await asignar({ viaje: await fx.viajePorId(viaje.id), alumno, usuarioId: null });
      return { alumno, asignacionId: r.asignacionId };
    };

    const x = await inscribir(abierto);
    tutorX = x.alumno;
    asig.x = x.asignacionId;
    await fx.actualizarPaso(asig.x, "a1", { fechaLimite: sumarDias(HOY, 7) });

    asig.y = (await inscribir(abierto)).asignacionId;
    await fx.actualizarPaso(asig.y, "a1", { fechaLimite: sumarDias(HOY, -1) });
    await fx.actualizarPaso(asig.y, "d1", { estado: "completado" });

    asig.z = (await inscribir(abierto)).asignacionId;
    await fx.actualizarPaso(asig.z, "a1", { estado: "completado", fechaLimite: sumarDias(HOY, 7) });
    await fx.actualizarPaso(asig.z, "d1", { estado: "na" });

    asig.cancelada = (await inscribir(abierto)).asignacionId;
    await fx.actualizarPaso(asig.cancelada, "a1", { fechaLimite: sumarDias(HOY, 14) });
    await cancelar(asig.cancelada, abierto.id, "[INT] baja");

    // asignarConTablero exige un viaje inscribible: se inscribe con el viaje
    // abierto y recién después pasa a en curso.
    asig.enCurso = (await inscribir(enCurso)).asignacionId;
    await fx.actualizarPaso(asig.enCurso, "a1", { fechaLimite: sumarDias(HOY, 3) });
    await fx.db().update(viajes).set({ estado: "en_curso" }).where(eq(viajes.id, enCurso.id));
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await fx.limpiar();
  });

  async function pasoIdsPropios(): Promise<Set<string>> {
    const rows = await fx
      .db()
      .select({ id: pasosAlumno.id })
      .from(pasosAlumno)
      .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
      .where(inArray(asignaciones.alumnoId, fx.propios.alumnos));
    return new Set(rows.map((r) => r.id));
  }

  async function scanSeguro(hoy: Date) {
    const propios = await pasoIdsPropios();
    const ajenas = (await listPasosParaRecordatorio()).filter((f) => {
      if (propios.has(f.pasoId)) return false;
      if (f.codigo === "a1") {
        return (
          f.fechaLimite !== null &&
          (a1Vencido(f.fechaLimite, hoy, f.estado) || recordatorioA1DeHoy(f.fechaLimite, hoy, f.estado) !== null)
        );
      }
      return f.codigo === "d1" && recordatorioD1DeHoy(f.fechaInicioViaje, hoy, f.estado) !== null;
    });
    if (ajenas.length > 0) {
      throw new FixtureError(
        `el scan tocaría pasos ajenos con hoy=${hoy.toISOString()}: ${ajenas.map((f) => `${f.viajeCodigo}/${f.codigo}`).join(", ")}`
      );
    }
    return scan(hoy);
  }

  async function notificacionesPropias() {
    const propios = [...(await pasoIdsPropios())];
    return fx
      .db()
      .select()
      .from(notificacionesEnviadas)
      .where(inArray(notificacionesEnviadas.entidadId, propios));
  }

  const mailsA = (to: string) => email.emailsDryRun().filter((m) => m.to.includes(to));

  it("envía el recordatorio de A1 y el de D1 que tocan hoy, marca A1 vencido y deja el resto quieto", async () => {
    const r = await scanSeguro(HOY);

    expect(r).toMatchObject({ enviados: 2, vencidosMarcados: 1, errores: 0 });

    const x = await fx.pasos(asig.x);
    const notifs = await notificacionesPropias();
    expect(
      notifs
        .map((n) => ({
          tipo: n.tipo,
          entidadTipo: n.entidadTipo,
          entidadId: n.entidadId,
          clave: n.clave,
          destinatario: n.destinatario,
          estado: n.estado,
        }))
        .sort((a, b) => a.tipo.localeCompare(b.tipo))
    ).toEqual([
      {
        tipo: "recordatorio_a1",
        entidadTipo: "paso_alumno",
        entidadId: x.get("a1")?.id,
        clave: "7d",
        destinatario: tutorX.tutor1Email,
        estado: "sent",
      },
      {
        tipo: "recordatorio_d1",
        entidadTipo: "paso_alumno",
        entidadId: x.get("d1")?.id,
        clave: "30d",
        destinatario: tutorX.tutor1Email,
        estado: "sent",
      },
    ]);
    expect(notifs.every((n) => n.resendMessageId?.startsWith("dry-run-"))).toBe(true);

    expect(mailsA(tutorX.tutor1Email).map((m) => m.subject).sort()).toEqual([
      expect.stringMatching(/Application Form del colegio .*\(7 días\)$/),
      expect.stringMatching(/Autorización de viaje ante escribano .*\(30 días\)$/),
    ]);

    expect((await fx.paso(asig.y, "a1")).estado).toBe("vencido");
    expect((await fx.paso(asig.z, "a1")).estado).toBe("completado");
    expect((await fx.paso(asig.cancelada, "a1")).estado).toBe("pendiente");
    expect((await fx.paso(asig.enCurso, "a1")).estado).toBe("pendiente");
  });

  it("correrlo dos veces el mismo día no duplica notificaciones, mails ni el marcado de vencido", async () => {
    const mailsAntes = mailsA(tutorX.tutor1Email).length;

    const r = await scanSeguro(new Date("2003-04-10T20:00:00.000Z"));

    expect(r).toMatchObject({ enviados: 0, vencidosMarcados: 0, errores: 0 });
    expect(await notificacionesPropias()).toHaveLength(2);
    expect(mailsA(tutorX.tutor1Email)).toHaveLength(mailsAntes);
  });

  it("otra ocurrencia del mismo paso (3 días antes) es una notificación nueva", async () => {
    const r = await scanSeguro(sumarDias(HOY, 4));

    expect(r).toMatchObject({ enviados: 1, vencidosMarcados: 0, errores: 0 });
    const a1 = (await notificacionesPropias()).filter((n) => n.tipo === "recordatorio_a1");
    expect(a1.map((n) => n.clave).sort()).toEqual(["3d", "7d"]);
  });

  it("si el envío falla, la ocurrencia queda registrada como failed y se cuenta como error", async () => {
    const hoyFalla = new Date("2002-01-15T11:00:00.000Z");
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: sumarDias(hoyFalla, 200) });
    const alumno = await fx.alumno({ fechaNacimiento: MENOR });
    const { asignacionId } = await asignar({ viaje, alumno, usuarioId: null });
    await fx.actualizarPaso(asignacionId, "a1", { fechaLimite: sumarDias(hoyFalla, 3) });

    const envio = await import("@/lib/email/send-recordatorio");
    vi.mocked(envio.sendRecordatorioEmail).mockRejectedValueOnce(new Error("[INT] Resend caído"));
    const silenciar = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const r = await scanSeguro(hoyFalla);

      expect(r).toMatchObject({ enviados: 0, vencidosMarcados: 0, errores: 1 });
      const a1 = await fx.paso(asignacionId, "a1");
      const [fila, ...resto] = (await notificacionesPropias()).filter((n) => n.entidadId === a1.id);
      expect(resto).toHaveLength(0);
      expect(fila).toMatchObject({ tipo: "recordatorio_a1", clave: "3d", estado: "failed", resendMessageId: null });
    } finally {
      silenciar.mockRestore();
      await cancelar(asignacionId, viaje.id, "[INT] fin del escenario");
    }
  });
});
