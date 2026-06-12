import { describe, expect, it } from "vitest";

import {
  DocumentoInvalidoError,
  MAX_DOCUMENTO_BYTES,
  keyDocumento,
  validarDocumento,
} from "./index";

describe("validarDocumento (TEC-02)", () => {
  it("acepta PDF/DOCX/JPG/PNG dentro del límite", () => {
    expect(validarDocumento({ mime: "application/pdf", bytes: 1024 })).toBe("application/pdf");
    expect(validarDocumento({ mime: "image/png", bytes: MAX_DOCUMENTO_BYTES })).toBe("image/png");
  });

  it("rechaza formatos no permitidos", () => {
    expect(() => validarDocumento({ mime: "application/zip", bytes: 10 })).toThrow(
      DocumentoInvalidoError
    );
    expect(() => validarDocumento({ mime: "text/html", bytes: 10 })).toThrow();
  });

  it("rechaza archivos de más de 10 MB y vacíos", () => {
    expect(() =>
      validarDocumento({ mime: "application/pdf", bytes: MAX_DOCUMENTO_BYTES + 1 })
    ).toThrow("10 MB");
    expect(() => validarDocumento({ mime: "application/pdf", bytes: 0 })).toThrow("vacío");
  });
});

describe("keyDocumento", () => {
  it("sanitiza el nombre y arma una key estable por entidad", () => {
    const key = keyDocumento({
      entidadTipo: "paso_alumno",
      entidadId: "abc-123",
      nombreOriginal: "Parental Consent — Pérez (firmado).pdf",
      mime: "application/pdf",
      timestamp: new Date("2026-06-12T10:00:00Z"),
    });
    expect(key).toBe("paso_alumno/abc-123/2026-06-12-parental-consent-perez-firmado.pdf");
  });

  it("nunca produce keys vacías", () => {
    const key = keyDocumento({
      entidadTipo: "paso_alumno",
      entidadId: "x",
      nombreOriginal: "%%%.pdf",
      mime: "application/pdf",
      timestamp: new Date("2026-06-12"),
    });
    expect(key).toContain("documento.pdf");
  });
});
