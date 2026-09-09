import { describe, expect, it } from "vitest";

import { keyEsSegura, nombreDesdeKey } from "./key";

describe("keyEsSegura", () => {
  it("acepta las keys que genera el portal", () => {
    expect(keyEsSegura("paso_alumno/abc-123/2026-06-12-parental-consent.pdf")).toBe(true);
    expect(keyEsSegura("prospectos/1a2b/1750000000000-logo.png")).toBe(true);
  });

  it("rechaza traversal y separadores de Windows", () => {
    expect(keyEsSegura("../.env")).toBe(false);
    expect(keyEsSegura("paso_alumno/../../.env")).toBe(false);
    expect(keyEsSegura("paso_alumno\\x.pdf")).toBe(false);
    expect(keyEsSegura("paso_alumno//x.pdf")).toBe(false);
    expect(keyEsSegura("paso_alumno/./x.pdf")).toBe(false);
  });

  it("rechaza vacías, con espacios o desmesuradas", () => {
    expect(keyEsSegura("")).toBe(false);
    expect(keyEsSegura("con espacio.pdf")).toBe(false);
    expect(keyEsSegura(`a/${"x".repeat(600)}.pdf`)).toBe(false);
  });
});

describe("nombreDesdeKey", () => {
  it("devuelve el último segmento", () => {
    expect(nombreDesdeKey("paso_alumno/abc/2026-06-12-consent.pdf")).toBe(
      "2026-06-12-consent.pdf"
    );
    expect(nombreDesdeKey("suelto.pdf")).toBe("suelto.pdf");
  });
});
