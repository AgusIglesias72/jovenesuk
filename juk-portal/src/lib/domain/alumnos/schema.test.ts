import { describe, expect, it } from "vitest";

import {
  PASOS_FILTRABLES,
  alumnoCreateSchema,
  alumnoFiltersSchema,
  alumnoUpdateSchema,
} from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

const base = {
  nombre: "Tomás",
  apellido: "García",
  fechaNacimiento: "2010-05-20",
  dni: "45102338",
  numeroPasaporte: "AAB123456",
  fechaVencimientoPasaporte: "2030-01-01",
  tutor1Nombre: "Laura García",
  tutor1Celular: "+54 9 11 5555-1234",
  tutor1Email: "laura@example.com",
};

const facturacionCompleta = {
  razonSocial: "Laura García",
  direccion: "Av. Corrientes 1234",
  localidad: "CABA",
  provincia: "Buenos Aires",
  codigoPostal: "C1043",
  cuilCuit: "27-12345678-4",
  condicionFiscal: "consumidor_final",
};

const facturacionVacia = {
  razonSocial: "",
  direccion: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  cuilCuit: "",
  condicionFiscal: "consumidor_final",
};

function issues(input: unknown) {
  const r = alumnoCreateSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

describe("alumnoCreateSchema — obligatorios", () => {
  it("acepta un alumno con solo los obligatorios y deja los opcionales en null", () => {
    const r = alumnoCreateSchema.parse(base);
    expect(r.fechaNacimiento.toISOString()).toBe("2010-05-20T00:00:00.000Z");
    expect(r.fechaVencimientoPasaporte.toISOString()).toBe("2030-01-01T00:00:00.000Z");
    for (const campo of [
      "telefonoAlumno",
      "emailAlumno",
      "alergiasSalud",
      "tutor2Nombre",
      "tutor2Celular",
      "tutor2Email",
      "facturacion",
      "preferenciasAlojamiento",
      "nivelInglesAutoevaluacion",
      "notasInternas",
    ] as const) {
      expect(r[campo]).toBeNull();
    }
  });

  it("cada obligatorio vacío falla con su mensaje", () => {
    expect(issues({ ...base, nombre: "  " })).toEqual([{ path: "nombre", message: "Ingresá el nombre" }]);
    expect(issues({ ...base, dni: "" })).toEqual([{ path: "dni", message: "Ingresá el DNI" }]);
    expect(issues({ ...base, numeroPasaporte: " " })).toEqual([
      { path: "numeroPasaporte", message: "Ingresá el número de pasaporte" },
    ]);
    expect(issues({ ...base, tutor1Nombre: "" })).toEqual([
      { path: "tutor1Nombre", message: "Ingresá el nombre del tutor" },
    ]);
    expect(issues({ ...base, tutor1Celular: "" })).toEqual([
      { path: "tutor1Celular", message: "Ingresá el celular del tutor" },
    ]);
  });

  it("el email del tutor 1 es obligatorio y con formato", () => {
    expect(issues({ ...base, tutor1Email: "laura.example.com" })).toEqual([
      { path: "tutor1Email", message: "Email inválido" },
    ]);
    expect(issues({ ...base, tutor1Email: "" }).map((i) => i.path)).toEqual(["tutor1Email"]);
  });

  it("recorta DNI y pasaporte (el DNI es el slug de la URL)", () => {
    const r = alumnoCreateSchema.parse({ ...base, dni: " 45102338 ", numeroPasaporte: " AAB123456 " });
    expect(r.dni).toBe("45102338");
    expect(r.numeroPasaporte).toBe("AAB123456");
  });

  it("respeta los largos máximos de DNI y pasaporte", () => {
    expect(issues({ ...base, dni: "1".repeat(31) }).map((i) => i.path)).toEqual(["dni"]);
    expect(issues({ ...base, numeroPasaporte: "A".repeat(31) }).map((i) => i.path)).toEqual([
      "numeroPasaporte",
    ]);
  });
});

describe("alumnoCreateSchema — fechas", () => {
  it("vacía o ausente pide la fecha", () => {
    expect(issues({ ...base, fechaNacimiento: "" })).toEqual([
      { path: "fechaNacimiento", message: "Ingresá la fecha" },
    ]);
    expect(issues({ ...base, fechaVencimientoPasaporte: undefined })).toEqual([
      { path: "fechaVencimientoPasaporte", message: "Ingresá la fecha" },
    ]);
  });

  it("una fecha que no se puede interpretar falla en su campo", () => {
    expect(issues({ ...base, fechaNacimiento: "20/05/2010" }).map((i) => i.path)).toEqual([
      "fechaNacimiento",
    ]);
  });
});

describe("alumnoCreateSchema — opcionales", () => {
  it("strings vacíos o en blanco del form quedan null", () => {
    const r = alumnoCreateSchema.parse({
      ...base,
      telefonoAlumno: "",
      emailAlumno: "  ",
      tutor2Nombre: "",
      tutor2Email: "",
      alergiasSalud: "   ",
    });
    expect(r.telefonoAlumno).toBeNull();
    expect(r.emailAlumno).toBeNull();
    expect(r.tutor2Nombre).toBeNull();
    expect(r.tutor2Email).toBeNull();
    expect(r.alergiasSalud).toBeNull();
  });

  it("un email opcional cargado tiene que ser válido", () => {
    expect(issues({ ...base, emailAlumno: "tomas@" })).toEqual([
      { path: "emailAlumno", message: "Email inválido" },
    ]);
    expect(issues({ ...base, tutor2Email: "no-mail" }).map((i) => i.path)).toEqual(["tutor2Email"]);
    expect(alumnoCreateSchema.parse({ ...base, tutor2Email: " papa@example.com " }).tutor2Email).toBe(
      "papa@example.com"
    );
  });
});

describe("alumnoCreateSchema — facturación (todo o nada)", () => {
  it("ausente, null o con todos los textos vacíos queda null", () => {
    expect(alumnoCreateSchema.parse({ ...base, facturacion: null }).facturacion).toBeNull();
    expect(alumnoCreateSchema.parse({ ...base, facturacion: facturacionVacia }).facturacion).toBeNull();
    const enBlanco = { ...facturacionVacia, razonSocial: "   ", cuilCuit: " " };
    expect(alumnoCreateSchema.parse({ ...base, facturacion: enBlanco }).facturacion).toBeNull();
  });

  it("la condición fiscal sola (el select siempre tiene valor) no cuenta como carga", () => {
    const soloCondicion = { ...facturacionVacia, condicionFiscal: "monotributo" };
    expect(alumnoCreateSchema.parse({ ...base, facturacion: soloCondicion }).facturacion).toBeNull();
  });

  it("con un solo campo cargado exige los otros cinco", () => {
    const parcial = { ...facturacionVacia, razonSocial: "Laura García" };
    expect(issues({ ...base, facturacion: parcial })).toEqual([
      { path: "facturacion.direccion", message: "Requerido" },
      { path: "facturacion.localidad", message: "Requerido" },
      { path: "facturacion.provincia", message: "Requerido" },
      { path: "facturacion.codigoPostal", message: "Requerido" },
      { path: "facturacion.cuilCuit", message: "Requerido" },
    ]);
  });

  it("completa se guarda recortada", () => {
    const r = alumnoCreateSchema.parse({
      ...base,
      facturacion: { ...facturacionCompleta, razonSocial: "  Laura García  " },
    });
    expect(r.facturacion).toEqual(facturacionCompleta);
  });

  it("completa con una condición fiscal inventada falla en ese campo", () => {
    expect(
      issues({ ...base, facturacion: { ...facturacionCompleta, condicionFiscal: "autonomo" } }).map(
        (i) => i.path
      )
    ).toEqual(["facturacion.condicionFiscal"]);
  });
});

describe("alumnoUpdateSchema", () => {
  it("exige id uuid y un estado válido, además de las reglas del alta", () => {
    expect(alumnoUpdateSchema.safeParse({ ...base, id: UUID, estado: "activo" }).success).toBe(true);

    const sinId = alumnoUpdateSchema.safeParse({ ...base, estado: "activo" });
    expect(sinId.success).toBe(false);

    const estadoMalo = alumnoUpdateSchema.safeParse({ ...base, id: UUID, estado: "egresado" });
    expect(estadoMalo.success).toBe(false);

    const facturacionParcial = alumnoUpdateSchema.safeParse({
      ...base,
      id: UUID,
      estado: "baja",
      facturacion: { ...facturacionVacia, cuilCuit: "20-1-1" },
    });
    expect(facturacionParcial.success).toBe(false);
  });
});

describe("alumnoFiltersSchema", () => {
  it("acepta los filtros nuevos de US-17 (viaje y paso pendiente)", () => {
    const r = alumnoFiltersSchema.parse({ viajeId: UUID, paso: "c1" });
    expect(r.viajeId).toBe(UUID);
    expect(r.paso).toBe("c1");
  });

  it("conserva los filtros que ya existían", () => {
    const r = alumnoFiltersSchema.parse({ q: "perez", estado: "activo", alerta: "pasos_bloqueados" });
    expect(r).toEqual({ q: "perez", estado: "activo", alerta: "pasos_bloqueados" });
  });

  it("el Paso 0 no es filtrable: es de solo lectura y nunca queda pendiente", () => {
    expect(PASOS_FILTRABLES).not.toContain("paso_0");
    expect(PASOS_FILTRABLES).toHaveLength(10);
    expect(alumnoFiltersSchema.parse({ paso: "paso_0" }).paso).toBeUndefined();
  });

  it("descarta solo el valor inválido y conserva el resto", () => {
    const r = alumnoFiltersSchema.parse({
      q: "gomez",
      viajeId: "UK-2027-JUL-LONDON",
      paso: "z9",
      estado: "inexistente",
    });
    expect(r.q).toBe("gomez");
    expect(r.viajeId).toBeUndefined();
    expect(r.paso).toBeUndefined();
    expect(r.estado).toBeUndefined();
  });

  it("params vacíos cuentan como no filtrados", () => {
    const r = alumnoFiltersSchema.parse({ q: "", viajeId: "", paso: "" });
    expect(Object.values(r).some((v) => v !== undefined)).toBe(false);
  });
});
