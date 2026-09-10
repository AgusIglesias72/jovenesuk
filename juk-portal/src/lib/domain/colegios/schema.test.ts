import { describe, expect, it } from "vitest";

import { CONFIG_DOCUMENTAL_DEFAULT } from "./documentos";
import { colegioCreateSchema, colegioFiltersSchema, colegioUpdateSchema } from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

const base = {
  nombre: "Wimbledon School of English",
  tipo: "destino",
  pais: "reino_unido",
  ciudad: "London",
  contactoAcademico: { nombre: "Ana Gómez", email: "ana@wimbledon.co.uk" },
  contactoAdministrativo: { nombre: "Bob Smith", email: "bob@wimbledon.co.uk", telefono: "" },
  tipoEntradaRequerida: "eta",
};

function paths(input: unknown): string[] {
  const r = colegioCreateSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
}

describe("colegioCreateSchema — alta mínima", () => {
  it("acepta un colegio con solo los obligatorios y completa los defaults", () => {
    const r = colegioCreateSchema.parse(base);
    expect(r.contactoAlojamientos).toBeNull();
    expect(r.contactoJuniors).toBeNull();
    expect(r.cursosDisponibles).toEqual([]);
    expect(r.tiposAlojamiento).toEqual([]);
    expect(r.configDocumental).toEqual(CONFIG_DOCUMENTAL_DEFAULT);
    expect(r.comisionAgenciaPorcentaje).toBeNull();
    expect(r.sitioWeb).toBeNull();
    expect(r.notas).toBeNull();
  });

  it("el teléfono vacío de un contacto queda undefined (no se guarda '')", () => {
    expect(colegioCreateSchema.parse(base).contactoAdministrativo.telefono).toBeUndefined();
  });

  it("exige nombre, ciudad, tipo, país y tipo de entrada", () => {
    expect(paths({ ...base, nombre: "   " })).toEqual(["nombre"]);
    expect(paths({ ...base, ciudad: "" })).toEqual(["ciudad"]);
    expect(paths({ ...base, tipo: "proveedor" })).toEqual(["tipo"]);
    expect(paths({ ...base, pais: "narnia" })).toEqual(["pais"]);
    expect(paths({ ...base, tipoEntradaRequerida: undefined })).toEqual(["tipoEntradaRequerida"]);
    expect(paths({ ...base, tipoEntradaRequerida: "pasaporte" })).toEqual(["tipoEntradaRequerida"]);
  });
});

describe("colegioCreateSchema — contactos", () => {
  it("los contactos académico y administrativo son obligatorios", () => {
    expect(paths({ ...base, contactoAcademico: undefined })).toEqual(["contactoAcademico"]);
    expect(paths({ ...base, contactoAdministrativo: { nombre: "", email: "" } })).toEqual([
      "contactoAdministrativo.nombre",
      "contactoAdministrativo.email",
    ]);
  });

  it("valida el email del contacto con path anidado", () => {
    const r = colegioCreateSchema.safeParse({
      ...base,
      contactoAcademico: { nombre: "Ana", email: "ana-arroba-colegio" },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["contactoAcademico", "email"]);
      expect(r.error.issues[0]?.message).toBe("Email inválido");
    }
  });

  it("un contacto opcional vacío (sin nombre ni email) queda null", () => {
    for (const vacio of [undefined, null, {}, { nombre: "", email: "  " }, { telefono: "123" }]) {
      expect(colegioCreateSchema.parse({ ...base, contactoAlojamientos: vacio }).contactoAlojamientos).toBeNull();
    }
  });

  it("un contacto opcional a medio cargar falla en el campo que falta", () => {
    expect(paths({ ...base, contactoAlojamientos: { nombre: "Carla" } })).toEqual([
      "contactoAlojamientos.email",
    ]);
    expect(paths({ ...base, contactoJuniors: { email: "juniors@wimbledon.co.uk" } })).toEqual([
      "contactoJuniors.nombre",
    ]);
  });

  it("un contacto opcional completo se guarda recortado", () => {
    const r = colegioCreateSchema.parse({
      ...base,
      contactoJuniors: { nombre: "  Carla  ", email: " carla@wimbledon.co.uk ", telefono: " +44 20 " },
    });
    expect(r.contactoJuniors).toEqual({
      nombre: "Carla",
      email: "carla@wimbledon.co.uk",
      telefono: "+44 20",
    });
  });
});

