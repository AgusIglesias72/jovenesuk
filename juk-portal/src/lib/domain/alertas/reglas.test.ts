import { describe, expect, it } from "vitest";

import type { RequisitoDocumento } from "@/lib/domain/colegios";

import {
  alertasMora,
  alertasParentalConsent,
  alertasPasaporte,
  alertasPasosBloqueados,
  alertasPoliceChecks,
  calcularAlertas,
  ordenarAlertas,
  type Alerta,
  type AsignacionParaAlerta,
  type ColegioParaAlerta,
  type CuotaParaAlerta,
  type GroupLeaderParaAlerta,
  type PasoBloqueadoParaAlerta,
  type ViajeParaAlerta,
} from "./reglas";

// Las reglas comparan días calendario UTC: con la zona del usuario activa,
// cualquier getter local corre las fechas un día y estos casos fallan.
process.env.TZ = "America/Argentina/Buenos_Aires";

const HOY = new Date("2026-06-12T23:30:00Z"); // 20:30 ART del 12/06

const colegio = (over: Partial<ColegioParaAlerta> = {}): ColegioParaAlerta => ({
  id: "col-1",
  nombre: "Wimbledon",
  parentalConsentUpdatedAt: null,
  ...over,
});

const viaje = (over: Partial<ViajeParaAlerta> = {}): ViajeParaAlerta => ({
  id: "via-1",
  codigo: "UK-2026-JUL-LONDON",
  fechaInicio: new Date(Date.UTC(2026, 6, 10)),
  ...over,
});

const asignacion = (over: Partial<AsignacionParaAlerta> = {}): AsignacionParaAlerta => ({
  asignacionId: "asg-1",
  viajeId: "via-1",
  dni: "45102338",
  nombre: "Lucía",
  apellido: "Pérez",
  vencimientoPasaporte: new Date(Date.UTC(2030, 0, 1)),
  ...over,
});

const cuota = (over: Partial<CuotaParaAlerta> = {}): CuotaParaAlerta => ({
  asignacionId: "asg-1",
  numero: 2,
  estado: "pendiente",
  fechaVencimiento: new Date(Date.UTC(2026, 5, 1)),
  ...over,
});

const paso = (over: Partial<PasoBloqueadoParaAlerta> = {}): PasoBloqueadoParaAlerta => ({
  asignacionId: "asg-1",
  codigo: "c3",
  notas: null,
  metadata: {},
  ...over,
});

const gl = (over: Partial<GroupLeaderParaAlerta> = {}): GroupLeaderParaAlerta => ({
  viajeId: "via-1",
  nombre: "Ana",
  apellido: "Gómez",
  policeCheckEstado: "vencido",
  ...over,
});

const mapaViajes = (...vs: ViajeParaAlerta[]) => new Map(vs.map((v) => [v.id, v]));
const mapaAsignaciones = (...as: AsignacionParaAlerta[]) =>
  new Map(as.map((a) => [a.asignacionId, a]));
const requerido = new Map<string, RequisitoDocumento>([["col-1", "requerido"]]);

describe("alertasParentalConsent", () => {
  it("alerta si nunca se cargó", () => {
    const alertas = alertasParentalConsent([colegio()], requerido, HOY);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]?.severidad).toBe("alta");
    expect(alertas[0]?.href).toBe("/colegios/col-1/editar");
    expect(alertas[0]?.viajeId).toBeUndefined();
  });

  it("no alerta con 11 meses de antigüedad", () => {
    const hace11 = new Date(Date.UTC(2025, 6, 12));
    expect(
      alertasParentalConsent([colegio({ parentalConsentUpdatedAt: hace11 })], requerido, HOY)
    ).toHaveLength(0);
  });

  it("el borde de los 12 meses exactos todavía no alerta; un segundo antes sí", () => {
    const justo12 = new Date(Date.UTC(2025, 5, 12));
    const unSegundoAntes = new Date(justo12.getTime() - 1000);
    expect(
      alertasParentalConsent([colegio({ parentalConsentUpdatedAt: justo12 })], requerido, HOY)
    ).toHaveLength(0);
    expect(
      alertasParentalConsent(
        [colegio({ parentalConsentUpdatedAt: unSegundoAntes })],
        requerido,
        HOY
      )
    ).toHaveLength(1);
  });

  it("alerta con 13 meses", () => {
    const hace13 = new Date(Date.UTC(2025, 4, 12));
    expect(
      alertasParentalConsent([colegio({ parentalConsentUpdatedAt: hace13 })], requerido, HOY)
    ).toHaveLength(1);
  });

  it("sin config explícita rige el default 'na' del dominio: no alerta", () => {
    expect(alertasParentalConsent([colegio()], new Map(), HOY)).toHaveLength(0);
  });

  it("requisito 'na' explícito tampoco alerta; 'opcional' sí", () => {
    const na = new Map<string, RequisitoDocumento>([["col-1", "na"]]);
    const opcional = new Map<string, RequisitoDocumento>([["col-1", "opcional"]]);
    expect(alertasParentalConsent([colegio()], na, HOY)).toHaveLength(0);
    expect(alertasParentalConsent([colegio()], opcional, HOY)).toHaveLength(1);
  });

  it("el corte no depende de la hora del día (mismo resultado a las 00:00 y a las 23:59 UTC)", () => {
    const updated = new Date(Date.UTC(2025, 5, 11, 12));
    const alMediodia = alertasParentalConsent(
      [colegio({ parentalConsentUpdatedAt: updated })],
      requerido,
      new Date("2026-06-12T00:00:00Z")
    );
    const aLaNoche = alertasParentalConsent(
      [colegio({ parentalConsentUpdatedAt: updated })],
      requerido,
      new Date("2026-06-12T23:59:00Z")
    );
    expect(alMediodia).toHaveLength(1);
    expect(aLaNoche).toHaveLength(1);
  });
});

