import { describe, expect, it } from "vitest";

import {
  groupLeaderCreateSchema,
  groupLeaderFiltersSchema,
  groupLeaderUpdateSchema,
} from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

const base = {
  nombre: "Lucía",
  apellido: "Fernández",
  email: "lucia@example.com",
  policeCheckEstado: "pendiente",
};

function issues(input: unknown) {
  const r = groupLeaderCreateSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

describe("groupLeaderCreateSchema", () => {
  it("con solo los obligatorios, los opcionales quedan null", () => {
    expect(groupLeaderCreateSchema.parse(base)).toEqual({
      ...base,
      telefono: null,
      documento: null,
      policeCheckFechaEmision: null,
      policeCheckFechaVencimiento: null,
    });
  });

  it("strings vacíos del form quedan null y los cargados se recortan", () => {
    const r = groupLeaderCreateSchema.parse({
      ...base,
      telefono: "   ",
      documento: " 30111222 ",
      policeCheckFechaEmision: "",
    });
    expect(r.telefono).toBeNull();
    expect(r.documento).toBe("30111222");
    expect(r.policeCheckFechaEmision).toBeNull();
  });

  it("exige nombre, apellido y un email válido con mensajes en castellano", () => {
    expect(issues({ ...base, nombre: " " })).toEqual([{ path: "nombre", message: "Ingresá el nombre" }]);
    expect(issues({ ...base, apellido: "" })).toEqual([
      { path: "apellido", message: "Ingresá el apellido" },
    ]);
    expect(issues({ ...base, email: "lucia@" })).toEqual([{ path: "email", message: "Email inválido" }]);
  });

  it("recorta el email antes de validarlo", () => {
    expect(groupLeaderCreateSchema.parse({ ...base, email: "  lucia@example.com " }).email).toBe(
      "lucia@example.com"
    );
  });

  it("el estado del police check es obligatorio y de la lista", () => {
    expect(issues({ ...base, policeCheckEstado: undefined }).map((i) => i.path)).toEqual([
      "policeCheckEstado",
    ]);
    expect(issues({ ...base, policeCheckEstado: "rechazado" }).map((i) => i.path)).toEqual([
      "policeCheckEstado",
    ]);
  });

  it("las fechas del police check llegan como ISO del DateInput y quedan en medianoche UTC", () => {
    const r = groupLeaderCreateSchema.parse({
      ...base,
      policeCheckEstado: "aprobado",
      policeCheckFechaEmision: "2026-03-01",
      policeCheckFechaVencimiento: "2027-03-01",
    });
    expect(r.policeCheckFechaEmision?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(r.policeCheckFechaVencimiento?.toISOString()).toBe("2027-03-01T00:00:00.000Z");
  });

  it("rechaza una fecha que no se puede interpretar", () => {
    expect(issues({ ...base, policeCheckFechaVencimiento: "31/02/abc" }).map((i) => i.path)).toEqual([
      "policeCheckFechaVencimiento",
    ]);
  });

  it("respeta los largos máximos", () => {
    expect(issues({ ...base, nombre: "x".repeat(121) }).map((i) => i.path)).toEqual(["nombre"]);
  });
});

describe("groupLeaderUpdateSchema y filtros", () => {
  it("la edición exige un id uuid", () => {
    expect(groupLeaderUpdateSchema.safeParse({ ...base, id: UUID }).success).toBe(true);
    expect(groupLeaderUpdateSchema.safeParse({ ...base, id: "gl-1" }).success).toBe(false);
  });

  it("el filtro de police check valida el enum", () => {
    expect(groupLeaderFiltersSchema.parse({ q: " ana ", policeCheckEstado: "vencido" })).toEqual({
      q: "ana",
      policeCheckEstado: "vencido",
    });
    expect(groupLeaderFiltersSchema.safeParse({ policeCheckEstado: "otro" }).success).toBe(false);
  });
});
