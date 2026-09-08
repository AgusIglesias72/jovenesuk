import { describe, expect, it } from "vitest";

import { AsignacionNotFoundError, ViajeNoInscribibleError } from "./errors";

describe("errores de asignaciones", () => {
  it("AsignacionNotFoundError conserva el id", () => {
    const err = new AsignacionNotFoundError("xyz");
    expect(err.name).toBe("AsignacionNotFoundError");
    expect(err.id).toBe("xyz");
  });

  it("ViajeNoInscribibleError expone el estado del viaje en el mensaje", () => {
    const err = new ViajeNoInscribibleError("cancelado");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ViajeNoInscribibleError");
    expect(err.estado).toBe("cancelado");
    expect(err.message).toContain("cancelado");
  });
});
