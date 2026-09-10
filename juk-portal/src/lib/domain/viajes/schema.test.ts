import { describe, expect, it } from "vitest";

import { capacidadMaxima, ocupacionViaje, porcentaje, viajeFiltersSchema } from "./schema";

describe("capacidadMaxima", () => {
  it("es Group Leaders × 12 (PRD §4)", () => {
    expect(capacidadMaxima(1)).toBe(12);
    expect(capacidadMaxima(3)).toBe(36);
    expect(capacidadMaxima(0)).toBe(0);
  });
});

describe("viajeFiltersSchema", () => {
  const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

  it("acepta los filtros nuevos de US-12 (año, país, colegio) y coerciona el año", () => {
    const r = viajeFiltersSchema.parse({
      anio: "2027",
      pais: "reino_unido",
      colegioDestinoId: UUID,
      tipo: "individual",
    });
    expect(r).toEqual({
      anio: 2027,
      pais: "reino_unido",
      colegioDestinoId: UUID,
      tipo: "individual",
    });
  });

  it("sin params devuelve un objeto sin filtros", () => {
    const r = viajeFiltersSchema.parse({});
    expect(Object.values(r).some((v) => v !== undefined)).toBe(false);
  });

  it("descarta solo el valor inválido y conserva el resto de los filtros", () => {
    const r = viajeFiltersSchema.parse({
      q: "london",
      anio: "dosmil",
      pais: "narnia",
      colegioDestinoId: "no-es-uuid",
      estado: "confirmado",
    });
    expect(r.q).toBe("london");
    expect(r.estado).toBe("confirmado");
    expect(r.anio).toBeUndefined();
    expect(r.pais).toBeUndefined();
    expect(r.colegioDestinoId).toBeUndefined();
  });

  it("rechaza años fuera de rango o con decimales", () => {
    expect(viajeFiltersSchema.parse({ anio: "1999" }).anio).toBeUndefined();
    expect(viajeFiltersSchema.parse({ anio: "2101" }).anio).toBeUndefined();
    expect(viajeFiltersSchema.parse({ anio: "2027.5" }).anio).toBeUndefined();
  });

  it("un param vacío (?anio=&q=) cuenta como no filtrado", () => {
    const r = viajeFiltersSchema.parse({ anio: "", q: "   ", pais: "" });
    expect(r.anio).toBeUndefined();
    expect(r.q).toBeUndefined();
    expect(r.pais).toBeUndefined();
  });
});

describe("porcentaje", () => {
  it("redondea y acota a 0..100", () => {
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(2, 3)).toBe(67);
    expect(porcentaje(15, 12)).toBe(100);
  });

  it("sin total es 0%", () => {
    expect(porcentaje(0, 0)).toBe(0);
    expect(porcentaje(3, 0)).toBe(0);
  });
});

describe("ocupacionViaje", () => {
  const grupal = { capacidadMaxima: 12, capacidadMinima: 5, tipo: "grupal" as const };

  it("calcula vacantes y lo que falta para el mínimo en un Grupal", () => {
    expect(ocupacionViaje({ ...grupal, inscriptos: 3 })).toEqual({
      pct: 25,
      vacantes: 9,
      sobreCupo: 0,
      faltanParaMinimo: 2,
    });
  });

  it("con sobre-cupo la barra queda en 100% y se informa el excedente", () => {
    const o = ocupacionViaje({ ...grupal, inscriptos: 14 });
    expect(o.pct).toBe(100);
    expect(o.vacantes).toBe(0);
    expect(o.sobreCupo).toBe(2);
    expect(o.faltanParaMinimo).toBe(0);
  });

  it("el Individual no tiene regla de mínimo", () => {
    const o = ocupacionViaje({
      inscriptos: 0,
      capacidadMaxima: 1,
      capacidadMinima: 5,
      tipo: "individual",
    });
    expect(o.faltanParaMinimo).toBe(0);
    expect(o.vacantes).toBe(1);
  });

  it("capacidad 0 no divide por cero", () => {
    expect(ocupacionViaje({ ...grupal, capacidadMaxima: 0, inscriptos: 0 }).pct).toBe(0);
    expect(ocupacionViaje({ ...grupal, capacidadMaxima: 0, inscriptos: 2 }).pct).toBe(100);
  });
});
