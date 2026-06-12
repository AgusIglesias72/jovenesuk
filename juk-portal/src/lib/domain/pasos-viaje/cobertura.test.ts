import { describe, expect, it } from "vitest";

import { coberturaPorAlumno } from "./metadata";

describe("coberturaPorAlumno (M7 P3/P4)", () => {
  const activos = ["a", "b", "c"];

  it("cuenta solo los activos marcados", () => {
    expect(coberturaPorAlumno({ a: true, b: true }, activos)).toEqual({
      marcados: 2,
      total: 3,
      completo: false,
    });
  });

  it("completo cuando todos los activos están cubiertos", () => {
    expect(coberturaPorAlumno({ a: true, b: true, c: true }, activos).completo).toBe(true);
  });

  it("una baja (asignación que ya no está activa) no cuenta para la cobertura", () => {
    // 'd' fue dado de baja: estaba marcado pero ya no está en activos.
    const cob = coberturaPorAlumno({ a: true, d: true }, activos);
    expect(cob).toEqual({ marcados: 1, total: 3, completo: false });
  });

  it("sin alumnos activos nunca está completo", () => {
    expect(coberturaPorAlumno({}, []).completo).toBe(false);
  });

  it("metadata ausente cuenta cero", () => {
    expect(coberturaPorAlumno(undefined, activos).marcados).toBe(0);
  });
});
