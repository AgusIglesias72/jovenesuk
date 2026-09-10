import { describe, expect, it } from "vitest";

import {
  ETA_PROBLEMA_LABELS,
  ETA_PROBLEMAS,
  ETA_SUBESTADO_LABELS,
  ETA_SUBESTADO_LABELS_FAMILIA,
  ETA_SUBESTADOS,
  ETA_SUBESTADOS_FAMILIA,
  ETA_URL_OFICIAL,
  esEtaSubEstadoFamilia,
  estadoPasoDesdeEta,
  estadoPasoDesdePc,
  PC_SUBESTADO_LABELS,
  PC_SUBESTADOS,
} from "./sub-estados";

describe("ETA desde el portal de familias (US-1.5 / US-1.6)", () => {
  it("la familia reporta avance sin 'rechazado': el rechazo va por 'Tuve un problema'", () => {
    expect(ETA_SUBESTADOS_FAMILIA).toEqual(["pendiente", "en_tramite", "aprobado"]);
    expect(ETA_SUBESTADOS_FAMILIA).not.toContain("rechazado");
    for (const s of ETA_SUBESTADOS_FAMILIA) {
      expect(ETA_SUBESTADOS).toContain(s);
    }
  });

  it("los tres tipos de problema del PRD tienen label", () => {
    expect(ETA_PROBLEMAS).toEqual(["rechazo_gobierno", "error_datos", "problema_app"]);
    for (const p of ETA_PROBLEMAS) {
      expect(ETA_PROBLEMA_LABELS[p].length).toBeGreaterThan(0);
    }
  });

  it("el link oficial es el sitio del gobierno británico", () => {
    expect(ETA_URL_OFICIAL).toMatch(/^https:\/\/www\.gov\.uk\//);
  });

  it("reportar un problema deja el paso destacado como bloqueado", () => {
    expect(estadoPasoDesdeEta("rechazado")).toBe("bloqueado");
  });

  it("cada etapa que reporta la familia tiene label en primera persona", () => {
    for (const s of ETA_SUBESTADOS_FAMILIA) {
      expect(ETA_SUBESTADO_LABELS_FAMILIA[s].length).toBeGreaterThan(0);
    }
  });

  it("esEtaSubEstadoFamilia acepta solo las etapas que reporta la familia", () => {
    expect(esEtaSubEstadoFamilia("en_tramite")).toBe(true);
    expect(esEtaSubEstadoFamilia("rechazado")).toBe(false);
    expect(esEtaSubEstadoFamilia(undefined)).toBe(false);
    expect(esEtaSubEstadoFamilia(3)).toBe(false);
  });
});

describe("estadoPasoDesdeEta (US-31)", () => {
  it("deriva el estado del paso desde cada sub-estado", () => {
    expect(estadoPasoDesdeEta("pendiente")).toBe("pendiente");
    expect(estadoPasoDesdeEta("en_tramite")).toBe("en_progreso");
    expect(estadoPasoDesdeEta("aprobado")).toBe("completado");
    expect(estadoPasoDesdeEta("rechazado")).toBe("bloqueado");
  });

  it("todo sub-estado tiene label", () => {
    for (const s of ETA_SUBESTADOS) {
      expect(ETA_SUBESTADO_LABELS[s]).toBeTruthy();
    }
  });
});

describe("estadoPasoDesdePc (US-29)", () => {
  it("enviado y firmado son en_progreso; recibido completa", () => {
    expect(estadoPasoDesdePc("enviado")).toBe("en_progreso");
    expect(estadoPasoDesdePc("firmado")).toBe("en_progreso");
    expect(estadoPasoDesdePc("recibido")).toBe("completado");
  });

  it("todo sub-estado tiene label", () => {
    for (const s of PC_SUBESTADOS) {
      expect(PC_SUBESTADO_LABELS[s]).toBeTruthy();
    }
  });
});
