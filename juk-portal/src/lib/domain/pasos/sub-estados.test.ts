import { describe, expect, it } from "vitest";

import {
  ETA_SUBESTADO_LABELS,
  ETA_SUBESTADOS,
  estadoPasoDesdeEta,
  estadoPasoDesdePc,
  PC_SUBESTADO_LABELS,
  PC_SUBESTADOS,
} from "./sub-estados";

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
