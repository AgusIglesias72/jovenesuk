import { describe, expect, it } from "vitest";

import { hashTexto } from "./hash-texto";

const POLITICA = "Tratamos los datos de tu hijo/a solo para organizar el viaje.";

describe("hashTexto", () => {
  it("es determinista entre llamadas", () => {
    expect(hashTexto(POLITICA)).toBe(hashTexto(POLITICA));
  });

  it("el mismo texto con CRLF y con LF da el mismo hash", () => {
    const conLf = "Primera línea\nSegunda línea\nTercera";
    const conCrlf = "Primera línea\r\nSegunda línea\r\nTercera";
    expect(hashTexto(conCrlf)).toBe(hashTexto(conLf));
  });

  it("ignora espacios y saltos al principio y al final", () => {
    expect(hashTexto(`\r\n  ${POLITICA}  \n`)).toBe(hashTexto(POLITICA));
  });

  it("textos distintos dan hashes distintos", () => {
    expect(hashTexto(POLITICA)).not.toBe(hashTexto(`${POLITICA} Y para nada más.`));
  });

  it("distingue un cambio mínimo en el medio del texto", () => {
    expect(hashTexto("Conservamos los datos 5 años")).not.toBe(
      hashTexto("Conservamos los datos 6 años"),
    );
  });

  it("el string vacío no rompe y es igual al de solo espacios", () => {
    expect(hashTexto("")).toBe(hashTexto("   \r\n  "));
    expect(hashTexto("")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("el resultado siempre es hex de 64 caracteres", () => {
    for (const texto of [POLITICA, "á", "", "línea\r\notra", "x".repeat(10_000)]) {
      expect(hashTexto(texto)).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