describe("colegioCreateSchema — comisión de agencia", () => {
  const comision = (v: unknown) =>
    colegioCreateSchema.safeParse({ ...base, comisionAgenciaPorcentaje: v });

  it("vacío o ausente queda null", () => {
    expect(comision("").success && comision("").data?.comisionAgenciaPorcentaje).toBeNull();
    expect(comision("   ").success && comision("   ").data?.comisionAgenciaPorcentaje).toBeNull();
    expect(comision(null).success && comision(null).data?.comisionAgenciaPorcentaje).toBeNull();
  });

  it("convierte el string del input a número, bordes incluidos", () => {
    expect(comision("15").data?.comisionAgenciaPorcentaje).toBe(15);
    expect(comision(" 0 ").data?.comisionAgenciaPorcentaje).toBe(0);
    expect(comision(100).data?.comisionAgenciaPorcentaje).toBe(100);
  });

  it("rechaza decimales, negativos, más de 100 y texto", () => {
    const mensaje = (v: unknown) => {
      const r = comision(v);
      return r.success ? null : r.error.issues[0]?.message;
    };
    expect(mensaje("15.5")).toBe("Tiene que ser un número entero");
    expect(mensaje("-1")).toBe("No puede ser negativo");
    expect(mensaje("101")).toBe("No puede superar 100");
    expect(comision("quince").success).toBe(false);
  });
});

describe("colegioCreateSchema — resto de los campos", () => {
  it("sitio web: vacío → null; inválido → error; válido se conserva", () => {
    expect(colegioCreateSchema.parse({ ...base, sitioWeb: "" }).sitioWeb).toBeNull();
    expect(paths({ ...base, sitioWeb: "wimbledon punto com" })).toEqual(["sitioWeb"]);
    expect(colegioCreateSchema.parse({ ...base, sitioWeb: "https://wimbledon.ac.uk" }).sitioWeb).toBe(
      "https://wimbledon.ac.uk"
    );
  });

  it("notas: vacías → null; más de 2000 caracteres → error", () => {
    expect(colegioCreateSchema.parse({ ...base, notas: "  " }).notas).toBeNull();
    expect(paths({ ...base, notas: "x".repeat(2001) })).toEqual(["notas"]);
  });

  it("cursos: rechaza un curso vacío señalando su posición", () => {
    expect(paths({ ...base, cursosDisponibles: ["General English", " "] })).toEqual([
      "cursosDisponibles.1",
    ]);
  });

  it("tipos de alojamiento fuera del enum se rechazan", () => {
    expect(paths({ ...base, tiposAlojamiento: ["residencia", "hotel"] })).toEqual([
      "tiposAlojamiento.1",
    ]);
  });

  it("config documental: acepta overrides completos y rechaza requisitos inventados", () => {
    const config = { ...CONFIG_DOCUMENTAL_DEFAULT, test_nivel: "requerido" };
    expect(colegioCreateSchema.parse({ ...base, configDocumental: config }).configDocumental).toEqual(
      config
    );
    expect(
      paths({ ...base, configDocumental: { ...CONFIG_DOCUMENTAL_DEFAULT, test_nivel: "obligatorio" } })
    ).toEqual(["configDocumental.test_nivel"]);
  });
});

describe("colegioUpdateSchema y filtros", () => {
  it("la edición exige un id uuid y aplica las mismas reglas", () => {
    expect(colegioUpdateSchema.safeParse({ ...base, id: UUID }).success).toBe(true);
    expect(colegioUpdateSchema.safeParse({ ...base, id: "123" }).success).toBe(false);
    expect(colegioUpdateSchema.safeParse(base).success).toBe(false);
    expect(
      colegioUpdateSchema.safeParse({ ...base, id: UUID, comisionAgenciaPorcentaje: "101" }).success
    ).toBe(false);
  });

  it("los filtros son opcionales pero validan el enum", () => {
    expect(colegioFiltersSchema.safeParse({}).success).toBe(true);
    expect(colegioFiltersSchema.parse({ q: "  wimbledon ", tipo: "cliente" })).toEqual({
      q: "wimbledon",
      tipo: "cliente",
    });
    expect(colegioFiltersSchema.safeParse({ pais: "narnia" }).success).toBe(false);
  });
});
