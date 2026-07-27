import { describe, expect, it } from "vitest";

import { parseProspectosCsv } from "./csv";

describe("parseProspectosCsv", () => {
  it("parsea con delimitador coma", () => {
    const { filas, errores } = parseProspectosCsv(
      "nombre,ciudad\nSt Mary,London\nGrange,Bristol"
    );
    expect(errores).toEqual([]);
    expect(filas).toHaveLength(2);
    expect(filas[0]?.nombre).toBe("St Mary");
    expect(filas[0]?.ciudad).toBe("London");
    expect(filas[1]?.nombre).toBe("Grange");
  });

  it("parsea con delimitador punto y coma", () => {
    const { filas } = parseProspectosCsv("nombre;ciudad\nSt Mary;London");
    expect(filas).toHaveLength(1);
    expect(filas[0]?.nombre).toBe("St Mary");
    expect(filas[0]?.ciudad).toBe("London");
  });

  it("parsea con delimitador tab", () => {
    const { filas } = parseProspectosCsv("nombre\tciudad\nSt Mary\tLondon");
    expect(filas).toHaveLength(1);
    expect(filas[0]?.nombre).toBe("St Mary");
    expect(filas[0]?.ciudad).toBe("London");
  });

  it("respeta comillas con el delimitador adentro", () => {
    const { filas } = parseProspectosCsv(
      'nombre,notas\n"Colegio, con coma","línea 1\nlínea 2"'
    );
    expect(filas).toHaveLength(1);
    expect(filas[0]?.nombre).toBe("Colegio, con coma");
    expect(filas[0]?.notas).toBe("línea 1\nlínea 2");
  });

  it("desescapa comillas dobles duplicadas", () => {
    const { filas } = parseProspectosCsv('nombre\n"El ""Grande"" School"');
    expect(filas[0]?.nombre).toBe('El "Grande" School');
  });

  it("separa múltiples emails en una celda", () => {
    const { filas } = parseProspectosCsv(
      'nombre,emails\nSt Mary,"a@x.com; b@y.com, c@z.com"'
    );
    expect(filas[0]?.emails).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });

  it("mapea headers con acentos y mayúsculas", () => {
    const { filas } = parseProspectosCsv("Nombre,Teléfono,País\nSt Mary,123,Reino Unido");
    expect(filas[0]?.nombre).toBe("St Mary");
    expect(filas[0]?.telefonos).toEqual(["123"]);
    expect(filas[0]?.pais).toBe("reino_unido");
  });

  it("descarta la fila sin nombre y registra el error", () => {
    const { filas, errores } = parseProspectosCsv("nombre,ciudad\n,London\nGrange,Bristol");
    expect(filas).toHaveLength(1);
    expect(filas[0]?.nombre).toBe("Grange");
    expect(errores.some((e) => e.includes("sin nombre"))).toBe(true);
  });

  it("filtra emails inválidos pero no frena la fila", () => {
    const { filas, errores } = parseProspectosCsv(
      'nombre,emails\nSt Mary,"ok@x.com, no-es-email"'
    );
    expect(filas).toHaveLength(1);
    expect(filas[0]?.emails).toEqual(["ok@x.com"]);
    expect(errores.some((e) => e.includes("email inválido"))).toBe(true);
  });

  it("falla si no hay columna nombre", () => {
    const { filas, errores } = parseProspectosCsv("ciudad,pais\nLondon,Reino Unido");
    expect(filas).toHaveLength(0);
    expect(errores.some((e) => e.includes("nombre"))).toBe(true);
  });
});
