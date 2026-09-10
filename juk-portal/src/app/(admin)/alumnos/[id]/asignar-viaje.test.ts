import { describe, expect, it } from "vitest";

import {
  cupoCompleto,
  etiquetaViajeAsignable,
  rangoFechas,
  textoCupos,
} from "./asignar-viaje";

const viaje = {
  codigo: "UK-2027-FEB-LONDON",
  fechaInicio: new Date("2027-02-02T00:00:00.000Z"),
  fechaFin: new Date("2027-02-20T00:00:00.000Z"),
  capacidadMaxima: 12,
  cupoUsado: 3,
};

describe("cupoCompleto", () => {
  it("con vacantes no está completo", () => {
    expect(cupoCompleto({ cupoUsado: 11, capacidadMaxima: 12 })).toBe(false);
  });

  it("al llegar al máximo está completo (mismo umbral que la action)", () => {
    expect(cupoCompleto({ cupoUsado: 12, capacidadMaxima: 12 })).toBe(true);
  });

  it("por encima del máximo (sobre-cupo confirmado) sigue completo", () => {
    expect(cupoCompleto({ cupoUsado: 13, capacidadMaxima: 12 })).toBe(true);
  });
});

describe("textoCupos", () => {
  it("muestra usados sobre máximo", () => {
    expect(textoCupos(viaje)).toBe("3/12 cupos");
  });
});

describe("etiquetaViajeAsignable", () => {
  it("combina código, fecha de salida DD/MM/YYYY y cupo", () => {
    expect(etiquetaViajeAsignable(viaje)).toBe("UK-2027-FEB-LONDON · sale 02/02/2027 · 3/12 cupos");
  });

  it("marca el viaje lleno para no elegirlo a ciegas", () => {
    expect(etiquetaViajeAsignable({ ...viaje, cupoUsado: 12 })).toBe(
      "UK-2027-FEB-LONDON · sale 02/02/2027 · 12/12 cupos · completo"
    );
  });

  it("no corre la fecha un día por zona horaria (columna date en UTC)", () => {
    expect(
      etiquetaViajeAsignable({ ...viaje, fechaInicio: new Date("2027-07-01T00:00:00.000Z") })
    ).toContain("sale 01/07/2027");
  });
});

describe("rangoFechas", () => {
  it("formatea inicio y fin como DD/MM/YYYY", () => {
    expect(rangoFechas(viaje)).toBe("02/02/2027 – 20/02/2027");
  });
});
