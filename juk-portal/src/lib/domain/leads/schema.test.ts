import { describe, expect, it } from "vitest";

import { ESTADO_CONSULTA_LABELS, PARA_QUIEN_LABELS } from "./labels";
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

describe("leadSchema", () => {
  it("acepta una consulta válida", () => {
    expect(leadSchema.safeParse(leadValido).success).toBe(true);
  });

  it("exige institución cuando la consulta es para un colegio", () => {
    const res = leadSchema.safeParse({ ...leadValido, paraQuien: "colegio" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "institucion")).toBe(true);
    }
  });

  it("rechaza el honeypot relleno", () => {
    expect(leadSchema.safeParse({ ...leadValido, website: "spam" }).success).toBe(false);
  });
});

describe("newsletterSchema y estado de consulta", () => {
  it("valida el email", () => {
    expect(newsletterSchema.safeParse({ email: "no-es-email" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: " ana@example.com " }).success).toBe(true);
  });

  it("solo admite estados conocidos", () => {
    const id = "00000000-0000-0000-0000-000000000001";
    expect(cambiarEstadoConsultaSchema.safeParse({ id, estado: "contactada" }).success).toBe(true);
    expect(cambiarEstadoConsultaSchema.safeParse({ id, estado: "otro" }).success).toBe(false);
  });

  it("labels cubren todas las opciones", () => {
    expect(values([{ value: "a" }, { value: "b" }])).toEqual(["a", "b"]);
    expect(PARA_QUIEN_LABELS.colegio).toBe("Para mi colegio o institución");
    expect(ESTADO_CONSULTA_LABELS.nueva).toBe("Nueva");
  });
});
