import { describe, expect, it } from "vitest";

import { RETURN_TO_POR_DEFECTO, sanitizeReturnTo } from "./return-to";

describe("sanitizeReturnTo: rechaza destinos fuera del portal", () => {
  const maliciosos: Array<[string, string | null | undefined]> = [
    ["vacío", ""],
    ["undefined", undefined],
    ["null", null],
    ["raíz pública", "/"],
    ["protocol-relative", "//evil.com"],
    ["backslash", "/\\evil.com"],
    ["backslash mixto", "/\\/evil.com"],
    ["backslash escapado por el browser", "/%5Cevil.com"],
    ["URL absoluta", "https://evil.com/dashboard"],
    ["URL absoluta sin esquema explícito", "http://evil.com"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["CRLF codificado", "/dashboard%0d"],
    ["CRLF crudo", "/dashboard\r\nSet-Cookie: a=b"],
    ["loop al login", "/login"],
    ["loop al reset", "/reset-password?token=abc"],
    ["página pública", "/salidas"],
    ["prefijo parecido pero ajeno", "/dashboardfalso"],
  ];

  for (const [nombre, entrada] of maliciosos) {
    it(`${nombre} → ${RETURN_TO_POR_DEFECTO}`, () => {
      expect(sanitizeReturnTo(entrada)).toBe(RETURN_TO_POR_DEFECTO);
    });
  }
});

describe("sanitizeReturnTo: acepta paths del portal", () => {
  it("conserva el path exacto de un prefijo", () => {
    expect(sanitizeReturnTo("/dashboard")).toBe("/dashboard");
  });

  it("conserva subpaths con slug", () => {
    expect(sanitizeReturnTo("/viajes/UK-2026-JUL-LONDON")).toBe("/viajes/UK-2026-JUL-LONDON");
  });

  it("conserva el query string", () => {
    expect(sanitizeReturnTo("/alumnos/123?x=1")).toBe("/alumnos/123?x=1");
    expect(sanitizeReturnTo("/viajes/UK-2026-JUL-LONDON?tab=pagos")).toBe(
      "/viajes/UK-2026-JUL-LONDON?tab=pagos"
    );
  });

  it("acepta el portal de familias", () => {
    expect(sanitizeReturnTo("/familias/45102338/pagos")).toBe("/familias/45102338/pagos");
  });

  it("descarta el hash (no viaja al server y no aporta al destino)", () => {
    expect(sanitizeReturnTo("/pagos#total")).toBe("/pagos");
  });
});
