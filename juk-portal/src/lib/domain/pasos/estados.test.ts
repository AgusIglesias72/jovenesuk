import { describe, expect, it } from "vitest";

import { grupoDePaso, PASO_CODIGOS, PASO_NUMERACION_VIEJA } from "./codigos";
import {
  PASO_ESTADOS,
  admiteFechaLimite,
  cuentaParaCompletitud,
  puedeTransicionarPasoAlumno,
  transicionRequiereNota,
  transicionesPasoAlumno,
} from "./estados";

describe("transicionRequiereNota", () => {
  it("bloquear exige motivo; el resto de las transiciones no", () => {
    expect(transicionRequiereNota("bloqueado")).toBe(true);
    for (const estado of PASO_ESTADOS.filter((e) => e !== "bloqueado")) {
      expect(transicionRequiereNota(estado)).toBe(false);
    }
  });
});

describe("admiteFechaLimite", () => {
  it("solo A1 tiene fecha límite editable", () => {
    expect(admiteFechaLimite("a1")).toBe(true);
    for (const codigo of PASO_CODIGOS.filter((c) => c !== "a1")) {
      expect(admiteFechaLimite(codigo)).toBe(false);
    }
  });
});

describe("puedeTransicionarPasoAlumno", () => {
  it("el Paso 0 no se puede transicionar nunca", () => {
    expect(puedeTransicionarPasoAlumno("paso_0", "completado", "pendiente")).toBe(false);
    expect(puedeTransicionarPasoAlumno("paso_0", "completado", "completado")).toBe(false);
  });

  it("'vencido' solo existe para A1", () => {
    expect(puedeTransicionarPasoAlumno("a1", "pendiente", "vencido")).toBe(true);
    expect(puedeTransicionarPasoAlumno("a2", "pendiente", "vencido")).toBe(false);
    expect(puedeTransicionarPasoAlumno("c3", "en_progreso", "vencido")).toBe(false);
  });

  it("vencido NO bloquea: se puede completar después", () => {
    expect(puedeTransicionarPasoAlumno("a1", "vencido", "completado")).toBe(true);
    expect(puedeTransicionarPasoAlumno("a1", "vencido", "en_progreso")).toBe(true);
  });

  it("N/A se puede reactivar a pendiente (y solo a pendiente)", () => {
    expect(puedeTransicionarPasoAlumno("a2", "na", "pendiente")).toBe(true);
    expect(puedeTransicionarPasoAlumno("a2", "na", "completado")).toBe(false);
  });

  it("completado se puede reabrir pero no bloquear directo", () => {
    expect(puedeTransicionarPasoAlumno("c3", "completado", "en_progreso")).toBe(true);
    expect(puedeTransicionarPasoAlumno("c3", "completado", "bloqueado")).toBe(false);
  });

  it("B1/B2 son solo lectura: su estado lo deriva el plan de cuotas", () => {
    expect(puedeTransicionarPasoAlumno("b1", "completado", "en_progreso")).toBe(false);
    expect(puedeTransicionarPasoAlumno("b2", "pendiente", "completado")).toBe(false);
    expect(transicionesPasoAlumno("b1", "pendiente")).toEqual(["pendiente"]);
  });
});

describe("transicionesPasoAlumno", () => {
  it("no ofrece 'vencido' fuera de A1", () => {
    expect(transicionesPasoAlumno("a2", "pendiente")).not.toContain("vencido");
    expect(transicionesPasoAlumno("a1", "pendiente")).toContain("vencido");
  });

  it("el Paso 0 solo se ofrece a sí mismo", () => {
    expect(transicionesPasoAlumno("paso_0", "completado")).toEqual(["completado"]);
  });
});

describe("cuentaParaCompletitud (MIN-13/MIN-06)", () => {
  it("N/A y opcionales no cuentan; activos requeridos sí", () => {
    expect(cuentaParaCompletitud("pendiente", false)).toBe(true);
    expect(cuentaParaCompletitud("completado", false)).toBe(true);
    expect(cuentaParaCompletitud("na", false)).toBe(false);
    expect(cuentaParaCompletitud("pendiente", true)).toBe(false);
  });
});

describe("códigos y grupos", () => {
  it("cada paso pertenece a su grupo", () => {
    expect(grupoDePaso("paso_0")).toBe("referencia");
    expect(grupoDePaso("a3")).toBe("a");
    expect(grupoDePaso("b2")).toBe("b");
    expect(grupoDePaso("c1")).toBe("c");
    expect(grupoDePaso("d2")).toBe("d");
  });

  it("la numeración vieja cubre los 10 pasos (sin Paso 0)", () => {
    const numeros = Object.values(PASO_NUMERACION_VIEJA).sort((x, y) => x - y);
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Object.keys(PASO_NUMERACION_VIEJA)).toHaveLength(PASO_CODIGOS.length - 1);
  });
});
