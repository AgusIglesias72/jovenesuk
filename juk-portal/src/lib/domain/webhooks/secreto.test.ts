import { describe, expect, it } from "vitest";

import { LARGO_MINIMO_SECRETO, coincideSecreto, secretoUsable } from "./secreto";

const SECRETO = "c".repeat(LARGO_MINIMO_SECRETO);

describe("secretoUsable", () => {
  it("rechaza ausente, vacío y corto", () => {
    expect(secretoUsable(undefined)).toBe(false);
    expect(secretoUsable(null)).toBe(false);
    expect(secretoUsable("")).toBe(false);
    expect(secretoUsable("c".repeat(LARGO_MINIMO_SECRETO - 1))).toBe(false);
  });

  it("acepta desde 32 caracteres", () => {
    expect(secretoUsable(SECRETO)).toBe(true);
    expect(secretoUsable(`${SECRETO}extra`)).toBe(true);
  });
});

describe("coincideSecreto", () => {
  it("acepta el secreto exacto", () => {
    expect(coincideSecreto(SECRETO, SECRETO)).toBe(true);
  });

  it("rechaza header ausente o vacío", () => {
    expect(coincideSecreto(null, SECRETO)).toBe(false);
    expect(coincideSecreto(undefined, SECRETO)).toBe(false);
    expect(coincideSecreto("", SECRETO)).toBe(false);
  });

  it("rechaza un prefijo correcto (no alcanza con adivinar el arranque)", () => {
    expect(coincideSecreto(SECRETO.slice(0, LARGO_MINIMO_SECRETO - 1), SECRETO)).toBe(false);
  });

  it("rechaza distinta longitud sin lanzar", () => {
    expect(() => coincideSecreto(`${SECRETO}x`, SECRETO)).not.toThrow();
    expect(coincideSecreto(`${SECRETO}x`, SECRETO)).toBe(false);
  });

  it("rechaza un secreto distinto del mismo largo", () => {
    expect(coincideSecreto("d".repeat(LARGO_MINIMO_SECRETO), SECRETO)).toBe(false);
  });

  it("compara bytes, no caracteres: distinto multibyte no matchea", () => {
    const conAcento = `${"c".repeat(LARGO_MINIMO_SECRETO - 1)}á`;
    expect(coincideSecreto(conAcento, SECRETO)).toBe(false);
  });
});
