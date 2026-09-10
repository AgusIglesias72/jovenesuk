import { describe, expect, it } from "vitest";

import {
  capacidadMaxima,
  ocupacionViaje,
  porcentaje,
  viajeCreateSchema,
  viajeFiltersSchema,
  viajeUpdateSchema,
} from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";
const OTRO_UUID = "8c9f2a31-44a4-4f1e-9e5a-1d2b3c4d5e6f";

const base = {
  codigo: "UK-2026-JUL-LONDON",
  nombre: "Londres en Julio",
  fechaInicio: "2026-07-01",
  fechaFin: "2026-07-15",
  origen: "representante_independiente",
  colegioDestinoId: OTRO_UUID,
  paisDestino: "reino_unido",
  curso: "General English",
  tipoAlojamientoSolicitado: "familia_anfitriona",
  cantidadGroupLeaders: 1,
  capacidadMinima: 5,
};

const individual = { ...base, tipo: "individual", cantidadGroupLeaders: 0 };

function issues(input: unknown, schema: typeof viajeCreateSchema | typeof viajeUpdateSchema = viajeCreateSchema) {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

const pathsDe = (input: unknown, schema?: typeof viajeCreateSchema | typeof viajeUpdateSchema) =>
  issues(input, schema).map((i) => i.path);

describe("viajeCreateSchema — alta válida", () => {
  it("un Grupal mínimo completa defaults y normaliza opcionales a null", () => {
    const r = viajeCreateSchema.parse(base);
    expect(r.tipo).toBe("grupal");
    expect(r.colegioClienteId).toBeNull();
    expect(r.comisionAgenciaPct).toBeNull();
    expect(r.feeRepresentante).toBeNull();
    expect(r.feeRepresentanteEsPorcentaje).toBe(false);
    expect(r.notasInternas).toBeNull();
    expect(r.fechaInicio.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("coerciona los números que llegan como string", () => {
    const r = viajeCreateSchema.parse({ ...base, cantidadGroupLeaders: "2", capacidadMinima: "8" });
    expect(r.cantidadGroupLeaders).toBe(2);
    expect(r.capacidadMinima).toBe(8);
  });
});

describe("viajeCreateSchema — código UK-YYYY-MMM-CITY", () => {
  it("acepta el formato del CLAUDE.md y recorta espacios", () => {
    expect(pathsDe({ ...base, codigo: "UK-2026-SEP-WIMBLEDON" })).toEqual([]);
    expect(viajeCreateSchema.parse({ ...base, codigo: "  UK-2026-JUL-LONDON " }).codigo).toBe(
      "UK-2026-JUL-LONDON"
    );
  });

  it("rechaza minúsculas, partes faltantes, año corto, mes largo y otro prefijo", () => {
    for (const codigo of [
      "uk-2026-jul-london",
      "UK-2026-JUL",
      "UK-26-JUL-LONDON",
      "UK-2026-JULY-LONDON",
      "AR-2026-JUL-LONDON",
      "UK-2026-JUL-LONDON-2",
      "UK 2026 JUL LONDON",
      "",
    ]) {
      expect(issues({ ...base, codigo })).toEqual([
        { path: "codigo", message: "Formato: UK-AAAA-MMM-CIUDAD (ej. UK-2026-JUL-LONDON)" },
      ]);
    }
  });
});

describe("viajeCreateSchema — fechas", () => {
  it("fin anterior al inicio falla en fechaFin", () => {
    expect(issues({ ...base, fechaInicio: "2026-07-15", fechaFin: "2026-07-01" })).toEqual([
      { path: "fechaFin", message: "La fecha de fin no puede ser anterior al inicio" },
    ]);
  });

  it("un viaje de un día (inicio = fin) es válido", () => {
    expect(pathsDe({ ...base, fechaInicio: "2026-07-10", fechaFin: "2026-07-10" })).toEqual([]);
  });

  it("vacía pide la fecha; ilegible falla en su campo", () => {
    expect(issues({ ...base, fechaInicio: "" })).toEqual([
      { path: "fechaInicio", message: "Ingresá la fecha" },
    ]);
    expect(pathsDe({ ...base, fechaFin: "15/07/2026" })).toEqual(["fechaFin"]);
  });
});

describe("viajeCreateSchema — colegio cliente según origen", () => {
  it("origen colegio_cliente sin cliente (ausente o '') falla en colegioClienteId", () => {
    const esperado = [{ path: "colegioClienteId", message: "Elegí el colegio cliente para este origen" }];
    expect(issues({ ...base, origen: "colegio_cliente" })).toEqual(esperado);
    expect(issues({ ...base, origen: "colegio_cliente", colegioClienteId: "" })).toEqual(esperado);
  });

  it("origen colegio_cliente con cliente uuid es válido", () => {
    const r = viajeCreateSchema.parse({ ...base, origen: "colegio_cliente", colegioClienteId: UUID });
    expect(r.colegioClienteId).toBe(UUID);
  });

  it("los demás orígenes no piden cliente y el '' del select queda null", () => {
    for (const origen of ["instituto", "representante_independiente", "juk_directo"]) {
      const r = viajeCreateSchema.parse({ ...base, origen, colegioClienteId: "" });
      expect(r.colegioClienteId).toBeNull();
    }
  });

  it("un cliente que no es uuid se rechaza", () => {
    expect(pathsDe({ ...base, colegioClienteId: "san-martin" })).toEqual(["colegioClienteId"]);
  });

  it("el colegio destino es obligatorio", () => {
    expect(issues({ ...base, colegioDestinoId: "" })).toEqual([
      { path: "colegioDestinoId", message: "Elegí un colegio destino" },
    ]);
  });
});

describe("viajeCreateSchema — reglas por tipo (Group Leaders)", () => {
  const GL_MSG = "Grupal: al menos 1 group leader. Individual: sin group leaders (0).";

  it("Grupal exige al menos 1 GL", () => {
    expect(issues({ ...base, tipo: "grupal", cantidadGroupLeaders: 0 })).toEqual([
      { path: "cantidadGroupLeaders", message: GL_MSG },
    ]);
  });

  it("Grupal admite hasta 20 GLs", () => {
    expect(pathsDe({ ...base, cantidadGroupLeaders: 20 })).toEqual([]);
    expect(issues({ ...base, cantidadGroupLeaders: 21 })).toEqual([
      { path: "cantidadGroupLeaders", message: "Máximo 20" },
    ]);
  });

  it("Individual exige exactamente 0 GLs", () => {
    expect(pathsDe(individual)).toEqual([]);
    expect(issues({ ...individual, cantidadGroupLeaders: 1 })).toEqual([
      { path: "cantidadGroupLeaders", message: GL_MSG },
    ]);
  });

  it("acepta juk_directo como origen", () => {
    expect(pathsDe({ ...individual, origen: "juk_directo" })).toEqual([]);
  });

  it("rechaza tipo u origen fuera de la lista", () => {
    expect(pathsDe({ ...base, tipo: "familiar" })).toEqual(["tipo"]);
    expect(pathsDe({ ...base, origen: "agencia" })).toEqual(["origen"]);
  });

  it("capacidad mínima al menos 1", () => {
    expect(issues({ ...base, capacidadMinima: 0 })).toEqual([
      { path: "capacidadMinima", message: "Mínimo 1" },
    ]);
  });
});

describe("viajeCreateSchema — comisión y fee (referencia interna)", () => {
  it("vacíos quedan null; cargados se convierten a número", () => {
    const vacios = viajeCreateSchema.parse({ ...base, comisionAgenciaPct: "", feeRepresentante: "" });
    expect(vacios.comisionAgenciaPct).toBeNull();
    expect(vacios.feeRepresentante).toBeNull();

    const cargados = viajeCreateSchema.parse({ ...base, comisionAgenciaPct: "10", feeRepresentante: "250.5" });
    expect(cargados.comisionAgenciaPct).toBe(10);
    expect(cargados.feeRepresentante).toBe(250.5);
  });

  it("rechaza comisión de agencia fuera de 0-100 o con decimales", () => {
    expect(pathsDe({ ...base, comisionAgenciaPct: 150 })).toEqual(["comisionAgenciaPct"]);
    expect(pathsDe({ ...base, comisionAgenciaPct: "-1" })).toEqual(["comisionAgenciaPct"]);
    expect(pathsDe({ ...base, comisionAgenciaPct: "12.5" })).toEqual(["comisionAgenciaPct"]);
  });

  it("rechaza un fee negativo", () => {
    expect(issues({ ...base, feeRepresentante: "-1" })).toEqual([
      { path: "feeRepresentante", message: "No puede ser negativo" },
    ]);
  });

  it("notas internas: en blanco → null; más de 2000 caracteres → error", () => {
    expect(viajeCreateSchema.parse({ ...base, notasInternas: "  " }).notasInternas).toBeNull();
    expect(pathsDe({ ...base, notasInternas: "x".repeat(2001) })).toEqual(["notasInternas"]);
  });
});

describe("viajeCreateSchema — errores combinados", () => {
  it("informa todas las reglas cruzadas rotas a la vez, no solo la primera", () => {
    expect(
      pathsDe({
        ...base,
        origen: "colegio_cliente",
        fechaInicio: "2026-07-15",
        fechaFin: "2026-07-01",
        cantidadGroupLeaders: 0,
      }).sort()
    ).toEqual(["cantidadGroupLeaders", "colegioClienteId", "fechaFin"]);
  });
});

describe("viajeUpdateSchema", () => {
  const edicion = { ...base, id: UUID, estado: "confirmado" };

  it("exige id uuid y un estado del ciclo de vida", () => {
    expect(pathsDe(edicion, viajeUpdateSchema)).toEqual([]);
    expect(pathsDe({ ...edicion, id: "UK-2026-JUL-LONDON" }, viajeUpdateSchema)).toEqual(["id"]);
    expect(pathsDe({ ...edicion, estado: "archivado" }, viajeUpdateSchema)).toEqual(["estado"]);
    expect(pathsDe({ ...base, estado: "confirmado" }, viajeUpdateSchema)).toEqual(["id"]);
  });

  it("aplica los mismos refinements que el alta", () => {
    expect(
      pathsDe({ ...edicion, fechaInicio: "2026-07-15", fechaFin: "2026-07-01" }, viajeUpdateSchema)
    ).toEqual(["fechaFin"]);
    expect(pathsDe({ ...edicion, origen: "colegio_cliente" }, viajeUpdateSchema)).toEqual([
      "colegioClienteId",
    ]);
    expect(pathsDe({ ...edicion, cantidadGroupLeaders: 0 }, viajeUpdateSchema)).toEqual([
      "cantidadGroupLeaders",
    ]);
  });
});

describe("capacidadMaxima", () => {
  it("Grupal (default) es Group Leaders × 12 (PRD §4)", () => {
    expect(capacidadMaxima(1)).toBe(12);
    expect(capacidadMaxima(3)).toBe(36);
    expect(capacidadMaxima(3, "grupal")).toBe(36);
    expect(capacidadMaxima(0)).toBe(0);
  });

  it("Individual es 1 fija, sin importar los GLs", () => {
    expect(capacidadMaxima(0, "individual")).toBe(1);
    expect(capacidadMaxima(5, "individual")).toBe(1);
  });
});

describe("viajeFiltersSchema", () => {
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
      origen: "agencia",
    });
    expect(r.q).toBe("london");
    expect(r.estado).toBe("confirmado");
    expect(r.anio).toBeUndefined();
    expect(r.pais).toBeUndefined();
    expect(r.colegioDestinoId).toBeUndefined();
    expect(r.origen).toBeUndefined();
  });

  it("un estado inválido se descarta en vez de romper la página", () => {
    expect(viajeFiltersSchema.safeParse({ estado: "archivado" }).success).toBe(true);
    expect(viajeFiltersSchema.parse({ estado: "archivado", tipo: "grupal" })).toEqual({
      tipo: "grupal",
    });
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
