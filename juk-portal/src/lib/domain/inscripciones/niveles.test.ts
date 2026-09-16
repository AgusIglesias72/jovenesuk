import { describe, expect, it } from "vitest";

import {
  CAMPOS_NIVEL_1,
  CAMPOS_NIVEL_2,
  enmascararDni,
  esCampoSensible,
  soloNivel1,
} from "./niveles";
import { inscripcionSchema, type InscripcionData } from "./schema";

const COMPLETO: InscripcionData = {
  nombre: "Milagros",
  apellido: "Sosa",
  fechaNacimiento: "2009-04-12",
  dni: "45102338",
  numeroPasaporte: "AAF123456",
  fechaVencimientoPasaporte: "2031-08-30",
  tutor1Nombre: "Vanina Sosa",
  tutor1Celular: "+54 9 11 5555 4444",
  tutor1Email: "vanina@example.com",
  telefonoAlumno: "+54 9 11 4444 3333",
  emailAlumno: "mili@example.com",
  alergiasSalud: "Alergia al maní",
  preferenciasAlojamiento: "Sin mascotas",
  nivelInglesAutoevaluacion: "Intermedio",
  website: "",
  acepta: true,
};

describe("contrato de clasificación", () => {
  it("los dos niveles cubren TODAS las claves del schema", () => {
    const delSchema = Object.keys(inscripcionSchema.shape).sort();
    const clasificadas = [...CAMPOS_NIVEL_1, ...CAMPOS_NIVEL_2].sort();
    expect(clasificadas).toEqual(delSchema);
  });

  it("ningún campo está en los dos niveles a la vez", () => {
    const enAmbos = CAMPOS_NIVEL_1.filter((c) => (CAMPOS_NIVEL_2 as readonly string[]).includes(c));
    expect(enAmbos).toEqual([]);
  });

  it("los datos que nunca salen del sistema están en Nivel 2", () => {
    for (const campo of [
      "dni",
      "numeroPasaporte",
      "fechaVencimientoPasaporte",
      "fechaNacimiento",
      "alergiasSalud",
      "telefonoAlumno",
      "tutor1Celular",
    ]) {
      expect(esCampoSensible(campo)).toBe(true);
    }
  });

  it("lo que puede viajar por mail no es sensible", () => {
    for (const campo of ["nombre", "apellido", "tutor1Email", "tutor1Nombre"]) {
      expect(esCampoSensible(campo)).toBe(false);
    }
  });

  it("un campo desconocido no es sensible pero tampoco pasa por soloNivel1", () => {
    expect(esCampoSensible("inventado")).toBe(false);
  });
});

describe("soloNivel1", () => {
  it("no deja NINGUNA clave de Nivel 2 sobre un payload completo", () => {
    const recortado = soloNivel1(COMPLETO);
    const claves = Object.keys(recortado);
    for (const sensible of CAMPOS_NIVEL_2) {
      expect(claves).not.toContain(sensible);
    }
    expect(JSON.stringify(recortado)).not.toContain("45102338");
    expect(JSON.stringify(recortado)).not.toContain("AAF123456");
    expect(JSON.stringify(recortado)).not.toContain("maní");
  });

  it("conserva lo de Nivel 1", () => {
    expect(soloNivel1(COMPLETO)).toEqual({
      nombre: "Milagros",
      apellido: "Sosa",
      tutor1Nombre: "Vanina Sosa",
      tutor1Email: "vanina@example.com",
      acepta: true,
    });
  });

  it("omite lo ausente y descarta las claves de más", () => {
    const recortado = soloNivel1({ nombre: "Milagros", dni: "45102338" });
    expect(recortado).toEqual({ nombre: "Milagros" });
  });

  it("es idempotente", () => {
    const una = soloNivel1(COMPLETO);
    expect(soloNivel1(una)).toEqual(una);
  });
});

describe("enmascararDni", () => {
  it("deja los últimos 4 dígitos", () => {
    expect(enmascararDni("45102338")).toBe("••••2338");
    expect(enmascararDni("45.102.338")).toBe("••••2338");
  });

  it("oculta entero un documento de 4 dígitos o menos", () => {
    expect(enmascararDni("1234")).toBe("••••");
    expect(enmascararDni("12")).toBe("••");
  });

  it("aguanta documentos largos", () => {
    expect(enmascararDni("1234567890123")).toBe("•••••••••0123");
  });

  it("devuelve vacío cuando no hay dígitos", () => {
    expect(enmascararDni("")).toBe("");
    expect(enmascararDni("   ")).toBe("");
    expect(enmascararDni("sin número")).toBe("");
  });
});
