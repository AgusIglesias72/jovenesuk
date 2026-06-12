import { describe, expect, it } from "vitest";

import { derivarEstadoPoliceChecks, type PoliceCheckEstado, type PoliceCheckGL } from "./police";

function gl(estado: PoliceCheckEstado, overrides: Partial<PoliceCheckGL> = {}): PoliceCheckGL {
  return {
    groupLeaderId: `gl-${estado}-${Math.abs(JSON.stringify(overrides).length)}`,
    nombre: "Ana",
    apellido: "Pérez",
    esPrincipal: false,
    estado,
    fechaVencimiento: null,
    ...overrides,
  };
}

describe("derivarEstadoPoliceChecks", () => {
  it("sin GLs asignados → pendiente", () => {
    expect(derivarEstadoPoliceChecks([])).toBe("pendiente");
  });

  it("algún GL vencido → bloqueado, aunque el resto esté aprobado", () => {
    expect(derivarEstadoPoliceChecks([gl("aprobado"), gl("vencido")])).toBe("bloqueado");
  });

  it("todos aprobados → completado", () => {
    expect(derivarEstadoPoliceChecks([gl("aprobado"), gl("aprobado")])).toBe("completado");
  });

  it("todos pendientes → pendiente", () => {
    expect(derivarEstadoPoliceChecks([gl("pendiente"), gl("pendiente")])).toBe("pendiente");
  });

  it("mezcla sin vencidos → en_progreso", () => {
    expect(derivarEstadoPoliceChecks([gl("aprobado"), gl("pendiente")])).toBe("en_progreso");
    expect(derivarEstadoPoliceChecks([gl("en_tramite")])).toBe("en_progreso");
  });

  it("vencido pisa a en_tramite (bloqueado gana)", () => {
    expect(derivarEstadoPoliceChecks([gl("en_tramite"), gl("vencido")])).toBe("bloqueado");
  });
});
