import { describe, expect, it } from "vitest";

import { PASOS_FILTRABLES, alumnoFiltersSchema } from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

describe("alumnoFiltersSchema", () => {
  it("acepta los filtros nuevos de US-17 (viaje y paso pendiente)", () => {
    const r = alumnoFiltersSchema.parse({ viajeId: UUID, paso: "c1" });
    expect(r.viajeId).toBe(UUID);
    expect(r.paso).toBe("c1");
  });

  it("conserva los filtros que ya existían", () => {
    const r = alumnoFiltersSchema.parse({ q: "perez", estado: "activo", alerta: "pasos_bloqueados" });
    expect(r).toEqual({ q: "perez", estado: "activo", alerta: "pasos_bloqueados" });
  });

  it("el Paso 0 no es filtrable: es de solo lectura y nunca queda pendiente", () => {
    expect(PASOS_FILTRABLES).not.toContain("paso_0");
    expect(PASOS_FILTRABLES).toHaveLength(10);
    expect(alumnoFiltersSchema.parse({ paso: "paso_0" }).paso).toBeUndefined();
  });

  it("descarta solo el valor inválido y conserva el resto", () => {
    const r = alumnoFiltersSchema.parse({
      q: "gomez",
      viajeId: "UK-2027-JUL-LONDON",
      paso: "z9",
      estado: "inexistente",
    });
    expect(r.q).toBe("gomez");
    expect(r.viajeId).toBeUndefined();
    expect(r.paso).toBeUndefined();
    expect(r.estado).toBeUndefined();
  });

  it("params vacíos cuentan como no filtrados", () => {
    const r = alumnoFiltersSchema.parse({ q: "", viajeId: "", paso: "" });
    expect(Object.values(r).some((v) => v !== undefined)).toBe(false);
  });
});