describe("alertasPasaporte", () => {
  const vs = mapaViajes(viaje());

  it("marca 'por vencer' el mismo día del vencimiento y 'vencido' al día siguiente", () => {
    const vence = new Date(Date.UTC(2026, 5, 12));
    const hoyMismoDia = alertasPasaporte([asignacion({ vencimientoPasaporte: vence })], vs, HOY);
    expect(hoyMismoDia[0]?.titulo).toContain("Pasaporte por vencer");

    const hoyDiaSiguiente = alertasPasaporte(
      [asignacion({ vencimientoPasaporte: vence })],
      vs,
      new Date("2026-06-13T00:30:00Z")
    );
    expect(hoyDiaSiguiente[0]?.titulo).toContain("Pasaporte vencido");
  });

  it("no depende de la zona horaria: 02:00 UTC del 13 ya es el día 13", () => {
    const vence = new Date(Date.UTC(2026, 5, 12));
    // En ART son las 23:00 del 12; con getters locales diría "por vencer".
    const alertas = alertasPasaporte(
      [asignacion({ vencimientoPasaporte: vence })],
      vs,
      new Date("2026-06-13T02:00:00Z")
    );
    expect(alertas[0]?.titulo).toContain("Pasaporte vencido");
  });

  it("no alerta si el pasaporte vence más allá de los 6 meses post-inicio", () => {
    expect(alertasPasaporte([asignacion()], vs, HOY)).toHaveLength(0);
  });

  it("ignora asignaciones de viajes que no están en el mapa", () => {
    const huerfana = asignacion({ viajeId: "via-9", vencimientoPasaporte: new Date(Date.UTC(2026, 5, 1)) });
    expect(alertasPasaporte([huerfana], vs, HOY)).toHaveLength(0);
  });

  it("es crítica y linkea al alumno por DNI, con el viaje asociado", () => {
    const alertas = alertasPasaporte(
      [asignacion({ vencimientoPasaporte: new Date(Date.UTC(2026, 8, 1)) })],
      vs,
      HOY
    );
    expect(alertas[0]?.severidad).toBe("critica");
    expect(alertas[0]?.href).toBe("/alumnos/45102338");
    expect(alertas[0]?.viajeId).toBe("via-1");
  });
});

describe("alertasMora", () => {
  const asigs = mapaAsignaciones(asignacion());

  it("no alerta el día del vencimiento y sí al día siguiente", () => {
    const vence = new Date(Date.UTC(2026, 5, 12));
    expect(alertasMora([cuota({ fechaVencimiento: vence })], asigs, HOY)).toHaveLength(0);
    const alDiaSiguiente = alertasMora(
      [cuota({ fechaVencimiento: vence })],
      asigs,
      new Date("2026-06-13T02:00:00Z")
    );
    expect(alDiaSiguiente).toHaveLength(1);
    expect(alDiaSiguiente[0]?.detalle).toContain("1 día de atraso");
  });

  it("7 días de atraso es alta; 8 es crítica", () => {
    const siete = alertasMora(
      [cuota({ fechaVencimiento: new Date(Date.UTC(2026, 5, 5)) })],
      asigs,
      HOY
    );
    const ocho = alertasMora(
      [cuota({ fechaVencimiento: new Date(Date.UTC(2026, 5, 4)) })],
      asigs,
      HOY
    );
    expect(siete[0]?.severidad).toBe("alta");
    expect(siete[0]?.detalle).toContain("7 días de atraso");
    expect(ocho[0]?.severidad).toBe("critica");
  });

  it("ignora cuotas pagadas y cuotas de asignaciones desconocidas", () => {
    expect(alertasMora([cuota({ estado: "pagada" })], asigs, HOY)).toHaveLength(0);
    expect(alertasMora([cuota({ asignacionId: "asg-9" })], asigs, HOY)).toHaveLength(0);
  });
});

