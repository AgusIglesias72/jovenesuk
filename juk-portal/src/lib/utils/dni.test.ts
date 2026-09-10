import { describe, expect, it } from "vitest";

import { formatearDni, soloDigitos } from "./dni";

describe("formatearDni", () => {
  it("agrupa de a tres desde la derecha", () => {
    expect(formatearDni("45102338")).toBe("45.102.338");
    expect(formatearDni("5102338")).toBe("5.102.338");
    expect(formatearDni("1234")).toBe("1.234");
    expect(formatearDni("123")).toBe("123");
  });

  it("es idempotente sobre un DNI ya formateado", () => {
    expect(formatearDni("45.102.338")).toBe("45.102.338");
    expect(formatearDni(formatearDni("45102338"))).toBe("45.102.338");
  });

  it("descarta separadores y espacios que no son dígitos", () => {
    expect(formatearDni(" 45 102-338 ")).toBe("45.102.338");
  });

  it("vacío o sin dígitos queda vacío", () => {
    expect(formatearDni("")).toBe("");
    expect(formatearDni("abc")).toBe("");
  });
});

describe("soloDigitos", () => {
  it("vuelve a dígitos puros (lo que se guarda y va en la URL)", () => {
    expect(soloDigitos("45.102.338")).toBe("45102338");
    expect(soloDigitos("45 102 338")).toBe("45102338");
  });

  it("deshace exactamente el formateo visual", () => {
    for (const dni of ["45102338", "5102338", "123", "1"]) {
      expect(soloDigitos(formatearDni(dni))).toBe(dni);
    }
  });
});
