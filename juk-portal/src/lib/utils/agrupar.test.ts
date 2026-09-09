import { describe, expect, it } from "vitest";

import { agruparPor } from "./agrupar";

describe("agruparPor", () => {
  it("agrupa por la clave y preserva el orden de entrada dentro de cada grupo", () => {
    const filas = [
      { id: "a", numero: 1 },
      { id: "b", numero: 1 },
      { id: "a", numero: 2 },
      { id: "a", numero: 3 },
    ];

    const mapa = agruparPor(filas, (f) => f.id);

    expect(mapa.get("a")?.map((f) => f.numero)).toEqual([1, 2, 3]);
    expect(mapa.get("b")?.map((f) => f.numero)).toEqual([1]);
  });

  it("devuelve un mapa vacío si no hay filas", () => {
    expect(agruparPor([], (f: { id: string }) => f.id).size).toBe(0);
  });

  it("no crea entradas para claves sin filas (el consumidor usa ?? [])", () => {
    const mapa = agruparPor([{ id: "a" }], (f) => f.id);
    expect(mapa.has("b")).toBe(false);
    expect(mapa.get("b") ?? []).toEqual([]);
  });
});
