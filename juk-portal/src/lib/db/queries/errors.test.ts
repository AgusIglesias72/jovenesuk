import { describe, expect, it } from "vitest";

import { FilaNoDevueltaError, esViolacionUnique, unicaFila } from "./errors";

describe("unicaFila", () => {
  it("devuelve la primera fila", () => {
    expect(unicaFila([{ id: 1 }, { id: 2 }], "x")).toEqual({ id: 1 });
  });

  it("lanza FilaNoDevueltaError con el nombre de la tabla si viene vacío", () => {
    expect(() => unicaFila([], "alumnos")).toThrowError(FilaNoDevueltaError);
    expect(() => unicaFila([], "alumnos")).toThrowError(/alumnos/);
  });
});

describe("esViolacionUnique", () => {
  it("reconoce el código 23505 de Postgres", () => {
    expect(esViolacionUnique({ code: "23505" })).toBe(true);
    expect(esViolacionUnique(Object.assign(new Error("dup"), { code: "23505" }))).toBe(true);
  });

  it("lo reconoce envuelto por drizzle (DrizzleQueryError → NeonDbError)", () => {
    const neon = Object.assign(new Error('duplicate key value violates unique constraint "uniq_alumnos_dni"'), {
      code: "23505",
    });
    const drizzle = Object.assign(new Error("Failed query: insert into alumnos …"), { cause: neon });
    expect(esViolacionUnique(drizzle)).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    expect(esViolacionUnique({ code: "23503" })).toBe(false);
    expect(esViolacionUnique(new Error("x"))).toBe(false);
    expect(esViolacionUnique(null)).toBe(false);
    expect(esViolacionUnique("23505")).toBe(false);
    expect(
      esViolacionUnique(Object.assign(new Error("wrap"), { cause: { code: "23503" } }))
    ).toBe(false);
  });

  it("no se cuelga con una cadena de causes circular", () => {
    const a: { cause?: unknown } = {};
    const b = { cause: a };
    a.cause = b;
    expect(esViolacionUnique(a)).toBe(false);
  });
});
