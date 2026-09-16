import { describe, expect, it } from "vitest";

import {
  FORMULARIO_SETTINGS_DEFAULT,
  formularioSettingsSchema,
  parsearFormularioSettings,
} from "./formulario";

describe("formularioSettingsSchema", () => {
  it("el default es la variante 'a'", () => {
    expect(FORMULARIO_SETTINGS_DEFAULT.varianteActiva).toBe("a");
    expect(formularioSettingsSchema.safeParse(FORMULARIO_SETTINGS_DEFAULT).success).toBe(true);
  });

  it("rechaza una variante que no existe", () => {
    expect(formularioSettingsSchema.safeParse({ varianteActiva: "z" }).success).toBe(false);
  });
});

describe("parsearFormularioSettings", () => {
  it("respeta un valor válido", () => {
    expect(parsearFormularioSettings({ varianteActiva: "b" })).toEqual({ varianteActiva: "b" });
  });

  it("acepta el mismo valor guardado como texto JSON", () => {
    expect(parsearFormularioSettings('{"varianteActiva":"c"}')).toEqual({ varianteActiva: "c" });
  });

  it("una variante desconocida cae al default", () => {
    expect(parsearFormularioSettings({ varianteActiva: "z" })).toEqual(
      FORMULARIO_SETTINGS_DEFAULT
    );
  });

  it("un JSON corrupto cae al default en vez de romper el formulario público", () => {
    expect(parsearFormularioSettings("{no es json")).toEqual(FORMULARIO_SETTINGS_DEFAULT);
  });

  it("null, undefined, un número o un array caen al default", () => {
    expect(parsearFormularioSettings(null)).toEqual(FORMULARIO_SETTINGS_DEFAULT);
    expect(parsearFormularioSettings(undefined)).toEqual(FORMULARIO_SETTINGS_DEFAULT);
    expect(parsearFormularioSettings(7)).toEqual(FORMULARIO_SETTINGS_DEFAULT);
    expect(parsearFormularioSettings(["b"])).toEqual(FORMULARIO_SETTINGS_DEFAULT);
  });

  it("un objeto sin la clave cae al default sin perder los campos que sí estén", () => {
    expect(parsearFormularioSettings({ otraCosa: true })).toEqual(FORMULARIO_SETTINGS_DEFAULT);
  });

  it("ignora las claves de más y conserva la variante válida", () => {
    expect(parsearFormularioSettings({ varianteActiva: "b", viejo: "x" })).toEqual({
      varianteActiva: "b",
    });
  });
});
