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

  it("rechaza cualquier otra cosa", () => {
    expect(esViolacionUnique({ code: "23503" })).toBe(false);
    expect(esViolacionUnique(new Error("x"))).toBe(false);
    expect(esViolacionUnique(null)).toBe(false);
    expect(esViolacionUnique("23505")).toBe(false);
  });
});
