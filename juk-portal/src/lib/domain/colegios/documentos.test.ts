import { describe, expect, it } from "vitest";

import {
  CONFIG_DOCUMENTAL_DEFAULT,
  DOCUMENTOS_CON_PASO,
  DOCUMENTOS_PROGRAMA,
  configDocumentalEfectiva,
  tipoEntradaPorPais,
} from "./documentos";
import { PAISES } from "./schema";

describe("CONFIG_DOCUMENTAL_DEFAULT (MIN-11)", () => {
  it("usa los defaults por documento del Modelo v1.7", () => {
    expect(CONFIG_DOCUMENTAL_DEFAULT).toEqual({
      application_form: "requerido",
      test_nivel: "na",
      parental_consent: "na",
      confirmation_letter: "requerido",
      visa_immigration_letter: "requerido",
    });
  });

  it("cubre los 5 documentos del programa", () => {
    expect(Object.keys(CONFIG_DOCUMENTAL_DEFAULT).sort()).toEqual(
      [...DOCUMENTOS_PROGRAMA].sort()
    );
  });
});

describe("configDocumentalEfectiva", () => {
  it("sin overrides devuelve los defaults", () => {
    expect(configDocumentalEfectiva({})).toEqual(CONFIG_DOCUMENTAL_DEFAULT);
  });

  it("los overrides pisan solo su documento", () => {
    const efectiva = configDocumentalEfectiva({ test_nivel: "requerido" });
    expect(efectiva.test_nivel).toBe("requerido");
    expect(efectiva.application_form).toBe("requerido");
    expect(efectiva.parental_consent).toBe("na");
  });
});

describe("tipoEntradaPorPais (MIN-14)", () => {
  it("UK → ETA; Canadá y Australia → VISA; el resto → ninguna", () => {
    expect(tipoEntradaPorPais("reino_unido")).toBe("eta");
    expect(tipoEntradaPorPais("canada")).toBe("visa");
    expect(tipoEntradaPorPais("australia")).toBe("visa");
    expect(tipoEntradaPorPais("irlanda")).toBe("ninguna");
    expect(tipoEntradaPorPais("malta")).toBe("ninguna");
    expect(tipoEntradaPorPais("argentina")).toBe("ninguna");
    expect(tipoEntradaPorPais("otro")).toBe("ninguna");
  });

  it("está definido para todos los países del enum", () => {
    for (const pais of PAISES) {
      expect(["eta", "visa", "ninguna"]).toContain(tipoEntradaPorPais(pais));
    }
  });
});

describe("DOCUMENTOS_CON_PASO", () => {
  it("solo AF, Test y PC inicializan pasos; CL y VISA son campos de control", () => {
    expect(DOCUMENTOS_CON_PASO).toEqual([
      "application_form",
      "test_nivel",
      "parental_consent",
    ]);
  });
});
