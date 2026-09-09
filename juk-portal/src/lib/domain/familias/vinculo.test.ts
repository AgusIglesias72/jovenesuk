import { describe, expect, it } from "vitest";

import {
  describirAlumnosVinculados,
  evaluarVinculoFamilia,
  normalizarApellido,
  type AlumnoVinculado,
} from "./vinculo";

const alumno = { id: "a-1", dni: "45102338", apellido: "Pérez" };

const hermano: AlumnoVinculado = {
  id: "a-2",
  dni: "47999111",
  nombre: "Sofía",
  apellido: "Perez",
};

const ajeno: AlumnoVinculado = {
  id: "a-3",
  dni: "40111222",
  nombre: "Joaquín",
  apellido: "Gutiérrez",
};

describe("evaluarVinculoFamilia", () => {
  it("email nuevo → hay que crear la cuenta", () => {
    expect(
      evaluarVinculoFamilia({ usuario: null, alumnosDeLaCuenta: [], alumno })
    ).toEqual({ tipo: "crear" });
  });

  it("cuenta de familia sin alumnos → vincula directo", () => {
    expect(
      evaluarVinculoFamilia({
        usuario: { id: "u-1", role: "familia" },
        alumnosDeLaCuenta: [],
        alumno,
      })
    ).toEqual({ tipo: "vincular", userId: "u-1" });
  });

  it("cuenta con un hermano (mismo apellido, con o sin acento) → vincula directo", () => {
    expect(
      evaluarVinculoFamilia({
        usuario: { id: "u-1", role: "familia" },
        alumnosDeLaCuenta: [hermano],
        alumno,
      })
    ).toEqual({ tipo: "vincular", userId: "u-1" });
  });

  it("cuenta con alumnos de otro apellido → conflicto con el detalle", () => {
    const r = evaluarVinculoFamilia({
      usuario: { id: "u-1", role: "familia" },
      alumnosDeLaCuenta: [hermano, ajeno],
      alumno,
    });

    expect(r).toEqual({ tipo: "conflicto", userId: "u-1", alumnos: [ajeno] });
  });

  it("el mismo alumno ya vinculado (por id o por dni) no cuenta como conflicto", () => {
    const mismoPorDni: AlumnoVinculado = {
      id: "otro-id",
      dni: alumno.dni,
      nombre: "Juan",
      apellido: "Perez Gutierrez",
    };

    expect(
      evaluarVinculoFamilia({
        usuario: { id: "u-1", role: "familia" },
        alumnosDeLaCuenta: [{ ...ajeno, id: alumno.id }, mismoPorDni],
        alumno,
      })
    ).toEqual({ tipo: "vincular", userId: "u-1" });
  });

  it("el email pertenece a un usuario del equipo → no se toca la cuenta", () => {
    expect(
      evaluarVinculoFamilia({
        usuario: { id: "u-9", role: "admin_juk" },
        alumnosDeLaCuenta: [],
        alumno,
      })
    ).toEqual({ tipo: "email_del_equipo" });
  });
});

describe("normalizarApellido", () => {
  it("ignora acentos, mayúsculas y espacios de más", () => {
    expect(normalizarApellido("  PÉREZ ")).toBe("perez");
  });
});

describe("describirAlumnosVinculados", () => {
  it("arma la lista legible para el admin", () => {
    expect(describirAlumnosVinculados([ajeno])).toBe("Gutiérrez, Joaquín (DNI 40111222)");
    expect(describirAlumnosVinculados([ajeno, hermano])).toBe(
      "Gutiérrez, Joaquín (DNI 40111222) · Perez, Sofía (DNI 47999111)"
    );
  });
});
