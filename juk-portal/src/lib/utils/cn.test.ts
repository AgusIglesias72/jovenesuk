import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("la última clase en conflicto gana (permite pisar estilos por props)", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("descarta valores falsos y resuelve objetos condicionales", () => {
    expect(cn("text-sm", false, null, undefined, { "font-bold": true, italic: false })).toBe(
      "text-sm font-bold"
    );
  });
});
