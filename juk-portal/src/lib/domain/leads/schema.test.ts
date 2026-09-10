import { describe, expect, it } from "vitest";

import { cambiarEstadoConsultaSchema, leadSchema, newsletterSchema, values } from "./schema";

const leadValido = {
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@example.com",
  telefono: "1122334455",
  paraQuien: "para_mi",
  modalidad: "grupal",
  cuando: "este_ano",
  acepta: true,
};

function issues(input: unknown) {
  const r = leadSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

describe("leadSchema", () => {
  it("acepta una consulta válida", () => {
    expect(leadSchema.safeParse(leadValido).success).toBe(true);
  });

  it("exige institución cuando la consulta es para un colegio", () => {
    expect(issues({ ...leadValido, paraQuien: "colegio" })).toEqual([
      { path: "institucion", message: "Contanos el nombre de tu colegio o institución." },
    ]);
    expect(issues({ ...leadValido, paraQuien: "colegio", institucion: "A" }).map((i) => i.path)).toEqual([
      "institucion",
    ]);
    expect(leadSchema.safeParse({ ...leadValido, paraQuien: "colegio", institucion: "IES" }).success).toBe(
      true
    );
  });

  it("una institución de puros espacios no cuenta (se recorta antes del refine)", () => {
    expect(
      issues({ ...leadValido, paraQuien: "colegio", institucion: "      " }).map((i) => i.path)
    ).toEqual(["institucion"]);
  });

  it("para uno mismo o un hijo la institución no es obligatoria", () => {
    expect(leadSchema.safeParse({ ...leadValido, paraQuien: "para_mi_hijo" }).success).toBe(true);
  });

  it("sin consentimiento no se puede enviar", () => {
    const mensaje = "Necesitamos tu consentimiento para contactarte.";
    expect(issues({ ...leadValido, acepta: false })).toEqual([{ path: "acepta", message: mensaje }]);
    expect(issues({ ...leadValido, acepta: undefined })).toEqual([{ path: "acepta", message: mensaje }]);
    expect(issues({ ...leadValido, acepta: "true" }).map((i) => i.path)).toEqual(["acepta"]);
  });

  it("modalidad y cuándo muestran mensajes propios en vez del error genérico de enum", () => {
    expect(issues({ ...leadValido, modalidad: "crucero" })).toEqual([
      { path: "modalidad", message: "Elegí una opción." },
    ]);
    expect(issues({ ...leadValido, cuando: undefined })).toEqual([
      { path: "cuando", message: "Elegí cuándo te gustaría viajar." },
    ]);
  });

  it("valida nombre, apellido y teléfono mínimos", () => {
    expect(issues({ ...leadValido, nombre: " A " }).map((i) => i.message)).toEqual(["Ingresá tu nombre."]);
    expect(issues({ ...leadValido, apellido: "P" }).map((i) => i.path)).toEqual(["apellido"]);
    expect(issues({ ...leadValido, telefono: "12345" })).toEqual([
      { path: "telefono", message: "Ingresá un teléfono de contacto." },
    ]);
  });

  it("destino es opcional pero de la lista", () => {
    expect(leadSchema.safeParse({ ...leadValido, destino: "irlanda" }).success).toBe(true);
    expect(issues({ ...leadValido, destino: "marte" }).map((i) => i.path)).toEqual(["destino"]);
  });

  it("honeypot: vacío pasa, relleno se rechaza", () => {
    expect(leadSchema.safeParse({ ...leadValido, website: "" }).success).toBe(true);
    expect(issues({ ...leadValido, website: "spam" }).map((i) => i.path)).toEqual(["website"]);
  });

  it("limita el mensaje a 1000 caracteres", () => {
    expect(issues({ ...leadValido, mensaje: "x".repeat(1001) }).map((i) => i.path)).toEqual(["mensaje"]);
  });
});

describe("newsletterSchema", () => {
  it("valida el email después de recortar", () => {
    expect(newsletterSchema.safeParse({ email: "no-es-email" }).success).toBe(false);
    expect(newsletterSchema.parse({ email: " ana@example.com " }).email).toBe("ana@example.com");
  });

  it("rechaza el honeypot relleno", () => {
    expect(newsletterSchema.safeParse({ email: "ana@example.com", website: "x" }).success).toBe(false);
  });
});

describe("estado de consulta", () => {
  it("solo admite estados conocidos y un id uuid", () => {
    const id = "00000000-0000-0000-0000-000000000001";
    expect(cambiarEstadoConsultaSchema.safeParse({ id, estado: "contactada" }).success).toBe(true);
    expect(cambiarEstadoConsultaSchema.safeParse({ id, estado: "otro" }).success).toBe(false);
    expect(cambiarEstadoConsultaSchema.safeParse({ id: "1", estado: "nueva" }).success).toBe(false);
  });

  it("values extrae los value de las opciones en orden", () => {
    expect(values([{ value: "a" }, { value: "b" }])).toEqual(["a", "b"]);
  });
});
