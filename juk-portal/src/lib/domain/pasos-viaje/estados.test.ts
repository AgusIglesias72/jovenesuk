import { describe, expect, it } from "vitest";

import {
  PASO_VIAJE_DEPENDENCIAS,
  PASO_VIAJE_ESTADOS,
  PASO_VIAJE_TIPOS,
  dependenciaPendiente,
  esPasoDerivado,
  puedeAvanzarConDependencias,
  puedeTransicionarPaso,
  transicionesPasoConDependencias,
  transicionesPasoPermitidas,
} from "./estados";

describe("dependenciaPendiente", () => {
  it("transfers espera a pasajes hasta que esté completado", () => {
    expect(dependenciaPendiente("transfers", { pasajes: "pendiente" })).toBe("pasajes");
    expect(dependenciaPendiente("transfers", { pasajes: "en_progreso" })).toBe("pasajes");
    expect(dependenciaPendiente("transfers", {})).toBe("pasajes");
    expect(dependenciaPendiente("transfers", { pasajes: "completado" })).toBeNull();
  });

  it("un paso sin dependencia nunca espera", () => {
    expect(dependenciaPendiente("excursiones", {})).toBeNull();
    expect(dependenciaPendiente("pasajes", { transfers: "pendiente" })).toBeNull();
  });
});

describe("puedeAvanzarConDependencias", () => {
  const sinPasajes = { pasajes: "pendiente" } as const;

  it("con pasajes pendiente, transfers no avanza a en progreso ni a completado", () => {
    expect(puedeAvanzarConDependencias("transfers", "en_progreso", sinPasajes)).toBe(false);
    expect(puedeAvanzarConDependencias("transfers", "completado", sinPasajes)).toBe(false);
  });

  it("bloquear o volver a pendiente siempre se puede", () => {
    expect(puedeAvanzarConDependencias("transfers", "bloqueado", sinPasajes)).toBe(true);
    expect(puedeAvanzarConDependencias("transfers", "pendiente", sinPasajes)).toBe(true);
  });

  it("sin dependencia, siempre se puede avanzar", () => {
    expect(puedeAvanzarConDependencias("excursiones", "completado", sinPasajes)).toBe(true);
  });

  it("con pasajes completado, transfers avanza", () => {
    expect(puedeAvanzarConDependencias("transfers", "completado", { pasajes: "completado" })).toBe(true);
  });
});

describe("transicionesPasoConDependencias", () => {
  it("filtra los avances bloqueados y conserva el estado actual (lo que ve el selector)", () => {
    expect(transicionesPasoConDependencias("transfers", "pendiente", { pasajes: "en_progreso" })).toEqual([
      "pendiente",
      "bloqueado",
    ]);
    expect(transicionesPasoConDependencias("transfers", "en_progreso", { pasajes: "pendiente" })).toEqual([
      "en_progreso",
      "bloqueado",
      "pendiente",
    ]);
  });

  it("con la dependencia cumplida ofrece todas las transiciones válidas", () => {
    expect(transicionesPasoConDependencias("transfers", "pendiente", { pasajes: "completado" })).toEqual(
      transicionesPasoPermitidas("pendiente")
    );
  });
});

describe("puedeTransicionarPaso", () => {
  it("desde pendiente se puede ir a cualquier otro estado", () => {
    expect(puedeTransicionarPaso("pendiente", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("pendiente", "completado")).toBe(true);
    expect(puedeTransicionarPaso("pendiente", "bloqueado")).toBe(true);
  });

  it("completado se puede reabrir pero no bloquear directo", () => {
    expect(puedeTransicionarPaso("completado", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("completado", "pendiente")).toBe(true);
    expect(puedeTransicionarPaso("completado", "bloqueado")).toBe(false);
  });

  it("bloqueado se desbloquea pero no se completa directo", () => {
    expect(puedeTransicionarPaso("bloqueado", "pendiente")).toBe(true);
    expect(puedeTransicionarPaso("bloqueado", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("bloqueado", "completado")).toBe(false);
  });

  it("quedarse en el mismo estado siempre es válido", () => {
    for (const estado of PASO_VIAJE_ESTADOS) {
      expect(puedeTransicionarPaso(estado, estado)).toBe(true);
    }
  });
});

describe("transicionesPasoPermitidas", () => {
  it("antepone el estado actual", () => {
    for (const estado of PASO_VIAJE_ESTADOS) {
      expect(transicionesPasoPermitidas(estado)[0]).toBe(estado);
    }
  });
});

describe("dependencias y derivados", () => {
  it("transfers depende de pasajes (PRD M7 §7.4)", () => {
    expect(PASO_VIAJE_DEPENDENCIAS.transfers).toBe("pasajes");
  });

  it("police_checks es el único paso derivado", () => {
    const derivados = PASO_VIAJE_TIPOS.filter(esPasoDerivado);
    expect(derivados).toEqual(["police_checks"]);
  });
});
