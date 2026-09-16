import { describe, expect, it } from "vitest";

import { generarTokenOpaco, hashToken } from "./token-opaco";

const HEX_64 = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** 32 bytes en base64url, sin padding: ceil(32 / 3) * 4 - 1 = 43 caracteres. */
const LARGO_ESPERADO = 43;

describe("generarTokenOpaco", () => {
  it("usa solo el alfabeto URL-safe: nada de +, / ni =", () => {
    for (let i = 0; i < 50; i++) {
      const token = generarTokenOpaco();
      expect(token).toMatch(BASE64URL);
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it("tiene largo estable", () => {
    for (let i = 0; i < 50; i++) {
      expect(generarTokenOpaco()).toHaveLength(LARGO_ESPERADO);
    }
  });

  it("dos llamadas seguidas dan tokens distintos", () => {
    expect(generarTokenOpaco()).not.toBe(generarTokenOpaco());
  });

  it("no repite en una tanda grande", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generarTokenOpaco()));
    expect(tokens.size).toBe(500);
  });

  it("sobrevive un ida y vuelta por la URL sin cambiar", () => {
    const token = generarTokenOpaco();
    const url = new URL(`https://jovenesenuk.com/inscripcion?t=${token}`);
    expect(url.searchParams.get("t")).toBe(token);
    expect(encodeURIComponent(token)).toBe(token);
  });
});

describe("hashToken", () => {
  it("es determinista para el mismo token", () => {
    const token = generarTokenOpaco();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("devuelve hex de 64 caracteres", () => {
    for (let i = 0; i < 20; i++) {
      expect(hashToken(generarTokenOpaco())).toMatch(HEX_64);
    }
    expect(hashToken("")).toMatch(HEX_64);
  });

  it("dos tokens distintos no colisionan", () => {
    const hashes = new Set(
      Array.from({ length: 200 }, () => hashToken(generarTokenOpaco())),
    );
    expect(hashes.size).toBe(200);
  });

  it("no devuelve nunca el token en claro", () => {
    const token = generarTokenOpaco();
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).not.toContain(token);
  });

  it("no normaliza: un espacio de más da otro hash", () => {
    const token = generarTokenOpaco();
    expect(hashToken(`${token} `)).not.toBe(hashToken(token));
    expect(hashToken(`\n${token}`)).not.toBe(hashToken(token));
  });

  it("distingue un cambio de un solo caracter", () => {
    expect(hashToken("abcdef")).not.toBe(hashToken("abcdeF"));
  });
});
