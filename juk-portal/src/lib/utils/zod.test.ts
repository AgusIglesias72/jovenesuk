import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fieldErrorsFromZod } from "./zod";

function errorDe<T extends z.ZodTypeAny>(schema: T, input: unknown): z.ZodError {
  const r = schema.safeParse(input);
  if (r.success) throw new Error("se esperaba que el schema falle");
  return r.error;
}

describe("fieldErrorsFromZod", () => {
  it("usa el path completo para subcampos anidados y posiciones de arrays", () => {
    const schema = z.object({
      contactoAcademico: z.object({ email: z.string().email("Email inválido") }),
      cursosDisponibles: z.array(z.string().min(1, "Vacío")),
    });
    const errores = fieldErrorsFromZod(
      errorDe(schema, { contactoAcademico: { email: "x" }, cursosDisponibles: ["ok", ""] })
    );
    expect(errores).toEqual({
      "contactoAcademico.email": ["Email inválido"],
      "cursosDisponibles.1": ["Vacío"],
    });
  });

  it("acumula en orden varios mensajes sobre el mismo campo", () => {
    const schema = z.object({
      codigo: z.string().min(5, "Muy corto").regex(/^UK/, "Formato inválido"),
    });
    expect(fieldErrorsFromZod(errorDe(schema, { codigo: "ab" }))).toEqual({
      codigo: ["Muy corto", "Formato inválido"],
    });
  });

  it("un error a nivel raíz (refine sin path) queda con clave vacía", () => {
    const schema = z
      .object({ desde: z.number(), hasta: z.number() })
      .refine((d) => d.hasta >= d.desde, "Rango invertido");
    expect(fieldErrorsFromZod(errorDe(schema, { desde: 5, hasta: 1 }))).toEqual({
      "": ["Rango invertido"],
    });
  });

  it("respeta el path explícito de un refine", () => {
    const schema = z
      .object({ desde: z.number(), hasta: z.number() })
      .refine((d) => d.hasta >= d.desde, { message: "Rango invertido", path: ["hasta"] });
    expect(fieldErrorsFromZod(errorDe(schema, { desde: 5, hasta: 1 }))).toEqual({
      hasta: ["Rango invertido"],
    });
  });
});
