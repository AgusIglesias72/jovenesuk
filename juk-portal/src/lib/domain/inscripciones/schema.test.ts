import { describe, expect, it } from "vitest";

import { NumeroInscripcionInvalidoError } from "./errors";
import { INSCRIPCION_ESTADO_LABELS, INSCRIPCION_ESTADO_TONE } from "./labels";
import {
  codigoInscripcion,
  esHoneypotRelleno,
  INSCRIPCION_ESTADOS,
  inscripcionFiltersSchema,
  inscripcionSchema,
  parsearCodigoInscripcion,
  resolverVariante,
  VARIANTES,
} from "./schema";

const VALIDO = {
  nombre: "Milagros",
  apellido: "Sosa",
  fechaNacimiento: "2009-04-12",
  dni: "45.102.338",
  numeroPasaporte: "AAF123456",
  fechaVencimientoPasaporte: "2031-08-30",
  tutor1Nombre: "Vanina Sosa",
  tutor1Celular: "+54 9 11 5555 4444",
  tutor1Email: "vanina@example.com",
  acepta: true,
};

function campos(input: unknown): string[] {
  const r = inscripcionSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
}

describe("inscripcionSchema", () => {
  it("acepta la ficha mínima del webhook y deja el DNI en dígitos (TEC-12)", () => {
    const r = inscripcionSchema.safeParse(VALIDO);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.dni).toBe("45102338");
    expect(r.data.fechaNacimiento).toBe("2009-04-12");
  });

  it("normaliza el DNI venga con puntos, espacios o guiones", () => {
    for (const dni of ["45.102.338", " 45 102 338 ", "45-102-338"]) {
      const r = inscripcionSchema.safeParse({ ...VALIDO, dni });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.dni).toBe("45102338");
    }
  });

  it("rechaza un DNI que se queda sin dígitos suficientes", () => {
    expect(campos({ ...VALIDO, dni: "no tengo" })).toContain("dni");
    expect(campos({ ...VALIDO, dni: "123" })).toContain("dni");
  });

  it("exige los campos obligatorios del webhook", () => {
    const paths = campos({ acepta: true });
    for (const campo of [
      "nombre",
      "apellido",
      "fechaNacimiento",
      "dni",
      "numeroPasaporte",
      "fechaVencimientoPasaporte",
      "tutor1Nombre",
      "tutor1Celular",
      "tutor1Email",
    ]) {
      expect(paths).toContain(campo);
    }
  });

  it("deja opcionales los campos opcionales del webhook, y el vacío no viaja", () => {
    const r = inscripcionSchema.safeParse({
      ...VALIDO,
      telefonoAlumno: "",
      emailAlumno: "  ",
      alergiasSalud: "Alergia al maní",
      preferenciasAlojamiento: "",
      nivelInglesAutoevaluacion: "Intermedio",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.telefonoAlumno).toBeUndefined();
    expect(r.data.emailAlumno).toBeUndefined();
    expect(r.data.alergiasSalud).toBe("Alergia al maní");
    expect(r.data.nivelInglesAutoevaluacion).toBe("Intermedio");
  });

  it("valida los emails", () => {
    expect(campos({ ...VALIDO, tutor1Email: "vanina(at)example.com" })).toContain("tutor1Email");
    expect(campos({ ...VALIDO, emailAlumno: "no-es-un-mail" })).toContain("emailAlumno");
  });

  it("rechaza fechas que no son AAAA-MM-DD o no existen en el calendario", () => {
    expect(campos({ ...VALIDO, fechaNacimiento: "12/04/2009" })).toContain("fechaNacimiento");
    expect(campos({ ...VALIDO, fechaNacimiento: "2009-02-31" })).toContain("fechaNacimiento");
    expect(campos({ ...VALIDO, fechaVencimientoPasaporte: "2031-13-01" })).toContain(
      "fechaVencimientoPasaporte"
    );
  });

  it("sin consentimiento no hay inscripción", () => {
    const { acepta: _acepta, ...sinAcepta } = VALIDO;
    expect(campos(sinAcepta)).toContain("acepta");
    expect(campos({ ...VALIDO, acepta: false })).toContain("acepta");
    expect(campos({ ...VALIDO, acepta: "on" })).toContain("acepta");
  });

  it("detecta el honeypot relleno y lo deja pasar a la validación", () => {
    const r = inscripcionSchema.safeParse({ ...VALIDO, website: "https://spam.example" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(esHoneypotRelleno(r.data)).toBe(true);
  });

  it("un envío humano tiene el honeypot vacío", () => {
    const r = inscripcionSchema.safeParse({ ...VALIDO, website: "   " });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.website).toBeUndefined();
    expect(esHoneypotRelleno(r.data)).toBe(false);
  });

  it("ignora viajeId, alumnoId, comunicacionId y estado inyectados por el cliente", () => {
    const r = inscripcionSchema.safeParse({
      ...VALIDO,
      viajeId: "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f",
      alumnoId: "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f",
      comunicacionId: "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f",
      estado: "procesada",
      codigoViaje: "UK-2026-JUL-LONDON",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    const claves = Object.keys(r.data);
    for (const prohibida of ["viajeId", "alumnoId", "comunicacionId", "estado", "codigoViaje"]) {
      expect(claves).not.toContain(prohibida);
    }
  });
});

describe("resolverVariante", () => {
  it("respeta la precedencia param > campaña > setting > 'a'", () => {
    expect(resolverVariante({ param: "c", campana: "b", setting: "a" })).toBe("c");
    expect(resolverVariante({ campana: "b", setting: "a" })).toBe("b");
    expect(resolverVariante({ setting: "c" })).toBe("c");
    expect(resolverVariante({})).toBe("a");
  });

  it("cae al siguiente escalón cuando el param es basura", () => {
    expect(resolverVariante({ param: "<script>alert(1)</script>", setting: "b" })).toBe("b");
    expect(resolverVariante({ param: "z", campana: "c", setting: "b" })).toBe("c");
    expect(resolverVariante({ param: "", setting: "b" })).toBe("b");
    expect(resolverVariante({ param: ["a"], setting: "c" })).toBe("c");
    expect(resolverVariante({ param: 3, campana: null, setting: undefined })).toBe("a");
  });

  it("tolera mayúsculas y espacios", () => {
    expect(resolverVariante({ param: " B " })).toBe("b");
    expect(resolverVariante({ campana: "C" })).toBe("c");
  });

  it("devuelve siempre una variante conocida", () => {
    for (const entrada of [{}, { param: {} }, { setting: "nada" }, { campana: false }]) {
      expect(VARIANTES).toContain(resolverVariante(entrada));
    }
  });
});

describe("codigoInscripcion / parsearCodigoInscripcion", () => {
  it("formatea el correlativo con 6 dígitos y sin año", () => {
    expect(codigoInscripcion(123)).toBe("INS-000123");
    expect(codigoInscripcion(1)).toBe("INS-000001");
    expect(codigoInscripcion(999999)).toBe("INS-999999");
    expect(codigoInscripcion(1000000)).toBe("INS-1000000");
  });

  it("es inversa de parsearCodigoInscripcion", () => {
    for (const numero of [1, 42, 123, 999999, 1000000]) {
      expect(parsearCodigoInscripcion(codigoInscripcion(numero))).toBe(numero);
    }
    expect(parsearCodigoInscripcion("INS-000123")).toBe(123);
  });

  it("tolera espacios y minúsculas al parsear", () => {
    expect(parsearCodigoInscripcion(" ins-000123 ")).toBe(123);
  });

  it("devuelve null con códigos inválidos", () => {
    for (const codigo of [
      "INS-123",
      "INS000123",
      "UK-2026-JUL-LONDON",
      "INS-00012A",
      "INS-000000",
      "",
      "  ",
      null,
      undefined,
      123,
    ]) {
      expect(parsearCodigoInscripcion(codigo)).toBeNull();
    }
  });

  it("rechaza números que no son correlativos", () => {
    for (const numero of [0, -3, 1.5, Number.NaN]) {
      expect(() => codigoInscripcion(numero)).toThrow(NumeroInscripcionInvalidoError);
    }
  });
});

describe("inscripcionFiltersSchema", () => {
  const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

  it("parsea los filtros válidos", () => {
    const r = inscripcionFiltersSchema.parse({
      q: " sosa ",
      estado: "recibida",
      viajeId: UUID,
      variante: "b",
    });
    expect(r).toEqual({ q: "sosa", estado: "recibida", viajeId: UUID, variante: "b" });
  });

  it("descarta el filtro inválido sin tirar abajo los demás", () => {
    const r = inscripcionFiltersSchema.parse({
      q: "sosa",
      estado: "inventado",
      viajeId: "no-es-uuid",
      variante: "z",
    });
    expect(r.q).toBe("sosa");
    expect(r.estado).toBeUndefined();
    expect(r.viajeId).toBeUndefined();
    expect(r.variante).toBeUndefined();
  });

  it("trata el vacío de la URL como ausencia", () => {
    const r = inscripcionFiltersSchema.parse({ q: "", estado: "", viajeId: "", variante: "" });
    expect(r).toEqual({
      q: undefined,
      estado: undefined,
      viajeId: undefined,
      variante: undefined,
    });
  });
});

describe("estados de una inscripción", () => {
  it("son los seis que el alta necesita distinguir", () => {
    expect(INSCRIPCION_ESTADOS).toEqual([
      "recibida",
      "procesada",
      "duplicada",
      "requiere_revision",
      "error",
      "anulada",
    ]);
  });

  it("la compuerta y el fallo existen como estados propios", () => {
    // Sin `requiere_revision` una carga anónima se colgaría sola de la cuenta de
    // otra familia; sin `error` un alta fallida sería un fallo mudo.
    expect(INSCRIPCION_ESTADOS).toContain("requiere_revision");
    expect(INSCRIPCION_ESTADOS).toContain("error");
  });

  it("cada estado tiene etiqueta y tono, y los que piden acción se ven distinto", () => {
    for (const estado of INSCRIPCION_ESTADOS) {
      expect(INSCRIPCION_ESTADO_LABELS[estado].trim()).not.toBe("");
      expect(INSCRIPCION_ESTADO_TONE[estado]).toBeDefined();
    }
    expect(INSCRIPCION_ESTADO_TONE.requiere_revision).toBe("warning");
    expect(INSCRIPCION_ESTADO_TONE.error).toBe("danger");
  });
});
