import { describe, expect, it } from "vitest";

import { contentDisposition, nombreArchivoSeguro } from "./content-disposition";

describe("nombreArchivoSeguro", () => {
  it("saca CR/LF y otros control chars", () => {
    expect(nombreArchivoSeguro("pasa\r\nporte.pdf")).toBe("pasaporte.pdf");
    expect(nombreArchivoSeguro("a\u0000b.pdf")).toBe("ab.pdf");
  });

  it("neutraliza separadores de path", () => {
    expect(nombreArchivoSeguro("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(nombreArchivoSeguro("C:\\temp\\x.pdf")).toBe("C:_temp_x.pdf");
  });

  it("nunca devuelve vacío", () => {
    expect(nombreArchivoSeguro("   ")).toBe("documento");
    expect(nombreArchivoSeguro("\n")).toBe("documento");
  });
});

describe("contentDisposition", () => {
  it("arma inline y attachment con filename y filename*", () => {
    expect(contentDisposition({ nombre: "consent.pdf", inline: true })).toBe(
      `inline; filename="consent.pdf"; filename*=UTF-8''consent.pdf`
    );
    expect(contentDisposition({ nombre: "consent.pdf", inline: false })).toBe(
      `attachment; filename="consent.pdf"; filename*=UTF-8''consent.pdf`
    );
  });

  it("escapa comillas para que no se pueda inyectar otro parámetro", () => {
    const header = contentDisposition({
      nombre: `x.pdf"; filename="evil.html`,
      inline: true,
    });
    expect(header.match(/filename="/g)).toHaveLength(1);
    expect(header).toBe(
      `inline; filename="x.pdf_; filename=_evil.html"; filename*=UTF-8''x.pdf%22%3B%20filename%3D%22evil.html`
    );
  });

  it("no deja pasar CR/LF al header", () => {
    const header = contentDisposition({
      nombre: "a.pdf\r\nX-Inyectado: 1",
      inline: false,
    });
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
  });

  it("codifica el nombre UTF-8 y deja un fallback ASCII", () => {
    const header = contentDisposition({ nombre: "Autorización ñandú.pdf", inline: true });
    expect(header).toContain(`filename="Autorizaci_n _and_.pdf"`);
    expect(header).toContain("filename*=UTF-8''Autorizaci%C3%B3n%20%C3%B1and%C3%BA.pdf");
  });

  it("codifica los caracteres que encodeURIComponent deja pasar (RFC 5987)", () => {
    const header = contentDisposition({ nombre: "a'b(c)d*e.pdf", inline: true });
    expect(header).toContain("filename*=UTF-8''a%27b%28c%29d%2Ae.pdf");
  });
});