describe("alertasPasosBloqueados", () => {
  const asigs = mapaAsignaciones(asignacion());

  it("excluye C2 bloqueado por B1 (dependencia estructural)", () => {
    const c2 = paso({ codigo: "c2", metadata: { bloqueadoPor: "b1" } });
    expect(alertasPasosBloqueados([c2], asigs)).toHaveLength(0);
  });

  it("incluye C2 bloqueado por otra causa", () => {
    const c2 = paso({ codigo: "c2", metadata: { bloqueadoPor: "documentacion" } });
    const alertas = alertasPasosBloqueados([c2], asigs);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]?.severidad).toBe("alta");
    expect(alertas[0]?.titulo).toContain("Immigration Letter bloqueado");
  });

  it("C1 rechazado es crítica y se titula 'ETA rechazado'", () => {
    const c1 = paso({ codigo: "c1", metadata: { subEstado: "rechazado" } });
    const alertas = alertasPasosBloqueados([c1], asigs);
    expect(alertas[0]?.severidad).toBe("critica");
    expect(alertas[0]?.titulo).toBe("ETA rechazado · Pérez, Lucía");
  });

  it("C1 bloqueado sin sub-estado rechazado queda en alta", () => {
    const c1 = paso({ codigo: "c1", metadata: { subEstado: "en_tramite" } });
    expect(alertasPasosBloqueados([c1], asigs)[0]?.severidad).toBe("alta");
  });

  it("usa las notas del paso como detalle y cae a un texto por defecto", () => {
    expect(alertasPasosBloqueados([paso({ notas: "Falta la partida" })], asigs)[0]?.detalle).toBe(
      "Falta la partida"
    );
    expect(alertasPasosBloqueados([paso()], asigs)[0]?.detalle).toBe(
      "Requiere intervención del equipo."
    );
  });
});

describe("alertasPoliceChecks", () => {
  const vs = mapaViajes(viaje());

  it("alerta solo si el check está vencido", () => {
    expect(alertasPoliceChecks([gl()], vs)).toHaveLength(1);
    expect(alertasPoliceChecks([gl({ policeCheckEstado: "aprobado" })], vs)).toHaveLength(0);
    expect(alertasPoliceChecks([gl({ policeCheckEstado: "pendiente" })], vs)).toHaveLength(0);
  });

  it("linkea al viaje por código", () => {
    const alerta = alertasPoliceChecks([gl()], vs)[0];
    expect(alerta?.href).toBe("/viajes/UK-2026-JUL-LONDON");
    expect(alerta?.viajeId).toBe("via-1");
  });

  it("ignora GLs de viajes fuera del mapa", () => {
    expect(alertasPoliceChecks([gl({ viajeId: "via-9" })], vs)).toHaveLength(0);
  });
});

describe("ordenarAlertas", () => {
  it("pone las críticas primero manteniendo el orden dentro de cada severidad", () => {
    const alertas: Alerta[] = [
      { severidad: "alta", titulo: "a1", detalle: "", href: "/" },
      { severidad: "critica", titulo: "c1", detalle: "", href: "/" },
      { severidad: "alta", titulo: "a2", detalle: "", href: "/" },
      { severidad: "critica", titulo: "c2", detalle: "", href: "/" },
    ];
    expect(ordenarAlertas(alertas).map((a) => a.titulo)).toEqual(["c1", "c2", "a1", "a2"]);
  });
});

describe("calcularAlertas", () => {
  it("compone las cinco reglas y devuelve las críticas primero", () => {
    const alertas = calcularAlertas({
      destinos: [colegio()],
      requisitoParentalConsentPorColegio: requerido,
      viajes: [viaje()],
      asignaciones: [asignacion({ vencimientoPasaporte: new Date(Date.UTC(2026, 5, 1)) })],
      cuotasImpagas: [cuota({ fechaVencimiento: new Date(Date.UTC(2026, 5, 1)) })],
      pasosBloqueados: [paso({ codigo: "c1", metadata: { subEstado: "rechazado" } })],
      groupLeaders: [gl()],
      hoy: HOY,
    });

    expect(alertas.map((a) => a.severidad)).toEqual([
      "critica",
      "critica",
      "critica",
      "critica",
      "alta",
    ]);
    expect(alertas.at(-1)?.titulo).toContain("Parental Consent desactualizado");
  });

  it("sin datos no devuelve alertas", () => {
    expect(
      calcularAlertas({
        destinos: [],
        requisitoParentalConsentPorColegio: new Map(),
        viajes: [],
        asignaciones: [],
        cuotasImpagas: [],
        pasosBloqueados: [],
        groupLeaders: [],
        hoy: HOY,
      })
    ).toEqual([]);
  });
});
