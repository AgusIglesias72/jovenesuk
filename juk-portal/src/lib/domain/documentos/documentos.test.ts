import { describe, expect, it } from "vitest";

import {
  DocumentoInvalidoError,
  MAX_DOCUMENTO_BYTES,
  detectarMime,
  keyDocumento,
  mimePorExtension,
  validarDocumento,
} from "./index";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const CABECERAS = {
  pdf: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
  jpg: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
  png: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
  webp: Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
  docx: Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]),
  doc: Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  html: Uint8Array.from([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50]),
} as const;

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

describe("detectarMime (magic bytes)", () => {
  it("reconoce los formatos de la allowlist", () => {
    expect(detectarMime(CABECERAS.pdf)).toBe("application/pdf");
    expect(detectarMime(CABECERAS.jpg)).toBe("image/jpeg");
    expect(detectarMime(CABECERAS.png)).toBe("image/png");
    expect(detectarMime(CABECERAS.webp)).toBe("image/webp");
    expect(detectarMime(CABECERAS.docx)).toBe(DOCX);
    expect(detectarMime(CABECERAS.doc)).toBe("application/msword");
  });

  it("devuelve null para contenido desconocido o cabeceras truncadas", () => {
    expect(detectarMime(CABECERAS.html)).toBeNull();
    expect(detectarMime(Uint8Array.from([]))).toBeNull();
    expect(detectarMime(Uint8Array.from([0x25, 0x50]))).toBeNull();
    // RIFF sin el marcador WEBP (p. ej. un .wav)
    expect(
      detectarMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]))
    ).toBeNull();
  });
});

describe("validarDocumento con magic bytes", () => {
  it("acepta cuando el contenido coincide con el MIME declarado", () => {
    expect(
      validarDocumento({ mime: "application/pdf", bytes: 1024, head: CABECERAS.pdf })
    ).toBe("application/pdf");
    expect(validarDocumento({ mime: "image/webp", bytes: 20, head: CABECERAS.webp })).toBe(
      "image/webp"
    );
  });

  it("rechaza un MIME declarado que miente sobre el contenido", () => {
    expect(() =>
      validarDocumento({ mime: "application/pdf", bytes: 1024, head: CABECERAS.png })
    ).toThrow(DocumentoInvalidoError);
    expect(() =>
      validarDocumento({ mime: "image/png", bytes: 1024, head: CABECERAS.pdf })
    ).toThrow("no coincide");
  });

  it("rechaza contenido que no es ninguno de los formatos permitidos", () => {
    expect(() =>
      validarDocumento({ mime: "image/png", bytes: 1024, head: CABECERAS.html })
    ).toThrow("No pudimos reconocer");
  });

  it("sigue rechazando por MIME antes de mirar los bytes", () => {
    expect(() =>
      validarDocumento({ mime: "image/svg+xml", bytes: 1024, head: CABECERAS.png })
    ).toThrow("Formato no permitido");
  });
});

describe("mimePorExtension", () => {
  it("mapea las extensiones que servimos", () => {
    expect(mimePorExtension("prospectos/x/1750-logo.PNG")).toBe("image/png");
    expect(mimePorExtension("a/b/c.jpeg")).toBe("image/jpeg");
    expect(mimePorExtension("a/b/c.docx")).toBe(DOCX);
  });

  it("devuelve null si no hay extensión conocida", () => {
    expect(mimePorExtension("a/b/c.exe")).toBeNull();
    expect(mimePorExtension("a/b/c")).toBeNull();
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
