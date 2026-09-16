import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  ESTADOS_COMUNICACION,
  enviarOutreachSchema,
  moverEstadoSchema,
  notaSchema,
  prospectoCreateSchema,
  prospectoFiltersSchema,
  prospectoUpdateSchema,
} from "./schema";

const UUID = "3f1c2a4e-8b7d-4c1a-9e2f-5a6b7c8d9e0f";

function paths(schema: z.ZodTypeAny, input: unknown): string[] {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
}

describe("prospectoCreateSchema", () => {
  it("con solo el nombre nace en 'nuevo' y con listas vacías", () => {
    const r = prospectoCreateSchema.parse({ nombre: "  Colegio San Martín " });
    expect(r.nombre).toBe("Colegio San Martín");
    expect(r.estado).toBe("nuevo");
    expect(r.emails).toEqual([]);
    expect(r.telefonos).toEqual([]);
    expect(r.proximaAccionAt).toBeUndefined();
  });

  it("exige el nombre", () => {
    expect(paths(prospectoCreateSchema, { nombre: "   " })).toEqual(["nombre"]);
    expect(paths(prospectoCreateSchema, {})).toEqual(["nombre"]);
  });

  it("las URLs opcionales aceptan vacío pero no texto que no es URL", () => {
    expect(prospectoCreateSchema.safeParse({ nombre: "X", sitioWeb: "", ubicacionUrl: "" }).success).toBe(
      true
    );
    expect(paths(prospectoCreateSchema, { nombre: "X", sitioWeb: "colegio.edu.ar" })).toEqual([
      "sitioWeb",
    ]);
    expect(paths(prospectoCreateSchema, { nombre: "X", ubicacionUrl: "Av. Siempreviva 742" })).toEqual([
      "ubicacionUrl",
    ]);
    expect(
      prospectoCreateSchema.safeParse({ nombre: "X", ubicacionUrl: "https://maps.app.goo.gl/abc" })
        .success
    ).toBe(true);
  });

  it("valida cada email de la lista señalando cuál está mal", () => {
    expect(
      paths(prospectoCreateSchema, { nombre: "X", emails: ["info@colegio.edu.ar", "secretaria@"] })
    ).toEqual(["emails.1"]);
  });

  it("próxima acción: vacía o null queda sin fecha; ISO se convierte; basura se rechaza", () => {
    expect(prospectoCreateSchema.parse({ nombre: "X", proximaAccionAt: "" }).proximaAccionAt).toBeUndefined();
    expect(prospectoCreateSchema.parse({ nombre: "X", proximaAccionAt: null }).proximaAccionAt).toBeUndefined();
    expect(
      prospectoCreateSchema.parse({ nombre: "X", proximaAccionAt: "2026-10-01" }).proximaAccionAt?.toISOString()
    ).toBe("2026-10-01T00:00:00.000Z");
    expect(paths(prospectoCreateSchema, { nombre: "X", proximaAccionAt: "mañana" })).toEqual([
      "proximaAccionAt",
    ]);
  });

  it("responsable y país, si vienen, tienen que ser válidos", () => {
    expect(paths(prospectoCreateSchema, { nombre: "X", responsableId: "ana" })).toEqual(["responsableId"]);
    expect(paths(prospectoCreateSchema, { nombre: "X", pais: "uruguay" })).toEqual(["pais"]);
    expect(paths(prospectoCreateSchema, { nombre: "X", estado: "archivado" })).toEqual(["estado"]);
  });

  it("la edición exige el id uuid", () => {
    expect(prospectoUpdateSchema.safeParse({ nombre: "X", id: UUID }).success).toBe(true);
    expect(paths(prospectoUpdateSchema, { nombre: "X" })).toEqual(["id"]);
  });
});

describe("moverEstadoSchema (kanban)", () => {
  it("coerciona la posición que llega como string", () => {
    expect(moverEstadoSchema.parse({ id: UUID, estado: "ganado", posicion: "3" }).posicion).toBe(3);
  });

  it("rechaza posiciones negativas o fraccionarias y estados inexistentes", () => {
    expect(paths(moverEstadoSchema, { id: UUID, estado: "ganado", posicion: "-1" })).toEqual(["posicion"]);
    expect(paths(moverEstadoSchema, { id: UUID, estado: "ganado", posicion: 1.5 })).toEqual(["posicion"]);
    expect(paths(moverEstadoSchema, { id: UUID, estado: "archivado", posicion: 0 })).toEqual(["estado"]);
  });
});

describe("enviarOutreachSchema y notaSchema", () => {
  it("mide el largo después de recortar espacios", () => {
    const r = enviarOutreachSchema.safeParse({
      prospectoId: UUID,
      asunto: "  ab  ",
      mensaje: "   corto   ",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.message)).toEqual([
        "El asunto es muy corto",
        "El mensaje es muy corto",
      ]);
    }
  });

  it("acepta un outreach razonable", () => {
    expect(
      enviarOutreachSchema.safeParse({
        prospectoId: UUID,
        asunto: "Viajes a UK",
        mensaje: "Hola, les escribimos de Jóvenes en UK.",
      }).success
    ).toBe(true);
  });

  it("una nota en blanco se rechaza", () => {
    expect(paths(notaSchema, { prospectoId: UUID, texto: "   " })).toEqual(["texto"]);
    expect(paths(notaSchema, { prospectoId: "x", texto: "Llamé" })).toEqual(["prospectoId"]);
  });
});

describe("prospectoFiltersSchema", () => {
  it("coerciona la página y valida estado y responsable", () => {
    expect(prospectoFiltersSchema.parse({ q: " san ", page: "2", estado: "interesado" })).toEqual({
      q: "san",
      page: 2,
      estado: "interesado",
    });
    expect(prospectoFiltersSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(prospectoFiltersSchema.safeParse({ estado: "archivado" }).success).toBe(false);
  });
});

describe("comunicacionEstadoEnum", () => {
  it("tiene 'enviando' entre 'pendiente' y 'enviado' (envío por lote reanudable)", () => {
    expect(ESTADOS_COMUNICACION).toEqual([
      "pendiente",
      "enviando",
      "enviado",
      "entregado",
      "abierto",
      "click",
      "rebotado",
      "spam",
      "fallido",
    ]);
  });
});
